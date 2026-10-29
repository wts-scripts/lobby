// WTS Lobby · tendances : jeux les plus joués sur Steam (joueurs en ce moment) et les plus regardés sur Twitch
//   GET /api/trends → { steam: [...], twitch: [...], failed: [...] }
const { send, cached, http, hasTwitch, helix } = require("./_lib");

const header = id => `https://cdn.cloudflare.steamstatic.com/steam/apps/${id}/header.jpg`;

// nom d'un jeu Steam, gardé une semaine
const steamName = appid => cached("sname:" + appid, 7 * 86400, async () => {
  const j = await http(`https://store.steampowered.com/api/appdetails?appids=${appid}&filters=basic&l=french&cc=FR`);
  const d = j[appid] && j[appid].success && j[appid].data;
  return d ? d.name : null;
});
const players = appid => cached("splay:" + appid, 600, async () => {
  const j = await http(`https://api.steampowered.com/ISteamUserStats/GetNumberOfCurrentPlayers/v1/?appid=${appid}`);
  return j.response && j.response.result === 1 ? j.response.player_count : null;
});

async function steam() {
  const j = await http("https://api.steampowered.com/ISteamChartsService/GetMostPlayedGames/v1/");
  const ranks = ((j.response || {}).ranks || []).slice(0, 25);
  const rows = await Promise.all(ranks.map(async r => {
    const [name, now] = await Promise.all([steamName(r.appid).catch(() => null), players(r.appid).catch(() => null)]);
    return { rank: r.rank, appid: r.appid, name: name || "Jeu Steam " + r.appid, img: header(r.appid), now, peak: r.peak_in_game || null, last: r.last_week_rank || null, url: "https://store.steampowered.com/app/" + r.appid };
  }));
  return { rows, date: (j.response || {}).rollup_date ? j.response.rollup_date * 1000 : null };
}

async function twitch() {
  const top = await helix("games/top?first=20");
  const games = top.data || [];
  // spectateurs : somme des 100 plus gros lives de chaque jeu (approximation, Twitch ne donne pas le total)
  const rows = await Promise.all(games.map(async (g, i) => {
    let viewers = null;
    try { const s = await helix("streams?first=100&game_id=" + g.id); viewers = (s.data || []).reduce((t, x) => t + (x.viewer_count || 0), 0); } catch {}
    return { rank: i + 1, id: g.id, name: g.name, img: String(g.box_art_url || "").replace("{width}", "285").replace("{height}", "380"), viewers };
  }));
  return { rows };
}

module.exports = async (req, res) => {
  const jobs = [cached("trends:steam", 600, steam)];
  if (hasTwitch()) jobs.push(cached("trends:twitch", 600, twitch));
  const [s, t] = await Promise.allSettled(jobs);
  const failed = [];
  const out = { steam: [], steamDate: null, twitch: [], twitchOn: hasTwitch(), failed };
  if (s.status === "fulfilled") { out.steam = s.value.rows; out.steamDate = s.value.date; } else failed.push("Steam");
  if (t) { if (t.status === "fulfilled") out.twitch = t.value.rows; else failed.push("Twitch"); }
  send(res, 200, out, 600);
};
