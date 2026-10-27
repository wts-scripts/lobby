// Lobby · mises à jour des jeux (annonces officielles publiées sur Steam, sans clé)
//   GET /api/updates?apps=730,271590   → dernières mises à jour de ces jeux
//   GET /api/updates?search=rust       → trouver un jeu Steam à suivre
const { send, cached, http, params, decode, cut, cleanHTML, esc, safeUrl } = require("./_lib");

const header = id => `https://cdn.cloudflare.steamstatic.com/steam/apps/${id}/header.jpg`;
const PATCH = /\b(update|patch|hotfix|mise à jour|mise a jour|maj|correctif|release notes|changelog|v\d+(\.\d+)+|season|saison|chapter|chapitre)\b/i;

function kind(t) {
  if (/hotfix|correctif|fix\b/i.test(t)) return "hotfix";
  if (/season|saison|chapter|chapitre|act\b|acte\b/i.test(t)) return "saison";
  return "patch";
}

// Balises BBCode de Steam (avec ou sans attributs : [p align="justify"], [img src="…"], [previewyoutube=…]…)
const TAGS = "p|b|i|u|s|strike|h[1-6]|list|olist|\\*|url|img|quote|code|hr|spoiler|noparse|table|tr|td|th|previewyoutube|video|carousel|dynamiclink|expand|br|center|left|right|color|size|emoticon";
const ANY_TAG = new RegExp(`\\[\\/?(?:${TAGS})(?:[=\\s][^\\]]*)?\\]`, "gi");
// « \[ » et « \] » sont des crochets écrits exprès dans le texte : on les met de côté pendant le nettoyage
const hide = s => s.replace(/\\\[/g, "\u0001").replace(/\\\]/g, "\u0002");
const show = s => s.replace(/\u0001/g, "[").replace(/\u0002/g, "]");
const CLAN = "https://clan.akamai.steamstatic.com/images";
// titres de section écrits entre crochets par les studios : « [ MAP SCRIPTING ] »
const SECTION = /\[\s+([^\[\]<>]{2,48}?)\s+\]/g;
const imgOf = raw => (raw.match(/\[img(?:\s+src=["']?([^"'\]\s]+))?[^\]]*\]([^[]*)\[\/img\]/i) || []).slice(1).find(Boolean)
  || (raw.match(/<img[^>]+src=["']([^"']+)/i) || [])[1] || "";

// résumé : texte brut, sans aucune balise
function clean(s) {
  const raw = String(s || "").replace(/\{STEAM_CLAN_IMAGE\}/g, CLAN);
  const img = imgOf(raw).trim();
  const txt = show(hide(decode(raw))
    .replace(/\[img[^\]]*\][\s\S]*?\[\/img\]/gi, " ")
    .replace(/\[(previewyoutube|video)[^\]]*\][\s\S]*?\[\/\1\]/gi, " ")
    .replace(ANY_TAG, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/https?:\/\/\S+/g, " "))
    .replace(SECTION, "$1 ·")
    .replace(/\s+/g, " ").trim();
  return { txt, img };
}

// notes complètes pour le lecteur intégré : BBCode Steam → HTML simple et sûr
function bbToHtml(raw) {
  raw = String(raw || "").replace(/\{STEAM_CLAN_IMAGE\}/g, CLAN);
  if (/<(p|br|ul|li|h\d|img|div)\b/i.test(raw) && !/\[(p|b|list|h\d|img)\b/i.test(raw)) return cleanHTML(raw);
  let s = hide(esc(decode(raw)));
  const A = "(?:[=\\s][^\\]]*)?";   // attributs éventuels
  const R = [
    [/\[img\s+src=(?:&quot;|")?([^\]\s&"]+)(?:&quot;|")?[^\]]*\]\s*\[\/img\]/gi, (_, u) => { const x = safeUrl(u); return x ? `<img src="${x}" alt="" loading="lazy">` : ""; }],
    [/\[img(?:=[^\]]*)?\]\s*([^\[\s]+)\s*\[\/img\]/gi, (_, u) => { const x = safeUrl(u); return x ? `<img src="${x}" alt="" loading="lazy">` : ""; }],
    [/\[(previewyoutube|video)[^\]]*\][\s\S]*?\[\/\1\]/gi, ""],
    [/\[url=(?:&quot;)?([^\]]+?)(?:&quot;)?(?:\s[^\]]*)?\]([\s\S]*?)\[\/url\]/gi, (_, u, t) => { const x = safeUrl(u); return x ? `<a href="${x}">${t}</a>` : t; }],
    [new RegExp(`\\[h[1-2]${A}\\]`, "gi"), "<h3>"], [/\[\/h[1-2]\]/gi, "</h3>"], [new RegExp(`\\[h[3-6]${A}\\]`, "gi"), "<h4>"], [/\[\/h[3-6]\]/gi, "</h4>"],
    [/\[(\/?)(b|i|u)\]/gi, "<$1$2>"],
    [new RegExp(`\\[list${A}\\]`, "gi"), "<ul>"], [/\[\/list\]/gi, "</ul>"], [new RegExp(`\\[olist${A}\\]`, "gi"), "<ol>"], [/\[\/olist\]/gi, "</ol>"], [/\[\*\]/g, "<li>"], [/\[\/\*\]/g, "</li>"],
    [new RegExp(`\\[p${A}\\]`, "gi"), "<p>"], [/\[\/p\]/gi, "</p>"], [/\[hr\]\s*\[\/hr\]|\[hr\]/gi, "<hr>"],
    [new RegExp(`\\[quote${A}\\]`, "gi"), "<blockquote>"], [/\[\/quote\]/gi, "</blockquote>"],
    [ANY_TAG, ""]
  ];
  for (const [re, to] of R) s = s.replace(re, to);
  return show(s).replace(SECTION, "<h4>$1</h4>").replace(/\n{2,}/g, "<br><br>").replace(/\n/g, "<br>").replace(/<\/(p|h3|h4|ul|ol|li|blockquote)>(\s*<br>)+/g, "</$1>").replace(/(<br>\s*)+<h4>/g, "<h4>").replace(/(<br>\s*){3,}/g, "<br><br>").slice(0, 60000);
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
          txt: cut(c.txt, 260), html: bbToHtml(n.contents), author: n.author || "", img: /^https:/.test(c.img) ? c.img : header(appid), cover: header(appid)
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
