// Lobby · Meta : classes d'armes publiées par les joueurs
//   GET  /api/meta                         → publications (filtre ?game=…&q=…)
//   POST /api/meta { action: "create", post }            → publier (renvoie un jeton pour pouvoir supprimer)
//   POST /api/meta { action: "vote" | "unvote", id, device }
//   POST /api/meta { action: "report", id, device }
//   POST /api/meta { action: "delete", id, token }       → l'auteur (jeton) ou l'admin (en-tête x-lobby-key)
// Stockage : meta:post:<id> (JSON) · meta:ids (trié par date) · meta:votes (compteurs) · meta:v:<id> / meta:r:<id> (qui a voté / signalé)
const { send, params, body, redis, hasDB, sha, isAdmin, ipOf, crypto } = require("./_lib");

const HIDE_AT = 5;        // signalements avant masquage automatique
const PER_HOUR = 6;       // publications max par heure et par connexion
const clean = (v, max) => String(v ?? "").replace(/[\u0000-\u001f\u007f<>]/g, " ").replace(/\s+/g, " ").trim().slice(0, max);
const cleanML = (v, max) => String(v ?? "").replace(/[\u0000-\u0009\u000b-\u001f\u007f<>]/g, " ").replace(/\n{3,}/g, "\n\n").trim().slice(0, max);

function validate(p) {
  const post = {
    game: clean(p.game, 40), mode: clean(p.mode, 40), weapon: clean(p.weapon, 40), cat: clean(p.cat, 24),
    slots: (Array.isArray(p.slots) ? p.slots : []).slice(0, 10).map(s => [clean(s && s[0], 24), clean(s && s[1], 48)]).filter(s => s[1]),
    code: clean(p.code, 60), notes: cleanML(p.notes, 600), author: clean(p.author, 24)
  };
  if (post.game.length < 2) return [null, "Choisis le jeu."];
  if (post.weapon.length < 2) return [null, "Indique le nom de l'arme."];
  if (!post.slots.length && !post.code && !post.notes) return [null, "Ajoute au moins un accessoire, un code de partage ou une note."];
  if (post.author.length < 2) return [null, "Choisis un pseudo (2 caractères minimum)."];
  return [post, null];
}

async function list(req) {
  const q = params(req), admin = isAdmin(req);
  const ids = await redis("ZREVRANGE", "meta:ids", 0, 499);
  if (!ids.length) return [];
  const [raw, votes, reps] = await Promise.all([
    redis("MGET", ...ids.map(id => "meta:post:" + id)),
    redis("HMGET", "meta:votes", ...ids),
    redis("MGET", ...ids.map(id => "meta:rc:" + id))
  ]);
  const game = (q.get("game") || "").toLowerCase(), s = (q.get("q") || "").toLowerCase().trim();
  const out = [];
  raw.forEach((r, i) => {
    if (!r) return;
    let p; try { p = JSON.parse(r); } catch { return; }
    const rc = +reps[i] || 0;
    if (rc >= HIDE_AT && !admin) return;
    if (game && p.game.toLowerCase() !== game) return;
    if (s && !(p.weapon + " " + p.mode + " " + p.cat + " " + p.author + " " + p.game).toLowerCase().includes(s)) return;
    delete p.tok;
    p.votes = +votes[i] || 0;
    if (admin) p.reports = rc;
    out.push(p);
  });
  return out;
}

module.exports = async (req, res) => {
  if (!hasDB()) return send(res, 503, { error: "La Meta a besoin de la base de données : ajoute Upstash Redis au projet Vercel (onglet Storage), puis redéploie.", setup: true });
  try {
    if (req.method === "GET") {
      const posts = await list(req);
      const games = [...new Set(posts.map(p => p.game))];
      return send(res, 200, { posts, games, admin: isAdmin(req) });
    }
    if (req.method !== "POST") return send(res, 405, { error: "Méthode non prise en charge." });
    const b = await body(req);
    const id = clean(b.id, 24);
    const device = sha("d:" + clean(b.device, 64)).slice(0, 24);

    if (b.action === "create") {
      const [post, err] = validate(b.post || {});
      if (err) return send(res, 400, { error: err });
      const rl = "meta:rl:" + sha(ipOf(req)).slice(0, 20);
      const n = await redis("INCR", rl); if (n === 1) await redis("EXPIRE", rl, 3600);
      if (n > PER_HOUR) return send(res, 429, { error: "Tu as déjà beaucoup publié cette heure-ci. Réessaie un peu plus tard." });
      const newId = crypto.randomBytes(6).toString("base64url");
      const token = crypto.randomBytes(18).toString("base64url");
      Object.assign(post, { id: newId, created: Date.now(), tok: sha(token) });
      await redis("SET", "meta:post:" + newId, JSON.stringify(post));
      await redis("ZADD", "meta:ids", post.created, newId);
      delete post.tok;
      return send(res, 200, { post: Object.assign(post, { votes: 0 }), token });
    }
    if (!id) return send(res, 400, { error: "Publication introuvable." });
    if (!(await redis("EXISTS", "meta:post:" + id))) return send(res, 404, { error: "Cette publication n'existe plus." });

    if (b.action === "vote" || b.action === "unvote") {
      const changed = b.action === "vote" ? await redis("SADD", "meta:v:" + id, device) : await redis("SREM", "meta:v:" + id, device);
      const votes = changed ? await redis("HINCRBY", "meta:votes", id, b.action === "vote" ? 1 : -1) : +(await redis("HGET", "meta:votes", id) || 0);
      return send(res, 200, { id, votes: Math.max(0, votes) });
    }
    if (b.action === "report") {
      if (await redis("SADD", "meta:r:" + id, device)) await redis("INCR", "meta:rc:" + id);
      return send(res, 200, { ok: true });
    }
    if (b.action === "delete") {
      const p = JSON.parse(await redis("GET", "meta:post:" + id));
      if (!isAdmin(req) && !(b.token && p.tok === sha(b.token))) return send(res, 403, { error: "Seul l'auteur ou l'admin peut supprimer cette publication." });
      await Promise.all([redis("DEL", "meta:post:" + id, "meta:v:" + id, "meta:r:" + id, "meta:rc:" + id), redis("ZREM", "meta:ids", id), redis("HDEL", "meta:votes", id)]);
      return send(res, 200, { ok: true });
    }
    return send(res, 400, { error: "Action inconnue." });
  } catch (e) {
    return send(res, e.status || 500, { error: e.message });
  }
};
