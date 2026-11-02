const target = process.argv[2] || 'http://127.0.0.1:5173/cubingchina-oldstyle/#/';
const waitMs = Number(process.argv[3] || 12000);

async function main() {
  const listRes = await fetch('http://127.0.0.1:9333/json/list');
  const targets = await listRes.json();
  const page = targets.find((t) => t.type === 'page');
  if (!page) throw new Error('no page target');

  const ws = new WebSocket(page.webSocketDebuggerUrl);
  let id = 0;
  const pending = new Map();
  const logs = [];
  const requests = new Map();

  function send(method, params = {}) {
    const msgId = ++id;
    ws.send(JSON.stringify({ id: msgId, method, params }));
    return new Promise((resolve) => pending.set(msgId, resolve));
  }

  ws.addEventListener('message', (event) => {
    const msg = JSON.parse(event.data);
    if (msg.id && pending.has(msg.id)) {
      pending.get(msg.id)(msg.result);
      pending.delete(msg.id);
      return;
    }
    if (msg.method === 'Runtime.consoleAPICalled') {
      const text = (msg.params.args || [])
        .map((a) => a.value ?? a.description ?? a.type)
        .join(' ');
      logs.push(`[console.${msg.params.type}] ${text}`);
    }
    if (msg.method === 'Log.entryAdded') {
      const e = msg.params.entry;
      logs.push(`[log.${e.level}] ${e.text} ${e.url ? '@ ' + e.url : ''}`);
    }
    if (msg.method === 'Runtime.exceptionThrown') {
      const d = msg.params.exceptionDetails;
      logs.push(`[exception] ${d.text} ${d.exception?.description ?? ''}`);
    }
    if (msg.method === 'Network.requestWillBeSent') {
      requests.set(msg.params.requestId, {
        url: msg.params.request.url,
        method: msg.params.request.method,
      });
    }
    if (msg.method === 'Network.responseReceived') {
      const r = requests.get(msg.params.requestId);
      if (r) {
        r.status = msg.params.response.status;
        r.origin = msg.params.response.headers['access-control-allow-origin'] ?? '';
      }
    }
    if (msg.method === 'Network.loadingFailed') {
      const r = requests.get(msg.params.requestId);
      if (r) {
        r.failed = msg.params.errorText;
        r.blocked = msg.params.corsErrorStatus
          ? JSON.stringify(msg.params.corsErrorStatus)
          : '';
      }
    }
  });

  await new Promise((resolve) => ws.addEventListener('open', resolve));

  await send('Runtime.enable');
  await send('Log.enable');
  await send('Network.enable');
  await send('Page.enable');
  await send('Page.navigate', { url: target });

  await new Promise((resolve) => setTimeout(resolve, waitMs));

  const apiCalls = [...requests.values()].filter((r) => /cubing|api/.test(r.url));

  console.log('=== API REQUESTS ===');
  for (const r of apiCalls) {
    const parts = [`${r.method} ${r.url}`];
    if (r.status) parts.push(`status=${r.status}`);
    if (r.origin) parts.push(`acao=${r.origin}`);
    if (r.failed) parts.push(`FAILED=${r.failed}`);
    if (r.blocked) parts.push(`CORS=${r.blocked}`);
    console.log(parts.join(' | '));
  }

  console.log('\n=== LOGS ===');
  for (const line of logs.slice(0, 60)) console.log(line);

  const evalRes = await send('Runtime.evaluate', {
    expression: `JSON.stringify({
      articles: document.querySelectorAll('article.events-item').length,
      alert: document.querySelector('.alert-danger')?.textContent?.trim().slice(0, 120) ?? null,
      loading: !!document.querySelector('.loading-block'),
      wrapper: !!document.querySelector('.news-wrapper')
    })`,
    returnByValue: true,
  });
  console.log('\n=== DOM ===');
  console.log(evalRes?.result?.value ?? 'n/a');

  const shot = await send('Page.captureScreenshot', { format: 'png' });
  if (shot?.data) {
    const fs = await import('node:fs');
    fs.writeFileSync(process.env.TEMP + '/cc-cdp.png', Buffer.from(shot.data, 'base64'));
    console.log('\nscreenshot written');
  }

  ws.close();
}

main().catch((e) => {
  console.error('ERR', e.message);
  process.exit(1);
});
