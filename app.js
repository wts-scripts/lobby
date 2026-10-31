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

/* ---------- apparence : mode, thème, police ---------- */
const PREFS = Object.assign({ theme: "dark", palette: "wts", font: "michroma" }, store.get("prefs", {}));
// ordre : fond, surface, relief, trait, texte, texte doux, accent, accent 2, texte sur accent
const PALETTES = [
  { id: "wts", name: "WTS", note: "Le thème du site WTS", dark: ["#0a0a0a", "#111111", "#171717", "#262626", "#f3f3f4", "#a1a1aa", "#ff8a1f", "#a670f5", "#0a0a0a"], light: ["#ffffff", "#fafafa", "#f4f4f5", "#e5e5e5", "#111111", "#52525b", "#d9620b", "#6d16e2", "#ffffff"] },
  { id: "nuit", name: "Nuit", note: "Violet nuit et orange", dark: ["#12101c", "#1b1829", "#252136", "#332e4a", "#ece9f5", "#9a94b3", "#ff8a2a", "#8b6cff", "#1a0f02"], light: ["#f6f4fb", "#ffffff", "#eeeaf8", "#dcd6ec", "#1c1830", "#615a7d", "#d9620a", "#6a4ce0", "#ffffff"] },
  { id: "graphite", name: "Graphite", note: "Noir et blanc, accent bleu", dark: ["#0d0d0f", "#151518", "#1c1c20", "#2a2a30", "#f4f4f5", "#a1a1aa", "#e4e4e7", "#60a5fa", "#0d0d0f"], light: ["#fafafa", "#f4f4f5", "#ececee", "#e4e4e7", "#18181b", "#52525b", "#18181b", "#2563eb", "#ffffff"] },
  { id: "citron", name: "Citron", note: "Vert citron et jaune", dark: ["#0a0a0a", "#111111", "#171717", "#262626", "#f3f3f4", "#a1a1aa", "#3cf08a", "#ffd60a", "#0a0a0a"], light: ["#ffffff", "#fafafa", "#f4f4f5", "#e5e5e5", "#111111", "#52525b", "#0f9d4a", "#b88a00", "#ffffff"] },
  { id: "sunset", name: "Sunset", note: "Rose corail et orange", dark: ["#0a0a0a", "#111111", "#171717", "#262626", "#f3f3f4", "#a1a1aa", "#ff4f7b", "#ff8c2a", "#0a0a0a"], light: ["#ffffff", "#fafafa", "#f4f4f5", "#e5e5e5", "#111111", "#52525b", "#e8174f", "#f06a0c", "#ffffff"] },
  { id: "sable", name: "Sable", note: "Or et terre cuite", dark: ["#0a0a0a", "#111111", "#171717", "#262626", "#f3f3f4", "#a1a1aa", "#ffc35a", "#ff7a3d", "#0a0a0a"], light: ["#ffffff", "#fafafa", "#f4f4f5", "#e5e5e5", "#111111", "#52525b", "#b07a0e", "#c2501f", "#ffffff"] },
  { id: "sakura", name: "Sakura", note: "Rose vif et lavande", dark: ["#0a0a0a", "#111111", "#171717", "#262626", "#f3f3f4", "#a1a1aa", "#ff7ac6", "#b48cff", "#0a0a0a"], light: ["#ffffff", "#fafafa", "#f4f4f5", "#e5e5e5", "#111111", "#52525b", "#e0178a", "#8b4dff", "#ffffff"] },
  { id: "ocean", name: "Océan", note: "Bleu électrique et turquoise", dark: ["#050d16", "#0a1622", "#0f1e2e", "#18304a", "#e6f3ff", "#93b0c9", "#3ba7ff", "#2ef2c8", "#050d16"], light: ["#eaf3fa", "#e0edf7", "#d4e5f2", "#c2d8ea", "#08202f", "#3d5b73", "#0077d9", "#00a88a", "#ffffff"] },
  { id: "neon", name: "Néon", note: "Cyan et magenta, nuit", dark: ["#070614", "#0e0c22", "#15122e", "#241f48", "#eef0ff", "#a5a8d6", "#22d3ee", "#e879f9", "#070614"], light: ["#f7f7ff", "#efeffd", "#e5e5fa", "#d6d6f2", "#16143a", "#4f4d82", "#0891b2", "#c026d3", "#ffffff"] }
];
const PK = ["bg", "surface", "raise", "line", "fg", "muted", "accent", "violet", "on-accent"];
(() => {
  const vars = (v, mode) => PK.map((k, i) => `--${k}:${v[i]}`).join(";") + `;color-scheme:${mode}`;
  const css = PALETTES.filter(p => p.id !== "nuit").map(p => {
    const sel = `:root[data-palette="${p.id}"]`;
    return `${sel}{${vars(p.dark, "dark")}}@media (prefers-color-scheme: light){${sel}:not([data-theme="dark"]){${vars(p.light, "light")}}}${sel}[data-theme="light"]{${vars(p.light, "light")}}${sel}[data-theme="dark"]{${vars(p.dark, "dark")}}`;
  }).join("\n");
  const st = document.createElement("style"); st.textContent = css; document.head.appendChild(st);
})();
// d = titres, b = texte, n = chiffres ; ds / ns = mise à l'échelle des titres / chiffres pour garder la même taille visuelle
const FONTS = [
  { id: "michroma", name: "Michroma", sub: "Titillium Web", d: "Michroma", b: "Titillium Web", n: "Michroma", q: ["Michroma", "Titillium+Web:wght@400;600"], ds: .68, ns: .76 },
  { id: "chakra", name: "Chakra Petch", sub: "Barlow · JetBrains Mono", d: "Chakra Petch", b: "Barlow", n: "JetBrains Mono", q: ["Chakra+Petch:wght@500;600;700", "Barlow:wght@400;500;600", "JetBrains+Mono:wght@500;700"], ds: 1, ns: 1 },
  { id: "rajdhani", name: "Rajdhani", sub: "Titillium Web", d: "Rajdhani", b: "Titillium Web", n: "Rajdhani", q: ["Rajdhani:wght@500;600;700", "Titillium+Web:wght@400;600"], ds: 1.12, ns: 1.12 },
  { id: "orbitron", name: "Orbitron", sub: "Exo 2", d: "Orbitron", b: "Exo 2", n: "Orbitron", q: ["Orbitron:wght@500;600;700", "Exo+2:wght@400;500;600"], ds: .78, ns: .82 },
  { id: "russo", name: "Russo One", sub: "Barlow", d: "Russo One", b: "Barlow", n: "Russo One", q: ["Russo+One", "Barlow:wght@400;500;600"], ds: .92, ns: .95 },
  { id: "teko", name: "Teko", sub: "Saira", d: "Teko", b: "Saira", n: "Teko", q: ["Teko:wght@500;600;700", "Saira:wght@400;500;600"], ds: 1.4, ns: 1.35 },
  { id: "bebas", name: "Bebas Neue", sub: "Manrope", d: "Bebas Neue", b: "Manrope", n: "Bebas Neue", q: ["Bebas+Neue", "Manrope:wght@400;500;600;700"], ds: 1.35, ns: 1.3 },
  { id: "oxanium", name: "Oxanium", sub: "IBM Plex Sans", d: "Oxanium", b: "IBM Plex Sans", n: "Oxanium", q: ["Oxanium:wght@500;600;700", "IBM+Plex+Sans:wght@400;500;600"], ds: 1, ns: 1 },
  { id: "unbounded", name: "Unbounded", sub: "DM Sans", d: "Unbounded", b: "DM Sans", n: "Unbounded", q: ["Unbounded:wght@500;600;700", "DM+Sans:wght@400;500;600"], ds: .78, ns: .82 },
  { id: "pixel", name: "Press Start 2P", sub: "Space Mono", d: "Press Start 2P", b: "Space Mono", n: "Press Start 2P", q: ["Press+Start+2P", "Space+Mono:wght@400;700"], ds: .55, ns: .68 },
  // série « gras et impactant »
  { id: "anton", name: "Anton", sub: "Archivo", d: "Anton", b: "Archivo", n: "Anton", q: ["Anton", "Archivo:wght@400;500;600;800"], ds: 1.25, ns: 1.15 },
  { id: "archivoblack", name: "Archivo Black", sub: "Archivo", d: "Archivo Black", b: "Archivo", n: "Archivo Black", q: ["Archivo+Black", "Archivo:wght@400;500;600;800"], ds: .88, ns: .9 },
  { id: "bungee", name: "Bungee", sub: "Barlow", d: "Bungee", b: "Barlow", n: "Bungee", q: ["Bungee", "Barlow:wght@400;500;600"], ds: .8, ns: .85 },
  { id: "dela", name: "Dela Gothic One", sub: "Manrope", d: "Dela Gothic One", b: "Manrope", n: "Dela Gothic One", q: ["Dela+Gothic+One", "Manrope:wght@400;500;600;700"], ds: .86, ns: .9 },
  { id: "bigshoulders", name: "Big Shoulders Display", sub: "Barlow", d: "Big Shoulders Display", b: "Barlow", n: "Big Shoulders Display", q: ["Big+Shoulders+Display:wght@700;800;900", "Barlow:wght@400;500;600"], ds: 1.4, ns: 1.35 },
  { id: "bowlby", name: "Bowlby One SC", sub: "Rubik", d: "Bowlby One SC", b: "Rubik", n: "Bowlby One SC", q: ["Bowlby+One+SC", "Rubik:wght@400;500;600;700"], ds: .86, ns: .9 },
  { id: "rubikmono", name: "Rubik Mono One", sub: "Rubik", d: "Rubik Mono One", b: "Rubik", n: "Rubik Mono One", q: ["Rubik+Mono+One", "Rubik:wght@400;500;600;700"], ds: .68, ns: .78 },
  { id: "staatliches", name: "Staatliches", sub: "Work Sans", d: "Staatliches", b: "Work Sans", n: "Staatliches", q: ["Staatliches", "Work+Sans:wght@400;500;600;700"], ds: 1.3, ns: 1.25 },
  { id: "titan", name: "Titan One", sub: "Nunito", d: "Titan One", b: "Nunito", n: "Titan One", q: ["Titan+One", "Nunito:wght@400;600;700;800"], ds: .95, ns: .97 },
  { id: "passion", name: "Passion One", sub: "Archivo", d: "Passion One", b: "Archivo", n: "Passion One", q: ["Passion+One:wght@400;700;900", "Archivo:wght@400;500;600;800"], ds: 1.25, ns: 1.25 }
];
const fontURL = qs => "https://fonts.googleapis.com/css2?" + qs.map(q => "family=" + q).join("&") + "&display=swap";
function applyAppearance() {
  const r = document.documentElement;
  if (PREFS.theme === "system") delete r.dataset.theme; else r.dataset.theme = PREFS.theme;
  if (PREFS.palette === "nuit") delete r.dataset.palette; else r.dataset.palette = PREFS.palette;
  const f = FONTS.find(x => x.id === PREFS.font) || FONTS[0];
  $("#fontlink").href = fontURL(f.q);
  const st = r.style;
  st.setProperty("--display", `"${f.d}",system-ui,sans-serif`);
  st.setProperty("--body", `"${f.b}",system-ui,sans-serif`);
  st.setProperty("--mono", `"${f.n}",ui-monospace,monospace`);
  st.setProperty("--ds", f.ds); st.setProperty("--ns", f.ns);
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) setTimeout(() => meta.content = getComputedStyle(document.body).backgroundColor, 0);
}
function savePrefs() { store.set("prefs", PREFS); applyAppearance(); renderReglages(); }
const isDarkNow = () => PREFS.theme === "dark" || (PREFS.theme === "system" && !matchMedia("(prefers-color-scheme: light)").matches);
let previewFonts = false;
function renderReglages() {
  const el = $("#v-reglages"); if (!el) return;
  if (!previewFonts) {   // charge toutes les polices une seule fois pour les aperçus
    previewFonts = true;
    const l = document.createElement("link"); l.rel = "stylesheet"; l.href = fontURL([...new Set(FONTS.flatMap(f => f.q))]); document.head.appendChild(l);
  }
  const dark = isDarkNow();
  el.innerHTML = `<div class="row"><h2>Réglages</h2></div>
  <div class="set">
    <div><h3>Mode</h3><div class="seg">${[["system", "Système"], ["dark", "Sombre"], ["light", "Clair"]].map(([v, l]) => `<button data-pref="theme" data-val="${v}" aria-pressed="${PREFS.theme === v}">${l}</button>`).join("")}</div></div>
    <div><h3>Thème</h3><div class="pals">${PALETTES.map(p => { const v = dark ? p.dark : p.light; return `<button class="pal" data-pref="palette" data-val="${p.id}" aria-pressed="${PREFS.palette === p.id}" style="--pbg:${v[1]};--pfg:${v[4]}">
      <span class="sw"><i style="background:${v[6]}"></i><i style="background:${v[7]}"></i><i style="background:${v[2]};border:1px solid ${v[3]}"></i></span>
      <span><b>${esc(p.name)}</b><small>${esc(p.note)}</small></span></button>`; }).join("")}</div></div>
    <div><h3>Police</h3><div class="fonts">${FONTS.map(f => `<button class="fnt" data-pref="font" data-val="${f.id}" aria-pressed="${PREFS.font === f.id}">
      <span class="fd" style="font-family:'${f.d}',sans-serif;font-size:${Math.round(26 * f.ds)}px">Grand Theft Auto VI</span>
      <span class="fn" style="font-family:'${f.n}',monospace;font-size:${Math.round(18 * f.ns)}px">22 j 10:41:07</span>
      <span class="fb" style="font-family:'${f.b}',sans-serif">${esc(f.name)} · ${esc(f.sub)}</span></button>`).join("")}</div></div>
  </div>`;
}
matchMedia("(prefers-color-scheme: light)").addEventListener("change", () => { applyAppearance(); if (!$("#v-reglages").hidden) renderReglages(); });
applyAppearance();

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
  if (img.dataset.alt) { const alt = img.dataset.alt; delete img.dataset.alt; img.src = alt; return; }   // 2e image avant l'illustration
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
    <div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn primary" data-star="${g.id}" aria-pressed="${!!S.follow[g.id]}">${S.follow[g.id] ? "★ Suivi" : "☆ Suivre ce jeu"}</button></div>
    ${g.video ? `<div><h5>Bande-annonce</h5><div class="video"><iframe src="https://www.youtube-nocookie.com/embed/${encodeURIComponent(g.video)}?rel=0" title="Bande-annonce de ${esc(g.t)}" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen loading="lazy"></iframe></div></div>` : ""}
    ${g.shots && g.shots.length ? `<div><h5>Images</h5><div class="gallery">${g.shots.map((u, i) => `<button data-shot="${i}" aria-label="Agrandir l'image ${i + 1}"><img src="${esc(u)}" alt="" loading="lazy"></button>`).join("")}</div></div>` : ""}
    ${g.sum ? `<div><h5>Résumé</h5><span class="sum">${esc(g.sum)}</span></div>` : ""}
    ${g.dev ? `<div><h5>Studio</h5><span class="sum">${esc(g.dev)}</span></div>` : ""}
    <div><h5>Actualités</h5><div class="mini" id="dNews"><span style="color:var(--muted)">Recherche des actus…</span></div></div>`;
  dr.hidden = $("#scrim").hidden = false; dr.scrollTop = 0; tick();
  S.drawerGame = g.id; S.shots = g.shots || [];
  dr.querySelector("[data-act=close]").focus();
  try {
    const words = g.t.replace(/[:\-–].*$/, "").trim();
    const j = await api("/api/news?q=" + encodeURIComponent(words));
    if ($("#dTitle") && $("#dTitle").textContent === g.t)
      $("#dNews").innerHTML = j.news.length ? j.news.slice(0, 5).map(n => `<a href="#" data-read="${reg("news", n)}"><img src="${esc(n.img || art(n.t, "mountains", 320, 180))}" alt="" data-k="${esc(n.t)}" data-w="320" data-h="180"><span>${esc(n.t)}<br><span class="meta">${esc(n.src)} · ${ago(n.d)}</span></span></a>`).join("")
        : `<span style="color:var(--muted)">Pas d'actu récente sur ce jeu.</span>`;
  } catch { $("#dNews") && ($("#dNews").innerHTML = `<span style="color:var(--muted)">Actus indisponibles pour le moment.</span>`); }
}
function closeDrawer() { $("#drawer").hidden = $("#scrim").hidden = true; S.drawerGame = null; if ($("#lightbox")) $("#lightbox").hidden = true; }

/* ---------- lecteur intégré (mises à jour, actus) ---------- */
const READ = new Map();
function reg(kind, item) { const k = kind + ":" + (item.url || item.t); READ.set(k, Object.assign({ kind }, item)); return esc(k); }
function openReader(key) {
  const it = READ.get(key); if (!it) return;
  const back = !$("#drawer").hidden && S.drawerGame ? S.drawerGame : null;
  const label = { patch: "Patch", hotfix: "Correctif", saison: "Saison" };
  const img = it.img || art(it.t, kindOf("", it.t), 1280, 720);
  let html = it.html || (it.txt ? "<p>" + esc(it.txt) + "</p>" : "");
  const plain = html.replace(/<[^>]+>/g, "").trim();
  const short = it.kind === "news" && plain.length < 600;
  const src = it.kind === "upd" ? "Steam" : it.src;
  const dr = $("#drawer");
  dr.innerHTML = `<div class="dtop">${back ? `<button class="btn" data-back="${esc(back)}">← ${esc((gameById(back) || {}).t || "Retour")}</button>` : "<span></span>"}<button class="btn" data-act="close">Fermer</button></div>
    <div class="banner"><img src="${esc(it.hero && !it.ownImg ? it.hero : img)}" ${it.hero && !it.ownImg ? `data-alt="${esc(img)}"` : ""} alt="" data-k="${esc(it.t)}" data-w="1280" data-h="720"></div>
    <div><div class="meta">${it.kind === "upd" ? `<span class="tag ${it.type}">${label[it.type]}</span>${esc(it.game || "")}` : esc(it.src || "")} · ${ago(it.d)}</div><h3 id="dTitle">${esc(it.t)}</h3></div>
    <div class="prose" id="prose">${html || "<p>Pas de texte pour cet article.</p>"}</div>
    ${short ? `<p class="note">${esc(it.src)} ne publie qu'un extrait de cet article. La suite est sur son site.</p>` : ""}
    ${it.url ? `<p class="meta">Source : <a href="${esc(it.url)}" target="_blank" rel="noopener">${short ? "lire l'article complet sur " + esc(src) : esc(src)}</a></p>` : ""}`;
  // pas de doublon avec l'image du haut ; les liens du texte s'ouvrent à part
  const p = $("#prose");
  p.querySelectorAll("img").forEach((im, i) => { if (i === 0 && it.img && im.src === it.img && (it.ownImg || !it.hero)) im.remove(); });
  p.querySelectorAll("a[href]").forEach(a => { a.target = "_blank"; a.rel = "noopener"; });
  dr.hidden = $("#scrim").hidden = false; dr.scrollTop = 0;
  if (!back) S.drawerGame = null;
  dr.querySelector("[data-act=close]").focus();
}

/* ---------- images en grand ---------- */
let lbIndex = 0;
function lightbox(i) {
  const list = S.shots || []; if (!list.length) return;
  lbIndex = (i + list.length) % list.length;
  let lb = $("#lightbox");
  if (!lb) { lb = document.createElement("div"); lb.id = "lightbox"; lb.setAttribute("role", "dialog"); lb.setAttribute("aria-label", "Image en grand"); document.body.appendChild(lb); }
  lb.innerHTML = `<img src="${esc(list[lbIndex])}" alt=""><button class="lb-prev" data-lb="-1" aria-label="Image précédente">‹</button><button class="lb-next" data-lb="1" aria-label="Image suivante">›</button><button class="lb-close" data-lb="x" aria-label="Fermer">×</button><span class="lb-n">${lbIndex + 1} / ${list.length}</span>`;
  lb.hidden = false;
}


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
      : `<div class="feed">${S.updates.map(u => `<a class="item" href="#" data-read="${reg("upd", Object.assign({ game: name(u.appid) }, u))}">
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
      : `<div class="news">${S.news.map(n => `<a class="ncard" href="#" data-read="${reg("news", n)}">
          <img src="${esc(n.img || art(n.t, kindOf("", n.t), 640, 360))}" alt="" data-k="${esc(n.t)}" loading="lazy">
          <div><span class="meta">${esc(n.src)} · ${ago(n.d)}</span><h4>${esc(n.t)}</h4>${n.txt ? `<p>${esc(n.txt)}</p>` : ""}</div></a>`).join("")}</div>`}`;
}

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
  const rd = t.closest("[data-read]"); if (rd) { e.preventDefault(); openReader(rd.dataset.read); return; }
  const bk = t.closest("[data-back]"); if (bk) { openGame(bk.dataset.back); return; }
  const sh = t.closest("[data-shot]"); if (sh) { lightbox(+sh.dataset.shot); return; }
  const lbb = t.closest("[data-lb]"); if (lbb) { if (lbb.dataset.lb === "x") $("#lightbox").hidden = true; else lightbox(lbIndex + +lbb.dataset.lb); return; }
  if (t.id === "lightbox") { t.hidden = true; return; }
  const pref = t.closest("[data-pref]"); if (pref) { PREFS[pref.dataset.pref] = pref.dataset.val; savePrefs(); return; }
  const star = t.closest("[data-star]"); if (star) { e.stopPropagation(); toggleFollow(star.dataset.star); return; }
  const o = t.closest("[data-open]"); if (o) { $("#results").hidden = true; $("#q").value = ""; openGame(o.dataset.open); return; }
  const p = t.closest("[data-plat]"); if (p) { S.plat = p.dataset.plat; S.onlyFollow = false; renderSorties(); return; }
  const add = t.closest("[data-addapp]");
  if (add) { const id = +add.dataset.addapp; if (!S.apps.some(a => a.appid === id)) { S.apps.push({ appid: id, name: add.dataset.name }); store.set("apps", S.apps); toast(add.dataset.name + " ajouté"); } S.updates = null; renderMaj(); loadUpdates(); return; }
  const un = t.closest("[data-unapp]");
  if (un) { S.apps = S.apps.filter(a => a.appid !== +un.dataset.unapp); store.set("apps", S.apps); S.updates = (S.updates || []).filter(u => u.appid !== +un.dataset.unapp); renderMaj(); return; }
  const act = t.closest("[data-act]")?.dataset.act;
  if (act === "only-follow") { S.onlyFollow = !S.onlyFollow; renderSorties(); }
  else if (act === "close") closeDrawer();
  else if (act === "reload-games") { S.gamesErr = ""; S.games = []; ["accounts", "seen", "myProfile", "accSub", "twitchAuth", "chatTab", "liveReopen"].forEach(k => { try { localStorage.removeItem("lobby." + k); } catch {} });
renderSorties(); loadGames(); }
  else if (act === "reload-news") { S.news = null; renderActus(); loadNews(); }
  if (t.id === "scrim") closeDrawer();
  if (!t.closest(".search")) $("#results").hidden = true;
  if (!t.closest(".addapp") && $("#appres")) $("#appres").hidden = true;
});
document.addEventListener("keydown", e => {
  const lb = $("#lightbox");
  if (lb && !lb.hidden) { if (e.key === "Escape") lb.hidden = true; if (e.key === "ArrowRight") lightbox(lbIndex + 1); if (e.key === "ArrowLeft") lightbox(lbIndex - 1); return; }
  if (e.key === "Escape") closeDrawer();
  if ((e.key === "Enter" || e.key === " ") && e.target.matches("[role=button][data-open]")) { e.preventDefault(); openGame(e.target.dataset.open); }
});

/* ---------- onglets ---------- */
const VIEWS = ["sorties", "evenements", "maj", "actus", "tendances", "esport", "gratuits", "abonnements", "meta", "pc", "reglages"];
const loaded = {};
function route() {
  const v = VIEWS.includes(location.hash.slice(1)) ? location.hash.slice(1) : "sorties";
  VIEWS.forEach(k => $("#v-" + k).hidden = k !== v);
  document.querySelectorAll("#tabs a").forEach(a => a.hash === "#" + v ? a.setAttribute("aria-current", "page") : a.removeAttribute("aria-current"));
  if (v === "maj" && !loaded.maj) { loaded.maj = 1; renderMaj(); loadUpdates(); }
  if (v === "actus" && !loaded.actus) { loaded.actus = 1; renderActus(); loadNews(); }
  if (v === "reglages") renderReglages();
  if (v === "meta" && window.renderMetaTab) window.renderMetaTab();
  if (v === "pc" && window.renderPC) window.renderPC();
  if (window["render_" + v]) window["render_" + v]();
  if (window.onRoute) window.onRoute(v);
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

/* ---------- installation ---------- */
let installEvt;
window.addEventListener("beforeinstallprompt", e => { e.preventDefault(); installEvt = e; $("#install").hidden = false; });
$("#install").addEventListener("click", async () => { if (!installEvt) return; installEvt.prompt(); await installEvt.userChoice; installEvt = null; $("#install").hidden = true; });
if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => {});

// premier affichage une fois tous les scripts chargés (Meta, Config PC)
["accounts", "seen", "myProfile", "accSub", "twitchAuth", "chatTab", "liveReopen"].forEach(k => { try { localStorage.removeItem("lobby." + k); } catch {} });
renderSorties(); loadGames();
if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", route); else setTimeout(route, 0);
