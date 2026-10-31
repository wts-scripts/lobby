/* WTS Lobby · menu des catégories configurable (ordre, noms, catégories masquées, séparateurs) */
"use strict";
(() => {
  const TABS = [
    ["sorties", "Sorties"], ["evenements", "Événements"], ["maj", "Mises à jour"], ["actus", "Actualités"], ["tendances", "Tendances"], ["esport", "Esport"], ["gratuits", "Jeux gratuits"], ["abonnements", "Abonnements"],
    ["meta", "Meta"], ["pc", "Config PC"], ["reglages", "Réglages"]
  ];
  const T = Object.fromEntries(TABS.map(([id, label, extra]) => [id, { label, extra: extra || "" }]));
  // menu d'origine : rubriques groupées par des séparateurs
  const DEFAULT = [
    { t: "tab", id: "sorties" }, { t: "tab", id: "evenements" },
    { t: "sep", label: "Infos" }, { t: "tab", id: "actus" }, { t: "tab", id: "maj" }, { t: "tab", id: "tendances" }, { t: "tab", id: "esport" },
    { t: "sep", label: "Gratuit" }, { t: "tab", id: "gratuits" }, { t: "tab", id: "abonnements" },
    { t: "sep", label: "Outils" }, { t: "tab", id: "meta" }, { t: "tab", id: "pc" },
    { t: "sep", label: "" }, { t: "tab", id: "reglages" }
  ];
  const clean = s => String(s || "").replace(/[<>\u0000-\u001f]/g, "").trim().slice(0, 24);

  // remet une config en ordre : catégories connues, pas de doublon, les nouvelles ajoutées à la fin, Réglages toujours visible
  function normalize(menu) {
    const out = [], seen = new Set();
    for (const it of Array.isArray(menu) ? menu.slice(0, 40) : []) {
      if (it && it.t === "sep") out.push({ t: "sep", label: clean(it.label) });
      else if (it && T[it.id] && !seen.has(it.id)) { seen.add(it.id); out.push({ t: "tab", id: it.id, label: clean(it.label), hidden: it.id !== "reglages" && !!it.hidden }); }
    }
    for (const [id] of TABS) if (!seen.has(id)) out.push({ t: "tab", id });
    return out;
  }
  let siteDefault = DEFAULT;
  let menu = normalize(store.get("menu", null) || DEFAULT);
  const custom = () => store.get("menu", null) !== null;
  const save = () => { store.set("menu", menu); renderNav(); refreshMenuEditor(); };

  function renderNav() {
    const nav = $("#tabs"); if (!nav) return;
    nav.innerHTML = menu.map(it => it.t === "sep"
      ? `<span class="navsep" role="separator">${it.label ? esc(it.label) : ""}</span>`
      : it.hidden ? "" : `<a href="#${it.id}">${esc(it.label || T[it.id].label)}${T[it.id].extra}</a>`).join("")
      // pas de séparateur au début, à la fin ou en double
      .replace(/^(\s*<span class="navsep"[^>]*><\/span>)+/, "").replace(/(<span class="navsep"[^>]*>[^<]*<\/span>\s*)+$/, "")
      .replace(/(<span class="navsep"[^>]*>[^<]*<\/span>)(\s*<span class="navsep"[^>]*>[^<]*<\/span>)+/g, "$1");
    // remet l'onglet actif et les compteurs
    const v = location.hash.slice(1);
    nav.querySelectorAll("a").forEach(a => a.hash === "#" + v ? a.setAttribute("aria-current", "page") : a.removeAttribute("aria-current"));
    if (!nav.querySelector("[aria-current]")) { const first = nav.querySelector('a[href="#sorties"]'); if (first && !VIEWS.includes(v)) first.setAttribute("aria-current", "page"); }
  }

  /* ---------- éditeur dans Réglages ---------- */
  function editorHTML() {
    const admin = !!store.get("adminKey", "");
    return `<div id="menuEditor"><h3>Menu</h3>
      <p class="meta" style="margin:-4px 0 10px">Glisse les lignes (ou utilise les flèches) pour changer l'ordre. Renomme, masque, ajoute des séparateurs : le menu change tout de suite.</p>
      <ol class="mlist">${menu.map((it, i) => `<li class="mrow${it.t === "sep" ? " sep" : ""}${it.hidden ? " off" : ""}" draggable="true" data-mi="${i}">
        <span class="grip" aria-hidden="true">⋮⋮</span>
        <span class="mv"><button type="button" data-mup="${i}" aria-label="Monter" ${i === 0 ? "disabled" : ""}>↑</button><button type="button" data-mdown="${i}" aria-label="Descendre" ${i === menu.length - 1 ? "disabled" : ""}>↓</button></span>
        ${it.t === "sep"
          ? `<span class="mkind">Séparateur</span><input data-mlabel="${i}" maxlength="24" placeholder="Titre (facultatif)" value="${esc(it.label)}" aria-label="Titre du séparateur"><button type="button" class="linkbtn" data-mdel="${i}">Retirer</button>`
          : `<input data-mlabel="${i}" maxlength="24" placeholder="${esc(T[it.id].label)}" value="${esc(it.label || "")}" aria-label="Nom de la catégorie ${esc(T[it.id].label)}">
             <label class="mvis"><input type="checkbox" data-mvis="${i}" ${it.hidden ? "" : "checked"} ${it.id === "reglages" ? "disabled" : ""}> Visible</label>`}
      </li>`).join("")}</ol>
      <div class="mact" style="margin:10px 0 0;flex-wrap:wrap"><button type="button" class="btn" data-madd>Ajouter un séparateur</button>
        <button type="button" class="btn" data-mreset ${custom() ? "" : "disabled"}>Revenir au menu ${siteDefault === DEFAULT ? "d'origine" : "du site"}</button>
        ${admin ? `<button type="button" class="btn primary" data-mglobal>Utiliser ce menu pour tout le monde</button>` : ""}</div>
      ${admin ? `<p class="meta">Admin : « pour tout le monde » change le menu des personnes qui n'ont pas personnalisé le leur.</p>` : ""}
    </div>`;
  }
  function refreshMenuEditor() { const ed = $("#menuEditor"); if (ed) ed.outerHTML = editorHTML(); }
  const origReglages = window.renderReglages;
  window.renderReglages = function () { origReglages(); const set = document.querySelector("#v-reglages .set"); if (set) set.insertAdjacentHTML("beforeend", editorHTML()); };

  const move = (i, j) => { if (j < 0 || j >= menu.length || i === j) return; const [x] = menu.splice(i, 1); menu.splice(j, 0, x); save(); };
  document.addEventListener("click", async e => {
    const t = e.target;
    const up = t.closest("[data-mup]"); if (up) { const i = +up.dataset.mup; move(i, i - 1); const b = document.querySelector(`[data-mup="${i - 1}"]`) || document.querySelector(`[data-mdown="${i - 1}"]`); b && b.focus(); return; }
    const dn = t.closest("[data-mdown]"); if (dn) { const i = +dn.dataset.mdown; move(i, i + 1); const b = document.querySelector(`[data-mdown="${i + 1}"]`) || document.querySelector(`[data-mup="${i + 1}"]`); b && b.focus(); return; }
    const del = t.closest("[data-mdel]"); if (del) { menu.splice(+del.dataset.mdel, 1); save(); return; }
    if (t.closest("[data-madd]")) { menu.push({ t: "sep", label: "" }); save(); const ins = document.querySelectorAll("[data-mlabel]"); ins[ins.length - 1] && ins[ins.length - 1].focus(); return; }
    if (t.closest("[data-mreset]")) { store.set("menu", null); try { localStorage.removeItem("lobby.menu"); } catch {} menu = normalize(siteDefault); renderNav(); refreshMenuEditor(); toast("Menu remis par défaut"); return; }
    if (t.closest("[data-mglobal]")) {
      try {
        const r = await fetch("/api/config", { method: "POST", headers: { "content-type": "application/json", "x-lobby-key": store.get("adminKey", "") }, body: JSON.stringify({ menu }) });
        const j = await r.json().catch(() => ({})); if (!r.ok) throw new Error(j.error || "Enregistrement impossible.");
        siteDefault = normalize(j.menu); toast("Menu enregistré pour tout le monde");
      } catch (x) { toast(x.message); }
    }
  });
  document.addEventListener("change", e => {
    const v = e.target.dataset.mvis; if (v === undefined) return;
    menu[+v].hidden = !e.target.checked; save();
  });
  let typing;
  document.addEventListener("input", e => {
    const i = e.target.dataset.mlabel; if (i === undefined) return;
    menu[+i].label = clean(e.target.value);
    store.set("menu", menu); clearTimeout(typing); typing = setTimeout(renderNav, 150);   // pas de re-rendu de l'éditeur pendant la saisie
  });
  // glisser-déposer
  let dragFrom = null;
  document.addEventListener("dragstart", e => { const r = e.target.closest && e.target.closest(".mrow"); if (!r) return; dragFrom = +r.dataset.mi; r.classList.add("drag"); e.dataTransfer.effectAllowed = "move"; try { e.dataTransfer.setData("text/plain", String(dragFrom)); } catch {} });
  document.addEventListener("dragover", e => { const r = e.target.closest && e.target.closest(".mrow"); if (r && dragFrom !== null) { e.preventDefault(); document.querySelectorAll(".mrow.over").forEach(x => x.classList.remove("over")); r.classList.add("over"); } });
  document.addEventListener("drop", e => { const r = e.target.closest && e.target.closest(".mrow"); if (r && dragFrom !== null) { e.preventDefault(); const to = +r.dataset.mi; const from = dragFrom; dragFrom = null; move(from, to); } });
  document.addEventListener("dragend", () => { dragFrom = null; document.querySelectorAll(".mrow.drag,.mrow.over").forEach(x => x.classList.remove("drag", "over")); });

  renderNav();
  // menu par défaut choisi par l'admin pour tout le monde
  fetch("/api/config").then(r => r.ok ? r.json() : null).then(j => {
    if (!j || !Array.isArray(j.menu)) return;
    siteDefault = normalize(j.menu);
    if (!custom()) { menu = siteDefault; renderNav(); refreshMenuEditor(); }
  }).catch(() => {});
  window.renderNav = renderNav;
})();
