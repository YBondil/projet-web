# SOMA

Générateur de séances de sport personnalisées.
Entrez un groupe musculaire, une durée, un objectif et l'équipement disponible — obtenez une séance complète avec exercices, séries, répétitions et temps de repos.

---

## 1. Participants

- BONDIL Yoan (frontend + branchement au backend)
- LAUVERGNE Alexis (backend + gestion des tests)

---

## 2. Ce que fait le projet

### Idée générale

SOMA génère des séances de sport adaptées à quatre paramètres : le groupe musculaire ciblé, la durée disponible, l'objectif (endurance, force, prise de muscle, tonification) et l'équipement à disposition. L'application calcule automatiquement le nombre de séries, de répétitions et les temps de repos en fonction de ces paramètres.
SOMA opère également comme un tracker de progression sportive, permettant de suivre les séances passées et de visualiser les records personnels etc.

### Fonctionnalités disponibles

- Formulaire de configuration : groupe musculaire (7 groupes), durée (30 à 150 min), objectif (endurance / force / prise de muscle / tonification), équipement (5 types)
- Filtrage du pool d'exercices par équipement disponible (le mode « salle de musculation » donne accès à tout)
- Génération de séance via algorithme intégré avec priorisation par type d'exercice et ordre des muscles primaires
- Affichage structuré : exercices ordonnés, séries × reps, temps de repos, durée estimée par exercice et durée totale
- Avertissement visuel si la durée estimée dépasse la durée demandée
- Édition de la séance en temps réel : retirer un exercice, ajouter un exercice via un picker avec recherche
- Réordonnancement des exercices par drag-and-drop (HTML5 natif, indicateur d'insertion `drop-above` / `drop-below`, recalcul automatique de la durée estimée)
- Bouton « Régénérer » pour obtenir une variante aléatoire
- Enregistrement local des séances (localStorage) avec nom personnalisé, listing dans « Mes séances », relance ou suppression
- Catalogue complet des exercices par groupe musculaire avec filtre par type et recherche transverse
- Création d'exercices personnalisés (nom, groupe, type, équipement, muscles ciblés avec autocomplétion, vidéo) persistés en localStorage et fusionnés avec la base intégrée
- Lien vidéo tutoriel pour chaque exercice
- Page de suivi (placeholder) qui annonce les fonctionnalités du Scope 2
- Design clair, angulaire, responsive (fond crème, primary teal, accent ambré, ombres « flat » nettes)
- Chronomètre guidé pendant la séance ([frontend/src/pages/training-ongoing.jsx](frontend/src/pages/training-ongoing.jsx))
- Backend Bun + Hono en place : `GET /api/health`, `GET/POST /api/sessions`, `GET/DELETE /api/sessions/:id` — voir [backend/README.md](backend/README.md)
- Stockage SQLite (`backend/data/soma.db`) via le module natif `bun:sqlite`, deux tables :
  - `sessions` (colonnes filtrables `musculaire` / `objectif` / `duree` / `created_at` + payload JSON pour le détail des exercices) ;
  - `exercises` (exercices personnalisés ; colonne `group_name` indexée pour le filtrage par groupe musculaire, `muscles_json` pour la liste des muscles ciblés).
- Le frontend consomme l'API ([frontend/src/api/sessions.js](frontend/src/api/sessions.js), [frontend/src/store/savedSessions.js](frontend/src/store/savedSessions.js)) avec **fallback localStorage** si le backend ne répond pas (timeout 3 s via `AbortController`). Badge de statut « Synchronisé / Hors ligne » + bouton « Réessayer » sur la page « Mes séances »
- Les exercices personnalisés sont aussi persistés côté serveur ([frontend/src/api/exercises.js](frontend/src/api/exercises.js), [frontend/src/store/exercises.js](frontend/src/store/exercises.js)) avec la même stratégie : API d'abord, fallback localStorage, mises à jour optimistes. Table SQLite `exercises` côté backend

---

## 3. Comment lancer le projet

### Prérequis

- [Bun](https://bun.sh) installé 
- Un navigateur moderne (Chrome ou Firefox)


### Lancement (frontend + backend)

```bash
# Terminal 1
cd backend
bun install
bun run dev   # API sur http://localhost:3000

# Terminal 2
cd frontend
bun install
bun run dev   # UI sur http://localhost:5173
```

> Le frontend fonctionne aussi sans backend démarré : chaque store (`savedSessions.js`, `exercises.js`, `completedSessions.js`) bascule automatiquement en mode local (localStorage) après un timeout de 3 s, avec un badge de statut « Hors ligne » et un bouton « Réessayer ».

---

## 4. Difficultés rencontrées

- Bugs de typo silencieux en JSX (`math.floor` au lieu de `Math.floor`, `Maths.max` au lieu de `Math.max`) difficiles à traquer.
- Gerer les éléments visuels un peu complexes notement les barres de recherche, les chronomètres, les graphiques de progression etc
- beaucoup de bugs "simples" dus au manque d'experience dans l'écriture de code et souvent une approche trop naive de certains aspects tels que le branchement du frontend sur l'API backend. 
- Lorsque l'IA repasse sur un bug, il devient difficile de comprendre toutes les subtilités apportées par le code, bien que la structure reste claire. Cela n'est pas très dérangeant pour le premier bug mais lorsqu'ils commencent à s'accumuler on perd vite la comprehension du code et les bugs deviennent plus difficiles à repérer et à résoudre, ce qui nécessite de prendre le temps de lire et comprendre le code écrit. 

---

## 5. Usage de l'IA

- **Claude Code** est l'agent principal qui a été utilisé pour :
  - La rédaction des fichiers `.md`.
  - La complétion du CSS et l'enrichissement de la base d'exercices.
  - La mise en place du drag-and-drop natif HTML5 sur la liste des exercices (signals SolidJS pour `draggedIndex` / `dragOverIndex` / `dropPosition`, indicateurs visuels d'insertion et reorder du tableau d'exercices avec recalcul de la durée).
  - Le branchement du frontend sur l'API backend : wrapper `fetch` avec `AbortController`, refactor de `store/savedSessions.js` avec mises à jour optimistes + **fallback localStorage** si l'API ne répond pas, signal `apiStatus` (online / offline / loading) affiché en haut de la page « Mes séances ».
  - La mise en place d'une suite de tests exhaustive couvrant l'algorithme de génération, le filtre d'équipement, le storage SQLite et l'API HTTP (non présent dans le fichier final mais qui ont permis la detection et la correction de nombreux bugs)
  - La migration des exercices personnalisés vers SQLite : nouvelle table `exercises`, endpoints `/api/exercises` (GET / POST / GET-by-id / DELETE), refactor du store frontend avec API + fallback localStorage, et tests dédiés (`exercises.storage.test.js`, `exercises.api.test.js`).
  - Plus globalement, l'agent a été utilisé en très grande majorité pour venir reprendre et corriger du code existant, notamment les bugs et les comportements inattendus, apportant des nouveautés conceptuels auxquelles nous étions étrangers. 

---

## 6. Ce qui fonctionne

### Génération et édition de séance
- [x] Formulaire de saisie complet (groupe, durée, objectif, équipement)
- [x] Filtrage du pool d'exercices par équipement (la salle de musculation déverrouille tout)
- [x] Algorithme de génération (priorisation par type d'exercice, ordre des muscles primaires, fallback pool, minimum 3 exercices garanti)
- [x] Affichage de la séance avec durée estimée recalculée à chaque modification
- [x] Avertissement quand la séance dépasse la durée demandée
- [x] Édition en temps réel : retirer / ajouter (picker recherchable) / réordonner par drag-and-drop natif HTML5
- [x] Bouton « Régénérer » pour obtenir une variante aléatoire
- [x] Page de choix au démarrage (`/start`) : « Générer une séance » ou « Reprendre une séance enregistrée »
- [x] Page de détail d'une séance enregistrée (`/saved/:id`) : voir les exercices, lancer, modifier ou supprimer

### Catalogue d'exercices
- [x] Page catalogue : tous les exercices par groupe musculaire, badges de type, filtre transverse
- [x] Recherche par nom, muscle, équipement
- [x] Création d'exercices personnalisés (chips de muscles + autocomplétion) persistés via l'API + fallback localStorage
- [x] Liens vidéo tutoriel sur chaque exercice

### Chronomètre + suivi (Scope 2)
- [x] Chronomètre intégré pendant la séance : anneau de décompte, repos entre séries, navigation entre exos
- [x] Saisie de performances en fin d'exercice (charge, reps, ressenti) persistée côté serveur
- [x] Enregistrement automatique de la séance terminée dans `/api/completed-sessions` à la fin du chrono
- [x] Page « Mon suivi » (`/progress`) refondue en hub : stats globales + raccourci records + cartes par groupe musculaire + 5 dernières séances
- [x] Sous-page `/progress/records` : tous les PR groupés par groupe musculaire
- [x] Sous-page `/progress/muscle/:group` : exos travaillés pour un groupe (mini-graphiques d'évolution + PR par exo)
- [x] Sous-page `/progress/exercise/:exoId` : grand graphique SVG d'évolution + carte PR + historique cliquable (chaque ligne renvoie vers la séance d'origine)
- [x] Sous-page `/progress/sessions` : liste exhaustive des séances passées (accessible via « Voir toutes les séances » quand il y en a plus de 5)
- [x] Page de détail d'une séance terminée (`/past-training/:id`) : performances saisies + bouton « Enregistrer dans Mes séances »

### Persistance + backend
- [x] Backend Bun + Hono, CORS, 3 routes CRUD : `/api/sessions`, `/api/exercises`, `/api/completed-sessions` + `/api/health`
- [x] Stockage SQLite (`backend/data/soma.db`) via `bun:sqlite` natif, 3 tables (`sessions`, `exercises`, `completed_sessions`) avec colonnes filtrables et index
- [x] Tous les stores frontend (`savedSessions`, `exercises`, `completedSessions`) consomment l'API d'abord, fallback localStorage transparent si timeout (3 s via `AbortController`)
- [x] Mises à jour optimistes : la création / suppression apparaît immédiatement dans l'UI, l'API est sync en arrière-plan
- [x] Badge de statut « Synchronisé / Hors ligne » + bouton « Réessayer » sur les pages concernées


### Design + navigation
- [x] Design responsive — thème clair, angulaire (radius `4px`, bordures `2px`, ombres « flat » décalées, fond crème + primary teal + accent ambré)
- [x] Navigation complète entre toutes les pages (15 routes), breadcrumb sur les sous-pages de « Mon suivi »

---

## 7. Ce qui manque

- [ ] Alerte sonore à la fin des phases de repos (le visuel est en place)
- [ ] Queue de re-synchronisation : les entrées créées en mode offline restent locales tant que `refresh` n'est pas relancé manuellement
- [ ] IA d'adaptation basée sur la progression (Scope 3)

---

## 8. Structure du projet

```
projet-web/
├── frontend/
│   └── src/
│       ├── index.jsx                  → point d'entrée, monte le DOM
│       ├── App.jsx                    → routeur (15 routes)
│       ├── api/
│       │   ├── sessions.js            → wrapper fetch sessions (AbortController, timeout 3 s)
│       │   ├── exercises.js           → wrapper fetch exercices personnalisés
│       │   └── completed-sessions.js  → wrapper fetch séances terminées
│       ├── store/
│       │   ├── session.js             → signals partagés (config + séance courante)
│       │   ├── exercises.js           → exos custom : API + fallback localStorage, fusion avec exo.json
│       │   ├── savedSessions.js       → séances enregistrées : API + fallback localStorage, signal apiStatus
│       │   └── completedSessions.js   → séances terminées + feedbacks : API + fallback localStorage
│       ├── data/
│       │   ├── exo.json               → base d'exercices (7 groupes, ~76 exos)
│       │   ├── equipment.js           → liste d'équipements + filtre du pool
│       │   ├── algo.js                → generateTraining() — logique pure
│       │   └── progressAggregates.js  → helpers d'agrégation pour « Mon suivi »
│       ├── pages/
│       │   ├── home.jsx               → page d'accueil
│       │   ├── start.jsx              → choix « générer » / « reprendre »
│       │   ├── configure.jsx          → formulaire → génère la séance → store
│       │   ├── training.jsx           → affiche/édite la séance, drag-and-drop, régénère, enregistre
│       │   ├── training-ongoing.jsx   → chronomètre + saisie de feedback + auto-save à la fin
│       │   ├── saved.jsx              → liste des séances enregistrées (API + fallback local)
│       │   ├── savedDetail.jsx        → détail d'une séance enregistrée (lancer / modifier / supprimer)
│       │   ├── exercises.jsx          → catalogue + recherche + création d'exos
│       │   ├── progress.jsx           → hub « Mon suivi » (stats + raccourci records + groupes + 5 dernières séances)
│       │   ├── progressRecords.jsx    → tous les PR groupés par groupe musculaire
│       │   ├── progressMuscle.jsx     → exos travaillés pour un groupe (mini-graphiques)
│       │   ├── progressExercise.jsx   → détail d'un exo (grand chart SVG + carte PR + historique)
│       │   ├── progressSessions.jsx   → liste complète des séances passées
│       │   └── pastTraining.jsx       → détail d'une séance terminée + bouton « Enregistrer dans Mes séances »
│       ├── components/
│       │   ├── exocard.jsx            → carte d'un exercice (drag-and-drop, props only)
│       │   └── progressbar.jsx        → (fichier vide, à implémenter)
│       └── styles/
│           └── global.css             → tout le CSS (thème clair, angulaire, variables)
│
├── backend/
   ├── package.json
   ├── README.md
   ├── data/                          → soma.db SQLite (créée à la volée, gitignored)
   └── src/
       ├── server.js                  → Hono + CORS + routing
       ├── routes/
       │   ├── health.js              → GET /api/health
       │   ├── sessions.js            → CRUD /api/sessions
       │   ├── exercises.js           → CRUD /api/exercises
       │   └── completed-sessions.js  → CRUD /api/completed-sessions
       └── storage/
           ├── db.js                  → init bun:sqlite + 3 tables (sessions, exercises, completed_sessions)
           ├── sessions.js            → requêtes préparées sessions
           ├── exercises.js           → requêtes préparées exercices
           └── completed-sessions.js  → requêtes préparées séances terminées
