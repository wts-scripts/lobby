// Lobby · mises à jour des jeux (annonces officielles publiées sur Steam, sans clé)
//   GET /api/updates?apps=730,271590   → dernières mises à jour de ces jeux
//   GET /api/updates?search=rust       → trouver un jeu Steam à suivre
const { send, cached, http, params, decode, cut } = require("./_lib");

const header = id => `https://cdn.cloudflare.steamstatic.com/steam/apps/${id}/header.jpg`;
const PATCH = /\b(update|patch|hotfix|mise à jour|mise a jour|maj|correctif|release notes|changelog|v\d+(\.\d+)+|season|saison|chapter|chapitre)\b/i;

function kind(t) {
  if (/hotfix|correctif|fix\b/i.test(t)) return "hotfix";
  if (/season|saison|chapter|chapitre|act\b|acte\b/i.test(t)) return "saison";
  return "patch";
}

// les annonces Steam sont en BBCode : on garde le texte et la première image
function clean(s) {
  const raw = String(s || "");
  const img = (raw.match(/\[img\]([^[]+)\[\/img\]/i) || raw.match(/<img[^>]+src=["']([^"']+)/i) || [])[1] || "";
  const txt = decode(raw)
    .replace(/\[img\][\s\S]*?\[\/img\]/gi, " ")
    .replace(/\[\/?[a-z0-9*]+(=[^\]]*)?\]/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\{STEAM_CLAN_IMAGE\}\S*/g, " ")
    .replace(/https?:\/\/\S+/g, " ")
    .replace(/\s+/g, " ").trim();
  return { txt, img: img.replace("{STEAM_CLAN_IMAGE}", "https://clan.akamai.steamstatic.com/images").trim() };
}

async function forApp(appid) {
  return cached("news:" + appid, 900, async () => {
    const j = await http(`https://api.steampowered.com/ISteamNews/GetNewsForApp/v2/?appid=${appid}&count=15&maxlength=0&feeds=steam_community_announcements&format=json`);
    const items = (j.appnews && j.appnews.newsitems) || [];
    return items
      .filter(n => (n.tags || []).includes("patchnotes") || PATCH.test(n.title))
      .slice(0, 4)
      .map(n => {
        const c = clean(n.contents);
        return {
          appid, t: decode(n.title), url: n.url, d: n.date * 1000, type: kind(n.title),
          txt: cut(c.txt, 260), img: /^https:/.test(c.img) ? c.img : header(appid), cover: header(appid)
        };
      });
  });
}

module.exports = async (req, res) => {
  const q = params(req);
  const search = (q.get("search") || "").trim().slice(0, 60);
  if (search) {
    try {
      const j = await cached("ss:" + search.toLowerCase(), 3600, () =>
        http(`https://store.steampowered.com/api/storesearch/?term=${encodeURIComponent(search)}&l=french&cc=FR`));
      return send(res, 200, { apps: (j.items || []).filter(i => i.type === "app").slice(0, 10).map(i => ({ appid: i.id, name: i.name, img: header(i.id) })) }, 3600);
    } catch (e) { return send(res, 502, { error: "La recherche Steam ne répond pas, réessaie dans un instant." }); }
  }
  const apps = (q.get("apps") || "").split(",").map(s => parseInt(s, 10)).filter(n => n > 0).slice(0, 30);
  if (!apps.length) return send(res, 200, { updates: [] });
  const r = await Promise.allSettled(apps.map(forApp));
  const updates = r.flatMap(x => x.status === "fulfilled" ? x.value : []).sort((a, b) => b.d - a.d);
  const failed = apps.filter((_, i) => r[i].status === "rejected");
  send(res, 200, { updates, failed }, 900);
};
