// WTS Lobby · événements (showcases, salons, cérémonies, soldes, esport) avec compte à rebours
//   GET  /api/events                         → événements à venir et en cours
//   POST /api/events { action: "save", event }   → admin : ajoute ou modifie (event.id pour modifier)
//   POST /api/events { action: "delete", id }    → admin
// Sans base de données ou tant que l'admin n'a rien changé : liste de départ ci-dessous (vérifiée fin octobre 2026).
const { send, body, redis, hasDB, isAdmin, crypto } = require("./_lib");

const KINDS = ["showcase", "salon", "ceremonie", "soldes", "esport", "autre"];
// time: false = jour connu mais pas l'heure
const SEED = [
  { id: "streamer-awards-2026", name: "The Streamer Awards 2026", kind: "ceremonie", start: "2026-11-12", time: false, place: "En ligne", url: "https://thestreamerawards.com", desc: "La cérémonie qui récompense les streamers de l'année." },
  { id: "twitchcon-sd-2026", name: "TwitchCon San Diego 2026", kind: "salon", start: "2026-11-13", end: "2026-11-15", time: false, place: "San Diego", url: "https://www.twitchcon.com", desc: "La convention Twitch : streamers, conférences et annonces." },
  { id: "gstar-2026", name: "G-STAR 2026", kind: "salon", start: "2026-11-19", end: "2026-11-22", time: false, place: "Busan, Corée du Sud", url: "https://www.gstar.or.kr", desc: "Le grand salon du jeu vidéo coréen." },
  { id: "dreamhack-sthlm-2026", name: "DreamHack Stockholm 2026", kind: "esport", start: "2026-11-27", end: "2026-11-29", time: false, place: "Stockholm", url: "https://dreamhack.com", desc: "Festival gaming et tournois esport." },
  { id: "tga-2026", name: "The Game Awards 2026", kind: "ceremonie", start: "2026-12-10", time: false, place: "Peacock Theater, Los Angeles", url: "https://thegameawards.com", desc: "Les prix du jeu de l'année et une pluie d'annonces. Diffusé en direct la nuit en France." },
  { id: "steam-winter-2026", name: "Soldes d'hiver Steam", kind: "soldes", start: "2026-12-17", end: "2027-01-04", time: false, place: "Steam", url: "https://store.steampowered.com", desc: "Les grandes soldes de fin d'année sur Steam." }
];
const clean = (v, max) => String(v ?? "").replace(/[\u0000-\u001f\u007f<>]/g, " ").replace(/\s+/g, " ").trim().slice(0, max);
const dateOk = v => /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2})?$/.test(String(v || ""));

function validate(e) {
  const ev = {
    id: clean(e.id, 40) || crypto.randomBytes(6).toString("base64url"),
    name: clean(e.name, 80), kind: KINDS.includes(e.kind) ? e.kind : "autre",
    start: String(e.start || ""), end: e.end ? String(e.end) : "", time: /T\d{2}:\d{2}$/.test(String(e.start || "")),
    place: clean(e.place, 60), desc: clean(e.desc, 300),
    url: /^https:\/\/[^\s<>"']+$/.test(String(e.url || "").trim()) ? String(e.url).trim().slice(0, 200) : ""
  };
  if (ev.name.length < 3) return [null, "Donne un nom à l'événement."];
  if (!dateOk(ev.start)) return [null, "Date de début invalide."];
  if (ev.end && !dateOk(ev.end)) return [null, "Date de fin invalide."];
  if (ev.end && ev.end.slice(0, 10) < ev.start.slice(0, 10)) return [null, "La fin est avant le début."];
  return [ev, null];
}
async function load() {
  if (!hasDB()) return SEED;
  const r = await redis("GET", "cfg:events");
  return r ? JSON.parse(r) : SEED;
}

module.exports = async (req, res) => {
  try {
    if (req.method === "GET") {
      const today = new Date(Date.now() - 864e5).toISOString().slice(0, 10);   // garde la veille (fuseaux)
      const events = (await load()).filter(e => (e.end || e.start).slice(0, 10) >= today).sort((a, b) => a.start.localeCompare(b.start));
      return send(res, 200, { events, admin: isAdmin(req), editable: hasDB() }, isAdmin(req) ? 0 : 300);
    }
    if (req.method !== "POST") return send(res, 405, { error: "Méthode non prise en charge." });
    if (!isAdmin(req)) return send(res, 403, { error: "Réservé à l'admin." });
    if (!hasDB()) return send(res, 503, { error: "Ajoute d'abord la base Upstash au projet Vercel pour modifier les événements." });
    const b = await body(req);
    let list = await load();
    if (b.action === "save") {
      const [ev, err] = validate(b.event || {});
      if (err) return send(res, 400, { error: err });
      list = list.filter(e => e.id !== ev.id).concat(ev);
    } else if (b.action === "delete") {
      list = list.filter(e => e.id !== clean(b.id, 40));
    } else return send(res, 400, { error: "Action inconnue." });
    // on garde aussi les événements passés depuis moins d'un mois, pour l'historique
    const old = new Date(Date.now() - 30 * 864e5).toISOString().slice(0, 10);
    list = list.filter(e => (e.end || e.start).slice(0, 10) >= old).slice(0, 200);
    await redis("SET", "cfg:events", JSON.stringify(list));
    return send(res, 200, { ok: true });
  } catch (e) { return send(res, e.status || 500, { error: e.message }); }
};
