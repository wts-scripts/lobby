// WTS Lobby · Live : les joueurs qui ont mis leur chaîne dans leur profil public, et qui est en direct sur Twitch
//   GET /api/live  → { live: [...], offline: [...], others: [...], twitch: true|false }
const { send, cached, redis, hasDB, hasTwitch, helix } = require("./_lib");
const { twitchLogin } = require("../platforms.js");

async function profiles() {
  const hs = await redis("ZREVRANGE", "prof:list", 0, 999);
  if (!hs.length) return [];
  const [raw, rcs] = await Promise.all([redis("MGET", ...hs.map(h => "prof:" + h)), redis("MGET", ...hs.map(h => "prof:rc:" + h))]);
  return raw.map((r, i) => r && (+rcs[i] || 0) < 5 ? JSON.parse(r) : null).filter(Boolean)
    .filter(p => p.links && (p.links.twitch || p.links.youtube || p.links.kick));
}

async function twitchStatus(logins) {
  const live = {}, users = {};
  for (let i = 0; i < logins.length; i += 100) {
    const part = logins.slice(i, i + 100), q = part.map(l => "user_login=" + encodeURIComponent(l)).join("&");
    const ql = part.map(l => "login=" + encodeURIComponent(l)).join("&");
    const [s, u] = await Promise.all([helix("streams?first=100&" + q), helix("users?" + ql)]);
    for (const x of s.data || []) live[x.user_login.toLowerCase()] = x;
    for (const x of u.data || []) users[x.login.toLowerCase()] = x;
  }
  return { live, users };
}

module.exports = async (req, res) => {
  if (!hasDB()) return send(res, 503, { error: "Le Live s'appuie sur les profils publics : ajoute Upstash Redis au projet Vercel (onglet Storage), puis redéploie.", setup: true });
  try {
    const data = await cached("live", 60, async () => {
      const ps = await profiles();
      const withTwitch = ps.map(p => ({ p, login: twitchLogin(p.links.twitch) })).filter(x => x.login);
      let st = { live: {}, users: {} }, twitchErr = null;
      if (hasTwitch() && withTwitch.length) { try { st = await twitchStatus(withTwitch.map(x => x.login)); } catch (e) { twitchErr = "Twitch ne répond pas pour le moment."; } }
      const base = p => ({ handle: p.handle, name: p.name, games: p.games, links: { twitch: p.links.twitch, youtube: p.links.youtube, kick: p.links.kick } });
      const live = [], offline = [];
      for (const { p, login } of withTwitch) {
        const s = st.live[login], u = st.users[login];
        const item = Object.assign(base(p), { login, avatar: u ? u.profile_image_url : null, desc: u ? String(u.description || "").slice(0, 200) : "" });
        if (s) live.push(Object.assign(item, { title: s.title, game: s.game_name, viewers: s.viewer_count, started: Date.parse(s.started_at), thumb: s.thumbnail_url.replace("{width}", "640").replace("{height}", "360") }));
        else offline.push(item);
      }
      live.sort((a, b) => b.viewers - a.viewers);
      const others = ps.filter(p => !twitchLogin(p.links.twitch)).map(base);
      return { live, offline, others, twitch: hasTwitch(), twitchErr, at: Date.now() };
    });
    send(res, 200, data, 60);
  } catch (e) { send(res, e.status || 500, { error: e.message }); }
};
