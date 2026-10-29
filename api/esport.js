// WTS Lobby · esport : matchs en cours, à venir et résultats (PandaScore, offre gratuite « Fixtures »)
//   GET /api/esport?game=csgo|valorant|lol|dota2  → { running, upcoming, past }
// Clé : PANDASCORE_TOKEN sur Vercel (gratuite sur pandascore.co).
const { send, cached, http, params } = require("./_lib");

const GAMES = { csgo: "Counter-Strike 2", valorant: "Valorant", lol: "League of Legends", dota2: "Dota 2" };
const ps = path => http("https://api.pandascore.co" + path, { headers: { Authorization: "Bearer " + process.env.PANDASCORE_TOKEN, accept: "application/json" } });

function shape(m) {
  const opp = (m.opponents || []).map(o => o.opponent || {}).slice(0, 2);
  const score = id => ((m.results || []).find(r => r.team_id === id) || {}).score;
  const stream = (m.streams_list || []).find(s => s.main) || (m.streams_list || []).find(s => s.official) || (m.streams_list || [])[0];
  return {
    id: m.id, status: m.status, at: Date.parse(m.begin_at || m.scheduled_at) || null, end: Date.parse(m.end_at) || null,
    league: (m.league || {}).name || "", leagueImg: (m.league || {}).image_url || null,
    serie: (m.serie || {}).full_name || "", stage: (m.tournament || {}).name || "", bo: m.number_of_games || null,
    teams: opp.map(o => ({ name: o.name || "À déterminer", short: o.acronym || null, img: o.image_url || null, score: o.id ? score(o.id) : null })),
    winner: m.winner_id || null, winnerName: (opp.find(o => o.id === m.winner_id) || {}).name || null,
    stream: stream && /^https:\/\//.test(stream.raw_url || "") ? { url: stream.raw_url, lang: stream.language || "" } : null
  };
}

module.exports = async (req, res) => {
  if (!process.env.PANDASCORE_TOKEN) return send(res, 503, { error: "L'esport n'est pas encore activé : ajoute la clé PANDASCORE_TOKEN sur Vercel (gratuite sur pandascore.co).", setup: true });
  const game = params(req).get("game");
  if (!GAMES[game]) return send(res, 400, { error: "Jeu non pris en charge." });
  try {
    const [running, upcoming, past] = await Promise.all([
      cached(`es:${game}:run`, 60, () => ps(`/${game}/matches/running?per_page=20`)),
      cached(`es:${game}:up`, 300, () => ps(`/${game}/matches/upcoming?per_page=50&sort=begin_at`)),
      cached(`es:${game}:past`, 300, () => ps(`/${game}/matches/past?per_page=30&sort=-end_at`))
    ]);
    send(res, 200, { game: GAMES[game], running: running.map(shape), upcoming: upcoming.map(shape), past: past.map(shape) }, 60);
  } catch (e) {
    send(res, e.status === 401 || e.status === 403 ? 503 : 502, { error: e.status === 401 || e.status === 403 ? "Clé PandaScore refusée : vérifie PANDASCORE_TOKEN sur Vercel." : "PandaScore ne répond pas pour le moment.", setup: e.status === 401 });
  }
};
