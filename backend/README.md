# Sportacus — Backend

API HTTP du projet Sportacus, basée sur **Bun** + **Hono**.

## Lancement

```bash
cd backend
bun install
bun run dev
```

L'API écoute sur [http://localhost:3000](http://localhost:3000).

## Endpoints (Scope 2 — en cours)

| Méthode | Route                  | Description                                              |
|---------|------------------------|----------------------------------------------------------|
| GET     | `/api/health`          | Sanity check (status + version + timestamp)              |
| GET     | `/api/sessions`        | Liste des séances enregistrées                           |
| POST    | `/api/sessions`        | Enregistrer une séance (`{ name?, session }`)            |
| GET     | `/api/sessions/:id`    | Détail d'une séance                                      |
| DELETE  | `/api/sessions/:id`    | Supprimer une séance                                     |
| GET     | `/api/exercises`       | Liste des exercices personnalisés                        |
| POST    | `/api/exercises`       | Créer un exercice perso (`{ group, exercise }`)          |
| GET     | `/api/exercises/:id`   | Détail d'un exercice                                     |
| DELETE  | `/api/exercises/:id`   | Supprimer un exercice                                    |
| GET     | `/api/completed-sessions`     | Liste des séances terminées (avec performances)   |
| POST    | `/api/completed-sessions`     | Enregistrer une séance terminée (`{ session, feedbacks, durationSeconds }`) |
| GET     | `/api/completed-sessions/:id` | Détail d'une séance terminée                      |
| DELETE  | `/api/completed-sessions/:id` | Supprimer une séance terminée                     |

## Stockage

Les séances sont persistées dans une base **SQLite** locale (`data/sportacus.db`), gérée via le module `bun:sqlite` natif (aucune dépendance externe, pas de serveur DB séparé à lancer).

Schéma de la table `sessions` :

| Colonne         | Type    | Description                              |
|-----------------|---------|------------------------------------------|
| `id`            | TEXT PK | identifiant de la séance (`s-...`)       |
| `name`          | TEXT    | nom donné par l'utilisateur              |
| `created_at`    | TEXT    | timestamp ISO 8601                       |
| `musculaire`    | TEXT    | groupe musculaire ciblé (filtrable)      |
| `objectif`      | TEXT    | force / endurance / prise de muscle / …  |
| `duree`         | INTEGER | durée demandée (min)                     |
| `duree_estimee` | INTEGER | durée réellement estimée (min)           |
| `session_json`  | TEXT    | payload complet de la séance (JSON)      |

Schéma de la table `exercises` :

| Colonne         | Type    | Description                                |
|-----------------|---------|--------------------------------------------|
| `id`            | TEXT PK | identifiant de l'exercice (`e-...`)        |
| `group_name`    | TEXT    | groupe musculaire (`pectoraux`, `dos`, …)  |
| `name`          | TEXT    | nom                                        |
| `type`          | TEXT    | force / endurance / tonification / …       |
| `equipment`     | TEXT    | équipement requis (peut être `NULL`)       |
| `muscles_json`  | TEXT    | tableau JSON des muscles ciblés            |
| `video`         | TEXT    | URL de tutoriel (peut être vide)           |
| `created_at`    | TEXT    | timestamp ISO 8601                         |

Schéma de la table `completed_sessions` (séances terminées + performances saisies) :

| Colonne            | Type    | Description                                       |
|--------------------|---------|---------------------------------------------------|
| `id`               | TEXT PK | identifiant (`c-...`)                             |
| `finished_at`      | TEXT    | timestamp ISO 8601 de fin de séance               |
| `duration_seconds` | INTEGER | durée réellement écoulée (secondes)               |
| `musculaire`       | TEXT    | groupe musculaire (filtrable)                     |
| `objectif`         | TEXT    | objectif (filtrable)                              |
| `session_json`     | TEXT    | séance générée (config + exercises)               |
| `feedbacks_json`   | TEXT    | `{ [exoId]: { charge, reps, difficulte } }`       |

Index : `idx_sessions_created_at`, `idx_exercises_group`, `idx_completed_sessions_finished_at`. Le mode `WAL` est activé pour de meilleures performances en lecture concurrente.

La base et ses fichiers associés (`*.db-wal`, `*.db-shm`) sont créés automatiquement au premier démarrage et ignorés par git.

## Structure

```
backend/
├── package.json
├── README.md
├── data/                       # base SQLite créée à la volée (gitignored)
│   └── .gitkeep
└── src/
    ├── server.js                   # entrée Hono + CORS + montage des routes
    ├── routes/
    │   ├── health.js               # GET /api/health
    │   ├── sessions.js             # CRUD /api/sessions
    │   ├── exercises.js            # CRUD /api/exercises
    │   └── completed-sessions.js   # CRUD /api/completed-sessions
    └── storage/
        ├── db.js                   # init SQLite + PRAGMA + CREATE TABLE (3 tables, 3 index)
        ├── sessions.js             # requêtes préparées sessions
        ├── exercises.js            # requêtes préparées exercices
        └── completed-sessions.js   # requêtes préparées séances terminées
```

## Test rapide

```bash
# health
curl http://localhost:3000/api/health

# liste de séances (vide au départ)
curl http://localhost:3000/api/sessions

# création de séance
curl -X POST http://localhost:3000/api/sessions \
  -H "Content-Type: application/json" \
  -d '{"name":"test","session":{"musculaire":"dos","objectif":"force","exercises":[{"id":"a","name":"Tractions"}]}}'

# création d'exercice perso
curl -X POST http://localhost:3000/api/exercises \
  -H "Content-Type: application/json" \
  -d '{"group":"pectoraux","exercise":{"name":"Pompes diamant","type":"force","equipment":"poids du corps","muscles":["triceps","pectoraux"]}}'

# liste des exercices
curl http://localhost:3000/api/exercises
```
