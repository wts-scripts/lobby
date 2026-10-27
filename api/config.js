// WTS Lobby · réglages du site choisis par l'admin (menu par défaut pour tout le monde)
//   GET  /api/config            → { menu }
//   POST /api/config { menu }   → admin seulement (en-tête x-lobby-key)
const { send, body, redis, hasDB, isAdmin } = require("./_lib");
const IDS = new Set(["sorties", "maj", "actus", "live", "meta", "pc", "amis", "comptes", "reglages"]);
const clean = s => String(s || "").replace(/[<>\u0000-\u001f]/g, "").trim().slice(0, 24);

module.exports = async (req, res) => {
  const pub = { twitchClientId: process.env.TWITCH_CLIENT_ID || null };   // identifiant public (pas le secret), pour « Se connecter avec Twitch »
  if (!hasDB()) return send(res, req.method === "GET" ? 200 : 503, req.method === "GET" ? Object.assign({ menu: null }, pub) : { error: "Ajoute d'abord la base Upstash au projet Vercel." });
  try {
    if (req.method === "GET") {
      const m = await redis("GET", "cfg:menu");
      return send(res, 200, Object.assign({ menu: m ? JSON.parse(m) : null }, pub), 60);
    }
    if (req.method !== "POST") return send(res, 405, { error: "Méthode non prise en charge." });
    if (!isAdmin(req)) return send(res, 403, { error: "Code admin manquant ou incorrect." });
    const b = await body(req);
    const seen = new Set();
    const menu = (Array.isArray(b.menu) ? b.menu : []).slice(0, 40).map(it => {
      if (it && it.t === "sep") return { t: "sep", label: clean(it.label) };
      if (it && IDS.has(it.id) && !seen.has(it.id)) { seen.add(it.id); return { t: "tab", id: it.id, label: clean(it.label), hidden: it.id !== "reglages" && !!it.hidden }; }
      return null;
    }).filter(Boolean);
    if (!menu.some(it => it.t === "tab" && !it.hidden)) return send(res, 400, { error: "Il faut au moins une catégorie visible." });
    await redis("SET", "cfg:menu", JSON.stringify(menu));
    return send(res, 200, { menu });
  } catch (e) { return send(res, e.status || 500, { error: e.message }); }
};
