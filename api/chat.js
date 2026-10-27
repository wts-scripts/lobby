// WTS Lobby · chat Lobby d'un live (un salon par chaîne)
//   GET  /api/chat?c=chaine                       → 60 derniers messages (gardé 2 s par le CDN : 1 lecture de la base toutes les 2 s, quel que soit le nombre de spectateurs)
//   POST /api/chat { action: "send", c, name, handle?, text, device }
//   POST /api/chat { action: "delete", c, id }     → admin (x-lobby-key)
// Stockage : chat:<chaine> (liste, 200 messages max, effacée après 2 jours sans message) · chat:del:<chaine> (messages retirés)
const { send, params, body, redis, hasDB, sha, isAdmin, crypto } = require("./_lib");

const chan = c => (/^[a-z0-9_]{3,25}$/.test(String(c || "").toLowerCase()) ? String(c).toLowerCase() : null);
const clean = (v, max) => String(v ?? "").replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, max);

module.exports = async (req, res) => {
  if (!hasDB()) return send(res, 503, { error: "Le chat Lobby a besoin de la base de données Upstash.", setup: true });
  try {
    if (req.method === "GET") {
      const c = chan(params(req).get("c")); if (!c) return send(res, 400, { error: "Chaîne inconnue." });
      const [raw, del] = await Promise.all([redis("LRANGE", "chat:" + c, 0, 59), redis("SMEMBERS", "chat:del:" + c)]);
      const gone = new Set(del || []);
      const msgs = (raw || []).map(r => { try { return JSON.parse(r); } catch { return null; } }).filter(m => m && !gone.has(m.id)).reverse();
      return send(res, 200, { msgs, admin: isAdmin(req) }, isAdmin(req) ? 0 : 2);
    }
    if (req.method !== "POST") return send(res, 405, { error: "Méthode non prise en charge." });
    const b = await body(req);
    const c = chan(b.c); if (!c) return send(res, 400, { error: "Chaîne inconnue." });

    if (b.action === "send") {
      const text = clean(b.text, 300), name = clean(b.name, 24);
      if (!text) return send(res, 400, { error: "Message vide." });
      if (name.length < 2) return send(res, 400, { error: "Choisis un pseudo pour discuter." });
      const dev = sha("d:" + clean(b.device, 64)).slice(0, 20);
      // anti-flood : 1 message par seconde et demie, 15 par minute
      if (!(await redis("SET", "chat:rl:" + dev, 1, "PX", 1500, "NX"))) return send(res, 429, { error: "Doucement, attends une seconde." });
      const n = await redis("INCR", "chat:rm:" + dev); if (n === 1) await redis("EXPIRE", "chat:rm:" + dev, 60);
      if (n > 15) return send(res, 429, { error: "Trop de messages d'un coup. Attends un peu." });
      const msg = { id: crypto.randomBytes(5).toString("base64url"), n: name, h: clean(b.handle, 24).toLowerCase() || null, t: text, ts: Date.now() };
      await redis("LPUSH", "chat:" + c, JSON.stringify(msg));
      await redis("LTRIM", "chat:" + c, 0, 199);
      await redis("EXPIRE", "chat:" + c, 172800);
      return send(res, 200, { msg });
    }
    if (b.action === "delete") {
      if (!isAdmin(req)) return send(res, 403, { error: "Réservé à l'admin." });
      await redis("SADD", "chat:del:" + c, clean(b.id, 16)); await redis("EXPIRE", "chat:del:" + c, 172800);
      return send(res, 200, { ok: true });
    }
    return send(res, 400, { error: "Action inconnue." });
  } catch (e) { return send(res, e.status || 500, { error: e.message }); }
};
