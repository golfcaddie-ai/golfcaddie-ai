// notion-proxy-worker.js - free Cloudflare Worker that lets GolfCaddie AI reach the Notion API.
// Browsers block direct calls to api.notion.com (no CORS headers), so the app sends each
// request to this worker and the worker forwards it. Your Notion token passes through the
// worker, so run it on your own free Cloudflare account where only you control it.
//
// Setup (about 5 minutes):
//   1. Go to https://dash.cloudflare.com and sign up (free).
//   2. Workers & Pages -> Create Worker -> name it e.g. "notion-proxy" -> Deploy.
//   3. Open the worker -> Edit code -> delete the example, paste this whole file -> Deploy.
//   4. Copy the worker URL (https://notion-proxy.<you>.workers.dev) and paste it into the
//      proxy field in the app's Notion setup, ending in /?
//
// The app then calls <worker-url>/?<url-encoded full api.notion.com URL>.

export default {
  async fetch(request) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders() });
    }
    const url = new URL(request.url);
    const target = (url.search || '').replace(/^\?/, '');
    let targetUrl;
    try { targetUrl = new URL(decodeURIComponent(target)); }
    catch (e) { return json({ error: 'pass the full api.notion.com URL after the ?' }, 400); }
    if (targetUrl.host !== 'api.notion.com') {
      return json({ error: 'only api.notion.com requests are allowed' }, 403);
    }
    const headers = new Headers();
    ['authorization', 'content-type', 'notion-version'].forEach(function (h) {
      const v = request.headers.get(h);
      if (v) headers.set(h, v);
    });
    const resp = await fetch(targetUrl.toString(), {
      method: request.method,
      headers: headers,
      body: ['GET', 'HEAD'].includes(request.method) ? undefined : await request.text(),
    });
    const out = new Response(resp.body, resp);
    const ch = corsHeaders();
    Object.keys(ch).forEach(function (k) { out.headers.set(k, ch[k]); });
    return out;
  },
};

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type, Notion-Version',
  };
}

function json(obj, status) {
  return new Response(JSON.stringify(obj), {
    status: status,
    headers: Object.assign({ 'Content-Type': 'application/json' }, corsHeaders()),
  });
}
