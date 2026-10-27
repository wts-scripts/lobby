/* WTS Lobby · onglet Live : les joueurs Lobby qui streament, en direct dans l'appli */
"use strict";
(() => {
  const L = { data: null, err: "", setup: false, at: 0 };
  window.LIVE_NOW = [];
  const host = location.hostname || "localhost";
  const fmtViewers = n => n >= 1000 ? (n / 1000).toFixed(n >= 10000 ? 0 : 1).replace(".", ",") + " k" : String(n);

  async function load() {
    try {
      const r = await fetch("/api/live"); const j = await r.json().catch(() => ({}));
      if (!r.ok) { L.err = j.error || "Le Live ne répond pas."; L.setup = !!j.setup; L.data = L.data || { live: [], offline: [], others: [] }; }
      else { L.data = j; L.err = j.twitchErr || ""; L.setup = false; }
    } catch { L.err = "Le Live ne répond pas pour le moment."; L.data = L.data || { live: [], offline: [], others: [] }; }
    L.at = Date.now(); window.LIVE_NOW = L.data.live || [];
    const c = $("#liveCount"); if (c) { c.hidden = !window.LIVE_NOW.length; c.textContent = window.LIVE_NOW.length; }
    if (!$("#v-live").hidden) render();
  }

  function liveCard(x, big) {
    return `<button class="lcard${big ? " big" : ""}" data-liveopen="${esc(x.login)}">
      <span class="lthumb"><img src="${esc(x.thumb)}" alt="" loading="lazy" data-k="${esc(x.name)}" data-w="640" data-h="360"><span class="livetag">EN DIRECT</span><span class="lview">${fmtViewers(x.viewers)} spectateurs</span></span>
      <span class="linfo"><img class="lav" src="${esc(x.avatar || art(x.name, "avatar", 96, 96))}" alt="" width="40" height="40">
        <span><b>${esc(x.name)}</b><span class="ltitle">${esc(x.title)}</span><span class="meta">${esc(x.game || "")}${x.started ? " · depuis " + dur(Date.now() - x.started) : ""}</span></span></span></button>`;
  }
  function render() {
    const el = $("#v-live"); if (!el) return;
    const d = L.data;
    el.innerHTML = `<div class="row"><h2>Live</h2><a class="btn" href="#comptes" data-addchannel>Ajouter ma chaîne</a></div>
      <p style="color:var(--muted);margin:-6px 0 16px;max-width:70ch">Les joueurs Lobby qui streament. Ceux qui sont en direct passent en premier, le plus regardé à la une. Pour apparaître ici, mets ta chaîne Twitch dans Comptes → Mon profil.</p>
      ${L.err ? `<p class="${L.setup ? "note" : "err"}">${esc(L.err)}</p>` : ""}
      ${d && d.twitch === false ? `<p class="note">Les clés Twitch ne sont pas encore réglées sur le serveur : impossible de savoir qui est en direct.</p>` : ""}
      ${!d ? `<div class="empty">Recherche des lives…</div>` : `
        ${d.live.length ? `${liveCard(d.live[0], true)}${d.live.length > 1 ? `<h3 class="subh">En direct</h3><div class="lgrid">${d.live.slice(1).map(x => liveCard(x)).join("")}</div>` : ""}`
          : `<div class="empty">Personne n'est en direct pour le moment.${d.offline.length ? "" : " Ajoute ta chaîne pour être le premier à apparaître ici."}</div>`}
        ${d.offline.length ? `<h3 class="subh">Chaînes Twitch</h3><div class="players">${d.offline.map(x => `<button class="pcard" data-pfview="${esc(x.handle)}">
            <img src="${esc(x.avatar || art(x.name, "avatar", 96, 96))}" alt="" width="48" height="48">
            <span class="pinfo"><b>${esc(x.name)}</b><span class="meta">Hors ligne · twitch.tv/${esc(x.login)}</span>${x.games && x.games.length ? `<span class="meta">${esc(x.games.slice(0, 3).join(", "))}</span>` : ""}</span></button>`).join("")}</div>` : ""}
        ${d.others.length ? `<h3 class="subh">Sur YouTube et Kick</h3><div class="players">${d.others.map(x => `<div class="pcard">
            <img src="${art(x.name, "avatar", 96, 96)}" alt="" width="48" height="48">
            <span class="pinfo"><b>${esc(x.name)}</b><span class="pbadges">${x.links.youtube ? `<a class="plat" href="${esc(x.links.youtube)}" target="_blank" rel="noopener">YouTube</a>` : ""}${x.links.kick ? `<a class="plat" href="${esc(x.links.kick)}" target="_blank" rel="noopener">Kick</a>` : ""}</span></span>
            <button class="linkbtn" data-pfview="${esc(x.handle)}">Profil</button></div>`).join("")}</div>` : ""}
        <p class="meta" style="margin-top:16px">Actualisé ${ago(L.at)} · toutes les minutes tant que l'onglet est ouvert.</p>`}`;
  }

  function openPlayer(login) {
    const x = (L.data && L.data.live || []).find(v => v.login === login) || (window.LIVE_NOW || []).find(v => v.login === login);
    const dr = $("#drawer");
    dr.innerHTML = `<div class="dtop"><span></span><button class="btn" data-act="close">Fermer</button></div>
      <div class="video"><iframe src="https://player.twitch.tv/?channel=${encodeURIComponent(login)}&parent=${encodeURIComponent(host)}&autoplay=true" title="Live de ${esc(x ? x.name : login)}" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen></iframe></div>
      ${x ? `<div><div class="meta"><span class="livetag" style="position:static">EN DIRECT</span> ${fmtViewers(x.viewers)} spectateurs · ${esc(x.game || "")}</div><h3 id="dTitle">${esc(x.title)}</h3></div>
      <div class="phead"><img src="${esc(x.avatar || art(x.name, "avatar", 96, 96))}" alt="" width="48" height="48"><div><b>${esc(x.name)}</b><br><span class="meta">twitch.tv/${esc(login)}</span></div></div>` : `<h3 id="dTitle">${esc(login)}</h3>`}
      <div class="mact" style="margin:0">${x ? `<button class="btn" data-pfview="${esc(x.handle)}">Voir le profil</button>` : ""}<button class="btn" data-livechat="${esc(login)}">Afficher le chat</button></div>
      <div id="livechat"></div>`;
    dr.hidden = $("#scrim").hidden = false; dr.scrollTop = 0; S.drawerGame = null;
  }

  document.addEventListener("click", e => {
    const o = e.target.closest("[data-liveopen]"); if (o) { e.preventDefault(); openPlayer(o.dataset.liveopen); return; }
    const c = e.target.closest("[data-livechat]");
    if (c) { const box = $("#livechat"); if (box.innerHTML) { box.innerHTML = ""; c.textContent = "Afficher le chat"; return; }
      const dark = document.documentElement.dataset.theme === "dark" || (!document.documentElement.dataset.theme && matchMedia("(prefers-color-scheme: dark)").matches);
      box.innerHTML = `<iframe class="lchat" src="https://www.twitch.tv/embed/${encodeURIComponent(c.dataset.livechat)}/chat?parent=${encodeURIComponent(host)}${dark ? "&darkpopout" : ""}" title="Chat Twitch"></iframe>`;
      c.textContent = "Masquer le chat"; return; }
    if (e.target.closest("[data-addchannel]")) store.set("accSub", "profil");
  });

  let timer;
  window.renderLive = () => { render(); if (!L.data || Date.now() - L.at > 55000) load(); };
  window.onRoute = v => { clearInterval(timer); if (v === "live") timer = setInterval(() => { if (!document.hidden) load(); }, 60000); };
  // compteur « en direct » dans le menu dès l'ouverture
  setTimeout(load, 1500);
})();
