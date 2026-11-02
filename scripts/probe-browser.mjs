const target = process.argv[2] || 'http://127.0.0.1:5173/cubingchina-oldstyle/#/';

async function main() {
  const listRes = await fetch('http://127.0.0.1:9333/json/list');
  const targets = await listRes.json();
  const page = targets.find((t) => t.type === 'page');
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  let id = 0;
  const pending = new Map();

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
    }
  });

  await new Promise((resolve) => ws.addEventListener('open', resolve));
  await send('Runtime.enable');
  await send('Page.enable');
  await send('Page.navigate', { url: target });
  await new Promise((r) => setTimeout(r, 6000));

  const expr = `(async () => {
    const out = {};
    try {
      const res = await fetch('/cubing-api/news?page=1', {headers:{Accept:'application/json'}});
      out.status = res.status;
      out.contentType = res.headers.get('content-type');
      const text = await res.text();
      out.bodyHead = text.slice(0, 120);
    } catch (e) { out.fetchError = String(e); }
    out.location = location.href;
    out.env = typeof import_meta_env !== 'undefined' ? 'x' : 'n/a';
    return JSON.stringify(out);
  })()`;

  const res = await send('Runtime.evaluate', {
    expression: expr,
    awaitPromise: true,
    returnByValue: true,
  });
  console.log('FETCH TEST:', res?.result?.value ?? JSON.stringify(res));

  const vueErr = await send('Runtime.evaluate', {
    expression: `document.body.innerText.slice(0, 400)`,
    returnByValue: true,
  });
  console.log('\nBODY TEXT:\n' + (vueErr?.result?.value ?? ''));

  ws.close();
}

main().catch((e) => {
  console.error('ERR', e.message);
  process.exit(1);
});
