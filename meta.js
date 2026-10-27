/* WTS Lobby · onglet Meta (classes d'armes partagées par les joueurs) */
"use strict";
(() => {
  const GAMES = ["Call of Duty: Warzone", "Call of Duty: Black Ops 7", "Battlefield 6", "Fortnite", "Apex Legends", "Valorant", "Counter-Strike 2", "Delta Force", "The Finals", "Rainbow Six Siege X", "PUBG: Battlegrounds", "Escape from Tarkov", "Arc Raiders", "GTA Online", "FiveM"];
  const MODES = ["Battle royale", "Résurgence", "Multijoueur", "Classé", "Zombies", "Extraction", "Conquête", "Percée"];
  const CATS = ["Fusil d'assaut", "Mitraillette", "Fusil de précision", "Fusil tactique", "Fusil à pompe", "Mitrailleuse", "Pistolet", "Corps à corps", "Autre"];
  const SLOTS = ["Bouche", "Canon", "Optique", "Laser", "Crosse", "Sous-canon", "Chargeur", "Poignée arrière", "Munitions", "Atout", "Accessoire"];

  const M = { posts: null, games: [], err: "", setup: false, game: "", q: "", sort: "top", admin: false };
  const device = store.get("device", null) || (() => { const d = (crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2) + Date.now()); store.set("device", d); return d; })();
  const tokens = store.get("metaTokens", {}), voted = store.get("metaVoted", {}), reported = store.get("metaReported", {});
  const adminKey = () => store.get("adminKey", "");
  const hdr = () => Object.assign({ "content-type": "application/json" }, adminKey() ? { "x-lobby-key": adminKey() } : {});

  async function load() {
    try {
      const r = await fetch("/api/meta", { headers: hdr() });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) { M.err = j.error || "La Meta ne répond pas."; M.setup = !!j.setup; M.posts = M.posts || []; }
      else { M.posts = j.posts; M.games = j.games; M.admin = !!j.admin; M.err = ""; M.setup = false; }
    } catch { M.err = "La Meta ne répond pas pour le moment."; M.posts = M.posts || []; }
    render();
  }
  async function post(payload) {
    const r = await fetch("/api/meta", { method: "POST", headers: hdr(), body: JSON.stringify(Object.assign({ device }, payload)) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j.error || "La Meta ne répond pas (" + r.status + ").");
    return j;
  }

  function card(p) {
    const mine = !!tokens[p.id];
    return `<article class="mcard" style="--mart:url('${art(p.game, kindOf("", p.game), 640, 240)}')">
      <header class="mhead"><span class="mgame">${esc(p.game)}${p.mode ? " · " + esc(p.mode) : ""}</span>${p.cat ? `<span class="plat">${esc(p.cat)}</span>` : ""}</header>
      <h4>${esc(p.weapon)}</h4>
      ${p.slots.length ? `<dl class="slots">${p.slots.map(([s, n]) => `<div><dt>${esc(s || "Accessoire")}</dt><dd>${esc(n)}</dd></div>`).join("")}</dl>` : ""}
      ${p.code ? `<div class="mcode"><code>${esc(p.code)}</code><button class="btn" data-mcopy="${esc(p.code)}">Copier</button></div>` : ""}
      ${p.notes ? `<p class="mnotes">${esc(p.notes)}</p>` : ""}
      <footer class="mfoot">
        <button class="vote" data-mvote="${esc(p.id)}" aria-pressed="${!!voted[p.id]}" aria-label="${voted[p.id] ? "Retirer mon vote" : "Voter pour cette classe"}">▲ <b>${p.votes}</b></button>
        <span class="meta">${esc(p.author)} · ${ago(p.created)}${M.admin && p.reports ? ` · <span style="color:var(--danger)">${p.reports} signalement${p.reports > 1 ? "s" : ""}</span>` : ""}</span>
        <span class="mact">${mine || M.admin ? `<button class="linkbtn" data-mdel="${esc(p.id)}">Supprimer</button>` : ""}${!mine ? `<button class="linkbtn" data-mrep="${esc(p.id)}" ${reported[p.id] ? "disabled" : ""}>${reported[p.id] ? "Signalé" : "Signaler"}</button>` : ""}</span>
      </footer></article>`;
  }

  function render() {
    const el = $("#v-meta"); if (!el) return;
    let posts = (M.posts || []).filter(p => (!M.game || p.game === M.game) && (!M.q || (p.weapon + " " + p.mode + " " + p.cat + " " + p.author).toLowerCase().includes(M.q.toLowerCase())));
    posts = posts.sort(M.sort === "top" ? (a, b) => b.votes - a.votes || b.created - a.created : (a, b) => b.created - a.created);
    const games = [...new Set((M.posts || []).map(p => p.game))].sort();
    el.innerHTML = `<div class="row"><h2>Meta</h2><button class="btn primary" data-mnew>Publier une classe</button></div>
      <p style="color:var(--muted);margin:-6px 0 16px;max-width:65ch">Les meilleures classes d'armes du moment, partagées par les joueurs. Vote pour celles qui marchent, publie les tiennes.</p>
      ${M.err ? `<p class="${M.setup ? "note" : "err"}">${esc(M.err)}</p>` : ""}
      ${M.posts && M.posts.length ? `<div class="mbar">
        <div class="chips"><button class="chip" data-mgame="" aria-pressed="${!M.game}">Tous les jeux</button>${games.map(g => `<button class="chip" data-mgame="${esc(g)}" aria-pressed="${M.game === g}">${esc(g)}</button>`).join("")}</div>
        <div class="mtools"><input id="mq" type="search" placeholder="Chercher une arme" value="${esc(M.q)}" aria-label="Chercher une arme">
        <div class="seg"><button data-msort="top" aria-pressed="${M.sort === "top"}">Populaires</button><button data-msort="new" aria-pressed="${M.sort === "new"}">Récentes</button></div></div></div>` : ""}
      ${M.posts === null ? `<div class="empty">Chargement des classes…</div>`
        : !M.posts.length && !M.err ? `<div class="empty">Aucune classe publiée pour l'instant. Sois le premier à partager ta meta.<br><br><button class="btn primary" data-mnew>Publier une classe</button></div>`
        : !posts.length && M.posts.length ? `<div class="empty">Aucune classe ne correspond.</div>`
        : `<div class="mgrid">${posts.map(card).join("")}</div>`}
      <details class="madmin"><summary>Administration</summary>
        <p class="meta">Le code admin (LOBBY_KEY sur Vercel) permet de voir les signalements et de supprimer n'importe quelle publication.</p>
        <form id="madminForm" class="mtools"><input id="madminKey" type="password" autocomplete="off" placeholder="Code admin" value="${esc(adminKey())}" aria-label="Code admin"><button class="btn" type="submit">${M.admin ? "Mode admin actif" : "Valider"}</button></form>
      </details>`;
  }

  function slotRow(s = "", n = "") {
    return `<div class="srow"><input list="mslots" placeholder="Emplacement" value="${esc(s)}" aria-label="Emplacement" maxlength="24"><input placeholder="Accessoire" value="${esc(n)}" aria-label="Accessoire" maxlength="48"><button type="button" class="linkbtn" data-mrow-del aria-label="Retirer cet accessoire">×</button></div>`;
  }
  function openForm() {
    const dr = $("#drawer");
    dr.innerHTML = `<div class="dtop"><span></span><button class="btn" data-act="close">Fermer</button></div>
      <h3 id="dTitle">Publier une classe</h3>
      <form id="mform" class="mform">
        <datalist id="mgames">${GAMES.map(g => `<option value="${esc(g)}">`).join("")}</datalist>
        <datalist id="mmodes">${MODES.map(g => `<option value="${esc(g)}">`).join("")}</datalist>
        <datalist id="mslots">${SLOTS.map(g => `<option value="${esc(g)}">`).join("")}</datalist>
        <div class="field"><label for="m-game">Jeu</label><input id="m-game" list="mgames" required maxlength="40" placeholder="Call of Duty: Warzone" value="${esc(M.game)}"></div>
        <div class="two"><div class="field"><label for="m-weapon">Arme</label><input id="m-weapon" required maxlength="40" placeholder="Nom de l'arme"></div>
          <div class="field"><label for="m-cat">Type</label><select id="m-cat"><option value="">—</option>${CATS.map(c => `<option>${esc(c)}</option>`).join("")}</select></div></div>
        <div class="field"><label for="m-mode">Mode de jeu (facultatif)</label><input id="m-mode" list="mmodes" maxlength="40" placeholder="Battle royale, Classé…"></div>
        <div class="field"><label>Accessoires</label><div id="mslotsBox">${slotRow()}${slotRow()}${slotRow()}</div><button type="button" class="btn" data-mrow-add style="justify-self:start">Ajouter un accessoire</button></div>
        <div class="field"><label for="m-code">Code de partage (facultatif)</label><input id="m-code" maxlength="60" placeholder="Le code de la classe dans le jeu"></div>
        <div class="field"><label for="m-notes">Conseils (facultatif)</label><textarea id="m-notes" maxlength="600" rows="4" placeholder="Pour quelle distance, quel style de jeu, quel atout…"></textarea></div>
        <div class="field"><label for="m-author">Ton pseudo</label><input id="m-author" required maxlength="24" value="${esc(store.get("pseudo", ""))}"></div>
        <p class="err" id="mformErr" hidden></p>
        <button class="btn primary" type="submit">Publier</button>
        <p class="meta">Ta publication est visible par tout le monde. Tu peux la supprimer depuis cet appareil.</p>
      </form>`;
    dr.hidden = $("#scrim").hidden = false; dr.scrollTop = 0; S.drawerGame = null;
    $("#m-game").focus();
  }

  document.addEventListener("click", async e => {
    const t = e.target;
    if (t.closest("[data-mnew]")) { openForm(); return; }
    if (t.closest("[data-mrow-add]")) { const box = $("#mslotsBox"); if (box.children.length < 10) box.insertAdjacentHTML("beforeend", slotRow()); return; }
    if (t.closest("[data-mrow-del]")) { t.closest(".srow").remove(); return; }
    const g = t.closest("[data-mgame]"); if (g) { M.game = g.dataset.mgame; render(); return; }
    const so = t.closest("[data-msort]"); if (so) { M.sort = so.dataset.msort; render(); return; }
    const cp = t.closest("[data-mcopy]");
    if (cp) { try { await navigator.clipboard.writeText(cp.dataset.mcopy); toast("Code copié"); } catch { toast("Copie impossible : sélectionne le code à la main"); } return; }
    const v = t.closest("[data-mvote]");
    if (v) {
      const id = v.dataset.mvote, on = !voted[id], p = M.posts.find(x => x.id === id);
      if (on) voted[id] = 1; else delete voted[id]; store.set("metaVoted", voted);
      if (p) p.votes = Math.max(0, p.votes + (on ? 1 : -1)); render();
      try { const j = await post({ action: on ? "vote" : "unvote", id }); if (p) { p.votes = j.votes; render(); } } catch (err) { toast(err.message); }
      return;
    }
    const rp = t.closest("[data-mrep]");
    if (rp) { const id = rp.dataset.mrep; try { await post({ action: "report", id }); reported[id] = 1; store.set("metaReported", reported); toast("Merci, la publication est signalée"); render(); } catch (err) { toast(err.message); } return; }
    const del = t.closest("[data-mdel]");
    if (del) {
      const id = del.dataset.mdel;
      if (del.dataset.confirm !== "1") { del.dataset.confirm = "1"; del.textContent = "Confirmer la suppression"; setTimeout(() => { if (del.isConnected) { del.dataset.confirm = ""; del.textContent = "Supprimer"; } }, 4000); return; }
      try { await post({ action: "delete", id, token: tokens[id] }); delete tokens[id]; store.set("metaTokens", tokens); M.posts = M.posts.filter(p => p.id !== id); toast("Publication supprimée"); render(); } catch (err) { toast(err.message); }
    }
  });
  document.addEventListener("input", e => { if (e.target.id === "mq") { M.q = e.target.value; const pos = e.target.selectionStart; render(); const i = $("#mq"); i.focus(); try { i.setSelectionRange(pos, pos); } catch {} } });
  document.addEventListener("submit", async e => {
    if (e.target.id === "madminForm") { e.preventDefault(); store.set("adminKey", $("#madminKey").value.trim()); await load(); toast(M.admin ? "Mode admin actif" : "Code admin incorrect ou non réglé sur Vercel"); return; }
    if (e.target.id !== "mform") return;
    e.preventDefault();
    const slots = [...document.querySelectorAll("#mslotsBox .srow")].map(r => { const [a, b] = r.querySelectorAll("input"); return [a.value.trim(), b.value.trim()]; }).filter(s => s[1]);
    const data = { game: $("#m-game").value, weapon: $("#m-weapon").value, cat: $("#m-cat").value, mode: $("#m-mode").value, slots, code: $("#m-code").value, notes: $("#m-notes").value, author: $("#m-author").value };
    const err = $("#mformErr"), btn = e.target.querySelector("[type=submit]");
    btn.disabled = true; err.hidden = true;
    try {
      const j = await post({ action: "create", post: data });
      tokens[j.post.id] = j.token; store.set("metaTokens", tokens); store.set("pseudo", data.author.trim());
      (M.posts = M.posts || []).unshift(j.post); M.sort = "new"; M.game = "";
      closeDrawer(); toast("Classe publiée"); render();
    } catch (x) { err.textContent = x.message; err.hidden = false; btn.disabled = false; }
  });

  let loadedOnce = false;
  window.renderMetaTab = () => { render(); if (!loadedOnce) { loadedOnce = true; load(); } };
})();
