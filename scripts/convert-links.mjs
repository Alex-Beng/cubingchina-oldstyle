import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const source = process.argv[2];

if (!source) {
  console.error('Usage: node scripts/convert-links.mjs <path-to-links.php>');
  process.exit(1);
}

function stripComments(src) {
  return src
    .replace(/^\s*<\?php\s*/i, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^[ \t]*\/\/.*$/gm, '');
}

function unquote(token) {
  const q = token[0];
  const inner = token.slice(1, -1);
  if (q === "'") return inner.replace(/\\'/g, "'").replace(/\\\\/g, '\\');
  return inner.replace(/\\"/g, '"').replace(/\\\\/g, '\\');
}

function parseLinks(src) {
  const body = stripComments(src);
  const items = [];
  const arrayRe = /array\s*\(([\s\S]*?)\n\s*\),?/g;
  const seen = new Set();
  let m;
  while ((m = arrayRe.exec(body)) !== null) {
    const entry = {};
    const pairRe = /'([a-zA-Z_]+)'\s*=>\s*('(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*")/g;
    let p;
    while ((p = pairRe.exec(m[1])) !== null) {
      entry[p[1]] = unquote(p[2]);
    }
    if (Object.keys(entry).length) {
      const key = entry.url ?? entry.name;
      if (!seen.has(key)) {
        seen.add(key);
        items.push(entry);
      }
    }
  }
  return items;
}

const raw = fs.readFileSync(source, 'utf8');
const links = parseLinks(raw);
const outFile = path.join(root, 'src', 'data', 'links.json');
fs.mkdirSync(path.dirname(outFile), { recursive: true });
fs.writeFileSync(outFile, JSON.stringify(links, null, 2) + '\n', 'utf8');
console.log(`${links.length} links -> ${path.relative(root, outFile)}`);
