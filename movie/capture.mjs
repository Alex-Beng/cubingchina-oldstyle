#!/usr/bin/env node
// 用 Playwright 驱动真实站点，按运镜描述逐帧导出画面。
//
// 用法（由 render.py 调用）：
//   node capture.mjs --plan plan.json
//
// plan.json：
//   {
//     "base": "https://alex-beng.github.io/cubingchina-oldstyle/",
//     "outDir": "out/raw",
//     "width": 1920, "height": 1080, "dpr": 2, "quality": 92,
//     "concurrency": 2, "parallelPages": 4,
//     "shots": [ { "route": "#/", "topPad": 210,
//                  "frames": [ {"i":0,"scale":1,"x":0,"y":0,"scroll":0}, ... ] } ]
//   }
//
// topPad 把网页整体下推，顶部留出干净标题带，叠层标题绝不压住内容。
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

function argOf(name, def = null) {
  const i = process.argv.indexOf(name);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : def;
}

const planPath = argOf('--plan');
if (!planPath) {
  console.error('missing --plan');
  process.exit(2);
}
const plan = JSON.parse(fs.readFileSync(planPath, 'utf-8'));
fs.mkdirSync(plan.outDir, { recursive: true });

const FREEZE_CSS = `
  *, *::before, *::after {
    animation: none !important;
    transition: none !important;
    animation-duration: 0s !important;
    transition-duration: 0s !important;
    caret-color: transparent !important;
  }
  html { scroll-behavior: auto !important; }
  body { transform-origin: 0 0 !important; will-change: transform; }
  ::-webkit-scrollbar { display: none !important; }
`;

async function waitReady(page) {
  await page.waitForFunction(() => {
    const el = document.querySelector('.page-content') || document.body;
    return el && el.innerText && el.innerText.trim().length > 40;
  }, { timeout: 40000 });

  // 文本长度连续两次采样不变，视为渲染完成（兼容新旧两站）
  let prev = -1;
  for (let k = 0; k < 40; k++) {
    const len = await page.evaluate(() => (document.body.innerText || '').length);
    if (len === prev) break;
    prev = len;
    await page.waitForTimeout(180);
  }
  try {
    await page.evaluate(async () => {
      if (document.fonts && document.fonts.ready) await document.fonts.ready;
      const imgs = Array.from(document.images).filter((im) => !im.complete);
      await Promise.all(imgs.map((im) => new Promise((r) => {
        im.addEventListener('load', r, { once: true });
        im.addEventListener('error', r, { once: true });
        setTimeout(r, 3000);
      })));
    });
  } catch { /* ignore */ }
  await page.waitForTimeout(100);
}

async function applyState(page, st) {
  await page.evaluate((s) => {
    window.scrollTo(0, s.scroll || 0);
    document.body.style.transform = `translate(${s.x}px,${s.y}px) scale(${s.scale})`;
  }, st);
}

async function openPage(browser, shot) {
  const ctx = await browser.newContext({
    viewport: { width: plan.width, height: plan.height },
    deviceScaleFactor: plan.dpr || 2,
    locale: 'zh-CN',
    timezoneId: 'Asia/Shanghai',
  });
  const page = await ctx.newPage();
  // 每个批次可覆盖 base（用于对照新版站 cubing.com）
  const base = (shot.base || plan.base).replace(/\/$/, '/');
  const url = base + shot.route.replace(/^\//, '');
  await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
  await waitReady(page);
  await page.addStyleTag({ content: FREEZE_CSS });
  if (shot.topPad) {
    await page.addStyleTag({
      content: `body { padding-top: ${shot.topPad}px !important; }`,
    });
  }
  return { ctx, page };
}

async function renderChunk(browser, shot, frames) {
  if (!frames.length) return;
  const { ctx, page } = await openPage(browser, shot);
  try {
    for (const st of frames) {
      await applyState(page, st);
      await page.screenshot({
        path: path.join(plan.outDir, `${String(st.i).padStart(5, '0')}.jpg`),
        type: 'jpeg',
        quality: plan.quality || 92,
        captureBeyondViewport: false,
      });
    }
  } finally {
    await ctx.close();
  }
}

async function runShot(browser, shot) {
  // 把该批次的帧轮转分成若干块，多个页面并行抓
  const n = Math.max(1, Math.min(plan.parallelPages || 4, shot.frames.length));
  const chunks = Array.from({ length: n }, () => []);
  shot.frames.forEach((f, i) => chunks[i % n].push(f));
  await Promise.all(chunks.map((c) => renderChunk(browser, shot, c)));
  console.error(`[shot] ${shot.route} done (${shot.frames.length})`);
}

async function main() {
  const browser = await chromium.launch({
    args: ['--font-render-hinting=none', '--disable-lcd-text'],
  });
  try {
    const conc = Math.max(1, Math.min(plan.concurrency || 2, plan.shots.length));
    let cursor = 0;
    const workers = Array.from({ length: conc }, async () => {
      while (true) {
        const idx = cursor++;
        if (idx >= plan.shots.length) return;
        await runShot(browser, plan.shots[idx]);
      }
    });
    await Promise.all(workers);
  } finally {
    await browser.close();
  }
  const total = plan.shots.reduce((a, s) => a + s.frames.length, 0);
  console.error(`[done] ${total} frames -> ${plan.outDir}`);
}

main().catch((e) => {
  console.error('CAPTURE FAILED:', e && e.message ? e.message : e);
  process.exit(1);
});
