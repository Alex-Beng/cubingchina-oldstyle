import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const srcMessages = path.join(root, 'reference', 'messages');
const outDir = path.join(root, 'src', 'i18n', 'locales');

const LOCALES = { zh_cn: 'zh-CN', zh_tw: 'zh-TW' };

function stripPhpComments(src) {
  return src
    .replace(/^\s*<\?php\s*/i, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^[ \t]*\/\/.*$/gm, '');
}

function phpArrayToEntries(body) {
  const entries = {};
  const re = /((?:'(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"))\s*=>\s*((?:'(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"))/g;
  let m;
  while ((m = re.exec(body)) !== null) {
    entries[unquote(m[1])] = unquote(m[2]);
  }
  return entries;
}

function unquote(token) {
  const q = token[0];
  let inner = token.slice(1, -1);
  if (q === "'") {
    inner = inner.replace(/\\'/g, "'").replace(/\\\\/g, '\\');
    return inner;
  }
  return inner
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '\r')
    .replace(/\\t/g, '\t')
    .replace(/\\"/g, '"')
    .replace(/\\\\/g, '\\');
}

function convertFile(file) {
  const raw = fs.readFileSync(file, 'utf8');
  const src = stripPhpComments(raw);
  const start = src.indexOf('return array');
  if (start < 0) return {};
  const body = src.slice(start + 'return array'.length);
  return phpArrayToEntries(body);
}

fs.mkdirSync(outDir, { recursive: true });

for (const [dir, locale] of Object.entries(LOCALES)) {
  const localeDir = path.join(srcMessages, dir);
  if (!fs.existsSync(localeDir)) continue;
  const merged = {};
  for (const file of fs.readdirSync(localeDir)) {
    if (!file.endsWith('.php')) continue;
    const category = path.basename(file, '.php');
    const entries = convertFile(path.join(localeDir, file));
    const cleaned = {};
    for (const [k, v] of Object.entries(entries)) {
      if (v === '' || /^@@.*@@$/.test(v)) continue;
      cleaned[k] = v;
    }
    if (Object.keys(cleaned).length) merged[category] = cleaned;
  }
  const out = path.join(outDir, `${locale}.json`);
  fs.writeFileSync(out, JSON.stringify(merged, null, 2) + '\n', 'utf8');
  const total = Object.values(merged).reduce((n, o) => n + Object.keys(o).length, 0);
  console.log(`${locale}: ${Object.keys(merged).length} categories, ${total} messages -> ${path.relative(root, out)}`);
}
