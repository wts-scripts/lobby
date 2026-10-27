/* Lobby · appli */
"use strict";
const $ = s => document.querySelector(s);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const pad = n => String(n).padStart(2, "0");

/* ---------- stockage local ---------- */
const store = {
  get(k, d) { try { const v = localStorage.getItem("lobby." + k); return v ? JSON.parse(v) : d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem("lobby." + k, JSON.stringify(v)); } catch {} }
};
const DEFAULT_APPS = [
  { appid: 730, name: "Counter-Strike 2" }, { appid: 271590, name: "GTA V / GTA Online" },
  { appid: 1172470, name: "Apex Legends" }, { appid: 252490, name: "Rust" },
  { appid: 2767030, name: "Marvel Rivals" }, { appid: 2694490, name: "Path of Exile 2" }
];
const S = {
  games: [], demo: false, gamesErr: "",
  follow: store.get("follow", {}),
  apps: store.get("apps", DEFAULT_APPS),
  acc: store.get("accounts", { steam: "", xbox: "", fivemServers: "", fivemNames: "" }),
  seen: store.get("seen", {}),
  plat: "all", onlyFollow: false, friendPlat: "all",
  updates: null, updErr: "", news: null, newsFailed: [], friends: null, friendErr: [], friendsAt: 0
};

async function api(path, opts) {
  const r = await fetch(path, opts);
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || "Le serveur ne répond pas (" + r.status + ").");
  return j;
}

/* ---------- illustrations de secours (quand un jeu n'a pas d'image) ---------- */
const artCache = {};
function hash(s) { let h = 2166136261; for (const c of String(s)) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return h >>> 0; }
function rng(seed) { return () => { seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function kindOf(genre, name) {
  const g = (genre || "").toLowerCase();
  if (/open world|monde ouvert/.test(g) || /gta|online|fivem/i.test(name)) return "city";
  if (/shooter|fps|sci|sf/.test(g)) return "grid";
  if (/role|rpg/.test(g)) return "mountains";
  if (/adventure|aventure/.test(g)) return "waves";
  if (/platform|music|plateforme|musique|party|sport|racing/.test(g)) return "bars";
  return ["city", "grid", "mountains", "waves", "bars"][hash(name) % 5];
}
function art(key, kind, w, h) {
  const id = key + "|" + kind + "|" + w + "x" + h; if (artCache[id]) return artCache[id];
  const c = document.createElement("canvas"); c.width = w; c.height = h; const x = c.getContext("2d"); const r = rng(hash(key));
  const hue = hash(key) % 360, h2 = (hue + 30 + Math.floor(r() * 90)) % 360;
  const sky = x.createLinearGradient(0, 0, 0, h); sky.addColorStop(0, `hsl(${hue},55%,12%)`); sky.addColorStop(.7, `hsl(${h2},65%,38%)`); sky.addColorStop(1, `hsl(${h2},75%,55%)`);
  x.fillStyle = sky; x.fillRect(0, 0, w, h);
  for (let i = 0; i < 70; i++) { x.fillStyle = `rgba(255,255,255,${r() * .7})`; x.fillRect(r() * w, r() * h * .55, r() * 2 + .5, r() * 2 + .5); }
  const sun = (cx, cy, rad, col) => { const gl = x.createRadialGradient(cx, cy, 0, cx, cy, rad * 3); gl.addColorStop(0, col); gl.addColorStop(1, "rgba(0,0,0,0)"); x.fillStyle = gl; x.fillRect(0, 0, w, h); x.fillStyle = col; x.beginPath(); x.arc(cx, cy, rad, 0, 7); x.fill(); };
  const m = Math.min(w, h);
  if (kind === "avatar") {
    const g = x.createLinearGradient(0, 0, w, h); g.addColorStop(0, `hsl(${hue},70%,45%)`); g.addColorStop(1, `hsl(${h2},75%,30%)`); x.fillStyle = g; x.fillRect(0, 0, w, h);
    for (let i = 0; i < 4; i++) { x.fillStyle = `hsla(${(h2 + i * 40) % 360},80%,65%,.35)`; x.beginPath(); x.arc(r() * w, r() * h, w * (.2 + r() * .4), 0, 7); x.fill(); }
    x.fillStyle = "#fff"; x.font = `700 ${w * .45}px "Chakra Petch", sans-serif`; x.textAlign = "center"; x.textBaseline = "middle"; x.fillText(String(key).trim().charAt(0).toUpperCase(), w / 2, h / 2 + 2);
  } else if (kind === "city") {
    sun(w * (.3 + r() * .4), h * .62, m * .16, `hsl(${(h2 + 20) % 360},95%,68%)`);
    for (let layer = 0; layer < 3; layer++) {
      const base = h * (.62 + layer * .12), col = `hsl(${hue},45%,${Math.max(4, 10 - layer * 3)}%)`; x.fillStyle = col;
      let px = -10; while (px < w) { const bw = w * (.03 + r() * .07), bh = h * (.12 + r() * (.42 - layer * .08)); x.fillRect(px, base - bh, bw, h);
        if (layer === 2) for (let wy = base - bh + 8; wy < base; wy += 10) for (let wx = px + 5; wx < px + bw - 6; wx += 9) if (r() < .28) { x.fillStyle = `hsla(${(h2 + 40) % 360},100%,75%,${.5 + r() * .5})`; x.fillRect(wx, wy, 4, 5); x.fillStyle = col; }
        px += bw + r() * 6; }
    }
  } else if (kind === "grid") {
    const hz = h * .58; sun(w / 2, hz - h * .05, m * .2, `hsl(${(h2 + 30) % 360},95%,65%)`);
    x.fillStyle = `hsl(${hue},55%,8%)`; x.fillRect(0, hz, w, h - hz);
    x.strokeStyle = `hsla(${h2},100%,65%,.75)`; x.lineWidth = 1.4;
    for (let i = -14; i <= 14; i++) { x.beginPath(); x.moveTo(w / 2, hz); x.lineTo(w / 2 + i * w * .12, h); x.stroke(); }
    for (let i = 1; i < 12; i++) { const y = hz + (h - hz) * Math.pow(i / 11, 2.2); x.beginPath(); x.moveTo(0, y); x.lineTo(w, y); x.stroke(); }
  } else if (kind === "waves") {
    sun(w * (.2 + r() * .6), h * .38, m * .12, `hsl(${(h2 + 30) % 360},90%,75%)`);
    for (let l = 0; l < 5; l++) { const y0 = h * (.55 + l * .09), amp = 6 + r() * 14, f = .008 + r() * .02, ph = r() * 6;
      x.fillStyle = `hsl(${(hue + l * 8) % 360},55%,${30 - l * 5}%)`; x.beginPath(); x.moveTo(0, h);
      for (let px = 0; px <= w; px += 8) x.lineTo(px, y0 + Math.sin(px * f + ph) * amp); x.lineTo(w, h); x.fill(); }
  } else if (kind === "bars") {
    for (let i = 0; i < 14; i++) { x.fillStyle = `hsla(${(h2 + i * 25) % 360},90%,65%,.55)`; x.beginPath(); x.arc(r() * w, r() * h * .7, m * (.02 + r() * .08), 0, 7); x.fill(); }
    const n = 18, bw = w / n; for (let i = 0; i < n; i++) { const bh = h * (.15 + r() * .5); const g = x.createLinearGradient(0, h - bh, 0, h); g.addColorStop(0, `hsl(${(h2 + i * 6) % 360},95%,65%)`); g.addColorStop(1, `hsl(${hue},70%,25%)`); x.fillStyle = g; x.fillRect(i * bw + 2, h - bh, bw - 4, bh); }
  } else {
    sun(w * (.25 + r() * .5), h * .3, m * .1, `hsl(${(h2 + 40) % 360},80%,80%)`);
    for (let l = 0; l < 4; l++) { const base = h * (.5 + l * .13); x.fillStyle = `hsl(${hue},${40 + l * 5}%,${28 - l * 6}%)`; x.beginPath(); x.moveTo(0, h);
      let px = 0; x.lineTo(0, base); while (px < w) { px += w * (.05 + r() * .11); x.lineTo(px, base - (r() * h * (.28 - l * .04))); } x.lineTo(w, h); x.fill(); }
  }
  if (kind !== "avatar") { const v = x.createRadialGradient(w / 2, h / 2, m * .3, w / 2, h / 2, Math.max(w, h) * .75); v.addColorStop(0, "rgba(0,0,0,0)"); v.addColorStop(1, "rgba(0,0,0,.45)"); x.fillStyle = v; x.fillRect(0, 0, w, h); }
  return artCache[id] = c.toDataURL("image/jpeg", .85);
}
const coverOf = g => g.cover || art(g.t, kindOf(g.g, g.t), 360, 480);
const bannerOf = g => g.art || art(g.t, kindOf(g.g, g.t), 1280, 720);
// une image distante qui ne charge pas → illustration de secours
document.addEventListener("error", e => {
  const img = e.target; if (img.tagName !== "IMG" || img.dataset.fb === "1") return;
  img.dataset.fb = "1"; const k = img.dataset.k || img.alt || "lobby";
  img.src = art(k, img.dataset.kind || kindOf("", k), +(img.dataset.w || 640), +(img.dataset.h || 360));
}, true);

/* ---------- temps ---------- */
function parts(ms) { ms = Math.max(0, ms); const s = Math.floor(ms / 1000); return { j: Math.floor(s / 86400), h: Math.floor(s % 86400 / 3600), m: Math.floor(s % 3600 / 60), s: s % 60 }; }
function short(g) {
  if (!g.d) return [g.human || "Date à confirmer", false];
  if (!g.exact) return [g.human ? "Prévu : " + g.human : "Date à confirmer", false];
  const ms = g.d - Date.now(); if (ms <= 0) return ["Disponible", true];
  const p = parts(ms); return [(p.j ? p.j + " j " : "") + pad(p.h) + ":" + pad(p.m) + ":" + pad(p.s), p.j < 7];
}
const fmtDate = g => !g.d ? "Date à confirmer" : !g.exact ? (g.human || "Date à confirmer")
  : new Date(g.d).toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "long", year: "numeric" });
function dur(ms) { const min = Math.max(0, Math.floor(ms / 6e4)); if (min < 1) return "à l'instant"; if (min < 60) return min + " min"; const h = Math.floor(min / 60); if (h < 24) return h + " h " + pad(min % 60); const j = Math.floor(h / 24); return j + " j"; }
const ago = d => d ? "il y a " + dur(Date.now() - d).replace("à l'instant", "1 min") : "";
const platTags = p => p && p.length ? p.slice(0, 4).map(x => `<span class="plat">${esc(x)}</span>`).join("") + (p.length > 4 ? `<span class="plat">+${p.length - 4}</span>` : "") : `<span class="plat">Plateformes à confirmer</span>`;

/* ---------- Sorties ---------- */
async function loadGames() {
  try { const j = await api("/api/games"); S.games = j.games || []; S.demo = !!j.demo; S.gamesErr = ""; }
  catch (e) { S.gamesErr = e.message; }
  renderSorties();
}
function platKey(p) {
  const s = p.toLowerCase();
  if (s === "pc" || s.includes("windows")) return "PC";
  if (s.includes("ps5")) return "PS5";
  if (s.includes("series") || s.includes("xsx")) return "Xbox Series";
  if (s.includes("switch 2") || s === "ns2") return "Switch 2";
  if (s.includes("switch")) return "Switch";
  if (s.includes("ps4")) return "PS4";
  return null;
}
function renderSorties() {
  const el = $("#v-sorties");
  if (!S.games.length && !S.gamesErr) {
    el.innerHTML = `<div class="games">${'<div class="skel"></div>'.repeat(12)}</div>`; return;
  }
  const now = Date.now();
  const list = S.games.filter(g => !g.d || g.d > now - 864e5);
  const exact = list.filter(g => g.exact && g.d > now);
  const followedSoon = Object.values(S.follow).filter(g => g.exact && g.d > now).sort((a, b) => a.d - b.d)[0];
  const hypeSoon = exact.filter(g => g.d - now < 90 * 864e5).sort((a, b) => b.hype - a.hype)[0];
  const hero = followedSoon || hypeSoon || exact[0];
  const platCounts = {};
  list.forEach(g => new Set(g.p.map(platKey).filter(Boolean)).forEach(k => platCounts[k] = (platCounts[k] || 0) + 1));
  const plats = Object.keys(platCounts).sort((a, b) => platCounts[b] - platCounts[a]).slice(0, 5);
  let games = list.filter(g => S.plat === "all" || g.p.some(p => platKey(p) === S.plat));
  if (S.onlyFollow) games = Object.values(S.follow).filter(g => !g.d || g.d > now - 864e5).sort((a, b) => (a.d || 9e15) - (b.d || 9e15));
  const groups = {}, later = [];
  games.forEach(g => {
    if (!g.exact || !g.d) return later.push(g);
    const k = new Date(g.d).toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
    (groups[k] = groups[k] || []).push(g);
  });
  el.innerHTML = `
    ${S.demo ? `<div class="note"><b>Mode démo.</b> Les clés IGDB ne sont pas encore réglées sur le serveur : la liste ci-dessous est un calendrier fixe, sans jaquettes. Voir le README.</div>` : ""}
    ${S.gamesErr ? `<p class="err">${esc(S.gamesErr)} <button class="btn" data-act="reload-games">Réessayer</button></p>` : ""}
    ${hero ? `<div class="hero" style="--img:url('${bannerOf(hero)}')" data-open="${hero.id}" tabindex="0" role="button" aria-label="Voir ${esc(hero.t)}">
      <div><div class="lbl">${hero === followedSoon ? "Ton prochain jeu" : "Le plus attendu"}</div><h3>${esc(hero.t)}</h3><p>${fmtDate(hero)}${hero.p.length ? " · " + esc(hero.p.join(", ")) : ""}</p></div>
      <div class="clock" data-clock="${hero.d}"></div></div>` : ""}
    <div class="row"><h2>Sorties à venir</h2>
      <div class="chips">
        <button class="chip" data-plat="all" aria-pressed="${S.plat === "all" && !S.onlyFollow}">Toutes</button>
        ${plats.map(k => `<button class="chip" data-plat="${esc(k)}" aria-pressed="${S.plat === k && !S.onlyFollow}">${esc(k)}</button>`).join("")}
        <button class="chip" data-act="only-follow" aria-pressed="${S.onlyFollow}">★ Suivis (${Object.keys(S.follow).length})</button>
      </div></div>
    ${Object.entries(groups).map(([m, gs]) => `<div class="month">${m}</div><div class="games">${gs.map(card).join("")}</div>`).join("")}
    ${later.length ? `<div class="month">Date à confirmer</div><div class="games">${later.map(card).join("")}</div>` : ""}
    ${!games.length ? `<div class="empty">${S.onlyFollow ? "Tu ne suis aucun jeu. Touche l'étoile d'un jeu pour le suivre." : "Aucune sortie pour cette plateforme."}</div>` : ""}`;
  tick();
}
function card(g) {
  const [c, soon] = short(g);
  return `<div class="game" data-open="${g.id}" tabindex="0" role="button" aria-label="${esc(g.t)}">
    <button class="star" data-star="${g.id}" aria-pressed="${!!S.follow[g.id]}" aria-label="Suivre ${esc(g.t)}">★</button>
    <div class="pic"><img src="${esc(coverOf(g))}" alt="${esc(g.t)}" data-kind="${kindOf(g.g, g.t)}" data-w="360" data-h="480" loading="lazy">
    <span class="cd${soon ? " soon" : ""}" data-cd="${g.id}">${esc(c)}</span></div>
    <div class="body"><div class="t">${esc(g.t)}</div><div class="d">${esc(fmtDate(g))}</div><div class="plats">${platTags(g.p)}</div></div></div>`;
}
const gameById = id => S.games.find(g => String(g.id) === String(id)) || S.follow[id] || searchCache.find(g => String(g.id) === String(id));

/* ---------- fiche jeu ---------- */
async function openGame(id) {
  const g = gameById(id); if (!g) return;
  const dr = $("#drawer");
  dr.innerHTML = `<div class="dtop"><span></span><button class="btn" data-act="close">Fermer</button></div>
    <div class="banner"><img src="${esc(bannerOf(g))}" alt="" data-k="${esc(g.t)}" data-w="1280" data-h="720">${g.cover ? `<img class="cv" src="${esc(g.cover)}" alt="">` : ""}</div>
    <div><div class="meta">${esc(g.g || "")}</div><h3 id="dTitle">${esc(g.t)}</h3></div>
    <div><h5>Sortie</h5><p style="margin:0 0 10px">${esc(fmtDate(g))}</p>${g.exact && g.d > Date.now() ? `<div class="clock" data-clock="${g.d}"></div>` : ""}</div>
    <div><h5>Plateformes</h5><div class="plats">${platTags(g.p)}</div></div>
    <div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn primary" data-star="${g.id}" aria-pressed="${!!S.follow[g.id]}">${S.follow[g.id] ? "★ Suivi" : "☆ Suivre ce jeu"}</button>
      ${g.url ? `<a class="btn" href="${esc(g.url)}" target="_blank" rel="noopener">Fiche IGDB</a>` : ""}</div>
    ${g.sum ? `<div><h5>Résumé</h5><span class="sum">${esc(g.sum)}</span></div>` : ""}
    <div><h5>Actualités</h5><div class="mini" id="dNews"><span style="color:var(--muted)">Recherche des actus…</span></div></div>`;
  dr.hidden = $("#scrim").hidden = false; tick();
  dr.querySelector("[data-act=close]").focus();
  try {
    const words = g.t.replace(/[:\-–].*$/, "").trim();
    const j = await api("/api/news?q=" + encodeURIComponent(words));
    if ($("#dTitle") && $("#dTitle").textContent === g.t)
      $("#dNews").innerHTML = j.news.length ? j.news.slice(0, 5).map(n => `<a href="${esc(n.url)}" target="_blank" rel="noopener"><img src="${esc(n.img || art(n.t, "mountains", 320, 180))}" alt="" data-k="${esc(n.t)}" data-w="320" data-h="180"><span>${esc(n.t)}<br><span class="meta">${esc(n.src)} · ${ago(n.d)}</span></span></a>`).join("")
        : `<span style="color:var(--muted)">Pas d'actu récente sur ce jeu.</span>`;
  } catch { $("#dNews") && ($("#dNews").innerHTML = `<span style="color:var(--muted)">Actus indisponibles pour le moment.</span>`); }
}
function closeDrawer() { $("#drawer").hidden = $("#scrim").hidden = true; }

/* ---------- recherche ---------- */
let searchCache = [], sTimer, sSeq = 0;
const norm = s => String(s).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
function showResults(list, msg) {
  const r = $("#results");
  r.innerHTML = list.map(g => `<button data-open="${g.id}"><img src="${esc(coverOf(g))}" alt="" data-k="${esc(g.t)}" data-w="360" data-h="480"><span>${esc(g.t)}</span><small>${esc(short(g)[0])}</small></button>`).join("") + (msg ? `<div class="msg">${esc(msg)}</div>` : "");
  r.hidden = false;
}
$("#q").addEventListener("input", e => {
  const raw = e.target.value.trim(), q = norm(raw);
  clearTimeout(sTimer);
  if (!q) { $("#results").hidden = true; return; }
  const local = S.games.filter(g => norm(g.t).includes(q)).slice(0, 6);
  showResults(local, raw.length >= 2 ? "Recherche dans tous les jeux…" : "");
  if (raw.length < 2) return;
  const seq = ++sSeq;
  sTimer = setTimeout(async () => {
    try {
      const j = await api("/api/games?q=" + encodeURIComponent(raw));
      if (seq !== sSeq) return;
      searchCache = j.games || [];
      const ids = new Set(local.map(g => String(g.id)));
      const all = local.concat(searchCache.filter(g => !ids.has(String(g.id)))).slice(0, 12);
      showResults(all, all.length ? "" : `Aucun jeu trouvé pour « ${raw} ».`);
    } catch (err) { if (seq === sSeq) showResults(local, err.message); }
  }, 300);
});
$("#q").addEventListener("keydown", e => {
  if (e.key === "Enter") { const b = $("#results button[data-open]"); if (b) b.click(); }
  if (e.key === "Escape") $("#results").hidden = true;
});

/* ---------- Mises à jour ---------- */
async function loadUpdates() {
  S.updErr = "";
  if (!S.apps.length) { S.updates = []; return renderMaj(); }
  try { const j = await api("/api/updates?apps=" + S.apps.map(a => a.appid).join(",")); S.updates = j.updates || []; }
  catch (e) { S.updErr = e.message; S.updates = S.updates || []; }
  renderMaj();
}
function renderMaj() {
  const name = id => (S.apps.find(a => a.appid === id) || {}).name || "Jeu Steam " + id;
  const label = { patch: "Patch", hotfix: "Correctif", saison: "Saison" };
  $("#v-maj").innerHTML = `<div class="row"><h2>Mises à jour</h2></div>
    <div class="apps">${S.apps.map(a => `<span class="app">${esc(a.name)}<button data-unapp="${a.appid}" aria-label="Ne plus suivre ${esc(a.name)}">×</button></span>`).join("")}</div>
    <div class="addapp"><input id="appq" type="search" placeholder="Ajouter un jeu Steam à suivre" autocomplete="off" aria-label="Ajouter un jeu Steam à suivre"><div class="results" id="appres" hidden></div></div>
    ${S.updErr ? `<p class="err">${esc(S.updErr)}</p>` : ""}
    ${S.updates === null ? `<div class="empty">Chargement des notes de mise à jour…</div>`
      : !S.updates.length ? `<div class="empty">Aucune mise à jour récente pour ces jeux.</div>`
      : `<div class="feed">${S.updates.map(u => `<a class="item" href="${esc(u.url)}" target="_blank" rel="noopener">
          <img class="thumb" src="${esc(u.img)}" alt="" data-k="${esc(name(u.appid))}" data-w="460" data-h="215" loading="lazy">
          <div><div class="meta"><span class="tag ${u.type}">${label[u.type]}</span>${esc(name(u.appid))} · ${ago(u.d)}</div>
          <h4>${esc(u.t)}</h4><p>${esc(u.txt)}</p></div></a>`).join("")}</div>`}`;
}
let aTimer;
document.addEventListener("input", e => {
  if (e.target.id !== "appq") return;
  const v = e.target.value.trim(); clearTimeout(aTimer);
  const box = $("#appres"); if (v.length < 2) { box.hidden = true; return; }
  aTimer = setTimeout(async () => {
    try {
      const j = await api("/api/updates?search=" + encodeURIComponent(v));
      box.innerHTML = j.apps.length ? j.apps.map(a => `<button data-addapp="${a.appid}" data-name="${esc(a.name)}"><img src="${esc(a.img)}" alt="" style="width:64px;height:30px" data-k="${esc(a.name)}"><span>${esc(a.name)}</span></button>`).join("") : `<div class="msg">Aucun jeu Steam trouvé.</div>`;
    } catch (err) { box.innerHTML = `<div class="msg">${esc(err.message)}</div>`; }
    box.hidden = false;
  }, 300);
});

/* ---------- Actus ---------- */
async function loadNews() {
  try { const j = await api("/api/news"); S.news = j.news || []; S.newsFailed = j.failed || []; }
  catch (e) { S.news = S.news || []; S.newsFailed = ["tous les flux"]; }
  renderActus();
}
function renderActus() {
  $("#v-actus").innerHTML = `<div class="row"><h2>Actualités</h2><button class="btn" data-act="reload-news">Actualiser</button></div>
    ${S.newsFailed.length ? `<p class="note">Indisponible pour le moment : ${esc(S.newsFailed.join(", "))}.</p>` : ""}
    ${S.news === null ? `<div class="news">${'<div class="skel" style="aspect-ratio:4/3.4"></div>'.repeat(6)}</div>`
      : !S.news.length ? `<div class="empty">Aucune actu pour le moment.</div>`
      : `<div class="news">${S.news.map(n => `<a class="ncard" href="${esc(n.url)}" target="_blank" rel="noopener">
          <img src="${esc(n.img || art(n.t, kindOf("", n.t), 640, 360))}" alt="" data-k="${esc(n.t)}" loading="lazy">
          <div><span class="meta">${esc(n.src)} · ${ago(n.d)}</span><h4>${esc(n.t)}</h4>${n.txt ? `<p>${esc(n.txt)}</p>` : ""}</div></a>`).join("")}</div>`}`;
}

/* ---------- Amis ---------- */
const PLAT = { steam: "Steam", xbox: "Xbox", psn: "PlayStation", discord: "Discord", fivem: "FiveM", bnet: "Battle.net", ea: "EA app", epic: "Epic", riot: "Riot", ubi: "Ubisoft", nin: "Nintendo" };
const ST = { ingame: ["En jeu", "var(--ingame)"], online: ["En ligne", "var(--online)"], away: ["Absent", "var(--away)"], offline: ["Hors ligne", "var(--off)"] };
const ORDER = ["ingame", "online", "away", "offline"];
const hasAccounts = () => !!(S.acc.steam || S.acc.xbox || S.acc.fivemServers);
let fBusy = false;
async function loadFriends() {
  if (!hasAccounts() || fBusy) { renderAmis(); return; }
  fBusy = true;
  const list = s => s.split(/[,\n]/).map(x => x.trim()).filter(Boolean);
  try {
    const j = await api("/api/friends", { method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ steam: S.acc.steam || undefined, xbox: S.acc.xbox || undefined,
        fivem: S.acc.fivemServers ? { servers: list(S.acc.fivemServers), names: list(S.acc.fivemNames) } : undefined }) });
    track(j.friends || []); S.friends = j.friends || []; S.friendErr = j.errors || []; S.friendsAt = Date.now();
  } catch (e) { S.friendErr = [{ pl: "", error: e.message }]; S.friends = S.friends || []; }
  fBusy = false; renderAmis();
}
// « depuis quand » : Lobby note l'heure où il voit un changement de statut ou de jeu
function track(list) {
  const now = Date.now(), next = {};
  for (const f of list) {
    const sig = f.s === "offline" ? "off" : f.s + "|" + f.g;
    const p = S.seen[f.key];
    next[f.key] = p && p.sig === sig ? p : { sig, since: now, exact: !!p };
  }
  S.seen = next; store.set("seen", next);
}
function renderAmis() {
  const el = $("#v-amis");
  const online = (S.friends || []).filter(f => f.s !== "offline").length;
  const oc = $("#onlineCount"); oc.hidden = !S.friends; oc.textContent = online;
  if (!hasAccounts()) {
    el.innerHTML = `<div class="row"><h2>Amis</h2></div><div class="empty">Lie tes comptes Steam, Xbox ou ton serveur FiveM pour voir qui joue en ce moment.<br><br><a class="btn primary" href="#comptes">Lier mes comptes</a></div>`;
    return;
  }
  if (!S.friends) { el.innerHTML = `<div class="row"><h2>Amis</h2></div><div class="empty">Recherche de tes amis…</div>`; return; }
  const plats = [...new Set(S.friends.map(f => f.pl))];
  const fs = S.friends.filter(f => S.friendPlat === "all" || f.pl === S.friendPlat)
    .sort((a, b) => ORDER.indexOf(a.s) - ORDER.indexOf(b.s) || (S.seen[a.key]?.since || 0) - (S.seen[b.key]?.since || 0) || a.n.localeCompare(b.n));
  const c = k => S.friends.filter(f => f.s === k).length;
  el.innerHTML = `<div class="row"><h2>Amis</h2>
      <div class="sum">${ORDER.map(k => `<span><span class="dot" style="background:${ST[k][1]}"></span><b>${c(k)}</b>${ST[k][0]}</span>`).join("")}</div></div>
    ${S.friendErr.map(e => `<p class="err">${e.pl ? esc(PLAT[e.pl]) + " : " : ""}${esc(e.error)}</p>`).join("")}
    ${plats.length > 1 ? `<div class="chips" style="margin-bottom:16px">${["all", ...plats].map(k => `<button class="chip" data-fplat="${k}" aria-pressed="${S.friendPlat === k}">${k === "all" ? "Toutes" : PLAT[k]}</button>`).join("")}</div>` : ""}
    <div class="friends">${fs.map(friendCard).join("") || `<div class="empty">Aucun ami trouvé${S.friendPlat !== "all" ? " sur cette plateforme" : ""}.</div>`}</div>
    <p class="meta" style="margin-top:16px">Actualisé ${ago(S.friendsAt)} · toutes les minutes tant que Lobby est ouvert. « ≥ » : Lobby l'a vu connecté au moins depuis ce temps-là.</p>`;
}
function friendCard(f) {
  const on = f.s !== "offline", sn = S.seen[f.key];
  let since;
  if (on) since = sn ? `depuis<b>${sn.exact ? "" : "≥ "}${dur(Date.now() - sn.since)}</b>` : "";
  else since = f.last ? `vu<b>${ago(f.last)}</b>` : `<b>Hors ligne</b>`;
  return `<div class="friend" style="--st:${ST[f.s][1]}">
    <div class="avatar"><img src="${esc(f.avatar || art(f.n, "avatar", 96, 96))}" alt="" data-k="${esc(f.n)}" data-kind="avatar" data-w="96" data-h="96" loading="lazy"></div>
    <div class="info"><div class="n">${esc(f.n)}<span class="plat">${esc(PLAT[f.pl])}</span></div><div class="g">${esc(f.s === "ingame" ? f.g : f.g || ST[f.s][0])}</div></div>
    <div class="since">${since}</div></div>`;
}

/* ---------- Comptes ---------- */
function renderComptes() {
  const a = S.acc;
  const soon = [["psn", "Présence des amis PlayStation : en préparation."], ["discord", "Statut et jeu en cours via un bot Lobby : en préparation. Discord affiche aussi les jeux Battle.net, EA, Epic…"]];
  const none = ["bnet", "ea", "epic", "riot", "ubi", "nin"];
  $("#v-comptes").innerHTML = `<div class="row"><h2>Comptes liés</h2></div>
    <p style="color:var(--muted);margin:-6px 0 16px;max-width:65ch">Tes identifiants restent sur cet appareil. Lobby les envoie seulement pour demander qui est connecté, rien n'est enregistré sur le serveur.</p>
    <form class="accounts" id="accForm">
      <div class="acc"><h4>Steam<span class="lvl ok">Officiel</span></h4>
        <p>Colle l'adresse de ton profil Steam. Ta liste d'amis doit être publique (Steam → Profil → Modifier → Confidentialité).</p>
        <div class="field"><label for="f-steam">Profil Steam</label><input id="f-steam" name="steam" placeholder="https://steamcommunity.com/id/ton-pseudo" value="${esc(a.steam)}"></div></div>
      <div class="acc"><h4>Xbox<span class="lvl mid">Via OpenXBL</span></h4>
        <p>Connecte-toi sur <a href="https://xbl.io" target="_blank" rel="noopener">xbl.io</a> avec ton compte Xbox (gratuit), copie ta clé API personnelle et colle-la ici.</p>
        <div class="field"><label for="f-xbox">Clé OpenXBL</label><input id="f-xbox" name="xbox" type="password" autocomplete="off" placeholder="Ta clé xbl.io" value="${esc(a.xbox)}"></div></div>
      <div class="acc"><h4>FiveM<span class="lvl ok">Public</span></h4>
        <p>Code du serveur (la fin de cfx.re/join/…) et pseudos de tes amis. Lobby les repère dans la liste des joueurs connectés.</p>
        <div class="field"><label for="f-fs">Serveurs</label><input id="f-fs" name="fivemServers" placeholder="abc123, xyz789" value="${esc(a.fivemServers)}"></div>
        <div class="field"><label for="f-fn">Pseudos de tes amis</label><input id="f-fn" name="fivemNames" placeholder="Kenzo, Lina" value="${esc(a.fivemNames)}"></div></div>
      ${soon.map(([k, t]) => `<div class="acc"><h4>${PLAT[k]}<span class="lvl mid">Bientôt</span></h4><p>${t}</p></div>`).join("")}
      <div class="acc"><h4>Autres plateformes<span class="lvl no">Pas d'API</span></h4><p>${none.map(k => PLAT[k]).join(", ")} ne donnent pas accès au statut des amis. Ils apparaîtront via Discord.</p></div>
      <div style="grid-column:1/-1;display:flex;gap:8px;flex-wrap:wrap"><button class="btn primary" type="submit">Enregistrer</button>${hasAccounts() ? `<button class="btn" type="button" data-act="forget">Tout délier</button>` : ""}</div>
    </form>`;
}
document.addEventListener("submit", e => {
  if (e.target.id !== "accForm") return; e.preventDefault();
  const f = new FormData(e.target);
  S.acc = { steam: f.get("steam").trim(), xbox: f.get("xbox").trim(), fivemServers: f.get("fivemServers").trim(), fivemNames: f.get("fivemNames").trim() };
  store.set("accounts", S.acc); S.friends = null; S.friendErr = [];
  toast("Comptes enregistrés"); renderComptes(); location.hash = "#amis"; loadFriends();
});

/* ---------- événements ---------- */
let toastT;
function toast(m) { const t = $("#toast"); t.textContent = m; t.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => t.hidden = true, 2400); }
function toggleFollow(id) {
  if (S.follow[id]) { delete S.follow[id]; toast("Retiré de tes jeux suivis"); }
  else { const g = gameById(id); if (!g) return; S.follow[id] = g; toast("Ajouté à tes jeux suivis"); }
  store.set("follow", S.follow); renderSorties();
  if (!$("#drawer").hidden) openGame(id);
}
document.addEventListener("click", e => {
  const t = e.target;
  const star = t.closest("[data-star]"); if (star) { e.stopPropagation(); toggleFollow(star.dataset.star); return; }
  const o = t.closest("[data-open]"); if (o) { $("#results").hidden = true; $("#q").value = ""; openGame(o.dataset.open); return; }
  const p = t.closest("[data-plat]"); if (p) { S.plat = p.dataset.plat; S.onlyFollow = false; renderSorties(); return; }
  const fp = t.closest("[data-fplat]"); if (fp) { S.friendPlat = fp.dataset.fplat; renderAmis(); return; }
  const add = t.closest("[data-addapp]");
  if (add) { const id = +add.dataset.addapp; if (!S.apps.some(a => a.appid === id)) { S.apps.push({ appid: id, name: add.dataset.name }); store.set("apps", S.apps); toast(add.dataset.name + " ajouté"); } S.updates = null; renderMaj(); loadUpdates(); return; }
  const un = t.closest("[data-unapp]");
  if (un) { S.apps = S.apps.filter(a => a.appid !== +un.dataset.unapp); store.set("apps", S.apps); S.updates = (S.updates || []).filter(u => u.appid !== +un.dataset.unapp); renderMaj(); return; }
  const act = t.closest("[data-act]")?.dataset.act;
  if (act === "only-follow") { S.onlyFollow = !S.onlyFollow; renderSorties(); }
  else if (act === "close") closeDrawer();
  else if (act === "reload-games") { S.gamesErr = ""; S.games = []; renderSorties(); loadGames(); }
  else if (act === "reload-news") { S.news = null; renderActus(); loadNews(); }
  else if (act === "forget") { S.acc = { steam: "", xbox: "", fivemServers: "", fivemNames: "" }; store.set("accounts", S.acc); S.friends = null; S.seen = {}; store.set("seen", {}); renderComptes(); renderAmis(); toast("Comptes déliés"); }
  if (t.id === "scrim") closeDrawer();
  if (!t.closest(".search")) $("#results").hidden = true;
  if (!t.closest(".addapp") && $("#appres")) $("#appres").hidden = true;
});
document.addEventListener("keydown", e => {
  if (e.key === "Escape") closeDrawer();
  if ((e.key === "Enter" || e.key === " ") && e.target.matches("[role=button][data-open]")) { e.preventDefault(); openGame(e.target.dataset.open); }
});

/* ---------- onglets ---------- */
const VIEWS = ["sorties", "maj", "actus", "amis", "comptes"];
const loaded = {};
function route() {
  const v = VIEWS.includes(location.hash.slice(1)) ? location.hash.slice(1) : "sorties";
  VIEWS.forEach(k => $("#v-" + k).hidden = k !== v);
  document.querySelectorAll("#tabs a").forEach(a => a.hash === "#" + v ? a.setAttribute("aria-current", "page") : a.removeAttribute("aria-current"));
  if (v === "maj" && !loaded.maj) { loaded.maj = 1; renderMaj(); loadUpdates(); }
  if (v === "actus" && !loaded.actus) { loaded.actus = 1; renderActus(); loadNews(); }
  if (v === "comptes") renderComptes();
  if (v === "amis") renderAmis();
  closeDrawer();
}
window.addEventListener("hashchange", route);

/* ---------- horloges ---------- */
function clockHTML(d) { const p = parts(d - Date.now()); return [["j", "Jours"], ["h", "Heures"], ["m", "Min"], ["s", "Sec"]].map(([k, l]) => `<div><b>${k === "j" ? p[k] : pad(p[k])}</b><span>${l}</span></div>`).join(""); }
function tick() {
  document.querySelectorAll("[data-clock]").forEach(c => c.innerHTML = clockHTML(+c.dataset.clock));
  document.querySelectorAll("[data-cd]").forEach(c => { const g = gameById(c.dataset.cd); if (!g) return; const [t, s] = short(g); c.textContent = t; c.classList.toggle("soon", s); });
}
setInterval(() => { if (!document.hidden) tick(); }, 1000);
setInterval(() => { if (!document.hidden && hasAccounts()) loadFriends(); }, 60000);
document.addEventListener("visibilitychange", () => { if (!document.hidden && hasAccounts() && Date.now() - S.friendsAt > 55000) loadFriends(); });

/* ---------- installation ---------- */
let installEvt;
window.addEventListener("beforeinstallprompt", e => { e.preventDefault(); installEvt = e; $("#install").hidden = false; });
$("#install").addEventListener("click", async () => { if (!installEvt) return; installEvt.prompt(); await installEvt.userChoice; installEvt = null; $("#install").hidden = true; });
if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => {});

renderSorties(); route(); loadGames(); loadFriends();
