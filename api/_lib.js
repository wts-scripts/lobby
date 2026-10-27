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

/* ---- texte riche sûr pour le lecteur intégré ----
   Tout est échappé, puis seules quelques balises simples sont reconstruites, sans aucun attribut
   sauf src / href en https. Rien d'autre (script, style, iframe, on…=) ne peut passer. */
const esc = s => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const safeUrl = u => { u = decode(u).trim().replace(/^\/\//, "https://").replace(/^http:/, "https:"); return /^https:\/\/[^\s"'<>]+$/.test(u) ? u : ""; };
const KEEP = { p: 1, br: 1, b: 1, strong: 1, i: 1, em: 1, u: 1, ul: 1, ol: 1, li: 1, h1: "h3", h2: "h3", h3: "h3", h4: "h4", h5: "h4", h6: "h4", blockquote: 1, hr: 1, img: 1, a: 1, figure: 1, figcaption: 1, span: 0, div: "p" };
function cleanHTML(html, max = 40000) {
  let s = String(html || "").replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/<(script|style|iframe|object|embed|noscript|svg|form|button|select|textarea)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ");
  // un contenu tout échappé (&lt;p&gt;) est d'abord décodé une fois
  if (!/<[a-z]/i.test(s) && /&lt;[a-z]/i.test(s)) s = decode(s);
  const out = [];
  for (const tok of s.split(/(<[^>]*>)/)) {
    if (!tok) continue;
    if (tok[0] !== "<") { out.push(esc(decode(tok))); continue; }
    const m = tok.match(/^<\s*(\/?)\s*([a-z0-9]+)([^>]*)>$/i); if (!m) continue;
    const close = m[1], name = m[2].toLowerCase(), rule = KEEP[name];
    if (!rule) continue;
    const tag = rule === 1 ? name : rule;
    if (close) { if (!["br", "hr", "img"].includes(tag)) out.push(`</${tag}>`); continue; }
    if (tag === "img") { const src = safeUrl((m[3].match(/\bsrc\s*=\s*["']([^"']+)/i) || [])[1] || ""); if (src) out.push(`<img src="${esc(src)}" alt="" loading="lazy">`); continue; }
    if (tag === "a") { const href = safeUrl((m[3].match(/\bhref\s*=\s*["']([^"']+)/i) || [])[1] || ""); out.push(href ? `<a href="${esc(href)}">` : "<a>"); continue; }
    out.push(`<${tag}>`);
  }
  let r = out.join("").replace(/(<br>\s*){3,}/g, "<br><br>").replace(/<p>\s*<\/p>/g, "").trim();
  if (r.length > max) r = r.slice(0, max).replace(/<[^>]*$/, "") + "…";
  return r;
}

/* ---- base de données (Upstash Redis via REST, comme Cura) ---- */
const R_URL = () => process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const R_TOK = () => process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
const hasDB = () => !!(R_URL() && R_TOK());
async function redis(...cmd) {
  if (!hasDB()) throw Object.assign(new Error("Base de données non connectée : ajoute Upstash Redis au projet Vercel (onglet Storage)."), { status: 503 });
  const r = await fetch(R_URL(), { method: "POST", headers: { Authorization: "Bearer " + R_TOK(), "content-type": "application/json" }, body: JSON.stringify(cmd.map(String)) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || j.error) throw new Error("Base de données : " + (j.error || r.status));
  return j.result;
}
const crypto = require("crypto");
const sha = s => crypto.createHash("sha256").update(String(s)).digest("hex");
const sameStr = (a, b) => { const x = Buffer.from(String(a)), y = Buffer.from(String(b)); return x.length === y.length && crypto.timingSafeEqual(x, y); };
const isAdmin = req => !!process.env.LOBBY_KEY && sameStr(req.headers["x-lobby-key"] || "", process.env.LOBBY_KEY);
const ipOf = req => String(req.headers["x-forwarded-for"] || req.socket?.remoteAddress || "").split(",")[0].trim();

module.exports = { send, cached, http, params, body, decode, strip, cut, cleanHTML, esc, safeUrl, redis, hasDB, sha, isAdmin, ipOf, crypto };
