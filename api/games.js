// Lobby · sorties à venir et recherche de jeux (IGDB, via un compte Twitch développeur)
//   GET /api/games                 → prochaines sorties
//   GET /api/games?q=gta           → recherche
//   GET /api/games?id=1942         → un jeu
const { send, cached, http, params } = require("./_lib");

const IMG = (id, size) => id ? `https://images.igdb.com/igdb/image/upload/t_${size}/${id}.jpg` : null;
const FIELDS = [
  "name", "slug", "url", "summary", "hypes", "first_release_date",
  "cover.image_id", "artworks.image_id", "screenshots.image_id",
  "platforms.abbreviation", "platforms.name", "genres.name",
  "release_dates.date", "release_dates.human", "release_dates.platform.abbreviation"
].join(",");

async function token() {
  return cached("igdb-token", 3600 * 24, async () => {
    const id = process.env.TWITCH_CLIENT_ID, secret = process.env.TWITCH_CLIENT_SECRET;
    const u = `https://id.twitch.tv/oauth2/token?client_id=${encodeURIComponent(id)}&client_secret=${encodeURIComponent(secret)}&grant_type=client_credentials`;
    const j = await http(u, { method: "POST" });
    return j.access_token;
  });
}

async function igdb(query) {
  const t = await token();
  return http("https://api.igdb.com/v4/games", {
    method: "POST",
    headers: { "Client-ID": process.env.TWITCH_CLIENT_ID, Authorization: "Bearer " + t, "content-type": "text/plain" },
    body: query
  });
}

// "Nov 19, 2026" = date exacte ; "Nov 2026", "Q1 2027", "2027", "TBD" = date approximative
const EXACT = /^[A-Z][a-z]{2} \d{1,2}, \d{4}$/;
function shape(g) {
  const now = Date.now() / 1000;
  const rd = (g.release_dates || []).filter(r => r.date).sort((a, b) => a.date - b.date);
  const next = rd.find(r => r.date >= now - 86400) || rd[rd.length - 1];
  const when = next ? next.date : g.first_release_date;
  const art = (g.artworks && g.artworks[0]) || (g.screenshots && g.screenshots[0]);
  return {
    id: g.id, t: g.name, slug: g.slug, url: g.url || null,
    d: when ? when * 1000 : null,
    exact: next ? EXACT.test(next.human || "") : false,
    human: next ? next.human : null,
    p: [...new Set((g.platforms || []).map(p => p.abbreviation || p.name).filter(Boolean))],
    g: (g.genres || []).map(x => x.name).slice(0, 2).join(" / "),
    cover: IMG(g.cover && g.cover.image_id, "cover_big"),
    art: IMG(art && art.image_id, "1080p"),
    hype: g.hypes || 0,
    sum: g.summary || ""
  };
}

// sans clés IGDB : liste de secours (calendrier publié le 1er oct. 2026), pour que l'appli marche quand même
const DEMO = [
  ["Phantom Blade Zero", "2026-10-29", ["PS5", "PC"], "Action"],
  ["The Wolf Among Us Remastered", "2026-10-29", [], "Aventure"],
  ["The Legend of Zelda: Ocarina of Time Remake", "2026-11-06", ["Switch 2"], "Aventure"],
  ["Metaphor: ReFantazio", "2026-11-12", ["Switch 2"], "RPG"],
  ["Grand Theft Auto VI", "2026-11-19", ["PS5", "Series X|S"], "Action / Monde ouvert"],
  ["Dragon Quest Monsters", "2026-12-03", [], "RPG"],
  ["Rayman Legends Retold", "2026-12-03", [], "Plateforme"],
  ["Path of Exile 2", "2026-12-11", ["PC", "PS5", "Series X|S"], "Action-RPG"],
  ["Ananta", "2027-01-15", [], "Monde ouvert"],
  ["Metro 2039", "2027-02-04", [], "FPS"],
  ["Tomb Raider: Legacy of Atlantis", "2027-02-12", [], "Aventure"],
  ["God of War Laufey", "2027-02-16", ["PS5"], "Action"],
  ["Persona 4 Revival", "2027-02-18", [], "RPG"],
  ["Fable", "2027-02-23", ["Series X|S", "PC"], "RPG"],
  ["Exodus", "2027-04-07", [], "RPG / SF"]
].map(([t, d, p, g], i) => ({ id: "demo" + i, t, d: Date.parse(d + "T00:00:00Z"), exact: true, human: null, p, g, cover: null, art: null, hype: 0, sum: "" }));

module.exports = async (req, res) => {
  const q = params(req);
  const ready = process.env.TWITCH_CLIENT_ID && process.env.TWITCH_CLIENT_SECRET;
  try {
    if (!ready) {
      const s = (q.get("q") || "").toLowerCase();
      const list = DEMO.filter(g => g.d > Date.now() - 864e5 && (!s || g.t.toLowerCase().includes(s)));
      return send(res, 200, { demo: true, games: list }, 300);
    }
    if (q.get("id")) {
      const id = parseInt(q.get("id"), 10);
      if (!id) return send(res, 400, { error: "Identifiant de jeu invalide." });
      const r = await igdb(`fields ${FIELDS}; where id = ${id};`);
      return send(res, r[0] ? 200 : 404, r[0] ? { game: shape(r[0]) } : { error: "Jeu introuvable." }, 3600);
    }
    if (q.get("q")) {
      const s = q.get("q").replace(/["\\]/g, " ").trim().slice(0, 60);
      if (s.length < 2) return send(res, 200, { games: [] });
      const r = await cached("s:" + s.toLowerCase(), 1800, () => igdb(`search "${s}"; fields ${FIELDS}; where version_parent = null; limit 20;`));
      return send(res, 200, { games: r.map(shape) }, 1800);
    }
    const now = Math.floor(Date.now() / 1000) - 86400;
    const hype = Math.max(0, parseInt(q.get("hype") || "4", 10));
    const r = await cached("up:" + hype, 1800, () =>
      igdb(`fields ${FIELDS}; where first_release_date > ${now} & hypes >= ${hype} & version_parent = null; sort first_release_date asc; limit 300;`));
    return send(res, 200, { games: r.map(shape).filter(g => g.d) }, 1800);
  } catch (e) {
    const msg = e.status === 401 || e.status === 400 && /client/i.test(e.body || "")
      ? "Clés IGDB refusées : vérifie TWITCH_CLIENT_ID et TWITCH_CLIENT_SECRET sur Vercel."
      : "Impossible de joindre IGDB pour le moment (" + e.message + ").";
    return send(res, 502, { error: msg });
  }
};
