// Lobby · actualités jeux vidéo (flux RSS des sites, lus côté serveur)
//   GET /api/news            → dernières actus de tous les flux
//   GET /api/news?q=fable    → actus qui parlent d'un jeu
//   GET /api/news?cat=subs   → abonnements : Game Pass, PlayStation Plus… (blogs officiels Xbox et PlayStation)
// Flux modifiables sur Vercel : NEWS_FEEDS = "Nom|https://…/rss, Nom 2|https://…"
const { send, cached, http, params, decode, strip, cut, cleanHTML } = require("./_lib");

const DEFAULT_FEEDS = [
  "Jeuxvideo.com|https://www.jeuxvideo.com/rss/rss.xml",
  "JeuxActu|https://www.jeuxactu.com/rss/news.rss",
  "Gamekult|https://www.gamekult.com/feed.xml",
  "Millenium|https://www.millenium.org/rss",
  "Steam|https://store.steampowered.com/feeds/news.xml"
].join(",");

const SUBS_FEEDS = [
  "Xbox Wire|https://news.xbox.com/fr-fr/feed/",
  "PlayStation Blog|https://blog.fr.playstation.com/feed/"
].join(",");
// services d'abonnement reconnus dans les titres et le début des articles
const SERVICES = [
  ["gamepass", "Game Pass", /game ?pass/i],
  ["psplus", "PlayStation Plus", /playstation ?plus|ps ?plus/i],
  ["ubisoft", "Ubisoft+", /ubisoft ?\+/i],
  ["eaplay", "EA Play", /\bea play\b/i],
  ["nso", "Nintendo Switch Online", /nintendo switch online/i]
];

function feeds(cat) {
  return (cat === "subs" ? (process.env.SUBS_FEEDS || SUBS_FEEDS) : (process.env.NEWS_FEEDS || DEFAULT_FEEDS)).split(",").map(s => s.trim()).filter(Boolean).map(s => {
    const [name, url] = s.includes("|") ? s.split("|") : [new URL(s).host.replace(/^www\./, ""), s];
    return { name: name.trim(), url: url.trim() };
  });
}

const tag = (xml, name) => { const m = xml.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`, "i")); return m ? m[1] : ""; };
const attr = (xml, name, a) => { const m = xml.match(new RegExp(`<${name}[^>]*\\b${a}=["']([^"']+)["']`, "i")); return m ? decode(m[1]) : ""; };

function image(item, desc) {
  const firstImg = html => ((decode(html).match(/<img[^>]+src=["']([^"']+)["']/i) || [])[1] || "");
  return attr(item, "media:content", "url") || attr(item, "media:thumbnail", "url")
    || (/<enclosure[^>]*type=["']image/i.test(item) ? attr(item, "enclosure", "url") : "")
    || firstImg(desc) || firstImg(tag(item, "content:encoded"));
}

function parse(xml, source) {
  const items = xml.match(/<item[\s>][\s\S]*?<\/item>/gi) || xml.match(/<entry[\s>][\s\S]*?<\/entry>/gi) || [];
  return items.slice(0, 30).map(it => {
    const desc = tag(it, "description") || tag(it, "summary") || tag(it, "content:encoded") || tag(it, "content");
    const link = strip(tag(it, "link")) || attr(it, "link", "href");
    const date = Date.parse(strip(tag(it, "pubDate") || tag(it, "published") || tag(it, "updated") || tag(it, "dc:date")));
    const img = image(it, desc);
    return {
      t: strip(tag(it, "title")),
      txt: cut(strip(desc), 180),
      // ce que le site publie lui-même dans son flux (souvent un extrait), pour le lecteur intégré
      html: cleanHTML(tag(it, "content:encoded") || desc, 30000),
      url: /^https?:/.test(link) ? link : null,
      img: /^https?:/.test(img) ? img.replace(/^http:/, "https:") : null,
      d: isNaN(date) ? null : date,
      src: source
    };
  }).filter(n => n.t && n.url);
}

module.exports = async (req, res) => {
  const q = (params(req).get("q") || "").toLowerCase().trim();
  const cat = params(req).get("cat") === "subs" ? "subs" : "";
  const list = feeds(cat);
  const results = await Promise.allSettled(list.map(f =>
    cached("feed:" + f.url, 600, async () => parse(await http(f.url, { raw: true, headers: { accept: "application/rss+xml, application/xml, text/xml" } }), f.name))));
  let news = [], failed = [];
  results.forEach((r, i) => r.status === "fulfilled" ? news.push(...r.value) : failed.push(list[i].name));
  if (q) {
    const words = q.split(/[^a-z0-9àâçéèêëîïôûùüÿ]+/).filter(w => w.length > 2);
    news = news.filter(n => { const s = (n.t + " " + n.txt).toLowerCase(); return words.length && words.every(w => s.includes(w)); });
  }
  if (cat === "subs") {
    news = news.map(n => { const s = n.t + " " + n.txt.slice(0, 300); const sv = SERVICES.filter(([, , re]) => re.test(s)).map(([k, l]) => ({ k, l })); return sv.length ? Object.assign(n, { services: sv }) : null; }).filter(Boolean);
  }
  const seen = new Set();
  news = news.filter(n => !seen.has(n.url) && seen.add(n.url)).sort((a, b) => (b.d || 0) - (a.d || 0)).slice(0, 60);
  send(res, 200, { news, sources: list.map(f => f.name), failed }, 600);
};
