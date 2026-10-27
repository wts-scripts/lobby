// WTS Lobby · écrire dans le vrai chat Twitch d'un streamer, avec le compte Twitch de la personne
//   POST /api/twitchchat { action: "whoami", token }                 → { login }
//   POST /api/twitchchat { action: "send", token, channel, message } → { ok }
// Le jeton Twitch de la personne reste sur son appareil : le serveur le vérifie et le transmet à Twitch, sans le garder.
const { send, body, http, cached, helix, hasTwitch } = require("./_lib");

async function validate(token) {
  const v = await http("https://id.twitch.tv/oauth2/validate", { headers: { Authorization: "OAuth " + token } });
  if (v.client_id !== process.env.TWITCH_CLIENT_ID) throw Object.assign(new Error("Connexion Twitch invalide."), { status: 401 });
  return v;
}

module.exports = async (req, res) => {
  if (req.method !== "POST") return send(res, 405, { error: "Méthode non prise en charge." });
  if (!hasTwitch()) return send(res, 503, { error: "Twitch n'est pas encore activé sur le serveur." });
  const b = await body(req);
  const token = String(b.token || "").replace(/[^a-z0-9]/gi, "").slice(0, 64);
  if (!token) return send(res, 401, { error: "Connecte-toi avec Twitch pour écrire dans son chat." });
  try {
    const me = await validate(token);
    if (b.action === "whoami") return send(res, 200, { login: me.login, expires: Date.now() + (me.expires_in || 0) * 1000 });
    if (b.action !== "send") return send(res, 400, { error: "Action inconnue." });
    if (!(me.scopes || []).includes("user:write:chat")) return send(res, 403, { error: "Autorisation Twitch incomplète : reconnecte-toi." });
    const channel = String(b.channel || "").toLowerCase();
    if (!/^[a-z0-9_]{3,25}$/.test(channel)) return send(res, 400, { error: "Chaîne inconnue." });
    const message = String(b.message || "").replace(/[\u0000-\u001f]/g, " ").trim().slice(0, 500);
    if (!message) return send(res, 400, { error: "Message vide." });
    const bid = await cached("tw-id:" + channel, 3600, async () => { const u = await helix("users?login=" + channel); if (!u.data || !u.data[0]) throw new Error("Chaîne Twitch introuvable."); return u.data[0].id; });
    const r = await http("https://api.twitch.tv/helix/chat/messages", {
      method: "POST",
      headers: { Authorization: "Bearer " + token, "Client-Id": process.env.TWITCH_CLIENT_ID, "content-type": "application/json" },
      body: JSON.stringify({ broadcaster_id: bid, sender_id: me.user_id, message })
    });
    const d = r.data && r.data[0];
    if (d && d.is_sent === false) return send(res, 422, { error: "Twitch a refusé le message" + (d.drop_reason && d.drop_reason.message ? " : " + d.drop_reason.message : ".") });
    return send(res, 200, { ok: true });
  } catch (e) {
    if (e.status === 401) return send(res, 401, { error: "Ta connexion Twitch a expiré : reconnecte-toi.", relogin: true });
    if (e.status === 403) return send(res, 403, { error: "Twitch refuse : tu es peut-être banni ou en mode lent sur cette chaîne." });
    return send(res, 502, { error: e.message || "Twitch ne répond pas." });
  }
};
