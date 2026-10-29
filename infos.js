/* WTS Lobby · rubriques d'info : Événements, Jeux gratuits, Tendances, Esport, Abonnements */
"use strict";
(() => {
  const host = location.hostname || "localhost";
  const adminKey = () => store.get("adminKey", "");
  const fmtN = n => n == null ? "—" : n >= 1e6 ? (n / 1e6).toFixed(1).replace(".", ",") + " M" : n >= 1e4 ? Math.round(n / 1000) + " k" : n.toLocaleString("fr-FR");
  const day = ms => new Date(ms).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
  const hm = ms => new Date(ms).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  async function get(url, opts) {
    const r = await fetch(url, opts); const j = await r.json().catch(() => ({}));
    if (!r.ok) throw Object.assign(new Error(j.error || "Le serveur ne répond pas (" + r.status + ")."), { setup: !!j.setup });
    return j;
  }
  const note = (err, setup) => err ? `<p class="${setup ? "note" : "err"}">${esc(err)}</p>` : "";

  // comptes à rebours « jusqu'à » (data-until = ms) : mis à jour chaque seconde
  function untilText(ms, prefix) {
    const d = ms - Date.now(); if (d <= 0) return prefix === "end" ? "Terminé" : "C'est parti";
    const p = parts(d);
    return (prefix === "end" ? "Plus que " : "Dans ") + (p.j ? p.j + " j " : "") + pad(p.h) + ":" + pad(p.m) + ":" + pad(p.s);
  }
  setInterval(() => { if (document.hidden) return; document.querySelectorAll("[data-until]").forEach(el => el.textContent = untilText(+el.dataset.until, el.dataset.mode)); }, 1000);

  // lecteur vidéo dans l'appli (Twitch, YouTube), sinon lien
  function embedOf(url) {
    const u = String(url || "");
    let m = u.match(/twitch\.tv\/([a-z0-9_]{3,25})(?:$|[/?#])/i); if (m) return `https://player.twitch.tv/?channel=${m[1].toLowerCase()}&parent=${encodeURIComponent(host)}&autoplay=true`;
    m = u.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/live\/)([\w-]{11})/); if (m) return `https://www.youtube-nocookie.com/embed/${m[1]}?autoplay=1`;
    return null;
  }
  function openDrawer(html) { const dr = $("#drawer"); dr.innerHTML = `<div class="dtop"><span></span><button class="btn" data-act="close">Fermer</button></div>` + html; dr.hidden = $("#scrim").hidden = false; dr.scrollTop = 0; S.drawerGame = null; }

  /* =================== ÉVÉNEMENTS =================== */
  const KIND = { showcase: "Showcase", salon: "Salon", ceremonie: "Cérémonie", soldes: "Soldes", esport: "Esport", autre: "Événement" };
  const E = { list: null, err: "", admin: false, editable: false };
  const evStart = e => e.time ? Date.parse(e.start) : Date.parse(e.start + "T00:00:00");
  const evEnd = e => e.end ? Date.parse((e.end.length > 10 ? e.end : e.end + "T23:59:59")) : (e.time ? Date.parse(e.start) + 3 * 3600e3 : Date.parse(e.start + "T23:59:59"));
  function evWhen(e) {
    const s = new Date(evStart(e)), opts = { day: "numeric", month: "long" };
    if (e.end && e.end.slice(0, 10) !== e.start.slice(0, 10)) return "Du " + s.toLocaleDateString("fr-FR", opts) + " au " + new Date(evEnd(e)).toLocaleDateString("fr-FR", Object.assign({ year: "numeric" }, opts));
    return s.toLocaleDateString("fr-FR", Object.assign({ weekday: "long", year: "numeric" }, opts)) + (e.time ? " à " + hm(s) : "");
  }
  function evCount(e) {
    const now = Date.now(), s = evStart(e), en = evEnd(e);
    if (now >= s && now <= en) return `<span class="evnow">En cours</span>`;
    if (e.time) return `<span class="evcd" data-until="${s}">${untilText(s)}</span>`;
    const days = Math.ceil((new Date(e.start + "T00:00:00") - new Date(new Date().toDateString())) / 864e5);
    return `<span class="evcd">${days <= 0 ? "Aujourd'hui" : days === 1 ? "Demain" : "J-" + days}</span>`;
  }
  async function loadEvents() {
    try { const j = await get("/api/events", { headers: adminKey() ? { "x-lobby-key": adminKey() } : {} }); E.list = j.events; E.admin = j.admin; E.editable = j.editable; E.err = ""; }
    catch (x) { E.list = E.list || []; E.err = x.message; }
    renderEvents();
  }
  function renderEvents() {
    const el = $("#v-evenements"); if (!el) return;
    const list = E.list, next = list && list[0];
    el.innerHTML = `<div class="row"><h2>Événements</h2>${E.admin ? `<button class="btn primary" data-evnew>Ajouter un événement</button>` : ""}</div>
      ${note(E.err)}
      ${!list ? `<div class="empty">Chargement des événements…</div>` : !list.length ? `<div class="empty">Aucun événement prévu pour le moment.</div>` : `
      <div class="hero evhero" style="--img:url('${art(next.name, next.kind === "soldes" ? "bars" : next.kind === "esport" ? "grid" : "city", 1280, 520)}')">
        <div><div class="lbl">Prochain événement · ${esc(KIND[next.kind] || "Événement")}</div><h3>${esc(next.name)}</h3><p>${esc(evWhen(next))}${next.place ? " · " + esc(next.place) : ""}</p></div>
        ${next.time && evStart(next) > Date.now() ? `<div class="clock" data-clock="${evStart(next)}"></div>` : `<div class="evbig">${evCount(next)}</div>`}
      </div>
      <div class="evlist">${list.map(e => `<article class="evcard">
        <div class="evdate"><b>${new Date(evStart(e)).getDate()}</b><span>${new Date(evStart(e)).toLocaleDateString("fr-FR", { month: "short" }).replace(".", "")}</span></div>
        <div class="evbody"><div class="meta"><span class="tag ev-${e.kind}">${esc(KIND[e.kind] || "Événement")}</span>${e.place ? esc(e.place) : ""}</div>
          <h4>${esc(e.name)}</h4><p class="evwhen">${esc(evWhen(e))}${e.time ? "" : " · heure à confirmer"}</p>${e.desc ? `<p class="evdesc">${esc(e.desc)}</p>` : ""}
          <div class="mact" style="margin:0">${e.url ? `<a class="btn" href="${esc(e.url)}" target="_blank" rel="noopener">Site officiel</a>` : ""}${E.admin ? `<button class="linkbtn" data-evedit="${esc(e.id)}">Modifier</button><button class="linkbtn" data-evdel="${esc(e.id)}">Supprimer</button>` : ""}</div></div>
        <div class="evright">${evCount(e)}</div></article>`).join("")}</div>`}
      <p class="meta" style="margin-top:16px">Les dates viennent des annonces officielles${E.admin ? "" : " et sont mises à jour par l'équipe WTS Lobby"}.</p>`;
    tick();
  }
  function evForm(e) {
    e = e || { kind: "showcase", start: "", time: false };
    const date = (e.start || "").slice(0, 10), time = e.time ? e.start.slice(11, 16) : "";
    openDrawer(`<h3 id="dTitle">${e.id ? "Modifier l'événement" : "Nouvel événement"}</h3>
      <form id="evform" class="mform" data-id="${esc(e.id || "")}">
        <div class="field"><label for="ev-name">Nom</label><input id="ev-name" required maxlength="80" value="${esc(e.name || "")}" placeholder="Nintendo Direct"></div>
        <div class="two"><div class="field"><label for="ev-kind">Type</label><select id="ev-kind">${Object.entries(KIND).map(([k, l]) => `<option value="${k}" ${e.kind === k ? "selected" : ""}>${l}</option>`).join("")}</select></div>
          <div class="field"><label for="ev-place">Lieu (facultatif)</label><input id="ev-place" maxlength="60" value="${esc(e.place || "")}" placeholder="En ligne"></div></div>
        <div class="two"><div class="field"><label for="ev-date">Date</label><input id="ev-date" type="date" required value="${esc(date)}"></div>
          <div class="field"><label for="ev-time">Heure, heure de Paris (facultatif)</label><input id="ev-time" type="time" value="${esc(time)}"></div></div>
        <div class="field"><label for="ev-end">Dernier jour, s'il dure plusieurs jours (facultatif)</label><input id="ev-end" type="date" value="${esc((e.end || "").slice(0, 10))}"></div>
        <div class="field"><label for="ev-url">Site officiel ou lien du direct (facultatif)</label><input id="ev-url" maxlength="200" value="${esc(e.url || "")}" placeholder="https://"></div>
        <div class="field"><label for="ev-desc">Description (facultatif)</label><textarea id="ev-desc" maxlength="300" rows="3">${esc(e.desc || "")}</textarea></div>
        <p class="err" id="evErr" hidden></p><button class="btn primary" type="submit">Enregistrer</button></form>`);
    $("#ev-name").focus();
  }

  /* =================== JEUX GRATUITS =================== */
  const F = { items: null, err: "", failed: [], kind: "game", store: "" };
  async function loadFree() {
    try { const j = await get("/api/free"); F.items = j.items; F.failed = j.failed || []; F.err = ""; }
    catch (x) { F.items = F.items || []; F.err = x.message; }
    renderFree();
  }
  function freeCard(g) {
    return `<button class="fcard" data-free="${esc(g.id)}">
      <span class="fimg"><img src="${esc(g.img || art(g.title, "mountains", 640, 300))}" alt="" loading="lazy" data-k="${esc(g.title)}" data-w="640" data-h="300"><span class="fstore">${esc(g.store)}</span></span>
      <span class="fbody"><b>${esc(g.title)}</b>
        <span class="fprice">${g.worth ? `<s>${esc(g.worth)}</s>` : ""}<em>${g.upcoming ? "Bientôt gratuit" : "Gratuit"}</em></span>
        ${g.upcoming ? `<span class="fend" data-until="${g.start}" data-mode="start">${untilText(g.start)}</span>` : g.end ? `<span class="fend" data-until="${g.end}" data-mode="end">${untilText(g.end, "end")}</span>` : `<span class="fend meta">Sans date de fin annoncée</span>`}</span></button>`;
  }
  function renderFree() {
    const el = $("#v-gratuits"); if (!el) return;
    const all = F.items || [];
    const byKind = all.filter(g => g.kind === F.kind);
    const stores = [...new Set(byKind.map(g => g.store))].sort((a, b) => byKind.filter(g => g.store === b).length - byKind.filter(g => g.store === a).length);
    const list = byKind.filter(g => !F.store || g.store === F.store);
    const now = list.filter(g => !g.upcoming).sort((a, b) => (a.src === "epic" ? 0 : 1) - (b.src === "epic" ? 0 : 1) || (a.end || 9e15) - (b.end || 9e15));
    const soon = list.filter(g => g.upcoming).sort((a, b) => a.start - b.start);
    el.innerHTML = `<div class="row"><h2>Jeux gratuits</h2>
        <div class="seg">${[["game", "Jeux à garder"], ["loot", "Contenus en jeu"], ["beta", "Bêtas"]].map(([k, l]) => `<button data-fkind="${k}" aria-pressed="${F.kind === k}">${l}</button>`).join("")}</div></div>
      ${note(F.err)}${F.failed.length ? `<p class="note">Indisponible pour le moment : ${esc(F.failed.join(", "))}.</p>` : ""}
      ${stores.length > 1 ? `<div class="chips" style="margin-bottom:16px"><button class="chip" data-fstore="" aria-pressed="${!F.store}">Toutes</button>${stores.map(s => `<button class="chip" data-fstore="${esc(s)}" aria-pressed="${F.store === s}">${esc(s)}</button>`).join("")}</div>` : ""}
      ${F.items === null ? `<div class="fgrid">${'<div class="skel" style="aspect-ratio:4/3.2"></div>'.repeat(6)}</div>`
        : !list.length ? `<div class="empty">Rien de gratuit dans cette catégorie pour le moment.</div>` : `
        ${now.length ? `<h3 class="subh">À récupérer maintenant</h3><div class="fgrid">${now.map(freeCard).join("")}</div>` : ""}
        ${soon.length ? `<h3 class="subh">Bientôt gratuit</h3><div class="fgrid">${soon.map(freeCard).join("")}</div>` : ""}`}
      <p class="meta" style="margin-top:16px">Offres Epic Games Store et giveaways recensés par <a href="https://www.gamerpower.com" target="_blank" rel="noopener">GamerPower</a>. Récupérer un jeu se fait sur la boutique concernée, avec ton compte.</p>`;
  }
  function openFree(id) {
    const g = (F.items || []).find(x => x.id === id); if (!g) return;
    openDrawer(`<div class="banner"><img src="${esc(g.img || art(g.title, "mountains", 1280, 720))}" alt="" data-k="${esc(g.title)}" data-w="1280" data-h="720"></div>
      <div><div class="meta"><span class="plat">${esc(g.store)}</span> ${g.worth ? `Valeur ${esc(g.worth)}` : ""}</div><h3 id="dTitle">${esc(g.title)}</h3></div>
      <div class="fbig">${g.upcoming ? `<span>Gratuit à partir du ${esc(day(g.start))} à ${hm(g.start)}</span><b data-until="${g.start}">${untilText(g.start)}</b>` : g.end ? `<span>Gratuit jusqu'au ${esc(day(g.end))} à ${hm(g.end)}</span><b data-until="${g.end}" data-mode="end">${untilText(g.end, "end")}</b>` : `<span>Gratuit, sans date de fin annoncée</span>`}</div>
      ${g.desc ? `<p class="sum" style="margin:0">${esc(g.desc)}</p>` : ""}
      ${g.howto ? `<div><h5>Comment le récupérer</h5><p class="sum" style="margin:0">${esc(g.howto)}</p></div>` : ""}
      ${g.upcoming ? "" : `<a class="btn primary big" href="${esc(g.url)}" target="_blank" rel="noopener">Récupérer sur ${esc(g.store)}</a>`}
      <p class="meta">La récupération se fait sur la boutique ${esc(g.store)}, connecté à ton compte. Le jeu reste à toi ensuite${g.kind === "loot" ? " (code ou objet en jeu)" : ""}.</p>`);
  }

  /* =================== TENDANCES =================== */
  const T = { data: null, err: "", tab: "steam" };
  async function loadTrends() {
    try { T.data = await get("/api/trends"); T.err = ""; } catch (x) { T.data = T.data || { steam: [], twitch: [], failed: [] }; T.err = x.message; }
    renderTrends();
  }
  function renderTrends() {
    const el = $("#v-tendances"); if (!el) return;
    const d = T.data;
    const hyped = (S.games || []).filter(g => g.hype && g.d > Date.now()).sort((a, b) => b.hype - a.hype).slice(0, 15);
    const tabs = [["steam", "Les plus joués"], ["twitch", "Les plus regardés"], ["hype", "Les plus attendus"]];
    el.innerHTML = `<div class="row"><h2>Tendances</h2><div class="seg">${tabs.map(([k, l]) => `<button data-ttab="${k}" aria-pressed="${T.tab === k}">${l}</button>`).join("")}</div></div>
      ${note(T.err)}${d && d.failed && d.failed.length ? `<p class="note">Indisponible pour le moment : ${esc(d.failed.join(", "))}.</p>` : ""}
      ${!d && T.tab !== "hype" ? `<div class="empty">Chargement des tendances…</div>`
      : T.tab === "steam" ? (d.steam.length ? `<p class="meta" style="margin:-4px 0 12px">Joueurs connectés en ce moment sur Steam, et pic des dernières 24 h.</p>
          <ol class="trank">${d.steam.map(r => `<li><button class="trow" data-tsteam="${r.appid}">
            <span class="tr">${r.rank}</span><img src="${esc(r.img)}" alt="" loading="lazy" class="twide" data-k="${esc(r.name)}" data-w="460" data-h="215">
            <span class="tn"><b>${esc(r.name)}</b>${r.last && r.last !== r.rank ? `<span class="meta">${r.last > r.rank ? "▲" : "▼"} ${Math.abs(r.last - r.rank)} place${Math.abs(r.last - r.rank) > 1 ? "s" : ""} en une semaine</span>` : ""}</span>
            <span class="tv"><b>${fmtN(r.now)}</b><span class="meta">en jeu</span></span><span class="tv hide-s"><b>${fmtN(r.peak)}</b><span class="meta">pic 24 h</span></span></button></li>`).join("")}</ol>`
          : `<div class="empty">Classement Steam indisponible pour le moment.</div>`)
      : T.tab === "twitch" ? (!d.twitchOn ? `<p class="note">Les clés Twitch ne sont pas encore réglées sur le serveur.</p>` : d.twitch.length ? `<p class="meta" style="margin:-4px 0 12px">Les jeux les plus regardés sur Twitch en ce moment.</p>
          <div class="tgrid">${d.twitch.map(r => `<div class="tbox"><span class="tr">${r.rank}</span><img src="${esc(r.img)}" alt="" loading="lazy" data-k="${esc(r.name)}" data-w="285" data-h="380"><b>${esc(r.name)}</b>${r.viewers != null ? `<span class="meta">${fmtN(r.viewers)} spectateurs</span>` : ""}</div>`).join("")}</div>`
          : `<div class="empty">Classement Twitch indisponible pour le moment.</div>`)
      : (hyped.length ? `<p class="meta" style="margin:-4px 0 12px">Les sorties à venir que les joueurs attendent le plus (IGDB).</p><div class="games">${hyped.map(card).join("")}</div>`
          : `<div class="empty">${S.demo ? "Disponible une fois les clés IGDB réglées sur le serveur." : "Chargement…"}</div>`)}`;
    tick();
  }
  function openSteam(appid) {
    const r = ((T.data || {}).steam || []).find(x => String(x.appid) === String(appid)); if (!r) return;
    const followed = S.apps.some(a => a.appid === r.appid);
    openDrawer(`<div class="banner"><img src="${esc(r.img)}" alt="" data-k="${esc(r.name)}" data-w="1280" data-h="720"></div>
      <div><div class="meta">N° ${r.rank} des jeux les plus joués sur Steam</div><h3 id="dTitle">${esc(r.name)}</h3></div>
      <div class="kvs"><div><b>${fmtN(r.now)}</b><span>joueurs en ce moment</span></div><div><b>${fmtN(r.peak)}</b><span>pic des dernières 24 h</span></div>${r.last ? `<div><b>${r.last}</b><span>rang la semaine dernière</span></div>` : ""}</div>
      <div class="mact" style="margin:0"><button class="btn primary" data-tfollow="${r.appid}" data-name="${esc(r.name)}" ${followed ? "disabled" : ""}>${followed ? "Mises à jour déjà suivies" : "Suivre ses mises à jour"}</button></div>`);
  }

  /* =================== ESPORT =================== */
  const ES_GAMES = [["csgo", "Counter-Strike 2"], ["valorant", "Valorant"], ["lol", "League of Legends"], ["dota2", "Dota 2"]];
  const X = { game: store.get("esGame", "csgo"), data: {}, err: "", setup: false, at: {} };
  async function loadEsport(force) {
    const g = X.game;
    if (!force && X.data[g] && Date.now() - X.at[g] < 55000) return renderEsport();
    try { X.data[g] = await get("/api/esport?game=" + g); X.at[g] = Date.now(); X.err = ""; X.setup = false; }
    catch (x) { X.err = x.message; X.setup = x.setup; X.data[g] = X.data[g] || null; }
    renderEsport();
  }
  function team(t, side) {
    const tbd = !t.short && /déterminer/i.test(t.name || "");
    return `<span class="team ${side}">${t.img ? `<img src="${esc(t.img)}" alt="" loading="lazy">` : `<i>${tbd ? "?" : esc((t.short || t.name || "?").slice(0, 4))}</i>`}<b title="${esc(t.name)}">${esc(t.name)}</b></span>`;
  }
  function match(m, mode) {
    const [a, b] = [m.teams[0] || { name: "À déterminer" }, m.teams[1] || { name: "À déterminer" }];
    const mid = mode === "up" ? `<span class="vs">${m.at ? hm(m.at) : "—"}</span>` : `<span class="score">${a.score ?? "-"}<i>:</i>${b.score ?? "-"}</span>`;
    return `<div class="mrowm${mode === "live" ? " live" : ""}">
      <span class="lg">${m.leagueImg ? `<img src="${esc(m.leagueImg)}" alt="" loading="lazy">` : ""}<span><b>${esc(m.league)}</b><span class="meta">${esc([m.stage, m.bo ? "BO" + m.bo : ""].filter(Boolean).join(" · "))}</span></span></span>
      <span class="duel">${team(a, "l")}${mid}${team(b, "r")}</span>
      <span class="mend">${mode === "live" ? (m.stream ? `<button class="btn primary" data-esplay="${esc(m.stream.url)}" data-title="${esc(a.name + " vs " + b.name)}">Regarder</button>` : `<span class="livetag">EN DIRECT</span>`)
        : mode === "up" ? (m.at ? `<span class="meta" data-until="${m.at}">${untilText(m.at)}</span>` : "")
        : `<span class="meta">${m.end ? ago(m.end) : ""}</span>`}</span></div>`;
  }
  function renderEsport() {
    const el = $("#v-esport"); if (!el) return;
    const d = X.data[X.game];
    const byDay = {}; (d && d.upcoming || []).forEach(m => { const k = m.at ? day(m.at) : "Date à confirmer"; (byDay[k] = byDay[k] || []).push(m); });
    el.innerHTML = `<div class="row"><h2>Esport</h2><button class="btn" data-esreload>Actualiser</button></div>
      <div class="chips" style="margin-bottom:16px">${ES_GAMES.map(([k, l]) => `<button class="chip" data-esgame="${k}" aria-pressed="${X.game === k}">${l}</button>`).join("")}</div>
      ${note(X.err, X.setup)}
      ${d === undefined ? `<div class="empty">Chargement des matchs…</div>` : !d ? "" : `
        ${d.running.length ? `<h3 class="subh"><span class="livetag" style="margin-right:10px">EN DIRECT</span>En ce moment</h3><div class="mlistm">${d.running.map(m => match(m, "live")).join("")}</div>` : ""}
        <h3 class="subh">À venir</h3>${Object.keys(byDay).length ? Object.entries(byDay).slice(0, 7).map(([k, ms]) => `<div class="month">${esc(k)}</div><div class="mlistm">${ms.map(m => match(m, "up")).join("")}</div>`).join("") : `<div class="empty">Aucun match annoncé pour le moment.</div>`}
        <h3 class="subh">Résultats</h3>${d.past.length ? `<div class="mlistm">${d.past.slice(0, 20).map(m => match(m, "past")).join("")}</div>` : `<div class="empty">Pas de résultat récent.</div>`}`}
      <p class="meta" style="margin-top:16px">Données PandaScore. Heures affichées à l'heure de ton appareil.</p>`;
  }
  function openStream(url, title) {
    const emb = embedOf(url);
    if (!emb) { window.open(url, "_blank", "noopener"); return; }
    openDrawer(`<div class="video"><iframe src="${esc(emb)}" title="${esc(title)}" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen></iframe></div><h3 id="dTitle">${esc(title)}</h3>`);
  }

  /* =================== ABONNEMENTS =================== */
  const A = { news: null, err: "", failed: [], svc: "" };
  const SVC_ORDER = ["gamepass", "psplus", "ubisoft", "eaplay", "nso"];
  async function loadSubs() {
    try { const j = await get("/api/news?cat=subs"); A.news = j.news; A.failed = j.failed || []; A.err = ""; }
    catch (x) { A.news = A.news || []; A.err = x.message; }
    renderSubs();
  }
  function renderSubs() {
    const el = $("#v-abonnements"); if (!el) return;
    const all = A.news || [];
    const svcs = SVC_ORDER.map(k => { const n = all.find(x => x.services.some(s => s.k === k)); return n ? n.services.find(s => s.k === k) : null; }).filter(Boolean);
    const list = all.filter(n => !A.svc || n.services.some(s => s.k === A.svc));
    el.innerHTML = `<div class="row"><h2>Abonnements</h2><button class="btn" data-subsreload>Actualiser</button></div>
      <p style="color:var(--muted);margin:-6px 0 16px;max-width:70ch">Ce qui arrive et ce qui part du Game Pass et du PlayStation Plus, les jeux du mois offerts, d'après les annonces officielles de Xbox et PlayStation.</p>
      ${note(A.err)}${A.failed.length ? `<p class="note">Indisponible pour le moment : ${esc(A.failed.join(", "))}.</p>` : ""}
      ${svcs.length > 1 ? `<div class="chips" style="margin-bottom:16px"><button class="chip" data-subsvc="" aria-pressed="${!A.svc}">Tous</button>${svcs.map(s => `<button class="chip" data-subsvc="${s.k}" aria-pressed="${A.svc === s.k}">${esc(s.l)}</button>`).join("")}</div>` : ""}
      ${A.news === null ? `<div class="news">${'<div class="skel" style="aspect-ratio:4/3.4"></div>'.repeat(6)}</div>`
        : !list.length ? `<div class="empty">Aucune annonce d'abonnement récente.</div>`
        : `<div class="news">${list.map(n => `<a class="ncard" href="#" data-read="${reg("news", n)}">
            <img src="${esc(n.img || art(n.t, "grid", 640, 360))}" alt="" data-k="${esc(n.t)}" loading="lazy">
            <div><span class="meta">${n.services.map(s => `<span class="tag sv-${s.k}">${esc(s.l)}</span>`).join(" ")} ${esc(n.src)} · ${ago(n.d)}</span><h4>${esc(n.t)}</h4>${n.txt ? `<p>${esc(n.txt)}</p>` : ""}</div></a>`).join("")}</div>`}`;
  }

  /* =================== événements de la page =================== */
  document.addEventListener("click", async e => {
    const t = e.target;
    // événements
    if (t.closest("[data-evnew]")) { evForm(); return; }
    const ee = t.closest("[data-evedit]"); if (ee) { evForm((E.list || []).find(x => x.id === ee.dataset.evedit)); return; }
    const ed = t.closest("[data-evdel]");
    if (ed) { if (ed.dataset.c !== "1") { ed.dataset.c = "1"; ed.textContent = "Confirmer la suppression"; return; }
      try { await get("/api/events", { method: "POST", headers: { "content-type": "application/json", "x-lobby-key": adminKey() }, body: JSON.stringify({ action: "delete", id: ed.dataset.evdel }) }); toast("Événement supprimé"); loadEvents(); } catch (x) { toast(x.message); } return; }
    // gratuits
    const fk = t.closest("[data-fkind]"); if (fk) { F.kind = fk.dataset.fkind; F.store = ""; renderFree(); return; }
    const fs = t.closest("[data-fstore]"); if (fs) { F.store = fs.dataset.fstore; renderFree(); return; }
    const fr = t.closest("[data-free]"); if (fr) { openFree(fr.dataset.free); return; }
    // tendances
    const tt = t.closest("[data-ttab]"); if (tt) { T.tab = tt.dataset.ttab; renderTrends(); return; }
    const ts = t.closest("[data-tsteam]"); if (ts) { openSteam(ts.dataset.tsteam); return; }
    const tf = t.closest("[data-tfollow]");
    if (tf) { const id = +tf.dataset.tfollow; if (!S.apps.some(a => a.appid === id)) { S.apps.push({ appid: id, name: tf.dataset.name }); store.set("apps", S.apps); S.updates = null; try { loaded.maj = 0; } catch {} }
      tf.disabled = true; tf.textContent = "Mises à jour suivies"; toast(tf.dataset.name + " ajouté aux mises à jour"); return; }
    // esport
    const eg = t.closest("[data-esgame]"); if (eg) { X.game = eg.dataset.esgame; store.set("esGame", X.game); renderEsport(); loadEsport(); return; }
    if (t.closest("[data-esreload]")) { loadEsport(true); return; }
    const ep = t.closest("[data-esplay]"); if (ep) { openStream(ep.dataset.esplay, ep.dataset.title); return; }
    // abonnements
    const sv = t.closest("[data-subsvc]"); if (sv) { A.svc = sv.dataset.subsvc; renderSubs(); return; }
    if (t.closest("[data-subsreload]")) { A.news = null; renderSubs(); loadSubs(); }
  });
  document.addEventListener("submit", async e => {
    if (e.target.id !== "evform") return; e.preventDefault();
    const date = $("#ev-date").value, time = $("#ev-time").value;
    const ev = { id: e.target.dataset.id || undefined, name: $("#ev-name").value, kind: $("#ev-kind").value, place: $("#ev-place").value, url: $("#ev-url").value, desc: $("#ev-desc").value,
      start: time ? date + "T" + time : date, end: $("#ev-end").value || "" };
    const err = $("#evErr"); err.hidden = true;
    try { await get("/api/events", { method: "POST", headers: { "content-type": "application/json", "x-lobby-key": adminKey() }, body: JSON.stringify({ action: "save", event: ev }) }); closeDrawer(); toast("Événement enregistré"); loadEvents(); }
    catch (x) { err.textContent = x.message; err.hidden = false; }
  });

  // ouverture des onglets (appelé par route() dans app.js)
  const fresh = (at, ms) => at && Date.now() - at < ms;
  const R = {};
  window.render_evenements = () => { renderEvents(); if (!fresh(R.ev, 300000)) { R.ev = Date.now(); loadEvents(); } };
  window.render_gratuits = () => { renderFree(); if (!fresh(R.fr, 600000)) { R.fr = Date.now(); loadFree(); } };
  window.render_tendances = () => { renderTrends(); if (!fresh(R.tr, 300000)) { R.tr = Date.now(); loadTrends(); } };
  window.render_esport = () => { renderEsport(); loadEsport(); };
  window.render_abonnements = () => { renderSubs(); if (!fresh(R.ab, 600000)) { R.ab = Date.now(); loadSubs(); } };
})();
