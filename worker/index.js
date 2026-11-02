/**
 * Cloudflare Worker: CORS proxy for api.cubing.com
 *
 * api.cubing.com does not send Access-Control-Allow-Origin, so a static
 * GitHub Pages site cannot call it directly. This Worker forwards requests
 * and adds the CORS headers the browser needs.
 *
 * Deploy:
 *   wrangler deploy
 * Then set VITE_CUBING_API_BASE to the Worker URL when building the site.
 */

const UPSTREAM = 'https://api.cubing.com';

const ALLOWED_METHODS = 'GET,HEAD,OPTIONS';
const CACHE_TTL = 60;

export default {
  async fetch(request) {
    const origin = request.headers.get('Origin') || '*';

    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: corsHeaders(origin),
      });
    }

    if (request.method !== 'GET' && request.method !== 'HEAD') {
      return json({ message: 'Method not allowed' }, 405, origin);
    }

    const url = new URL(request.url);
    const target = UPSTREAM + url.pathname + url.search;

    const cache = caches.default;
    const cacheKey = new Request(target, { method: 'GET' });
    const cached = await cache.match(cacheKey);
    if (cached) {
      const response = new Response(cached.body, cached);
      applyCors(response.headers, origin);
      return response;
    }

    let upstream;
    try {
      upstream = await fetch(target, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          'User-Agent': 'cubingchina-oldstyle/0.1 (+https://github.com/Alex-Beng/cubingchina-oldstyle)',
        },
        cf: { cacheTtl: CACHE_TTL, cacheEverything: true },
      });
    } catch (err) {
      return json({ message: 'Upstream fetch failed', detail: String(err) }, 502, origin);
    }

    const body = await upstream.arrayBuffer();
    const response = new Response(body, {
      status: upstream.status,
      headers: {
        'Content-Type': upstream.headers.get('Content-Type') || 'application/json; charset=utf-8',
        'Cache-Control': `public, max-age=${CACHE_TTL}`,
      },
    });
    applyCors(response.headers, origin);

    if (upstream.ok) {
      const toCache = new Response(response.clone().body, response);
      await cache.put(cacheKey, toCache);
    }

    return response;
  },
};

function corsHeaders(origin) {
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': ALLOWED_METHODS,
    'Access-Control-Allow-Headers': 'Content-Type, Accept',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
}

function applyCors(headers, origin) {
  for (const [key, value] of Object.entries(corsHeaders(origin))) {
    headers.set(key, value);
  }
}

function json(payload, status, origin) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      ...corsHeaders(origin),
    },
  });
}
