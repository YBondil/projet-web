# SOMA

Générateur de séances de sport personnalisées.
Entrez un groupe musculaire, une durée, un objectif et l'équipement disponible — obtenez une séance complète avec exercices, séries, répétitions et temps de repos.

---

## 1. Participants

- BONDIL Yoan
- LAUVERGNE Alexis

---

## 2. Ce que fait le projet

### Idée générale

SOMA génère des séances de sport adaptées à quatre paramètres : le groupe musculaire ciblé, la durée disponible, l'objectif (endurance, force, prise de muscle, tonification) et l'équipement à disposition. L'application calcule automatiquement le nombre de séries, de répétitions et les temps de repos en fonction de ces paramètres.

### Fonctionnalités disponibles (Scope 1 — terminé)

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

### Scope 2 — démarré

- Chronomètre guidé pendant la séance ([frontend/src/pages/training-ongoing.jsx](frontend/src/pages/training-ongoing.jsx))
- Backend Bun + Hono en place : `GET /api/health`, `GET/POST /api/sessions`, `GET/DELETE /api/sessions/:id` — voir [backend/README.md](backend/README.md)
- Stockage SQLite (`backend/data/soma.db`) via le module natif `bun:sqlite`, deux tables :
  - `sessions` (colonnes filtrables `musculaire` / `objectif` / `duree` / `created_at` + payload JSON pour le détail des exercices) ;
  - `exercises` (exercices personnalisés ; colonne `group_name` indexée pour le filtrage par groupe musculaire, `muscles_json` pour la liste des muscles ciblés).
- Le frontend consomme l'API ([frontend/src/api/sessions.js](frontend/src/api/sessions.js), [frontend/src/store/savedSessions.js](frontend/src/store/savedSessions.js)) avec **fallback localStorage** si le backend ne répond pas (timeout 3 s via `AbortController`). Badge de statut « Synchronisé / Hors ligne » + bouton « Réessayer » sur la page « Mes séances »
- Les exercices personnalisés sont aussi persistés côté serveur ([frontend/src/api/exercises.js](frontend/src/api/exercises.js), [frontend/src/store/exercises.js](frontend/src/store/exercises.js)) avec la même stratégie : API d'abord, fallback localStorage, mises à jour optimistes. Table SQLite `exercises` côté backend

### Fonctionnalités prévues

Voir [ROADMAP.md](ROADMAP.md) pour le détail des Scopes 2 et 3 :
- Saisie des performances réelles persistée côté serveur — Scope 2
- Historique de progression et records personnels — Scope 2
- IA d'adaptation basée sur la progression — Scope 3

---

## 3. Comment lancer le projet

### Prérequis

- [Bun](https://bun.sh) installé 
- Un navigateur moderne (Chrome ou Firefox)

### Lancement (Scope 1 — frontend uniquement)

```bash
cd frontend
bun install
bun run dev
```

L'application est disponible sur [http://localhost:5173](http://localhost:5173).

### Lancement (Scope 2 — frontend + backend)

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

> Le backend est minimal (health + CRUD sessions). Le frontend continue de fonctionner sans backend pour l'instant — l'intégration de `store/savedSessions.js` à l'API arrive ensuite.

---

## 4. Difficultés rencontrées

- Bugs de typo silencieux en JSX (`math.floor` au lieu de `Math.floor`, `Maths.max` au lieu de `Math.max`) difficiles à traquer.
- Gerer les éléments visuels un peu complexes notements les barres de recherche etc

---

## Tests

Une suite de tests exhaustive vit dans le dossier [TESTS/](TESTS/) (95 tests sur l'algorithme de génération, le filtrage d'équipement, le storage SQLite — sessions et exercices — et l'API HTTP). Lancement :

```bash
cd TESTS
bun run test
```

Le wrapper [TESTS/run-tests.js](TESTS/run-tests.js) sauvegarde et restaure automatiquement la DB de prod autour de l'exécution. Voir [TESTS/README.md](TESTS/README.md) pour le détail de la couverture.

---

## 5. Usage de l'IA

- **Claude Code** a été utilisé pour la rédaction des fichiers `.md`, la détection et la correction de bugs, la complétion du CSS et l'enrichissement de la base d'exercices.
- **Claude Code** a également été utilisé pour la gestion des barre de recherche.
- **Claude Code** a été utilisé pour la refonte du thème CSS (passage à un design clair, angulaire, fond crème + primary teal + accent ambré).
- **Claude Code** a été utilisé pour la mise en place du drag-and-drop natif HTML5 sur la liste des exercices (signals SolidJS pour `draggedIndex` / `dragOverIndex` / `dropPosition`, indicateurs visuels d'insertion et reorder du tableau d'exercices avec recalcul de la durée).
- **Claude Code** a été utilisé pour la mise en place du backend (Bun + Hono) : structure des routes, endpoints `health` et `sessions`.
- **Claude Code** a été utilisé pour la migration du stockage backend depuis un fichier JSON vers une base de données **SQLite** (`bun:sqlite`) : création de la table, requêtes préparées, mise à jour du `.gitignore`.
- **Claude Code** a été utilisé pour le branchement du frontend sur l'API backend : wrapper `fetch` avec `AbortController` (timeout 3 s), refactor de `store/savedSessions.js` avec mises à jour optimistes + **fallback localStorage** si l'API ne répond pas, signal `apiStatus` (online / offline / loading) affiché en haut de la page « Mes séances ».
- **Claude Code** a été utilisé pour la mise en place d'une suite de tests exhaustive (`TESTS/`, 95 tests `bun test` couvrant l'algorithme de génération, le filtre d'équipement, le storage SQLite et l'API HTTP), avec un wrapper [TESTS/run-tests.js](TESTS/run-tests.js) qui sauvegarde et restaure la DB de prod autour des runs.
- **Claude Code** a été utilisé pour la migration des exercices personnalisés vers SQLite : nouvelle table `exercises`, endpoints `/api/exercises` (GET / POST / GET-by-id / DELETE), refactor du store frontend avec API + fallback localStorage, et tests dédiés (`exercises.storage.test.js`, `exercises.api.test.js`).

---

## 6. Ce qui fonctionne

- [x] Formulaire de saisie complet (groupe, durée, objectif, équipement)
- [x] Filtrage par équipement disponible
- [x] Algorithme de génération de séance (priorisation par type, ordre des muscles, fallback pool)
- [x] Base d'exercices intégrée + exercices personnalisés (localStorage)
- [x] Affichage de la séance générée avec durée estimée réelle
- [x] Détection et avertissement quand la séance dépasse la durée demandée
- [x] Édition de la séance : retrait et ajout d'exercices avec picker recherchable
- [x] Réordonnancement des exercices par drag-and-drop
- [x] Liens vidéo tutoriel sur chaque exercice
- [x] Bouton « Régénérer »
- [x] Sauvegarde des séances en local (« Mes séances » : créer, relancer, supprimer)
- [x] Page catalogue des exercices avec filtre par groupe et type
- [x] Recherche transverse dans tout le catalogue
- [x] Formulaire d'ajout d'exercice personnalisé (avec chips de muscles + autocomplétion)
- [x] Page « Suivi » (placeholder explicatif des fonctionnalités du Scope 2)
- [x] Navigation complète entre toutes les pages
- [x] Design responsive — thème clair, angulaire (bordures `2px`, ombres flat)
- [x] Chronomètre intégré pendant la séance (anneau + repos + saisie de feedback en fin d'exercice)
- [x] Backend Bun + Hono — health check et CRUD `sessions` (stockage JSON)

---

## 7. Ce qui manque (Scope 2 et au-delà)

- [ ] Brancher `store/savedSessions.js` sur l'API (avec fallback localStorage)
- [ ] Persister les feedbacks de fin d'exercice côté serveur
- [ ] Historique et progression par exercice (page « Suivi » réelle, `pastTraining.jsx`)
- [ ] Records personnels (PR)
- [ ] Composant `progressbar.jsx` pour la progression dans la séance
- [ ] IA d'adaptation (Scope 3)

---

## Structure du projet

```
frontend/
└── src/
    ├── index.jsx                 → point d'entrée, monte le DOM
    ├── App.jsx                   → routeur (7 routes)
    ├── api/
    │   ├── sessions.js           → wrapper fetch sessions (AbortController, timeout 3 s)
    │   └── exercises.js          → wrapper fetch exercices
    ├── store/
    │   ├── session.js            → signals partagés (config + séance courante)
    │   ├── exercises.js          → exos custom : API d'abord, fallback localStorage, fusion avec exo.json
    │   └── savedSessions.js      → CRUD des séances : API d'abord, fallback localStorage, signal apiStatus
    ├── data/
    │   ├── exo.json              → base d'exercices (7 groupes, ~76 exos)
    │   ├── equipment.js          → liste d'équipements + filtre du pool
    │   └── algo.js               → generateTraining() — logique pure
    ├── pages/
    │   ├── home.jsx              → page d'accueil
    │   ├── configure.jsx         → formulaire → génère la séance → store
    │   ├── training.jsx          → affiche/édite la séance, régénère, enregistre
    │   ├── training-ongoing.jsx  → chronomètre + saisie de feedback
    │   ├── saved.jsx             → liste des séances enregistrées (localStorage)
    │   ├── exercises.jsx         → catalogue + recherche + création d'exos
    │   └── progress.jsx          → placeholder (Scope 2)
    ├── components/
    │   └── exocard.jsx           → carte d'un exercice (props only)
    └── styles/
        └── global.css            → tout le CSS (thème clair, angulaire, variables)

backend/
├── package.json
├── README.md
├── data/                         → soma.db SQLite (créée à la volée, gitignored)
└── src/
    ├── server.js                 → Hono + CORS + routing
    ├── routes/
    │   ├── health.js             → GET /api/health
    │   ├── sessions.js           → CRUD /api/sessions
    │   └── exercises.js          → CRUD /api/exercises
    └── storage/
        ├── db.js                 → init bun:sqlite + PRAGMA + CREATE TABLE (sessions + exercises)
        ├── sessions.js           → requêtes préparées sessions
        └── exercises.js          → requêtes préparées exercices
```

> Quelques fichiers vides existent pour préparer la suite : `pages/pastTraining.jsx`, `components/progressbar.jsx`.
