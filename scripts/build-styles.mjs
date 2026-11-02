import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import lessModule from 'less';
import postcss from 'postcss';
import autoprefixer from 'autoprefixer';

const less = lessModule.render ? lessModule : lessModule.default;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const fDir = path.join(root, 'public', 'f');
const outDir = path.join(fDir, 'build');

const ENTRIES = [
  {
    name: 'common',
    sources: [
      'node_modules/bootstrap/dist/css/bootstrap.css',
      'node_modules/font-awesome/css/font-awesome.css',
    ],
  },
  {
    name: 'main',
    lessEntry: path.join(fDir, 'less', 'styles.less'),
  },
];

function resolveBootstrapMediaPaths(css) {
  return css.replace(
    /url\((?:'|")?\.\.\/fonts\/([^)'"]+)(?:'|")?\)/g,
    (_, file) => `url("../fonts/${file}")`,
  );
}

const OUTPUT_CSS_DIR = path.join(outDir, 'css');

/**
 * 把 CSS 中的 url() 改写为「相对输出目录」的路径。
 * 旧站的 styles.less 直接 @import 了 .css 文件，Less 会保留成 CSS @import，
 * 生成后的相对路径会失效，所以这里先内联并重写资源路径。
 */
function rewriteUrls(css, assetDir) {
  return css.replace(
    /url\(\s*(['"]?)([^)'"]+\.(?:woff2?|ttf|eot|svg|png|jpe?g|gif))(?:\?[^)'"]*)?\1\s*\)/gi,
    (match, quote, asset) => {
      if (/^(data:|https?:|\/\/)/i.test(asset)) return match;
      const abs = path.resolve(assetDir, asset);
      if (!fs.existsSync(abs)) return match;
      const rel = path.relative(OUTPUT_CSS_DIR, abs).split(path.sep).join('/');
      return `url("${rel}")`;
    },
  );
}

function inlineCssImports(source, baseDir) {
  return source.replace(
    /@import\s+(?:\([^)]*\)\s*)?(['"])([^'"]+\.css)\1\s*;/g,
    (match, _quote, rel) => {
      if (/^(https?:)?\/\//i.test(rel) || rel.startsWith('data:')) return match;
      const abs = path.resolve(baseDir, rel);
      if (!fs.existsSync(abs)) {
        console.warn(`  ! css import not found, kept as-is: ${rel}`);
        return match;
      }
      const css = rewriteUrls(fs.readFileSync(abs, 'utf8'), path.dirname(abs));
      return `/* inlined: ${rel} */\n${css}\n/* end inlined: ${rel} */\n`;
    },
  );
}

function fixRenderedUrls(css, sourceDir) {
  const bases = [sourceDir, path.join(fDir, 'css'), fDir, OUTPUT_CSS_DIR];
  return css.replace(
    /url\(\s*(['"]?)([^)'"]+\.(?:woff2?|ttf|eot|svg|png|jpe?g|gif))(?:\?[^)'"]*)?\1\s*\)/gi,
    (match, _quote, asset) => {
      if (/^(data:|https?:|\/\/)/i.test(asset)) return match;
      for (const base of bases) {
        const abs = path.resolve(base, asset);
        if (fs.existsSync(abs)) {
          const rel = path.relative(OUTPUT_CSS_DIR, abs).split(path.sep).join('/');
          return `url("${rel}")`;
        }
      }
      return match;
    },
  );
}

async function compileLess(file) {
  const source = inlineCssImports(fs.readFileSync(file, 'utf8'), path.dirname(file));
  const result = await less.render(source, {
    filename: file,
    paths: [path.dirname(file), fDir, path.join(root, 'node_modules')],
    javascriptEnabled: true,
    compress: false,
  });
  return fixRenderedUrls(result.css, path.dirname(file));
}

async function main() {
  fs.mkdirSync(path.join(outDir, 'css'), { recursive: true });
  fs.mkdirSync(path.join(outDir, 'js'), { recursive: true });
  fs.mkdirSync(path.join(outDir, 'fonts'), { recursive: true });

  const fontDirs = [
    path.join(root, 'node_modules', 'bootstrap', 'dist', 'fonts'),
    path.join(root, 'node_modules', 'font-awesome', 'fonts'),
  ];
  for (const dir of fontDirs) {
    if (!fs.existsSync(dir)) continue;
    for (const file of fs.readdirSync(dir)) {
      fs.copyFileSync(
        path.join(dir, file),
        path.join(outDir, 'fonts', file),
      );
    }
  }

  for (const entry of ENTRIES) {
    let css = '';
    if (entry.sources) {
      for (const rel of entry.sources) {
        const file = path.join(root, rel);
        let content = fs.readFileSync(file, 'utf8');
        const base = path.dirname(file);
        content = content.replace(
          /url\((?:'|")?([^)'"]+\.(?:woff2?|ttf|eot|svg))(?:\?[^)'"]*)?(?:'|")?\)/g,
          (match, asset) => {
            if (/^(data:|https?:|\/\/)/.test(asset)) return match;
            const abs = path.resolve(base, asset);
            const fontName = path.basename(abs);
            if (fs.existsSync(abs)) {
              const target = path.join(outDir, 'fonts', fontName);
              if (!fs.existsSync(target)) fs.copyFileSync(abs, target);
            }
            return `url("../fonts/${fontName}")`;
          },
        );
        content = content.replace(
          /url\((?:'|")?([^)'"]+\.(?:png|jpg|jpeg|gif))(?:\?[^)'"]*)?(?:'|")?\)/g,
          (match, asset) => {
            if (/^(data:|https?:|\/\/)/.test(asset)) return match;
            const abs = path.resolve(base, asset);
            if (!fs.existsSync(abs)) return match;
            const imgName = path.basename(abs);
            const imgDir = path.join(outDir, 'images');
            fs.mkdirSync(imgDir, { recursive: true });
            const target = path.join(imgDir, imgName);
            if (!fs.existsSync(target)) fs.copyFileSync(abs, target);
            return `url("../images/${imgName}")`;
          },
        );
        css += `/* ${rel} */\n${content}\n`;
      }
    } else if (entry.lessEntry) {
      css = await compileLess(entry.lessEntry);
    }

    const processed = await postcss([autoprefixer()]).process(css, {
      from: undefined,
    });

    const outFile = path.join(outDir, 'css', `${entry.name}.min.css`);
    fs.writeFileSync(outFile, processed.css, 'utf8');
    console.log(
      `css/${entry.name}.min.css  ${(processed.css.length / 1024).toFixed(1)} KB`,
    );
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
