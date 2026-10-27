/* WTS Lobby · plateformes des profils publics (partagé entre l'appli et le serveur)
   kind "url" : on garde un lien propre vers le profil ; kind "id" : un identifiant à copier (avec lien quand il existe). */
(function (g) {
  const H = s => String(s || "").trim();
  const handle = (s, re) => { s = H(s).replace(/^@/, ""); return re.test(s) ? s : null; };
  const fromUrl = (s, host, re) => { const m = H(s).match(new RegExp("^(?:https?:\\/\\/)?(?:www\\.|m\\.)?" + host + "\\/" + re.source, "i")); return m ? m[1] : null; };
  const PLATFORMS = [
    // Jeux
    { k: "steam", n: "Steam", grp: "Jeux", kind: "url", ph: "https://steamcommunity.com/id/ton-pseudo",
      norm: s => { s = H(s); let m = s.match(/steamcommunity\.com\/(id|profiles)\/([\w.-]{2,64})/i); if (m) return `https://steamcommunity.com/${m[1].toLowerCase()}/${m[2]}`;
        if (/^\d{17}$/.test(s)) return "https://steamcommunity.com/profiles/" + s; if (/^[\w.-]{2,32}$/.test(s)) return "https://steamcommunity.com/id/" + s; return null; } },
    { k: "epic", n: "Epic Games", grp: "Jeux", kind: "id", ph: "Ton pseudo Epic" },
    { k: "xbox", n: "Xbox", grp: "Jeux", kind: "id", ph: "Ton gamertag" },
    { k: "psn", n: "PlayStation", grp: "Jeux", kind: "id", ph: "Ton ID en ligne PSN" },
    { k: "nintendo", n: "Nintendo", grp: "Jeux", kind: "id", ph: "SW-1234-5678-9012" },
    { k: "battlenet", n: "Battle.net", grp: "Jeux", kind: "id", ph: "Pseudo#1234" },
    { k: "ea", n: "EA app", grp: "Jeux", kind: "id", ph: "Ton ID EA" },
    { k: "riot", n: "Riot Games", grp: "Jeux", kind: "id", ph: "Pseudo#EUW" },
    { k: "ubisoft", n: "Ubisoft Connect", grp: "Jeux", kind: "id", ph: "Ton pseudo Ubisoft" },
    { k: "rockstar", n: "Rockstar Social Club", grp: "Jeux", kind: "id", ph: "Ton pseudo Social Club",
      link: v => /^[\w.-]{3,32}$/.test(v) ? "https://socialclub.rockstargames.com/member/" + encodeURIComponent(v) : null },
    // Streaming et réseaux
    { k: "twitch", n: "Twitch", grp: "Streaming et réseaux", kind: "url", ph: "twitch.tv/ta-chaine",
      norm: s => { const v = fromUrl(s, "twitch\\.tv", /([a-zA-Z0-9_]{3,25})(?:[/?#].*)?$/) || handle(s, /^[a-zA-Z0-9_]{3,25}$/); return v ? "https://www.twitch.tv/" + v.toLowerCase() : null; } },
    { k: "youtube", n: "YouTube", grp: "Streaming et réseaux", kind: "url", ph: "youtube.com/@ta-chaine",
      norm: s => { s = H(s); const m = s.match(/youtube\.com\/(@[\w.-]{3,40}|channel\/[\w-]{10,40}|c\/[\w.-]{2,60})/i); if (m) return "https://www.youtube.com/" + m[1];
        const h = handle(s, /^[\w.-]{3,40}$/); return h ? "https://www.youtube.com/@" + h : null; } },
    { k: "kick", n: "Kick", grp: "Streaming et réseaux", kind: "url", ph: "kick.com/ta-chaine",
      norm: s => { const v = fromUrl(s, "kick\\.com", /([\w-]{3,25})(?:[/?#].*)?$/) || handle(s, /^[\w-]{3,25}$/); return v ? "https://kick.com/" + v.toLowerCase() : null; } },
    { k: "tiktok", n: "TikTok", grp: "Streaming et réseaux", kind: "url", ph: "@ton-pseudo",
      norm: s => { const v = fromUrl(s, "tiktok\\.com", /@([\w.]{2,24})(?:[/?#].*)?$/) || handle(s, /^[\w.]{2,24}$/); return v ? "https://www.tiktok.com/@" + v : null; } },
    { k: "x", n: "X (Twitter)", grp: "Streaming et réseaux", kind: "url", ph: "@ton-pseudo",
      norm: s => { const v = fromUrl(s, "(?:x|twitter)\\.com", /(\w{1,15})(?:[/?#].*)?$/) || handle(s, /^\w{1,15}$/); return v ? "https://x.com/" + v : null; } },
    { k: "instagram", n: "Instagram", grp: "Streaming et réseaux", kind: "url", ph: "@ton-pseudo",
      norm: s => { const v = fromUrl(s, "instagram\\.com", /([\w.]{1,30})(?:[/?#].*)?$/) || handle(s, /^[\w.]{1,30}$/); return v ? "https://www.instagram.com/" + v : null; } },
    // Discord
    { k: "discord", n: "Discord", grp: "Discord", kind: "id", ph: "Ton pseudo Discord" },
    { k: "discordServer", n: "Serveur Discord", grp: "Discord", kind: "url", ph: "discord.gg/invitation",
      norm: s => { const m = H(s).match(/^(?:https?:\/\/)?(?:www\.)?(?:discord\.gg|discord\.com\/invite)\/([\w-]{2,32})$/i) || H(s).match(/^([\w-]{2,32})$/); return m ? "https://discord.gg/" + m[1] : null; } }
  ];
  // valeur propre ou null (refusée)
  function clean(k, v) {
    const p = PLATFORMS.find(x => x.k === k); if (!p) return null;
    v = String(v || "").replace(/[\u0000-\u001f\u007f<>"'`]/g, "").trim().slice(0, 120);
    if (!v) return null;
    if (p.kind === "url") return p.norm(v);
    return v.slice(0, 40);
  }
  const linkOf = (k, v) => { const p = PLATFORMS.find(x => x.k === k); if (!p) return null; return p.kind === "url" ? v : p.link ? p.link(v) : null; };
  const twitchLogin = url => (String(url || "").match(/twitch\.tv\/([a-z0-9_]{3,25})$/) || [])[1] || null;
  const api = { PLATFORMS, clean, linkOf, twitchLogin };
  if (typeof module !== "undefined" && module.exports) module.exports = api; else g.LOBBY_PLATFORMS = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
