// Lobby · amis connectés
//   POST /api/friends  { steam: "profil ou SteamID", xbox: "clé OpenXBL", fivem: { servers: ["abc123"], names: ["Kenzo"] } }
// Rien n'est enregistré côté serveur : les identifiants restent sur l'appareil de la personne.
const { send, cached, http, body } = require("./_lib");

const fail = (pl, msg) => ({ pl, error: msg });

/* ---------- Steam (clé du site : STEAM_API_KEY) ---------- */
async function steamId(input, key) {
  const s = String(input || "").trim();
  const num = s.match(/(\d{17})/);
  if (num) return num[1];
  const vanity = (s.match(/steamcommunity\.com\/id\/([^/?#]+)/i) || [])[1] || (/^[\w.-]{2,32}$/.test(s) ? s : "");
  if (!vanity) throw new Error("Profil Steam non reconnu : colle l'adresse de ton profil Steam.");
  const j = await cached("vanity:" + vanity.toLowerCase(), 86400, () =>
    http(`https://api.steampowered.com/ISteamUser/ResolveVanityURL/v1/?key=${key}&vanityurl=${encodeURIComponent(vanity)}`));
  if (!j.response || j.response.success !== 1) throw new Error("Profil Steam introuvable.");
  return j.response.steamid;
}

async function steam(input) {
  const key = process.env.STEAM_API_KEY;
  if (!key) return [fail("steam", "Steam n'est pas encore activé sur le serveur (clé STEAM_API_KEY manquante).")];
  try {
    const id = await steamId(input, key);
    let list;
    try {
      list = await http(`https://api.steampowered.com/ISteamUser/GetFriendList/v1/?key=${key}&steamid=${id}&relationship=friend`);
    } catch (e) {
      if (e.status === 401 || e.status === 403) return [fail("steam", "Ta liste d'amis Steam est privée. Steam → Profil → Modifier → Confidentialité → Liste d'amis : Public.")];
      throw e;
    }
    const ids = ((list.friendslist && list.friendslist.friends) || []).map(f => f.steamid);
    const out = [];
    for (let i = 0; i < ids.length; i += 100) {
      const j = await http(`https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/?key=${key}&steamids=${ids.slice(i, i + 100).join(",")}`);
      for (const p of (j.response && j.response.players) || []) {
        const st = p.gameextrainfo ? "ingame" : p.personastate === 0 ? "offline" : (p.personastate === 3 || p.personastate === 4) ? "away" : "online";
        out.push({
          key: "steam:" + p.steamid, pl: "steam", n: p.personaname, avatar: p.avatarfull || p.avatarmedium || null,
          s: st, g: p.gameextrainfo || "", last: p.lastlogoff ? p.lastlogoff * 1000 : null,
          url: p.profileurl || null
        });
      }
    }
    return out;
  } catch (e) { return [fail("steam", e.message)]; }
}

/* ---------- Xbox (clé personnelle OpenXBL : xbl.io) ---------- */
const XBOX_IDLE = /^(online|en ligne|home|accueil|xbox app|application xbox)$/i;
async function xbox(key) {
  try {
    const j = await http("https://xbl.io/api/v2/friends", { headers: { "X-Authorization": String(key).trim(), accept: "application/json", "accept-language": "fr-FR" } });
    const people = j.people || (j.content && j.content.people) || [];
    return people.map(p => {
      const on = /online/i.test(p.presenceState || "");
      const txt = p.presenceText || "";
      return {
        key: "xbox:" + p.xuid, pl: "xbox", n: p.gamertag || p.modernGamertag || p.displayName, avatar: p.displayPicRaw || null,
        s: on ? (txt && !XBOX_IDLE.test(txt) ? "ingame" : "online") : "offline",
        g: on ? (XBOX_IDLE.test(txt) ? "" : txt) : txt, last: null, url: null
      };
    });
  } catch (e) {
    if (e.status === 401 || e.status === 403) return [fail("xbox", "Clé OpenXBL refusée : vérifie-la sur xbl.io.")];
    return [fail("xbox", "Xbox ne répond pas pour le moment (" + e.message + ").")];
  }
}

/* ---------- FiveM (liste publique des joueurs d'un serveur) ---------- */
const noColors = s => String(s || "").replace(/\^[0-9]/g, "").replace(/\s+/g, " ").trim();
async function fivem(cfg) {
  const servers = (cfg.servers || []).map(s => String(s).trim().replace(/^.*cfx\.re\/join\//i, "").replace(/[^a-z0-9]/gi, "")).filter(Boolean).slice(0, 5);
  const names = (cfg.names || []).map(n => String(n).trim().toLowerCase()).filter(Boolean).slice(0, 50);
  if (!servers.length) return [];
  const out = [];
  await Promise.all(servers.map(async code => {
    try {
      const j = await cached("fivem:" + code, 45, () => http(`https://servers-frontend.fivem.net/api/servers/single/${code}`));
      const d = j.Data || j.data || {};
      const host = noColors(d.vars && d.vars.sv_projectName || d.hostname || code).slice(0, 60);
      for (const p of d.players || []) {
        const name = noColors(p.name);
        if (!names.some(n => name.toLowerCase().includes(n))) continue;
        out.push({ key: "fivem:" + code + ":" + name.toLowerCase(), pl: "fivem", n: name, avatar: null, s: "ingame", g: host, last: null, url: null });
      }
    } catch (e) {
      out.push(fail("fivem", e.status === 404 ? `Serveur FiveM ${code} introuvable ou hors ligne.` : `FiveM (${code}) ne répond pas.`));
    }
  }));
  return out;
}

module.exports = async (req, res) => {
  if (req.method !== "POST") return send(res, 405, { error: "Utilise POST." });
  const b = await body(req);
  const jobs = [];
  if (b.steam) jobs.push(steam(b.steam));
  if (b.xbox) jobs.push(xbox(b.xbox));
  if (b.fivem) jobs.push(fivem(b.fivem));
  const all = (await Promise.all(jobs)).flat();
  send(res, 200, {
    friends: all.filter(f => !f.error),
    errors: all.filter(f => f.error),
    at: Date.now(),
    enabled: { steam: !!process.env.STEAM_API_KEY, xbox: true, fivem: true }
  });
};
