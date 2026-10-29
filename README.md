# WTS Lobby

Toutes les sorties de jeux avec compte à rebours, la recherche de n'importe quel jeu, les notes de mise à jour, l'actu jeux vidéo, les événements, les tendances, l'esport, les jeux gratuits, les abonnements, les classes d'armes meta et un configurateur PC, au même endroit. S'installe sur PC et téléphone comme une appli.

## Contenu
| Fichier | Rôle |
|---|---|
| `index.html`, `app.js` | L'appli |
| `sw.js`, `manifest.webmanifest`, icônes | Installation sur l'écran d'accueil, interface hors ligne |
| `api/games.js` | Sorties à venir, recherche et fiches de jeux (IGDB) : jaquettes, images, plateformes, résumé |
| `api/updates.js` | Notes de mise à jour officielles des jeux suivis (annonces Steam, sans clé) + recherche de jeux Steam |
| `api/news.js` | Actualités lues dans les flux RSS des sites jeux vidéo |
| `api/meta.js`, `meta.js` | Meta : classes d'armes partagées (base Upstash) |
| `pc.js` | Configurateur PC |
| `infos.js` | Onglets Événements, Jeux gratuits, Tendances, Esport, Abonnements |
| `api/events.js` | Événements (liste de départ, modifiable par l'admin) |
| `api/free.js` | Jeux gratuits : Epic Games Store + GamerPower |
| `api/trends.js` | Tendances : les plus joués sur Steam, les plus regardés sur Twitch |
| `api/esport.js` | Esport : matchs en cours, à venir, résultats (PandaScore) |
| `menu.js`, `api/config.js` | Menu configurable, menu par défaut du site |

Les réponses sont gardées en cache par Vercel (30 min pour les sorties, 15 min pour les mises à jour, 10 min pour les actus). Les jeux suivis et les réglages restent sur l'appareil de chaque personne. Seule la Meta utilise la base Upstash.

## Mise en ligne (une seule fois)
1. **GitHub** : le code est dans `github.com/Wts-scripts/lobby`.
2. **Vercel** : Add New → Project → importe `lobby` → nom du projet `wts-lobby` (adresse https://wts-lobby.vercel.app) → Framework Preset : **Other** → Deploy.
   L'appli marche déjà en **mode démo** (calendrier fixe, sans jaquettes) tant que les clés ci-dessous manquent.

3. **Sorties et recherche (IGDB, gratuit)** :
   - Va sur https://dev.twitch.tv/console (connexion avec un compte Twitch, validation en deux étapes activée).
   - **Register Your Application** → nom : `Lobby` · OAuth Redirect URL : `http://localhost` · Category : **Application Integration** · Client Type : **Confidential** → Create.
   - Ouvre l'appli → copie le **Client ID**, puis **New Secret** → copie le secret.
   - Vercel → Settings → Environment Variables :
     - `TWITCH_CLIENT_ID` = le Client ID
     - `TWITCH_CLIENT_SECRET` = le secret

4. **Esport (gratuit)** : crée un compte sur https://pandascore.co → ton tableau de bord affiche ta clé (offre gratuite « Fixtures ») → Vercel : `PANDASCORE_TOKEN` = la clé. Sans elle, l'onglet Esport explique quoi faire.
4b. **Meta (classes d'armes partagées)** : dans le projet Vercel → onglet **Storage** → Create Database → **Upstash for Redis** (plan gratuit) → connecte-la au projet `wts-lobby`. C'est la même base que pour Cura.
5. **Code administrateur** : `LOBBY_KEY` = un code à toi (une phrase longue). Il permet de voir les signalements et de supprimer n'importe quelle publication de la Meta (onglet Meta → Administration).
6. Deployments → ⋯ → **Redeploy**.

### Facultatif
- `NEWS_FEEDS` : pour choisir les sites d'actus. Format : `Nom|adresse du flux RSS`, séparés par des virgules. Exemple : `Jeuxvideo.com|https://www.jeuxvideo.com/rss/rss.xml, Steam|https://store.steampowered.com/feeds/news.xml`. Un flux qui ne répond pas est simplement ignoré (il apparaît en note dans l'onglet Actualités).

## Tout dans l'appli
- **Mises à jour** : les notes de patch complètes s'ouvrent dans un lecteur intégré (texte, titres, listes, images de l'annonce Steam).
- **Actualités** : l'article s'ouvre dans le même lecteur avec le texte que le site publie dans son flux. Beaucoup de sites n'y mettent qu'un extrait : Lobby l'indique et propose la suite sur le site.
- **Fiche jeu** : bande-annonce lue dans l'appli, captures d'écran en galerie (plein écran au clic), résumé, studio, actus du jeu.

## Événements
- Showcases, salons, cérémonies, soldes, esport : le prochain en grand avec compte à rebours, puis la liste avec la date, le lieu, « J-12 » (ou le compte à rebours à la seconde quand l'heure est connue) et le lien du site officiel.
- Liste de départ vérifiée fin octobre 2026 : Streamer Awards (12 nov.), TwitchCon San Diego (13–15 nov.), G-STAR (19–22 nov.), DreamHack Stockholm (27–29 nov.), The Game Awards (10 déc.), soldes d'hiver Steam (17 déc. – 4 janv.).
- **Admin** (code `LOBBY_KEY` enregistré dans l'appli) : boutons Ajouter / Modifier / Supprimer directement dans l'onglet, dès qu'un Direct ou un showcase est annoncé. Les événements passés disparaissent seuls. Nécessite la base Upstash.

## Jeux gratuits
- **Jeux à garder**, **Contenus en jeu** (packs, skins, DLC) et **Bêtas**, filtrables par boutique (Epic, Steam, GOG, consoles…).
- « À récupérer maintenant » avec le temps restant à la seconde, « Bientôt gratuit » (les prochains jeux Epic) avec le compte à rebours avant l'offre.
- La fiche explique comment le récupérer ; le bouton mène à la boutique, où l'on récupère le jeu avec son compte.
- Sources : API Epic Games Store et GamerPower (gratuite, lien vers gamerpower.com obligatoire, affiché dans l'onglet). Actualisé toutes les 15 min.

## Tendances
- **Les plus joués** : top 25 Steam, joueurs connectés en ce moment et pic des dernières 24 h, évolution sur une semaine. Un clic propose de suivre les mises à jour du jeu.
- **Les plus regardés** : top 20 Twitch (mêmes clés qu'IGDB).
- **Les plus attendus** : les sorties à venir avec le plus d'attente sur IGDB.

## Esport
- Counter-Strike 2, Valorant, League of Legends, Dota 2 (ce que couvre l'offre gratuite PandaScore).
- Matchs **en direct** (score, bouton Regarder qui ouvre le stream dans l'appli), **à venir** par jour avec compte à rebours, **résultats** récents.

## Abonnements
- Les annonces Game Pass et PlayStation Plus (jeux qui arrivent, qui partent, jeux du mois) tirées des blogs officiels Xbox Wire et PlayStation Blog en français, lues dans l'appli.
- Flux modifiables : `SUBS_FEEDS` (même format que `NEWS_FEEDS`).

## Meta
- Chacun publie une classe : jeu, arme, type, mode, accessoires (emplacement + accessoire), code de partage, conseils, pseudo. Pas besoin de compte.
- Filtre par jeu, recherche par arme, tri **Populaires** (votes) ou **Récentes**. Le code de partage se copie en un clic.
- Un vote par appareil (on peut le retirer). L'auteur peut supprimer sa publication depuis l'appareil qui l'a publiée.
- Modération : une publication signalée par 5 appareils différents est masquée automatiquement ; l'admin (code `LOBBY_KEY`) voit les signalements et peut tout supprimer.
- Anti-spam : 6 publications maximum par heure et par connexion.
- Sans la base Upstash, l'onglet affiche comment l'activer.

## Config PC
- 4 configs de départ (Entrée, Milieu, Haut de gamme, Ultime) ou choix pièce par pièce : processeur, carte mère, mémoire, carte graphique, stockage, refroidissement, alimentation, boîtier.
- Vérifications : socket processeur / carte mère, DDR4 / DDR5, ventirad fourni ou non, emplacements M.2, longueur de la carte graphique / boîtier, puissance de l'alimentation (calcul de la consommation + marge), câble 12V-2x6, équilibre processeur / carte graphique, mémoire et VRAM.
- Performances estimées en 1080p, 1440p, 4K et en jeux compétitifs (indicatif).
- Prix indicatifs modifiables (chacun tape le prix trouvé), total automatique.
- Enregistrer plusieurs configs, copier la liste, ou **copier un lien** qui ouvre la config telle quelle chez quelqu'un d'autre.
- La liste des composants et leurs prix sont dans `pc.js` (tableau `D`), faciles à mettre à jour.

## Apparence (onglet Réglages)
- **Mode** : Système (suit le PC ou le téléphone), Sombre ou Clair.
- **Thème** : Nuit (par défaut), WTS, Graphite, Citron, Sunset, Sable, Sakura, Océan, Néon — les mêmes que Cura, chacun en sombre et en clair.
- **Police** : 20 associations titres + texte + chiffres, en deux séries (tech et futuriste, gras et impactant) — Chakra Petch par défaut. Les tailles sont ajustées pour que chaque police garde le même encombrement.
- **Menu** : par défaut, rubriques groupées (Sorties, Événements · Infos · Gratuit · Outils). Ordre des catégories (glisser-déposer ou flèches), renommer, masquer, ajouter des séparateurs avec ou sans titre. Réglages reste toujours visible.
Ces choix restent sur l'appareil. Avec le code admin, le bouton « Utiliser ce menu pour tout le monde » en fait le menu par défaut du site (pour ceux qui n'ont pas personnalisé le leur).

## À venir
- Comptes Lobby (inscription, synchro entre appareils) et offre Pro par Paddle, sur le modèle de Cura.
- Rappel le jour de la sortie d'un jeu suivi (notifications).

## Test en local
`npx vercel dev` dans ce dossier (les clés dans un fichier `.env.local`, jamais envoyé sur GitHub).
