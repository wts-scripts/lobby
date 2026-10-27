// Lobby · outils serveur partagés
const UA = "Lobby/1.0 (+https://github.com/Wts-scripts/lobby)";

function send(res, code, obj, maxAge = 0) {
  res.statusCode = code;
  res.setHeader("content-type", "application/json; charset=utf-8");
  // le CDN de Vercel garde la réponse : la plupart des appels ne touchent même pas les API externes
  res.setHeader("cache-control", maxAge ? `public, s-maxage=${maxAge}, stale-while-revalidate=${maxAge * 4}` : "no-store");
  res.end(JSON.stringify(obj));
}

// petit cache en mémoire (vit tant que la fonction reste chaude)
const mem = new Map();
async function cached(key, ttlSec, fn) {
  const h = mem.get(key);
  if (h && h.exp > Date.now()) return h.v;
  const v = await fn();
  mem.set(key, { v, exp: Date.now() + ttlSec * 1000 });
  if (mem.size > 500) mem.delete(mem.keys().next().value);
  return v;
}

async function http(url, opts = {}, ms = 9000) {
  const c = new AbortController();
  const t = setTimeout(() => c.abort(), ms);
  try {
    const r = await fetch(url, { ...opts, signal: c.signal, headers: { "user-agent": UA, ...(opts.headers || {}) } });
    if (!r.ok) {
      const body = await r.text().catch(() => "");
      throw Object.assign(new Error(`${new URL(url).host} a répondu ${r.status}`), { status: r.status, body: body.slice(0, 300) });
    }
    return opts.raw ? await r.text() : await r.json();
  } catch (e) {
    if (e.name === "AbortError") throw new Error(`${new URL(url).host} ne répond pas`);
    throw e;
  } finally { clearTimeout(t); }
}

const params = req => new URL(req.url, "http://x").searchParams;

async function body(req) {
  if (req.body && typeof req.body === "object") return req.body;
  if (typeof req.body === "string") { try { return JSON.parse(req.body); } catch { return {}; } }
  let s = "";
  for await (const chunk of req) { s += chunk; if (s.length > 20000) break; }
  try { return JSON.parse(s || "{}"); } catch { return {}; }
}

const ENT = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };
const decode = s => String(s || "")
  .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
  .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n))
  .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
  .replace(/&([a-z]+);/gi, (m, n) => ENT[n.toLowerCase()] ?? m);
const strip = s => decode(s).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
const cut = (s, n) => s.length > n ? s.slice(0, n - 1).replace(/\s+\S*$/, "") + "…" : s;

module.exports = { send, cached, http, params, body, decode, strip, cut };
