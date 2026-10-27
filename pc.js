/* WTS Lobby · onglet Config PC (configurateur avec compatibilité, alimentation, performances, prix) */
"use strict";
(() => {
  // Prix : indicatifs, en euros, modifiables dans l'appli. s = indice de performance en jeu (base 100 = Ryzen 7 9800X3D), w = consommation max en jeu.
  const D = {
    cpu: [
      { id: "r5-5600", n: "AMD Ryzen 5 5600", p: 110, sock: "AM4", w: 76, s: 55, box: 1 },
      { id: "i5-12400f", n: "Intel Core i5-12400F", p: 115, sock: "LGA1700", w: 90, s: 58, box: 1 },
      { id: "r5-7600", n: "AMD Ryzen 5 7600", p: 190, sock: "AM5", w: 88, s: 72, box: 1 },
      { id: "r5-9600x", n: "AMD Ryzen 5 9600X", p: 220, sock: "AM5", w: 88, s: 77 },
      { id: "i5-14600k", n: "Intel Core i5-14600K", p: 230, sock: "LGA1700", w: 181, s: 80 },
      { id: "u5-245k", n: "Intel Core Ultra 5 245K", p: 280, sock: "LGA1851", w: 159, s: 76 },
      { id: "r7-9700x", n: "AMD Ryzen 7 9700X", p: 300, sock: "AM5", w: 88, s: 82 },
      { id: "r7-7800x3d", n: "AMD Ryzen 7 7800X3D", p: 350, sock: "AM5", w: 120, s: 95 },
      { id: "u7-265k", n: "Intel Core Ultra 7 265K", p: 360, sock: "LGA1851", w: 250, s: 84 },
      { id: "r7-9800x3d", n: "AMD Ryzen 7 9800X3D", p: 480, sock: "AM5", w: 120, s: 100 },
      { id: "u9-285k", n: "Intel Core Ultra 9 285K", p: 600, sock: "LGA1851", w: 250, s: 86 },
      { id: "r9-9950x3d", n: "AMD Ryzen 9 9950X3D", p: 700, sock: "AM5", w: 170, s: 101 }
    ],
    mb: [
      { id: "b550", n: "Carte mère B550 (AM4, DDR4)", p: 110, sock: "AM4", ram: "DDR4", m2: 2 },
      { id: "a620", n: "Carte mère A620 (AM5, DDR5)", p: 100, sock: "AM5", ram: "DDR5", m2: 1 },
      { id: "b650", n: "Carte mère B650 (AM5, DDR5)", p: 160, sock: "AM5", ram: "DDR5", m2: 2 },
      { id: "b850", n: "Carte mère B850 Wi-Fi (AM5, DDR5)", p: 200, sock: "AM5", ram: "DDR5", m2: 3 },
      { id: "x870e", n: "Carte mère X870E (AM5, DDR5)", p: 380, sock: "AM5", ram: "DDR5", m2: 4 },
      { id: "b760d4", n: "Carte mère B760 DDR4 (LGA1700)", p: 120, sock: "LGA1700", ram: "DDR4", m2: 2 },
      { id: "b760", n: "Carte mère B760 DDR5 (LGA1700)", p: 150, sock: "LGA1700", ram: "DDR5", m2: 2 },
      { id: "z790", n: "Carte mère Z790 (LGA1700, DDR5)", p: 250, sock: "LGA1700", ram: "DDR5", m2: 4 },
      { id: "b860", n: "Carte mère B860 (LGA1851, DDR5)", p: 170, sock: "LGA1851", ram: "DDR5", m2: 2 },
      { id: "z890", n: "Carte mère Z890 (LGA1851, DDR5)", p: 300, sock: "LGA1851", ram: "DDR5", m2: 4 }
    ],
    ram: [
      { id: "d4-16", n: "16 Go DDR4-3200 (2 × 8)", p: 55, type: "DDR4", gb: 16 },
      { id: "d4-32", n: "32 Go DDR4-3600 (2 × 16)", p: 100, type: "DDR4", gb: 32 },
      { id: "d5-16", n: "16 Go DDR5-6000 (2 × 8)", p: 110, type: "DDR5", gb: 16 },
      { id: "d5-32", n: "32 Go DDR5-6000 (2 × 16)", p: 200, type: "DDR5", gb: 32 },
      { id: "d5-64", n: "64 Go DDR5-6000 (2 × 32)", p: 400, type: "DDR5", gb: 64 }
    ],
    gpu: [
      { id: "b580", n: "Intel Arc B580 12 Go", p: 280, w: 190, len: 272, vram: 12, s: 38 },
      { id: "5060", n: "NVIDIA GeForce RTX 5060 8 Go", p: 320, w: 145, len: 240, vram: 8, s: 42 },
      { id: "9060xt", n: "AMD Radeon RX 9060 XT 16 Go", p: 380, w: 160, len: 250, vram: 16, s: 48 },
      { id: "5060ti", n: "NVIDIA GeForce RTX 5060 Ti 16 Go", p: 460, w: 180, len: 250, vram: 16, s: 52 },
      { id: "5070", n: "NVIDIA GeForce RTX 5070 12 Go", p: 600, w: 250, len: 280, vram: 12, s: 66, plug: 1 },
      { id: "9070", n: "AMD Radeon RX 9070 16 Go", p: 610, w: 220, len: 290, vram: 16, s: 70 },
      { id: "9070xt", n: "AMD Radeon RX 9070 XT 16 Go", p: 690, w: 304, len: 305, vram: 16, s: 78 },
      { id: "5070ti", n: "NVIDIA GeForce RTX 5070 Ti 16 Go", p: 880, w: 300, len: 305, vram: 16, s: 82, plug: 1 },
      { id: "5080", n: "NVIDIA GeForce RTX 5080 16 Go", p: 1250, w: 360, len: 320, vram: 16, s: 92, plug: 1 },
      { id: "5090", n: "NVIDIA GeForce RTX 5090 32 Go", p: 2500, w: 575, len: 340, vram: 32, s: 120, plug: 1 }
    ],
    ssd: [
      { id: "1to", n: "SSD NVMe 1 To (PCIe 4.0)", p: 80, slots: 1 },
      { id: "2to", n: "SSD NVMe 2 To (PCIe 4.0)", p: 140, slots: 1 },
      { id: "4to", n: "SSD NVMe 4 To (PCIe 4.0)", p: 280, slots: 1 },
      { id: "2to5", n: "SSD NVMe 2 To (PCIe 5.0)", p: 230, slots: 1 },
      { id: "2x2", n: "2 × SSD NVMe 2 To (PCIe 4.0)", p: 280, slots: 2 }
    ],
    cool: [
      { id: "box", n: "Ventirad fourni avec le processeur", p: 0, cap: 90, box: 1 },
      { id: "tower1", n: "Ventirad tour simple", p: 35, cap: 180 },
      { id: "tower2", n: "Ventirad double tour", p: 75, cap: 250 },
      { id: "aio240", n: "Watercooling AIO 240 mm", p: 100, cap: 250 },
      { id: "aio360", n: "Watercooling AIO 360 mm", p: 140, cap: 320 }
    ],
    psu: [
      { id: "550b", n: "Alimentation 550 W 80+ Bronze", p: 55, w: 550 },
      { id: "650g", n: "Alimentation 650 W 80+ Gold", p: 85, w: 650 },
      { id: "750g", n: "Alimentation 750 W 80+ Gold ATX 3.1", p: 105, w: 750, atx3: 1 },
      { id: "850g", n: "Alimentation 850 W 80+ Gold ATX 3.1", p: 130, w: 850, atx3: 1 },
      { id: "1000g", n: "Alimentation 1000 W 80+ Gold ATX 3.1", p: 175, w: 1000, atx3: 1 },
      { id: "1200p", n: "Alimentation 1200 W 80+ Platinum ATX 3.1", p: 270, w: 1200, atx3: 1 }
    ],
    case: [
      { id: "matx", n: "Boîtier compact micro-ATX", p: 70, gpuMax: 320 },
      { id: "atx", n: "Boîtier moyen tour ATX ventilé", p: 95, gpuMax: 380 },
      { id: "pano", n: "Boîtier grand tour vitré panoramique", p: 150, gpuMax: 420 }
    ]
  };
  const PARTS = [["cpu", "Processeur"], ["mb", "Carte mère"], ["ram", "Mémoire vive"], ["gpu", "Carte graphique"], ["ssd", "Stockage"], ["cool", "Refroidissement"], ["psu", "Alimentation"], ["case", "Boîtier"]];
  const PRESETS = [
    { id: "entree", n: "Entrée de gamme", sub: "1080p fluide", sel: { cpu: "r5-7600", mb: "a620", ram: "d5-16", gpu: "9060xt", ssd: "1to", cool: "box", psu: "650g", case: "atx" } },
    { id: "milieu", n: "Milieu de gamme", sub: "1440p fluide", sel: { cpu: "r7-7800x3d", mb: "b650", ram: "d5-32", gpu: "9070xt", ssd: "2to", cool: "tower2", psu: "750g", case: "atx" } },
    { id: "haut", n: "Haut de gamme", sub: "1440p très fluide, 4K", sel: { cpu: "r7-9800x3d", mb: "b850", ram: "d5-32", gpu: "5080", ssd: "2to", cool: "aio360", psu: "850g", case: "pano" } },
    { id: "ultime", n: "Ultime", sub: "4K sans compromis", sel: { cpu: "r9-9950x3d", mb: "x870e", ram: "d5-64", gpu: "5090", ssd: "4to", cool: "aio360", psu: "1200p", case: "pano" } }
  ];

  const P = store.get("pc", { sel: Object.assign({}, PRESETS[1].sel), price: {} });
  let saved = store.get("pcSaved", []);
  const item = k => D[k].find(x => x.id === P.sel[k]) || D[k][0];
  const priceOf = (k, it) => P.price[k + ":" + it.id] ?? it.p;
  const save = () => store.set("pc", P);
  const eur = n => Math.round(n).toLocaleString("fr-FR") + " €";

  // une config partagée par lien : ?pc=…
  try {
    const q = new URLSearchParams(location.search).get("pc");
    if (q) {
      const j = JSON.parse(decodeURIComponent(escape(atob(q.replace(/-/g, "+").replace(/_/g, "/")))));
      PARTS.forEach(([k]) => { if (j.s && D[k].some(x => x.id === j.s[k])) P.sel[k] = j.s[k]; });
      P.price = j.p && typeof j.p === "object" ? j.p : {}; save();
      history.replaceState(null, "", location.pathname + "#pc");
      window.__pcShared = true;
    }
  } catch {}

  function checks() {
    const c = item("cpu"), m = item("mb"), r = item("ram"), g = item("gpu"), s = item("ssd"), co = item("cool"), ps = item("psu"), ca = item("case");
    const out = [];
    const need = c.w + g.w + 75, rec = Math.ceil(need * 1.4 / 50) * 50;
    if (c.sock !== m.sock) out.push(["err", `Le processeur (${c.sock}) ne rentre pas sur cette carte mère (${m.sock}).`]);
    if (r.type !== m.ram) out.push(["err", `Cette carte mère prend de la ${m.ram}, pas de la ${r.type}.`]);
    if (co.box && !c.box) out.push(["err", "Ce processeur est vendu sans ventirad : choisis un refroidissement."]);
    else if (co.cap < c.w) out.push(["warn", `Refroidissement un peu juste pour ce processeur (jusqu'à ${c.w} W).`]);
    if (s.slots > m.m2) out.push(["err", `Pas assez d'emplacements M.2 sur la carte mère (${m.m2}).`]);
    if (g.len > ca.gpuMax) out.push(["err", `La carte graphique (${g.len} mm) est trop longue pour ce boîtier (${ca.gpuMax} mm max).`]);
    if (ps.w < need * 1.1) out.push(["err", `Alimentation trop faible : il faut au moins ${rec} W.`]);
    else if (ps.w < rec) out.push(["warn", `Alimentation juste : ${rec} W conseillés pour être tranquille.`]);
    if (g.plug && !ps.atx3) out.push(["warn", "Cette carte graphique se branche en 12V-2x6 : une alimentation ATX 3.1 avec le câble natif est conseillée."]);
    if (g.s > c.s * 1.25) out.push(["warn", "Le processeur va limiter la carte graphique, surtout en 1080p."]);
    else if (c.s > g.s * 2.2) out.push(["info", "Processeur très puissant pour cette carte graphique : le budget serait mieux placé dans le GPU."]);
    if (r.gb < 32 && g.s >= 66) out.push(["info", "32 Go de mémoire sont conseillés pour les gros jeux récents."]);
    if (g.vram <= 8) out.push(["info", "8 Go de mémoire vidéo : juste en 1440p sur les jeux récents."]);
    return { list: out, need, rec };
  }
  // estimation : jeu AAA récent, réglages élevés, sans upscaling ni génération d'images
  function perf() {
    const c = item("cpu"), g = item("gpu");
    const vr = { 1080: 1, 1440: g.vram <= 8 ? .85 : 1, 2160: g.vram <= 8 ? .7 : g.vram <= 12 ? .9 : 1 };
    const row = (res, k, cap) => Math.round(Math.min(g.s * k * vr[res], c.s * cap));
    return [["1080p", row(1080, 1.75, 1.9)], ["1440p", row(1440, 1.25, 2.4)], ["4K", row(2160, .62, 4)], ["Compétitif 1080p", Math.round(Math.min(g.s * 6, c.s * 4.6))]];
  }
  const feel = f => f >= 120 ? ["Très fluide", "var(--online)"] : f >= 60 ? ["Fluide", "var(--online)"] : f >= 40 ? ["Jouable", "var(--away)"] : ["Insuffisant", "var(--danger)"];
  function shareURL() {
    const j = JSON.stringify({ s: P.sel, p: P.price });
    return location.origin + location.pathname + "?pc=" + btoa(unescape(encodeURIComponent(j))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }
  const listText = () => PARTS.map(([k, l]) => `${l} : ${item(k).n} (${eur(priceOf(k, item(k)))})`).join("\n") + `\nTotal : ${eur(total())}`;
  const total = () => PARTS.reduce((t, [k]) => t + (+priceOf(k, item(k)) || 0), 0);

  function render() {
    const el = $("#v-pc"); if (!el) return;
    const ck = checks(), pf = perf(), errs = ck.list.filter(x => x[0] === "err").length;
    const icon = { err: "✕", warn: "!", info: "i" };
    el.innerHTML = `<div class="row"><h2>Config PC</h2></div>
      <p style="color:var(--muted);margin:-6px 0 16px;max-width:70ch">Pars d'une base ou choisis chaque pièce. Lobby vérifie la compatibilité, calcule l'alimentation et estime les performances en jeu.</p>
      <div class="presets">${PRESETS.map(pr => { const on = PARTS.every(([k]) => P.sel[k] === pr.sel[k]); const tot = PARTS.reduce((t, [k]) => t + D[k].find(x => x.id === pr.sel[k]).p, 0);
        return `<button class="preset" data-pcpreset="${pr.id}" aria-pressed="${on}"><b>${pr.n}</b><span>${pr.sub}</span><small>≈ ${eur(tot)}</small></button>`; }).join("")}</div>
      <div class="pcgrid">
        <div class="parts">${PARTS.map(([k, l]) => { const it = item(k); return `<div class="part">
          <label for="pc-${k}">${l}</label>
          <select id="pc-${k}" data-pcpart="${k}">${D[k].map(x => `<option value="${x.id}" ${x.id === it.id ? "selected" : ""}>${esc(x.n)}</option>`).join("")}</select>
          <span class="price"><input id="pcp-${k}" type="number" min="0" step="1" inputmode="numeric" value="${priceOf(k, it)}" data-pcprice="${k}" aria-label="Prix ${l}"> €</span></div>`; }).join("")}
          <p class="meta">Prix indicatifs (les prix changent vite, la mémoire surtout) : tape le prix que tu as trouvé, Lobby le garde.</p>
        </div>
        <aside class="pcsum">
          <div class="total"><span>Total</span><b>${eur(total())}</b></div>
          <div class="kv"><span>Consommation max en jeu</span><b>≈ ${ck.need} W</b></div>
          <div class="kv"><span>Alimentation conseillée</span><b>${ck.rec} W</b></div>
          <h5>Compatibilité</h5>
          <ul class="checks">${ck.list.length ? ck.list.map(([lv, m]) => `<li class="${lv}"><i>${icon[lv]}</i>${esc(m)}</li>`).join("") : ""}${!errs ? `<li class="ok"><i>✓</i>${ck.list.length ? "Tout est compatible, avec les remarques ci-dessus." : "Tout est compatible."}</li>` : ""}</ul>
          <h5>Performances estimées</h5>
          <div class="perf">${pf.map(([l, f]) => { const [t, col] = feel(f); return `<div class="pr"><span>${l}</span><div class="bar"><i style="width:${Math.min(100, f / (l.startsWith("Comp") ? 5 : 2))}%;background:${col}"></i></div><b>${f} FPS</b><small style="color:${col}">${t}</small></div>`; }).join("")}</div>
          <p class="meta">Jeu récent en réglages élevés, sans upscaling. « Compétitif » : CS2, Valorant, Fortnite en réglages bas. Estimation, pas une mesure.</p>
          <div class="pcact"><button class="btn primary" data-pcact="share">Copier le lien</button><button class="btn" data-pcact="list">Copier la liste</button></div>
          <form id="pcsave" class="pcsave"><input id="pcname" maxlength="40" placeholder="Nom de la config" aria-label="Nom de la config"><button class="btn" type="submit">Enregistrer</button></form>
          ${saved.length ? `<ul class="saved">${saved.map((c, i) => `<li><button class="linkbtn" data-pcload="${i}">${esc(c.name)}</button><span class="meta">${eur(PARTS.reduce((t, [k]) => { const it = D[k].find(x => x.id === c.sel[k]) || D[k][0]; return t + (+(c.price[k + ":" + it.id] ?? it.p) || 0); }, 0))}</span><button class="linkbtn" data-pcdel="${i}" aria-label="Supprimer ${esc(c.name)}">×</button></li>`).join("")}</ul>` : ""}
        </aside>
      </div>`;
  }

  document.addEventListener("change", e => {
    const k = e.target.dataset.pcpart; if (!k) return;
    P.sel[k] = e.target.value;
    // carte mère : on suit le socket du processeur ; mémoire : on suit la carte mère
    if (k === "cpu") { const c = item("cpu"); if (item("mb").sock !== c.sock) P.sel.mb = D.mb.find(m => m.sock === c.sock && m.ram === "DDR5")?.id || D.mb.find(m => m.sock === c.sock).id; }
    if (k === "cpu" || k === "mb") { const m = item("mb"); if (item("ram").type !== m.ram) P.sel.ram = D.ram.find(r => r.type === m.ram && r.gb === 32).id; }
    save(); render(); const f = $("#pc-" + k); f && f.focus();
  });
  document.addEventListener("input", e => {
    const k = e.target.dataset.pcprice; if (!k) return;
    const v = e.target.value === "" ? null : Math.max(0, +e.target.value);
    const key = k + ":" + item(k).id; if (v === null || v === item(k).p) delete P.price[key]; else P.price[key] = v;
    save();
    const tot = document.querySelector(".pcsum .total b"); if (tot) tot.textContent = eur(total());
  });
  document.addEventListener("click", async e => {
    const t = e.target;
    const pr = t.closest("[data-pcpreset]"); if (pr) { P.sel = Object.assign({}, PRESETS.find(x => x.id === pr.dataset.pcpreset).sel); save(); render(); return; }
    const a = t.closest("[data-pcact]");
    if (a) { const txt = a.dataset.pcact === "share" ? shareURL() : listText(); try { await navigator.clipboard.writeText(txt); toast(a.dataset.pcact === "share" ? "Lien copié : la config s'ouvrira telle quelle" : "Liste copiée"); } catch { toast("Copie impossible sur cet appareil"); } return; }
    const ld = t.closest("[data-pcload]"); if (ld) { const c = saved[+ld.dataset.pcload]; P.sel = Object.assign({}, c.sel); P.price = Object.assign({}, c.price); save(); render(); toast(c.name + " chargée"); return; }
    const dl = t.closest("[data-pcdel]"); if (dl) { saved.splice(+dl.dataset.pcdel, 1); store.set("pcSaved", saved); render(); }
  });
  document.addEventListener("submit", e => {
    if (e.target.id !== "pcsave") return; e.preventDefault();
    const name = $("#pcname").value.trim() || "Ma config " + (saved.length + 1);
    saved = saved.filter(c => c.name !== name); saved.unshift({ name, sel: Object.assign({}, P.sel), price: Object.assign({}, P.price) });
    store.set("pcSaved", saved.slice(0, 20)); render(); toast("Config enregistrée");
  });

  window.renderPC = render;
  if (window.__pcShared) route();
})();
