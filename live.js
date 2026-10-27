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
    const re = store.get("liveReopen", null);
    if (re && !$("#v-live").hidden) { store.set("liveReopen", null); openPlayer(re, "twitch"); }
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

  /* ---------- lecteur + fenêtre de chat (onglets Lobby / Twitch) ---------- */
  const C = { login: null, tab: "lobby", msgs: new Map(), poll: null, admin: false, cfg: null };
  const myName = () => { const m = store.get("myProfile", {}); return (m.handle && ((m.data && m.data.name) || m.handle)) || store.get("pseudo", ""); };
  const myHandle = () => (store.get("myProfile", {}).handle || null);
  const adminHdr = () => store.get("adminKey", "") ? { "x-lobby-key": store.get("adminKey", "") } : {};
  const colorOf = n => `hsl(${hash(n) % 360} 70% 55%)`;
  const hhmm = ts => new Date(ts).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  const dark = () => document.documentElement.dataset.theme === "dark" || (!document.documentElement.dataset.theme && matchMedia("(prefers-color-scheme: dark)").matches);

  function openPlayer(login, tab) {
    const x = (L.data && L.data.live || []).find(v => v.login === login) || (window.LIVE_NOW || []).find(v => v.login === login);
    const dr = $("#drawer");
    C.login = login; C.tab = tab || store.get("chatTab", "lobby"); C.msgs = new Map();
    dr.innerHTML = `<div class="dtop"><span></span><button class="btn" data-act="close">Fermer</button></div>
      <div class="livewrap">
        <div class="lmain">
          <div class="video"><iframe src="https://player.twitch.tv/?channel=${encodeURIComponent(login)}&parent=${encodeURIComponent(host)}&autoplay=true" title="Live de ${esc(x ? x.name : login)}" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen></iframe></div>
          ${x ? `<div><div class="meta"><span class="livetag" style="position:static">EN DIRECT</span> ${fmtViewers(x.viewers)} spectateurs · ${esc(x.game || "")}</div><h3 id="dTitle">${esc(x.title)}</h3></div>
          <div class="phead"><img src="${esc(x.avatar || art(x.name, "avatar", 96, 96))}" alt="" width="48" height="48"><div><b>${esc(x.name)}</b><br><span class="meta">twitch.tv/${esc(login)}</span></div>
            <button class="btn" data-pfview="${esc(x.handle)}" style="margin-left:auto">Voir le profil</button></div>` : `<h3 id="dTitle">${esc(login)}</h3>`}
        </div>
        <aside class="lside" aria-label="Chat">
          <div class="seg ctabs"><button data-ctab="lobby" aria-pressed="${C.tab === "lobby"}">Chat Lobby</button><button data-ctab="twitch" aria-pressed="${C.tab === "twitch"}">Chat Twitch</button></div>
          <div id="cpane" class="cpane"></div>
        </aside>
      </div>`;
    dr.classList.add("wide");
    dr.hidden = $("#scrim").hidden = false; dr.scrollTop = 0; S.drawerGame = null;
    renderPane();
  }

  function renderPane() {
    const pane = $("#cpane"); if (!pane) return;
    clearInterval(C.poll);
    document.querySelectorAll("[data-ctab]").forEach(b => b.setAttribute("aria-pressed", b.dataset.ctab === C.tab));
    if (C.tab === "lobby") {
      const name = myName();
      pane.innerHTML = `<div class="cmsgs" id="cmsgs" role="log" aria-live="polite"><p class="meta cempty">Chargement du chat…</p></div>
        <form id="cform" class="cform">
          ${name ? "" : `<input id="cname" maxlength="24" placeholder="Ton pseudo" aria-label="Ton pseudo" required>`}
          <div class="crow"><input id="ctext" maxlength="300" placeholder="Écris un message…" aria-label="Message" autocomplete="off" required><button class="btn primary" type="submit">Envoyer</button></div>
          <p class="meta">${name ? `Tu écris en tant que <b>${esc(name)}</b> · ` : ""}Chat entre joueurs Lobby, le streamer ne le voit pas sur Twitch.</p>
        </form>`;
      pollChat(true);
      C.poll = setInterval(() => { if (!$("#cmsgs") || $("#drawer").hidden) return clearInterval(C.poll); if (!document.hidden) pollChat(); }, 2500);
    } else {
      const auth = store.get("twitchAuth", null);
      pane.innerHTML = `<iframe class="tchat" src="https://www.twitch.tv/embed/${encodeURIComponent(C.login)}/chat?parent=${encodeURIComponent(host)}${dark() ? "&darkpopout" : ""}" title="Chat Twitch de ${esc(C.login)}"></iframe>
        ${auth ? `<form id="tform" class="cform"><div class="crow"><input id="ttext" maxlength="500" placeholder="Écrire dans le chat Twitch…" aria-label="Message Twitch" autocomplete="off" required><button class="btn primary" type="submit">Envoyer</button></div>
            <p class="meta">Connecté à Twitch${auth.login ? ` en tant que <b>${esc(auth.login)}</b>` : ""} · <button type="button" class="linkbtn" data-tlogout>Se déconnecter</button></p></form>`
          : `<div class="cform"><button class="btn primary" data-tlogin>Se connecter avec Twitch pour écrire</button>
            <p class="meta">Lobby ne voit jamais ton mot de passe : Twitch te demande seulement l'autorisation d'envoyer des messages en ton nom.</p></div>`}`;
      if (auth && !auth.login) whoami();
    }
  }

  function drawMsgs() {
    const box = $("#cmsgs"); if (!box) return;
    const near = box.scrollHeight - box.scrollTop - box.clientHeight < 60;
    const list = [...C.msgs.values()].sort((a, b) => a.ts - b.ts).slice(-150);
    box.innerHTML = list.length ? list.map(m => `<div class="cmsg"><time>${hhmm(m.ts)}</time> <b style="color:${colorOf(m.n)}">${m.h ? `<button class="cname" data-pfview="${esc(m.h)}">${esc(m.n)}</button>` : esc(m.n)}</b> <span>${esc(m.t)}</span>${C.admin ? ` <button class="linkbtn cdel" data-cdel="${esc(m.id)}" aria-label="Retirer ce message">×</button>` : ""}</div>`).join("")
      : `<p class="meta cempty">Personne n'a encore écrit. Lance la discussion !</p>`;
    if (near) box.scrollTop = box.scrollHeight;
  }
  async function pollChat(first) {
    const login = C.login;
    try {
      const r = await fetch("/api/chat?c=" + encodeURIComponent(login), { headers: adminHdr() });
      const j = await r.json().catch(() => ({}));
      if (login !== C.login) return;
      if (!r.ok) { const box = $("#cmsgs"); if (box && first) box.innerHTML = `<p class="meta cempty">${esc(j.error || "Le chat ne répond pas.")}</p>`; return; }
      C.admin = !!j.admin;
      const ids = new Set(j.msgs.map(m => m.id));
      // les messages retirés par l'admin disparaissent aussi chez les autres
      for (const [id, m] of C.msgs) if (!ids.has(id) && m.ts > (j.msgs[0] ? j.msgs[0].ts : 0) && !m.local) C.msgs.delete(id);
      j.msgs.forEach(m => C.msgs.set(m.id, m));
      drawMsgs();
      if (first) { const box = $("#cmsgs"); if (box) box.scrollTop = box.scrollHeight; }
    } catch {}
  }

  async function whoami() {
    const auth = store.get("twitchAuth", null); if (!auth) return;
    try {
      const r = await fetch("/api/twitchchat", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "whoami", token: auth.token }) });
      const j = await r.json().catch(() => ({}));
      if (r.ok) { auth.login = j.login; store.set("twitchAuth", auth); } else if (r.status === 401) store.set("twitchAuth", null);
    } catch {}
    if (C.tab === "twitch") renderPane();
  }
  async function twitchLogin() {
    try {
      C.cfg = C.cfg || await (await fetch("/api/config")).json();
      if (!C.cfg.twitchClientId) { toast("Twitch n'est pas encore activé sur le serveur."); return; }
      const state = (crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2)).replace(/-/g, "");
      store.set("twitchState", state); store.set("twitchReturn", location.pathname + "#live"); store.set("liveReopen", C.login);
      location.href = "https://id.twitch.tv/oauth2/authorize?" + new URLSearchParams({ response_type: "token", client_id: C.cfg.twitchClientId, redirect_uri: location.origin + "/twitch.html", scope: "user:write:chat", state }).toString();
    } catch { toast("Connexion à Twitch impossible pour le moment."); }
  }

  document.addEventListener("click", async e => {
    const t = e.target;
    const o = t.closest("[data-liveopen]"); if (o) { e.preventDefault(); openPlayer(o.dataset.liveopen); return; }
    const ct = t.closest("[data-ctab]"); if (ct) { C.tab = ct.dataset.ctab; store.set("chatTab", C.tab); renderPane(); return; }
    if (t.closest("[data-tlogin]")) { twitchLogin(); return; }
    if (t.closest("[data-tlogout]")) { store.set("twitchAuth", null); renderPane(); toast("Déconnecté de Twitch"); return; }
    const cd = t.closest("[data-cdel]");
    if (cd) { try { const r = await fetch("/api/chat", { method: "POST", headers: Object.assign({ "content-type": "application/json" }, adminHdr()), body: JSON.stringify({ action: "delete", c: C.login, id: cd.dataset.cdel }) }); if (r.ok) { C.msgs.delete(cd.dataset.cdel); drawMsgs(); } } catch {} return; }
    if (t.closest("[data-addchannel]")) store.set("accSub", "profil");
  });
  document.addEventListener("submit", async e => {
    if (e.target.id === "cform") {
      e.preventDefault();
      const nameIn = $("#cname"); if (nameIn) store.set("pseudo", nameIn.value.trim());
      const input = $("#ctext"), text = input.value.trim(); if (!text) return;
      const btn = e.target.querySelector("[type=submit]"); btn.disabled = true;
      try {
        const r = await fetch("/api/chat", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "send", c: C.login, name: myName(), handle: myHandle(), text, device: store.get("device", "") }) });
        const j = await r.json().catch(() => ({}));
        if (!r.ok) toast(j.error || "Message non envoyé.");
        else { input.value = ""; C.msgs.set(j.msg.id, Object.assign(j.msg, { local: true })); if (nameIn) renderPane(); else { drawMsgs(); const box = $("#cmsgs"); box.scrollTop = box.scrollHeight; } }
      } catch { toast("Message non envoyé, vérifie ta connexion."); }
      btn.disabled = false; const i = $("#ctext"); i && i.focus();
      return;
    }
    if (e.target.id === "tform") {
      e.preventDefault();
      const input = $("#ttext"), message = input.value.trim(); if (!message) return;
      const auth = store.get("twitchAuth", null); if (!auth) return renderPane();
      const btn = e.target.querySelector("[type=submit]"); btn.disabled = true;
      try {
        const r = await fetch("/api/twitchchat", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "send", token: auth.token, channel: C.login, message }) });
        const j = await r.json().catch(() => ({}));
        if (r.ok) { input.value = ""; toast("Envoyé sur Twitch"); }
        else { toast(j.error || "Message non envoyé."); if (j.relogin) { store.set("twitchAuth", null); renderPane(); } }
      } catch { toast("Message non envoyé, vérifie ta connexion."); }
      btn.disabled = false;
    }
  });
  // le panneau reprend sa largeur normale pour tout ce qui n'est pas un live
  new MutationObserver(() => { const dr = $("#drawer"); if (!dr.querySelector(".livewrap")) dr.classList.remove("wide"); }).observe($("#drawer"), { childList: true });

  let timer;
  window.renderLive = () => { render(); if (!L.data || Date.now() - L.at > 55000) load(); };
  window.onRoute = v => { clearInterval(timer); if (v === "live") timer = setInterval(() => { if (!document.hidden) load(); }, 60000); };
  // compteur « en direct » dans le menu dès l'ouverture
  setTimeout(load, 1500);
})();
