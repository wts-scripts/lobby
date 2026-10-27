/* WTS Lobby · Comptes : mon profil public, annuaire des joueurs, liaisons pour les amis en ligne */
"use strict";
(() => {
  const { PLATFORMS, linkOf } = window.LOBBY_PLATFORMS;
  const PR = { sub: store.get("accSub", "profil"), list: null, err: "", setup: false, q: "", admin: false, busy: false };
  const empty = () => ({ handle: "", name: "", bio: "", games: "", links: {} });
  const mine = Object.assign({ token: null, handle: null, isPublic: true, data: empty() }, store.get("myProfile", {}));
  const saveMine = () => store.set("myProfile", mine);
  const hdr = () => Object.assign({ "content-type": "application/json" }, store.get("adminKey", "") ? { "x-lobby-key": store.get("adminKey", "") } : {});
  const device = () => store.get("device", "") || "x";
  const origLinks = window.renderComptes;
  const short = v => String(v).replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "");
  const groups = [...new Set(PLATFORMS.map(p => p.grp))];
  const avatarOf = p => art(p.name || p.handle, "avatar", 96, 96);

  async function call(method, payload, qs = "") {
    const r = await fetch("/api/profiles" + qs, method === "GET" ? { headers: hdr() } : { method, headers: hdr(), body: JSON.stringify(payload) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw Object.assign(new Error(j.error || "Le serveur ne répond pas (" + r.status + ")."), { setup: j.setup });
    return j;
  }
  async function loadList() {
    try { const j = await call("GET"); PR.list = j.profiles; PR.admin = j.admin; PR.err = ""; PR.setup = false; }
    catch (e) { PR.list = PR.list || []; PR.err = e.message; PR.setup = !!e.setup; }
    if (!$("#v-comptes").hidden) window.renderComptes();
  }

  /* ---------- rendu ---------- */
  window.renderComptes = function () {
    PR.sub = store.get("accSub", PR.sub);
    const el = $("#v-comptes");
    el.innerHTML = `<div class="row"><h2>Comptes</h2>
      <div class="seg">${[["profil", "Mon profil"], ["joueurs", "Joueurs"], ["liens", "Amis en ligne"]].map(([k, l]) => `<button data-accsub="${k}" aria-pressed="${PR.sub === k}">${l}</button>`).join("")}</div></div>
      <div id="acc-pane"></div>`;
    const pane = $("#acc-pane");
    if (PR.sub === "liens") { pane.innerHTML = '<div id="acc-links"></div>'; origLinks(); }
    else if (PR.sub === "joueurs") renderPlayers(pane);
    else renderMine(pane);
  };

  function renderMine(pane) {
    const d = mine.data, online = !!mine.handle;
    pane.innerHTML = `<p style="color:var(--muted);margin:0 0 16px;max-width:70ch">Mets tes comptes et tes chaînes ici. Si ton profil est public, les autres joueurs le voient dans <b>Joueurs</b>, et ta chaîne Twitch apparaît dans <b>Live</b>.</p>
      ${online ? `<div class="pubbar"><span><i class="dot" style="background:var(--online)"></i>Profil public en ligne : <b>@${esc(mine.handle)}</b></span>
        <span class="mact"><button class="btn" data-pfview="${esc(mine.handle)}">Voir mon profil</button><button class="btn" data-pfshare="${esc(mine.handle)}">Copier le lien</button></span></div>` : ""}
      ${PR.setup ? `<p class="note">${esc(PR.err)}</p>` : ""}
      <form id="pform" class="pform">
        <div class="pgrid">
          <div class="field"><label for="p-handle">Pseudo (unique)</label><input id="p-handle" required maxlength="24" pattern="[a-zA-Z0-9][a-zA-Z0-9_.\\-]{2,23}" placeholder="kenzo" value="${esc(d.handle)}"></div>
          <div class="field"><label for="p-name">Nom affiché</label><input id="p-name" maxlength="32" placeholder="Kenzo" value="${esc(d.name)}"></div>
          <div class="field span2"><label for="p-bio">Présentation (facultatif)</label><input id="p-bio" maxlength="200" placeholder="Joueur FPS, je stream le soir, cherche une team…" value="${esc(d.bio)}"></div>
          <div class="field span2"><label for="p-games">Jeux favoris (5 max, séparés par des virgules)</label><input id="p-games" maxlength="170" placeholder="Warzone, GTA Online, Rocket League" value="${esc(Array.isArray(d.games) ? d.games.join(", ") : d.games)}"></div>
        </div>
        ${groups.map(g => `<fieldset class="pgroup"><legend>${esc(g)}</legend><div class="pgrid">${PLATFORMS.filter(p => p.grp === g).map(p => `
          <div class="field"><label for="pl-${p.k}">${esc(p.n)}</label><input id="pl-${p.k}" data-plk="${p.k}" maxlength="120" placeholder="${esc(p.ph)}" value="${esc(d.links[p.k] || "")}" autocomplete="off"></div>`).join("")}</div></fieldset>`).join("")}
        <label class="check"><input type="checkbox" id="p-public" ${mine.isPublic ? "checked" : ""}> Profil public : les autres joueurs peuvent voir ces comptes et liens</label>
        <p class="err" id="pErr" hidden></p>
        <div class="mact" style="margin:0"><button class="btn primary" type="submit">${online ? "Mettre à jour" : "Enregistrer"}</button>${online ? `<button class="btn" type="button" data-pfdelete="1">Retirer mon profil public</button>` : ""}</div>
      </form>`;
  }

  function badges(p) {
    return `<div class="pbadges">${PLATFORMS.filter(x => p.links[x.k]).map(x => `<span class="plat">${esc(x.n)}</span>`).join("")}</div>`;
  }
  function renderPlayers(pane) {
    if (PR.list === null) { pane.innerHTML = `<div class="empty">Chargement des joueurs…</div>`; if (!PR.busy) { PR.busy = true; loadList().finally(() => PR.busy = false); } return; }
    const q = PR.q.toLowerCase();
    const list = PR.list.filter(p => !q || (p.handle + " " + p.name + " " + p.games.join(" ") + " " + Object.values(p.links).join(" ")).toLowerCase().includes(q));
    pane.innerHTML = `${PR.err ? `<p class="${PR.setup ? "note" : "err"}">${esc(PR.err)}</p>` : ""}
      ${PR.list.length ? `<div class="mtools" style="margin-bottom:16px"><input id="pq" type="search" placeholder="Chercher un joueur, un jeu" value="${esc(PR.q)}" aria-label="Chercher un joueur"></div>` : ""}
      ${!PR.list.length && !PR.err ? `<div class="empty">Aucun profil public pour l'instant. Crée le tien dans <b>Mon profil</b>.</div>`
        : !list.length && PR.list.length ? `<div class="empty">Aucun joueur ne correspond.</div>`
        : `<div class="players">${list.map(p => `<button class="pcard" data-pfview="${esc(p.handle)}">
            <img src="${avatarOf(p)}" alt="" width="48" height="48">
            <span class="pinfo"><b>${esc(p.name)}</b><span class="meta">@${esc(p.handle)}${p.games.length ? " · " + esc(p.games.slice(0, 3).join(", ")) : ""}</span>${badges(p)}</span>
            ${PR.admin && p.reports ? `<span class="meta" style="color:var(--danger)">${p.reports} signal.</span>` : ""}</button>`).join("")}</div>`}`;
  }

  /* ---------- fiche joueur ---------- */
  async function openProfile(h) {
    let p = (PR.list || []).find(x => x.handle === h);
    if (!p) { try { p = (await call("GET", null, "?h=" + encodeURIComponent(h))).profile; } catch (e) { toast(e.message); return; } }
    const isMine = mine.handle === p.handle;
    const live = (window.LIVE_NOW || []).find(x => x.handle === p.handle);
    const dr = $("#drawer");
    dr.innerHTML = `<div class="dtop"><span></span><button class="btn" data-act="close">Fermer</button></div>
      <div class="phead"><img src="${live && live.avatar ? esc(live.avatar) : avatarOf(p)}" alt="" width="72" height="72"><div><h3 id="dTitle">${esc(p.name)}</h3><span class="meta">@${esc(p.handle)}</span></div></div>
      ${live ? `<button class="livebar" data-liveopen="${esc(live.login)}"><span class="livetag">EN DIRECT</span>${esc(live.title)}<span class="meta">${esc(live.game || "")} · ${live.viewers} spectateurs</span></button>` : ""}
      ${p.bio ? `<p class="sum" style="margin:0">${esc(p.bio)}</p>` : ""}
      ${p.games.length ? `<div><h5>Jeux favoris</h5><div class="plats">${p.games.map(g => `<span class="plat">${esc(g)}</span>`).join("")}</div></div>` : ""}
      ${groups.map(g => { const ps = PLATFORMS.filter(x => x.grp === g && p.links[x.k]); return ps.length ? `<div><h5>${esc(g)}</h5><ul class="plinks">${ps.map(x => { const v = p.links[x.k], url = linkOf(x.k, v);
        return `<li><span class="pn">${esc(x.n)}</span><span class="pv">${esc(x.kind === "url" ? short(v) : v)}</span><span class="pa">${url ? `<a class="btn" href="${esc(url)}" target="_blank" rel="noopener">Ouvrir</a>` : ""}${x.kind === "id" ? `<button class="btn" data-pfcopy="${esc(v)}">Copier</button>` : ""}</span></li>`; }).join("")}</ul></div>` : ""; }).join("")}
      <div class="mact" style="margin:0">${!isMine ? `<button class="linkbtn" data-pfrep="${esc(p.handle)}">Signaler ce profil</button>` : ""}${PR.admin && !isMine ? `<button class="linkbtn" data-pfadmindel="${esc(p.handle)}">Supprimer (admin)</button>` : ""}<button class="linkbtn" data-pfshare="${esc(p.handle)}">Copier le lien du profil</button></div>`;
    dr.hidden = $("#scrim").hidden = false; dr.scrollTop = 0; S.drawerGame = null;
  }
  window.openProfile = openProfile;

  /* ---------- événements ---------- */
  document.addEventListener("click", async e => {
    const t = e.target;
    const sb = t.closest("[data-accsub]"); if (sb) { PR.sub = sb.dataset.accsub; store.set("accSub", PR.sub); if (PR.sub === "joueurs" && PR.list === null) loadList(); window.renderComptes(); return; }
    const v = t.closest("[data-pfview]"); if (v) { openProfile(v.dataset.pfview); return; }
    const cp = t.closest("[data-pfcopy]"); if (cp) { try { await navigator.clipboard.writeText(cp.dataset.pfcopy); toast("Copié"); } catch { toast("Copie impossible sur cet appareil"); } return; }
    const sh = t.closest("[data-pfshare]"); if (sh) { try { await navigator.clipboard.writeText(location.origin + "/#j-" + sh.dataset.pfshare); toast("Lien du profil copié"); } catch { toast("Copie impossible sur cet appareil"); } return; }
    const rp = t.closest("[data-pfrep]"); if (rp) { try { await call("POST", { action: "report", handle: rp.dataset.pfrep, device: device() }); toast("Merci, le profil est signalé"); rp.disabled = true; } catch (x) { toast(x.message); } return; }
    const ad = t.closest("[data-pfadmindel]");
    if (ad) { if (ad.dataset.c !== "1") { ad.dataset.c = "1"; ad.textContent = "Confirmer la suppression"; return; }
      try { await call("POST", { action: "delete", handle: ad.dataset.pfadmindel }); closeDrawer(); toast("Profil supprimé"); loadList(); } catch (x) { toast(x.message); } return; }
    const dl = t.closest("[data-pfdelete]");
    if (dl) { if (dl.dataset.c !== "1") { dl.dataset.c = "1"; dl.textContent = "Confirmer : retirer le profil public"; return; }
      try { await call("POST", { action: "delete", handle: mine.handle, token: mine.token }); mine.handle = null; mine.isPublic = false; saveMine(); toast("Profil public retiré (gardé sur cet appareil)"); PR.list = null; window.renderComptes(); } catch (x) { toast(x.message); } }
  });
  document.addEventListener("input", e => {
    if (e.target.id === "pq") { PR.q = e.target.value; const pos = e.target.selectionStart; window.renderComptes(); const i = $("#pq"); if (i) { i.focus(); try { i.setSelectionRange(pos, pos); } catch {} } }
  });
  document.addEventListener("submit", async e => {
    if (e.target.id !== "pform") return; e.preventDefault();
    const links = {}; document.querySelectorAll("[data-plk]").forEach(i => { if (i.value.trim()) links[i.dataset.plk] = i.value.trim(); });
    mine.data = { handle: $("#p-handle").value.trim().toLowerCase(), name: $("#p-name").value.trim(), bio: $("#p-bio").value.trim(), games: $("#p-games").value, links };
    mine.isPublic = $("#p-public").checked;
    const err = $("#pErr"), btn = e.target.querySelector("[type=submit]"); err.hidden = true; btn.disabled = true;
    try {
      if (mine.isPublic) {
        const j = await call("POST", { action: "save", profile: mine.data, token: mine.token, oldHandle: mine.handle && mine.handle !== mine.data.handle ? mine.handle : undefined });
        if (j.token) mine.token = j.token;
        mine.handle = j.profile.handle; mine.data.links = j.profile.links; mine.data.games = j.profile.games;
        toast("Profil public enregistré"); PR.list = null;
      } else {
        if (mine.handle) { await call("POST", { action: "delete", handle: mine.handle, token: mine.token }); mine.handle = null; PR.list = null; }
        toast("Profil enregistré sur cet appareil seulement");
      }
      saveMine(); window.renderComptes();
    } catch (x) { saveMine(); err.textContent = x.message; err.hidden = false; btn.disabled = false; }
  });

  // lien direct vers un profil : /#j-pseudo
  function fromHash() { const m = location.hash.match(/^#j-([a-z0-9_.-]{3,24})$/); if (m) setTimeout(() => openProfile(m[1]), 0); }
  window.addEventListener("hashchange", fromHash);
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", () => setTimeout(fromHash, 0)); else setTimeout(fromHash, 0);
  window.loadProfiles = loadList;
})();
