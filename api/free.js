// WTS Lobby · jeux gratuits : offres Epic Games Store + giveaways recensés par GamerPower (Steam, GOG, consoles…)
//   GET /api/free → { items: [...], failed: [...] }
// GamerPower demande un lien vers gamerpower.com (affiché dans l'onglet).
const { send, cached, http, strip, cut } = require("./_lib");

const EPIC = "https://store-site-backend-static-ipv4.ak.epicgames.com/freeGamesPromotions?locale=fr&country=FR&allowCountries=FR";
const GP = "https://www.gamerpower.com/api/giveaways";
const https = u => /^https?:\/\//.test(String(u || "")) ? String(u).replace(/^http:/, "https:") : null;

// store / plateforme lisible à partir du texte GamerPower (« PC, Steam », « PS5 »…)
function storeOf(platforms) {
  const p = String(platforms || "").toLowerCase();
  if (p.includes("epic")) return "Epic Games";
  if (p.includes("steam")) return "Steam";
  if (p.includes("gog")) return "GOG";
  if (p.includes("ubisoft")) return "Ubisoft";
  if (p.includes("battle")) return "Battle.net";
  if (p.includes("itch")) return "itch.io";
  if (p.includes("playstation") || p.includes("ps5") || p.includes("ps4")) return "PlayStation";
  if (p.includes("xbox")) return "Xbox";
  if (p.includes("switch") || p.includes("nintendo")) return "Nintendo";
  if (p.includes("android")) return "Android";
  if (p.includes("ios")) return "iOS";
  if (p.includes("drm")) return "Sans DRM";
  return "PC";
}

async function epic() {
  const j = await http(EPIC);
  const els = (((j.data || {}).Catalog || {}).searchStore || {}).elements || [];
  const now = Date.now(), out = [];
  for (const e of els) {
    const pick = types => ((e.keyImages || []).find(k => types.includes(k.type)) || {}).url;
    const slug = e.productSlug || ((e.catalogNs && e.catalogNs.mappings || [])[0] || {}).pageSlug || (e.offerMappings && e.offerMappings[0] || {}).pageSlug;
    const base = {
      title: e.title, store: "Epic Games", kind: "game", src: "epic",
      img: https(pick(["OfferImageWide", "DieselStoreFrontWide", "featuredMedia", "Thumbnail"])), tall: https(pick(["OfferImageTall", "DieselStoreFrontTall"])),
      url: slug ? "https://store.epicgames.com/fr/p/" + slug : "https://store.epicgames.com/fr/free-games",
      worth: e.price && e.price.totalPrice && e.price.totalPrice.originalPrice ? (e.price.totalPrice.originalPrice / 100).toFixed(2).replace(".", ",") + " €" : null,
      desc: cut(strip(e.description || ""), 220)
    };
    const offers = (lists, upcoming) => (lists || []).flatMap(x => x.promotionalOffers || []).forEach(o => {
      if (!o.discountSetting || o.discountSetting.discountPercentage !== 0) return;   // 0 % du prix = gratuit
      const start = Date.parse(o.startDate), end = Date.parse(o.endDate);
      if (end < now) return;
      if (!upcoming && start > now) return;
      out.push(Object.assign({}, base, { id: "epic:" + e.id + ":" + start, start, end, upcoming: !!upcoming || start > now }));
    });
    offers(e.promotions && e.promotions.promotionalOffers, false);
    offers(e.promotions && e.promotions.upcomingPromotionalOffers, true);
  }
  return out;
}

async function gamerpower() {
  const j = await http(GP + "?sort-by=popularity");
  return (Array.isArray(j) ? j : []).filter(g => String(g.status || "active").toLowerCase() === "active").slice(0, 120).map(g => {
    const kind = /game/i.test(g.type || "") ? "game" : /beta/i.test(g.type || "") ? "beta" : "loot";
    const end = g.end_date && g.end_date !== "N/A" ? Date.parse(String(g.end_date).replace(" ", "T") + "Z") : null;
    return {
      id: "gp:" + g.id, src: "gamerpower", kind,
      title: String(g.title || "").replace(/\s*\((Steam|Epic Games|GOG|PC|Xbox|PS[45]|Switch|IndieGala|Itch\.io)[^)]*\)\s*(Giveaway)?$/i, "").replace(/\s+Giveaway$/i, "").trim(),
      store: storeOf(g.platforms), platforms: g.platforms || "",
      img: https(g.image || g.thumbnail), tall: null,
      url: https(g.open_giveaway_url || g.open_giveaway || g.gamerpower_url),
      worth: g.worth && g.worth !== "N/A" ? g.worth : null,
      desc: cut(strip(g.description || ""), 220), howto: cut(strip(g.instructions || ""), 400),
      start: g.published_date ? Date.parse(String(g.published_date).replace(" ", "T") + "Z") : null,
      end: end && !isNaN(end) ? end : null, upcoming: false, users: +g.users || 0
    };
  }).filter(g => g.url && g.title);
}

module.exports = async (req, res) => {
  const [e, g] = await Promise.allSettled([cached("free:epic", 900, epic), cached("free:gp", 900, gamerpower)]);
  const failed = [];
  const ep = e.status === "fulfilled" ? e.value : (failed.push("Epic Games"), []);
  let gp = g.status === "fulfilled" ? g.value : (failed.push("GamerPower"), []);
  // un jeu Epic déjà donné par l'API Epic n'apparaît pas deux fois
  const norm = s => String(s).toLowerCase().replace(/[^a-z0-9]/g, "");
  const epicTitles = new Set(ep.map(x => norm(x.title)));
  gp = gp.filter(x => !(x.store === "Epic Games" && epicTitles.has(norm(x.title))));
  const now = Date.now();
  const items = ep.concat(gp).filter(x => !x.end || x.end > now);
  send(res, failed.length === 2 ? 502 : 200, failed.length === 2 ? { error: "Les sources de jeux gratuits ne répondent pas pour le moment." } : { items, failed }, 900);
};
