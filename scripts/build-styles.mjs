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

async function compileLess(file) {
  const source = fs.readFileSync(file, 'utf8');
  const result = await less.render(source, {
    filename: file,
    paths: [path.dirname(file), fDir, path.join(root, 'node_modules')],
    javascriptEnabled: true,
    compress: false,
  });
  return result.css;
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
