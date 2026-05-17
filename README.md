# SOMA

Générateur de séances de sport personnalisées **et** tracker de progression, avec un coach IA agentique branché sur la base.

Entrez un groupe musculaire, une durée, un objectif et l'équipement disponible — obtenez une séance complète avec exercices, séries, répétitions et temps de repos. Lancez le chronomètre, saisissez vos performances, retrouvez vos records personnels. Posez une question au coach SOMA pour qu'il analyse votre historique et ajuste votre programme.

---

## 1. Participants

- BONDIL Yoan (frontend + branchement au backend)
- LAUVERGNE Alexis (backend + gestion des tests)

---

## 2. Ce que fait le projet

### Idée générale

SOMA combine trois fonctions :

1. **Génération de séance** adaptée à 4 paramètres (groupe musculaire, durée, objectif, équipement). L'application calcule séries, reps et repos automatiquement, propose une variante en un clic et permet de réordonner les exercices par drag-and-drop.
2. **Chronomètre guidé + tracker** : anneau de décompte des repos, saisie des performances en fin d'exercice (charge, reps, ressenti), enregistrement automatique de la séance terminée. La page « Mon suivi » expose stats, records personnels, évolution par exercice (graphiques SVG) et historique complet.
3. **Coach IA** (chatbot accessible via le bouton flottant 💬) qui lit l'historique des 30 derniers jours, répond aux questions conversationnelles via Groq Llama 3.3 et exécute des actions agentiques sur la base via Gemini 2.5 Flash (masquer un exercice, ajuster une charge, planifier une séance). Détaillé dans [COACH_ARCHITECTURE.md](COACH_ARCHITECTURE.md).

### Stack

- **Frontend** : SolidJS + Vite, CSS angulaire fait main (pas de framework UI comme Tailwind).
- **Backend** : Bun + Hono, SQLite via `bun:sqlite` natif (aucun ORM).
- **IA** : SDKs officiels `@google/genai` (Gemini) et `groq-sdk` (Groq) + Zod pour la validation des tools.

---

## 3. Comment lancer le projet

### Prérequis

- [Bun](https://bun.sh) installé
- Un navigateur moderne (Chrome ou Firefox)

### Lancement

```bash
# Terminal 1 — backend
cd backend
bun install
bun run dev      # API sur http://localhost:3000

# Terminal 2 — frontend
cd frontend
bun install
bun run dev      # UI sur http://localhost:5173
```

> Le frontend fonctionne aussi **sans backend démarré** : chaque store (`savedSessions.js`, `exercises.js`, `completedSessions.js`) bascule automatiquement en mode local (localStorage) après un timeout de 3 s, avec un badge de statut « Hors ligne » et un bouton « Réessayer ».


### Activer le coach IA (optionnel)

Le coach est désactivé par défaut. Pour l'activer, fournis tes clés gratuites au lancement du backend :

```bash
GEMINI_API_KEY=AIza... GROQ_API_KEY=gsk_... bun run dev
```

Sans clé, le serveur démarre quand même : la route `/api/chat` renvoie un 503 explicite et le reste de l'app fonctionne normalement. Les clés sont lues via `process.env`, jamais commitées (cf. [COACH_ARCHITECTURE.md](COACH_ARCHITECTURE.md) pour les détails free tier / rate limits).
> Il de votre responsabilité de fournir les clefs API lors du lancement du backend car nous préférons ne pas les fournir en clair dans le code source puisque le répo GitHub est public.
Pour ce faire, vous pouvez vous rendre sur ces sites : [Gemini](https://aistudio.google.com/app/apikey) et [GROQ](https://console.groq.com/keys).

### Peupler la base avec un historique de test

Un script génère ~8 semaines de séances réalistes (32 séances terminées, 3 modèles enregistrés, 1 séance planifiée) avec des signaux exploitables par le coach (stagnations, ressenti récurrent « difficile »…) :

```bash
cd backend
bun run scripts/seed-history.js --reset
```

---

## 4. Difficultés rencontrées

- Bugs de typo silencieux en JSX (`math.floor` au lieu de `Math.floor`, `Maths.max` au lieu de `Math.max`) difficiles à traquer.
- Gerer les éléments visuels un peu complexes notement les barres de recherche, les chronomètres, les graphiques de progression etc
- beaucoup de bugs "simples" dus au manque d'experience dans l'écriture de code et souvent une approche trop naive de certains aspects tels que le branchement du frontend sur l'API backend.
- Lorsque l'IA repasse sur un bug, il devient difficile de comprendre toutes les subtilités apportées par le code, bien que la structure reste claire. Cela n'est pas très dérangeant pour le premier bug mais lorsqu'ils commencent à s'accumuler on perd vite la comprehension du code et les bugs deviennent plus difficiles à repérer et à résoudre, ce qui nécessite de prendre le temps de lire et comprendre le code écrit.
- Sur le coach IA : éviter que le LLM streame du JSON brut visible par l'utilisateur (forcé via deux prompts système distincts : texte pour Groq, JSON strict pour Gemini agentique) et reconstituer un payload lisible quand la réponse est tronquée par `max_tokens`.

---

## 5. Usage de l'IA

- **Claude Code** est l'agent principal qui a été utilisé pour :
  - La rédaction des fichiers `.md`.
  - La complétion du CSS et l'enrichissement de la base d'exercices.
  - La mise en place du drag-and-drop natif HTML5 sur la liste des exercices (signals SolidJS pour `draggedIndex` / `dragOverIndex` / `dropPosition`, indicateurs visuels d'insertion et reorder du tableau d'exercices avec recalcul de la durée).
  - Le branchement du frontend sur l'API backend : wrapper `fetch` avec `AbortController`, refactor des stores avec mises à jour optimistes + **fallback localStorage** si l'API ne répond pas.
  - La mise en place d'une suite de tests `bun test` couvrant l'algorithme de génération, le filtre d'équipement, les helpers d'agrégation de progression, le storage SQLite (3 tables CRUD) et l'API HTTP.
  - La migration des exercices personnalisés et des séances terminées vers SQLite : 3 endpoints CRUD, refactor des stores frontend avec API + fallback, tests dédiés.
  - **L'INTÉGRALITÉ de l'intégration du coach IA agentique** : table `agent_actions` pour la traçabilité, 5 tools Zod (hide_exercise, reintroduce_hidden_exercises, adjust_exercise_load, adjust_exercise_volume, schedule_workout), routing intent agentic/conversational, streaming SSE Hono côté backend et `ReadableStream` côté frontend, modal flottant `<CoachFab>` accessible depuis toutes les routes.
  - Plus globalement, l'agent a été utilisé en très grande majorité pour venir reprendre et corriger du code existant, notamment les bugs et les comportements inattendus, apportant des nouveautés conceptuelles auxquelles nous étions étrangers.

*Note :* Le choix de faire faire toute l'intégration du coach IA agentique à 100% par Claude Code a été fait car cet agent est uniquement dédié à l'amusement, nous avons conscience de l'absence d'intêret pédagogique.

---

## 6. Ce qui fonctionne

### Génération et édition de séance
- [x] Formulaire de saisie complet (groupe, durée, objectif, équipement)
- [x] Filtrage du pool d'exercices par équipement (la salle de musculation déverrouille tout)
- [x] Algorithme de génération (priorisation par type d'exercice, ordre des muscles primaires, fallback pool, minimum 3 exercices garanti)
- [x] Affichage de la séance avec durée estimée recalculée à chaque modification
- [x] Avertissement quand la séance dépasse la durée demandée
- [x] Édition en temps réel : retirer / ajouter (picker recherchable) / réordonner par drag-and-drop
- [x] Bouton « Régénérer » pour obtenir une variante aléatoire
- [x] Page de choix au démarrage (`/start`) : « Générer une séance » ou « Reprendre une séance enregistrée »
- [x] Page de détail d'une séance enregistrée (`/saved/:id`) : voir les exercices, lancer, modifier ou supprimer

### Catalogue d'exercices
- [x] Page catalogue : tous les exercices par groupe musculaire, badges de type, filtre transverse
- [x] Recherche par nom, muscle, équipement
- [x] Création d'exercices personnalisés (chips de muscles + autocomplétion) persistés via l'API + fallback localStorage
- [x] Liens vidéo tutoriel sur chaque exercice

### Chronomètre + suivi
- [x] Chronomètre intégré pendant la séance : anneau de décompte, repos entre séries, navigation entre exos
- [x] Saisie de performances en fin d'exercice (charge, reps, ressenti) persistée côté serveur
- [x] Enregistrement automatique de la séance terminée à la fin du chrono
- [x] Page « Mon suivi » (`/progress`) : hub avec stats globales + raccourci records + cartes par groupe musculaire + 5 dernières séances
- [x] Sous-page `/progress/records` : tous les PR groupés par groupe musculaire
- [x] Sous-page `/progress/muscle/:group` : exos travaillés pour un groupe (mini-graphiques d'évolution + PR par exo)
- [x] Sous-page `/progress/exercise/:exoId` : grand graphique SVG + carte PR + historique cliquable
- [x] Sous-page `/progress/sessions` : liste exhaustive des séances passées
- [x] Page `/past-training/:id` : détail d'une séance terminée + bouton « Enregistrer dans Mes séances »

### Coach IA
- [x] Modal `<CoachFab>` accessible depuis **toutes** les pages (bouton 💬 en bas à droite)
- [x] Streaming SSE : réponses conversationnelles en texte qui défile en live (Groq), recommandations agentiques avec cartes d'actions cliquables (Gemini)
- [x] 5 actions agentiques sur la base : `hide_exercise`, `reintroduce_hidden_exercises`, `adjust_exercise_load`, `adjust_exercise_volume`, `schedule_workout` (cf. [COACH_ARCHITECTURE.md](COACH_ARCHITECTURE.md))
- [x] Audit complet : chaque action de l'agent est tracée dans `agent_actions` avec `previous_value_json` pour réversibilité
- [x] Garde-fous : extraction tolérante en cas de JSON tronqué (`max_tokens`), fallback automatique Groq → Gemini, backoff exponentiel sur rate limits, 503 explicite si clés manquantes

### Persistance + backend
- [x] Backend Bun + Hono, CORS, 4 ressources CRUD : `/api/sessions`, `/api/exercises`, `/api/completed-sessions`, `/api/chat` + `/api/health`
- [x] Stockage SQLite (`backend/data/soma.db`) via `bun:sqlite` natif, **5 tables** (`sessions`, `exercises`, `completed_sessions`, `agent_actions`, `scheduled_workouts`) avec colonnes filtrables et index
- [x] Backfill au boot : les ~76 exos built-in de `exo.json` sont injectés dans la table `exercises` (source = `builtin`) pour que le coach puisse opérer dessus
- [x] Tous les stores frontend (`savedSessions`, `exercises`, `completedSessions`) consomment l'API d'abord, fallback localStorage transparent si timeout (3 s via `AbortController`)
- [x] Mises à jour optimistes : la création / suppression apparaît immédiatement dans l'UI
- [x] Badge de statut « Synchronisé / Hors ligne » + bouton « Réessayer » sur les pages concernées

### Design + navigation
- [x] Design responsive
- [x] Navigation complète entre toutes les pages (15 routes)

---

## 7. Ce qui manque

- [ ] Affichage côté frontend des champs `target_load_kg` / `target_sets` / `target_reps` / `hidden_until` modifiés par le coach (la BDD est en place, mais l'UI continue de lire `exo.json` pour les exos built-in)
- [ ] Alerte sonore à la fin des phases de repos (le visuel est en place)
- [ ] Queue de re-synchronisation : les entrées créées en mode offline restent locales tant que `refresh` n'est pas relancé manuellement
- [ ] Suivi long terme et profils utilisateur avancés (multi-utilisateur, suggestions hebdomadaires)
- [ ] Endpoint d'annulation des actions de l'agent (`agent_actions` capture déjà `previous_value_json`, il ne manque qu'une route REST pour rejouer l'inverse)
- [ ] Persistance des messages précédents avec l'agent IA

---

## 8. API HTTP (Bun + Hono)

L'API écoute sur `http://localhost:3000`. CORS activé sur `/api/*`.

| Méthode | Route                            | Description                                                                  |
|---------|----------------------------------|------------------------------------------------------------------------------|
| GET     | `/api/health`                    | Sanity check (status + version + timestamp)                                  |
| GET     | `/api/sessions`                  | Liste des séances enregistrées                                               |
| POST    | `/api/sessions`                  | Enregistrer une séance (`{ name?, session }`)                                |
| GET     | `/api/sessions/:id`              | Détail d'une séance                                                          |
| DELETE  | `/api/sessions/:id`              | Supprimer une séance                                                         |
| GET     | `/api/exercises`                 | Liste des exercices personnalisés (source `custom` uniquement)               |
| POST    | `/api/exercises`                 | Créer un exercice perso (`{ group, exercise }`)                              |
| GET     | `/api/exercises/:id`             | Détail d'un exercice                                                         |
| DELETE  | `/api/exercises/:id`             | Supprimer un exercice                                                        |
| GET     | `/api/completed-sessions`        | Liste des séances terminées (avec performances)                              |
| POST    | `/api/completed-sessions`        | Enregistrer une séance terminée (`{ session, feedbacks, durationSeconds }`)  |
| GET     | `/api/completed-sessions/:id`    | Détail d'une séance terminée                                                 |
| DELETE  | `/api/completed-sessions/:id`    | Supprimer une séance terminée                                                |
| POST    | `/api/chat`                      | Coach IA streaming SSE (`{ messages }`) — voir [COACH_ARCHITECTURE.md](COACH_ARCHITECTURE.md) |
| POST    | `/api/chat/execute-action`       | Exécuter manuellement une action du coach (clic UI sur une carte)            |
| GET     | `/api/chat/status`               | État des providers IA (Gemini / Groq)                                        |

Tous les sanity checks ont été réalisés via **Yaak** comme vu en cours.

---

## 9. Schéma SQLite

Base locale `backend/data/soma.db` (gitignored). Mode `WAL` activé. **5 tables** :

| Table                 | Rôle                                                          |
|-----------------------|---------------------------------------------------------------|
| `sessions`            | Séances enregistrées (modèles relançables) — colonnes filtrables `musculaire` / `objectif` / `duree` / `created_at` + payload JSON pour le détail des exercices |
| `exercises`           | Catalogue d'exercices (`source` = `builtin` ou `custom`) avec colonnes ajustables par le coach (`target_load_kg`, `target_sets`, `target_reps`, `hidden_until`) |
| `completed_sessions`  | Séances terminées + `feedbacks_json` (`{[exoId]:{charge,reps,difficulte}}`) |
| `agent_actions`       | Audit log de toutes les actions IA, avec `previous_value_json` pour réversibilité |
| `scheduled_workouts`  | Séances planifiées par le coach (date future, justification, statut `done_at`) |

Index : `idx_sessions_created_at`, `idx_exercises_group`, `idx_exercises_source`, `idx_exercises_hidden_until`, `idx_completed_sessions_finished_at`, `idx_agent_actions_created_at`, `idx_agent_actions_exercise`, `idx_scheduled_workouts_for`.


## 10. Structure du projet

```
projet-web/
├── README.md
├── COACH_ARCHITECTURE.md           ← spec du coach IA
├── ROADMAP.md
│
├── frontend/
│   ├── package.json
│   ├── index.html
│   ├── vite.config.js
│   └── src/
│       ├── index.jsx
│       ├── App.jsx                       ← routeur (15 routes) + RootLayout
│       ├── api/
│       │   ├── sessions.js               ← wrapper fetch (AbortController, timeout 3 s)
│       │   ├── exercises.js
│       │   ├── completed-sessions.js
│       │   └── chat.js                   ← streaming SSE via ReadableStream + execute-action
│       ├── store/
│       │   ├── session.js                ← signals partagés (config + séance courante)
│       │   ├── exercises.js              ← API + fallback localStorage, fusion avec exo.json
│       │   ├── savedSessions.js
│       │   └── completedSessions.js
│       ├── data/
│       │   ├── exo.json                  ← base d'exercices (7 groupes, ~76 exos)
│       │   ├── equipment.js
│       │   ├── algo.js                   ← generateTraining()
│       │   └── progressAggregates.js     ← helpers d'agrégation pour « Mon suivi »
│       ├── pages/
│       │   ├── home.jsx
│       │   ├── start.jsx                 ← choix générer / reprendre
│       │   ├── configure.jsx
│       │   ├── training.jsx              ← drag-and-drop des exercices
│       │   ├── training-ongoing.jsx      ← chronomètre + auto-save
│       │   ├── saved.jsx                 ← séances enregistrées
│       │   ├── savedDetail.jsx
│       │   ├── exercises.jsx
│       │   ├── progress.jsx              ← hub Mon suivi
│       │   ├── progressRecords.jsx
│       │   ├── progressMuscle.jsx
│       │   ├── progressExercise.jsx      ← grand chart SVG
│       │   ├── progressSessions.jsx
│       │   └── pastTraining.jsx
│       ├── components/
│       │   ├── exocard.jsx
│       │   ├── CoachFab.jsx              ← bouton flottant 
│       │   └── CoachChat.jsx             ← modal chat + actions cliquables
│       └── styles/
│           └── global.css                ← thème clair, angulaire
│
└── backend/
   ├── package.json
   ├── data/                             ← soma.db SQLite (créée à la volée, gitignored)
   ├── scripts/
   │   └── seed-history.js               ← ~8 semaines de séances de test
   └── src/
       ├── server.js                     ← Hono + CORS + montage des routes
       ├── routes/
       │   ├── health.js
       │   ├── sessions.js
       │   ├── exercises.js
       │   ├── completed-sessions.js
       │   └── chat.js                   ← SSE + execute-action + extractPayload
       ├── ai/
       │   ├── provider.js               ← SDKs Gemini + Groq, backoff exponentiel
       │   ├── intent.js                 ← heuristique mots-clés
       │   ├── context.js                ← contexte utilisateur 30 j (cache 60 s)
       │   ├── prompt.js                 ← prompts JSON-strict + texte naturel
       │   └── tools.js                  ← 5 tools Zod + audit
       └── storage/
           ├── db.js                     ← init bun:sqlite + 5 tables + backfill exo.json
           ├── sessions.js
           ├── exercises.js              ← + targets / hidden_until
           ├── completed-sessions.js
           ├── agent-actions.js
           └── scheduled-workouts.js
