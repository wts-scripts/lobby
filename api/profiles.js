// WTS Lobby · profils publics des joueurs (liens Steam, Epic, Twitch…)
//   GET  /api/profiles                 → annuaire (?q=…)
//   GET  /api/profiles?h=pseudo        → un profil
//   POST /api/profiles { action: "save", profile, token? }   → crée (renvoie un jeton) ou modifie avec le jeton
//   POST /api/profiles { action: "delete", handle, token }   → l'auteur (jeton) ou l'admin (x-lobby-key)
//   POST /api/profiles { action: "report", handle, device }
// Stockage : prof:<pseudo> (JSON) · prof:list (trié par mise à jour) · prof:r:<pseudo> / prof:rc:<pseudo> (signalements)
const { send, params, body, redis, hasDB, sha, isAdmin, ipOf, crypto } = require("./_lib");
const { PLATFORMS, clean: cleanLink } = require("../platforms.js");

const HIDE_AT = 5, PER_HOUR = 3;
const txt = (v, max) => String(v ?? "").replace(/[\u0000-\u001f\u007f<>]/g, " ").replace(/\s+/g, " ").trim().slice(0, max);
const handleOk = h => /^[a-z0-9][a-z0-9_.-]{2,23}$/.test(h);
const RESERVED = new Set(["admin", "administrateur", "lobby", "wts", "wtslobby", "moderateur", "support", "staff"]);

function shape(p, admin, rc) {
  const out = { handle: p.handle, name: p.name, bio: p.bio, games: p.games, links: p.links, created: p.created, updated: p.updated };
  if (admin) out.reports = rc || 0;
  return out;
}
function validate(raw) {
  const handle = txt(raw.handle, 24).toLowerCase();
  if (!handleOk(handle)) return [null, "Pseudo : 3 à 24 caractères, lettres minuscules, chiffres, point, tiret ou _."];
  if (RESERVED.has(handle)) return [null, "Ce pseudo est réservé."];
  const links = {}, bad = [];
  for (const p of PLATFORMS) {
    const v = raw.links && raw.links[p.k];
    if (!v || !String(v).trim()) continue;
    const c = cleanLink(p.k, v);
    if (c) links[p.k] = c; else bad.push(p.n);
  }
  if (bad.length) return [null, "Lien non reconnu : " + bad.join(", ") + ". Colle l'adresse de ton profil ou ton pseudo."];
  if (!Object.keys(links).length) return [null, "Ajoute au moins un compte ou un lien."];
  const games = (Array.isArray(raw.games) ? raw.games : String(raw.games || "").split(",")).map(g => txt(g, 32)).filter(Boolean).slice(0, 5);
  return [{ handle, name: txt(raw.name, 32) || handle, bio: txt(raw.bio, 200), games, links }, null];
}

module.exports = async (req, res) => {
  if (!hasDB()) return send(res, 503, { error: "Les profils publics ont besoin de la base de données : ajoute Upstash Redis au projet Vercel (onglet Storage), puis redéploie.", setup: true });
  try {
    const admin = isAdmin(req);
    if (req.method === "GET") {
      const q = params(req), one = txt(q.get("h"), 24).toLowerCase();
      if (one) {
        const [r, rc] = await Promise.all([redis("GET", "prof:" + one), redis("GET", "prof:rc:" + one)]);
        if (!r || (+rc >= HIDE_AT && !admin)) return send(res, 404, { error: "Ce profil n'existe pas ou plus." });
        return send(res, 200, { profile: shape(JSON.parse(r), admin, +rc) });
      }
      const hs = await redis("ZREVRANGE", "prof:list", 0, 999);
      if (!hs.length) return send(res, 200, { profiles: [], admin });
      const [raw, rcs] = await Promise.all([redis("MGET", ...hs.map(h => "prof:" + h)), redis("MGET", ...hs.map(h => "prof:rc:" + h))]);
      const s = txt(q.get("q"), 40).toLowerCase();
      const profiles = [];
      raw.forEach((r, i) => {
        if (!r) return; const rc = +rcs[i] || 0;
        if (rc >= HIDE_AT && !admin) return;
        const p = JSON.parse(r);
        if (s && !(p.handle + " " + p.name + " " + p.games.join(" ")).toLowerCase().includes(s)) return;
        profiles.push(shape(p, admin, rc));
      });
      return send(res, 200, { profiles, admin });
    }
    if (req.method !== "POST") return send(res, 405, { error: "Méthode non prise en charge." });
    const b = await body(req);

    if (b.action === "save") {
      const [p, err] = validate(b.profile || {});
      if (err) return send(res, 400, { error: err });
      const prev = await redis("GET", "prof:" + p.handle);
      let token = null;
      if (prev) {
        const old = JSON.parse(prev);
        if (!(b.token && old.tok === sha(b.token))) return send(res, 409, { error: "Ce pseudo est déjà pris. Choisis-en un autre." });
        Object.assign(p, { created: old.created, tok: old.tok });
      } else {
        const rl = "prof:rl:" + sha(ipOf(req)).slice(0, 20);
        const n = await redis("INCR", rl); if (n === 1) await redis("EXPIRE", rl, 3600);
        if (n > PER_HOUR) return send(res, 429, { error: "Trop de profils créés depuis cette connexion. Réessaie plus tard." });
        token = crypto.randomBytes(18).toString("base64url");
        Object.assign(p, { created: Date.now(), tok: sha(token) });
        // l'ancien pseudo de la même personne : on le libère si elle en change
        if (b.oldHandle && b.token) {
          const oh = txt(b.oldHandle, 24).toLowerCase(), o = await redis("GET", "prof:" + oh);
          if (o && JSON.parse(o).tok === sha(b.token)) { await redis("DEL", "prof:" + oh); await redis("ZREM", "prof:list", oh); p.tok = sha(b.token); token = b.token; }
        }
      }
      p.updated = Date.now();
      await redis("SET", "prof:" + p.handle, JSON.stringify(p));
      await redis("ZADD", "prof:list", p.updated, p.handle);
      return send(res, 200, { profile: shape(p), token });
    }
    const h = txt(b.handle, 24).toLowerCase();
    const r = h && await redis("GET", "prof:" + h);
    if (!r) return send(res, 404, { error: "Ce profil n'existe pas ou plus." });
    if (b.action === "report") {
      const dev = sha("d:" + txt(b.device, 64)).slice(0, 24);
      if (await redis("SADD", "prof:r:" + h, dev)) await redis("INCR", "prof:rc:" + h);
      return send(res, 200, { ok: true });
    }
    if (b.action === "delete") {
      if (!admin && !(b.token && JSON.parse(r).tok === sha(b.token))) return send(res, 403, { error: "Seul le propriétaire ou l'admin peut supprimer ce profil." });
      await redis("DEL", "prof:" + h, "prof:r:" + h, "prof:rc:" + h); await redis("ZREM", "prof:list", h);
      return send(res, 200, { ok: true });
    }
    return send(res, 400, { error: "Action inconnue." });
  } catch (e) { return send(res, e.status || 500, { error: e.message }); }
};
