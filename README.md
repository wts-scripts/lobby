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

5. Deployments → ⋯ → **Redeploy**.

### Facultatif
- `NEWS_FEEDS` : pour choisir les sites d'actus. Format : `Nom|adresse du flux RSS`, séparés par des virgules. Exemple : `Jeuxvideo.com|https://www.jeuxvideo.com/rss/rss.xml, Steam|https://store.steampowered.com/feeds/news.xml`. Un flux qui ne répond pas est simplement ignoré (il apparaît en note dans l'onglet Actualités).

## Apparence (onglet Réglages)
- **Mode** : Système (suit le PC ou le téléphone), Sombre ou Clair.
- **Thème** : Nuit (par défaut), WTS, Graphite, Citron, Sunset, Sable, Sakura, Océan, Néon — les mêmes que Cura, chacun en sombre et en clair.
- **Police** : 10 associations titres + texte + chiffres (Chakra Petch par défaut). Les tailles sont ajustées pour que chaque police garde le même encombrement.
Ces choix restent sur l'appareil.

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
