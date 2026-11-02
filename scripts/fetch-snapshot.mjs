import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const outDir = path.join(root, 'public', 'data');

const CUBING = 'https://api.cubing.com';
const WCA = 'https://wca-api.cubing.com';

const NEWS_PAGES = Number(process.env.SNAPSHOT_NEWS_PAGES || 10);
const DETAIL_YEARS = Number(process.env.SNAPSHOT_DETAIL_YEARS || 1);
const CONCURRENCY = Number(process.env.SNAPSHOT_CONCURRENCY || 6);

const stats = { written: 0, bytes: 0, failed: [] };

function writeJson(relPath, data) {
  const file = path.join(outDir, relPath);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const text = JSON.stringify(data);
  fs.writeFileSync(file, text, 'utf8');
  stats.written += 1;
  stats.bytes += Buffer.byteLength(text);
}

async function fetchJson(url, { retries = 2, timeoutMs = 40000 } = {}) {
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, {
        headers: {
          Accept: 'application/json',
          'User-Agent': 'cubingchina-oldstyle-build/0.1',
        },
        signal: controller.signal,
      });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status} for ${url}`);
      }
      return await res.json();
    } catch (err) {
      if (attempt === retries) throw err;
      await new Promise((r) => setTimeout(r, 800 * (attempt + 1)));
    } finally {
      clearTimeout(timer);
    }
  }
  throw new Error(`unreachable: ${url}`);
}

async function pool(items, worker, limit = CONCURRENCY) {
  const results = [];
  let index = 0;
  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (index < items.length) {
      const current = items[index];
      index += 1;
      results.push(await worker(current));
    }
  });
  await Promise.all(runners);
  return results;
}

function noteFailure(what, err) {
  stats.failed.push({ what, error: String(err?.message || err) });
  console.warn(`  ! ${what}: ${err?.message || err}`);
}

async function main() {
  fs.rmSync(outDir, { recursive: true, force: true });
  fs.mkdirSync(outDir, { recursive: true });

  console.log('Fetching competition search meta…');
  let years = [];
  try {
    const meta = await fetchJson(`${WCA}/competition/search/meta`);
    years = Array.isArray(meta.years) ? meta.years : [];
    writeJson('competition-meta.json', meta);
  } catch (err) {
    noteFailure('competition meta', err);
  }

  if (!years.length) {
    const current = new Date().getFullYear();
    years = [current, current + 1];
  }

  console.log(`Fetching competition lists for ${years.length} years…`);
  const yearLists = new Map();
  await pool(years, async (year) => {
    try {
      const data = await fetchJson(`${CUBING}/competitions?year=${year}`);
      writeJson(`competitions/${year}.json`, data);
      yearLists.set(year, Array.isArray(data) ? data : data.data ?? []);
    } catch (err) {
      noteFailure(`competitions ${year}`, err);
    }
    return null;
  });

  const currentYear = new Date().getFullYear();
  const detailYears = new Set();
  for (let i = 0; i < Math.max(1, DETAIL_YEARS); i += 1) {
    detailYears.add(currentYear + i);
  }

  const detailTargets = [];
  for (const [year, list] of yearLists) {
    if (!detailYears.has(Number(year))) continue;
    for (const competition of list) {
      if (competition?.alias) detailTargets.push(competition.alias);
    }
  }

  console.log(
    `Fetching ${detailTargets.length} competition details (years: ${[...detailYears].join(', ')})…`,
  );
  await pool(detailTargets, async (alias) => {
    try {
      const detail = await fetchJson(`${CUBING}/competitions/${encodeURIComponent(alias)}`);
      writeJson(`competition/${alias}.json`, detail);
    } catch (err) {
      noteFailure(`competition detail ${alias}`, err);
    }
    try {
      const schedule = await fetchJson(
        `${CUBING}/competitions/${encodeURIComponent(alias)}/schedule`,
      );
      writeJson(`schedule/${alias}.json`, schedule);
    } catch (err) {
      noteFailure(`competition schedule ${alias}`, err);
    }
    return null;
  });

  console.log(`Fetching ${NEWS_PAGES} news pages…`);
  const newsPages = Array.from({ length: NEWS_PAGES }, (_, i) => i + 1);
  await pool(newsPages, async (page) => {
    try {
      const data = await fetchJson(`${CUBING}/news?page=${page}`);
      writeJson(`news/page-${page}.json`, data);
      const items = Array.isArray(data) ? data : data.data ?? [];
      for (const item of items) {
        if (item?.alias) writeJson(`post/${item.alias}.json`, item);
      }
    } catch (err) {
      noteFailure(`news page ${page}`, err);
    }
    return null;
  });

  console.log('Fetching FAQ…');
  try {
    writeJson('faq.json', await fetchJson(`${CUBING}/faq`));
  } catch (err) {
    noteFailure('faq', err);
  }
  try {
    writeJson('faq-categories.json', await fetchJson(`${CUBING}/faq-categories`));
  } catch (err) {
    noteFailure('faq categories', err);
  }

  const manifest = {
    generatedAt: new Date().toISOString(),
    years,
    newsPages: NEWS_PAGES,
    detailYears: [...detailYears],
    files: stats.written,
    bytes: stats.bytes,
    failed: stats.failed,
  };
  writeJson('manifest.json', manifest);

  console.log(
    `\nSnapshot: ${stats.written} files, ${(stats.bytes / 1024 / 1024).toFixed(2)} MB` +
      (stats.failed.length ? `, ${stats.failed.length} failures` : ''),
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
