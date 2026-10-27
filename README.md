# WTS Lobby

Toutes les sorties de jeux avec compte à rebours, la recherche de n'importe quel jeu, les notes de mise à jour, l'actu jeux vidéo et les amis connectés (Steam, Xbox, FiveM), au même endroit. S'installe sur PC et téléphone comme une appli.

## Contenu
| Fichier | Rôle |
|---|---|
| `index.html`, `app.js` | L'appli |
| `sw.js`, `manifest.webmanifest`, icônes | Installation sur l'écran d'accueil, interface hors ligne |
| `api/games.js` | Sorties à venir, recherche et fiches de jeux (IGDB) : jaquettes, images, plateformes, résumé |
| `api/updates.js` | Notes de mise à jour officielles des jeux suivis (annonces Steam, sans clé) + recherche de jeux Steam |
| `api/news.js` | Actualités lues dans les flux RSS des sites jeux vidéo |
| `api/friends.js` | Amis connectés : Steam, Xbox (OpenXBL), FiveM |

Aucune base de données nécessaire : les réponses sont gardées en cache par Vercel (30 min pour les sorties, 15 min pour les mises à jour, 10 min pour les actus). Les jeux suivis et les comptes liés restent sur l'appareil de chaque personne.

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

4. **Amis Steam (gratuit)** :
   - https://steamcommunity.com/dev/apikey → nom de domaine : ton adresse Vercel → copie la clé.
   - Vercel : `STEAM_API_KEY` = la clé.

5. **Meta (classes d'armes partagées)** : dans le projet Vercel → onglet **Storage** → Create Database → **Upstash for Redis** (plan gratuit) → connecte-la au projet `wts-lobby`. C'est la même base que pour Cura.
6. **Code administrateur** : `LOBBY_KEY` = un code à toi (une phrase longue). Il permet de voir les signalements et de supprimer n'importe quelle publication de la Meta (onglet Meta → Administration).
7. Deployments → ⋯ → **Redeploy**.

### Facultatif
- `NEWS_FEEDS` : pour choisir les sites d'actus. Format : `Nom|adresse du flux RSS`, séparés par des virgules. Exemple : `Jeuxvideo.com|https://www.jeuxvideo.com/rss/rss.xml, Steam|https://store.steampowered.com/feeds/news.xml`. Un flux qui ne répond pas est simplement ignoré (il apparaît en note dans l'onglet Actualités).

## Tout dans l'appli
- **Mises à jour** : les notes de patch complètes s'ouvrent dans un lecteur intégré (texte, titres, listes, images de l'annonce Steam).
- **Actualités** : l'article s'ouvre dans le même lecteur avec le texte que le site publie dans son flux. Beaucoup de sites n'y mettent qu'un extrait : Lobby l'indique et propose la suite sur le site.
- **Fiche jeu** : bande-annonce lue dans l'appli, captures d'écran en galerie (plein écran au clic), résumé, studio, actus du jeu.

## Meta
- Chacun publie une classe : jeu, arme, type, mode, accessoires (emplacement + accessoire), code de partage, conseils, pseudo. Pas besoin de compte.
- Filtre par jeu, recherche par arme, tri **Populaires** (votes) ou **Récentes**. Le code de partage se copie en un clic.
- Un vote par appareil (on peut le retirer). L'auteur peut supprimer sa publication depuis l'appareil qui l'a publiée.
- Modération : une publication signalée par 5 appareils différents est masquée automatiquement ; l'admin (code `LOBBY_KEY`) voit les signalements et peut tout supprimer.
- Anti-spam : 6 publications maximum par heure et par connexion.
- Sans la base Upstash, l'onglet affiche comment l'activer.

## Comptes : profils publics
- **Mon profil** : pseudo unique, nom affiché, présentation, jeux favoris, et tous les comptes : Steam, Epic, Xbox, PlayStation, Nintendo, Battle.net, EA, Riot, Ubisoft, Rockstar, Twitch, YouTube, Kick, TikTok, X, Instagram, Discord (pseudo et serveur).
- Les liens sont vérifiés et remis au propre (un pseudo Twitch devient `https://www.twitch.tv/pseudo`, un SteamID devient le lien du profil…). Un lien vers un autre site est refusé.
- Case **Profil public** : cochée, le profil apparaît dans **Joueurs** (et dans **Live** s'il y a une chaîne). Décochée, il reste seulement sur l'appareil.
- Le pseudo est protégé : seul l'appareil qui l'a créé (jeton gardé sur l'appareil) peut le modifier ou le retirer.
- **Joueurs** : annuaire avec recherche. La fiche d'un joueur ouvre ses liens (Twitch, Steam…) et copie ses identifiants (PSN, Battle.net, Riot…). Lien direct vers une fiche : `/#j-pseudo`.
- Modération comme la Meta : masqué après 5 signalements, l'admin (`LOBBY_KEY`) peut supprimer.
- **Amis en ligne** : les liaisons Steam / Xbox / FiveM de l'onglet Amis (restent sur l'appareil).

## Live
- Les joueurs qui ont mis leur Twitch dans leur profil public. Ceux en direct passent devant, le plus regardé est mis **à la une** (miniature du stream, titre, jeu, spectateurs, depuis quand).
- Un clic ouvre le stream **dans l'appli**, avec le chat Twitch en option.
- **Fenêtre de chat** à côté du live (côte à côte sur grand écran), avec deux onglets :
  - **Chat Lobby** : un salon par live, entre joueurs Lobby (pseudo du profil public, ou un pseudo choisi). 200 derniers messages gardés 2 jours, 1 message par seconde et demie maximum, l'admin peut retirer un message (×). Une lecture de la base toutes les 2 s par live, quel que soit le nombre de spectateurs.
  - **Chat Twitch** : le vrai chat du streamer. Bouton « Se connecter avec Twitch » : les messages tapés dans Lobby partent dans son chat Twitch, au nom de la personne. Le jeton Twitch reste sur l'appareil.
  - **À faire une fois** : dans la console Twitch (dev.twitch.tv/console → ton appli Lobby → Gérer), ajoute l'URL de redirection OAuth `https://wts-lobby.vercel.app/twitch.html` (garde `http://localhost`), puis Enregistrer.
- Les chaînes hors ligne restent listées, et les profils YouTube / Kick ont leurs liens.
- Le compteur rouge dans le menu indique combien de joueurs sont en direct. Actualisation chaque minute.
- Utilise les mêmes clés `TWITCH_CLIENT_ID` / `TWITCH_CLIENT_SECRET` qu'IGDB, et la base Upstash des profils.

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
- **Menu** : ordre des catégories (glisser-déposer ou flèches), renommer, masquer, ajouter des séparateurs avec ou sans titre. Réglages reste toujours visible.
Ces choix restent sur l'appareil. Avec le code admin, le bouton « Utiliser ce menu pour tout le monde » en fait le menu par défaut du site (pour ceux qui n'ont pas personnalisé le leur).

## Pour chaque personne (onglet Comptes)
- **Steam** : coller l'adresse de son profil. La liste d'amis doit être publique (Profil → Modifier → Confidentialité).
- **Xbox** : se connecter sur https://xbl.io avec son compte Xbox (gratuit) et coller sa clé personnelle. Microsoft ne donne pas d'accès direct, OpenXBL sert d'intermédiaire.
- **FiveM** : code du serveur (fin de `cfx.re/join/…`) + pseudos des amis à repérer dans la liste des joueurs.

Ces identifiants restent dans le navigateur de la personne : Lobby les envoie à `api/friends` à chaque actualisation et le serveur ne les garde pas.

## « Depuis combien de temps »
Steam et FiveM ne donnent pas l'heure de début d'une session. Lobby note l'heure où il voit un ami passer en ligne ou changer de jeu (actualisation chaque minute tant que l'appli est ouverte). Quand Lobby n'a pas vu le changement (premier affichage), la durée est précédée de « ≥ ». Pour les amis hors ligne, Steam donne la dernière connexion.

## Plateformes
| Plateforme | Amis connectés |
|---|---|
| Steam | Oui (API officielle) |
| Xbox | Oui (OpenXBL) |
| FiveM | Oui (liste publique des joueurs d'un serveur) |
| PlayStation | Prévu (méthode non officielle) |
| Discord | Prévu (bot Lobby sur un serveur commun) — couvre aussi les jeux Battle.net, EA, Epic… affichés dans Discord |
| Battle.net, EA, Epic, Riot, Ubisoft, Nintendo | Pas d'API publique |

## À venir
- Comptes Lobby (inscription, synchro entre appareils) et offre Pro par Paddle, sur le modèle de Cura.
- Rappel le jour de la sortie d'un jeu suivi (notifications).
- PlayStation et Discord.

## Test en local
`npx vercel dev` dans ce dossier (les clés dans un fichier `.env.local`, jamais envoyé sur GitHub).
