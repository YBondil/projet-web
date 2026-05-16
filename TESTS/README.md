# TESTS — SOMA

Suite de tests exhaustive pour le frontend (logique pure) et le backend (storage + API HTTP).
Tout passe par **`bun test`** (intégré à Bun, aucune dépendance supplémentaire à installer).

## Lancer les tests

```bash
cd TESTS
bun run test                  # tout (recommandé — wrapper qui sauvegarde/restore la DB user)
bun run test:backend          # uniquement le backend
bun run test:frontend         # uniquement le frontend
bun run test backend/api      # un fichier précis
```

> `bun run test` passe par le wrapper [run-tests.js](run-tests.js) qui :
> 1. restaure un éventuel backup résiduel d'un run précédent foiré,
> 2. sauvegarde la DB de prod (`backend/data/soma.db*` → `*.test-backup`),
> 3. lance `bun test` (avec une DB vide créée à la volée),
> 4. restaure la DB de prod **dans tous les cas** (même si les tests échouent).
>
> Si tu veux contourner le wrapper (au risque de polluer la DB de prod) : `bun run test:raw`.

> Aucun `bun install` n'est nécessaire dans `TESTS/` : les modules importés (Hono, SolidJS) sont résolus depuis `backend/node_modules` ou `frontend/node_modules`.

## Couverture

### `frontend/equipment.test.js`
- Constantes `EQUIPMENTS` et `EQUIPMENT_LABEL` complètes.
- `filterByEquipment` : pool entier si argument vide / `undefined` / contient `"salle de musculation"` ; filtre exact sur un seul équipement ; filtre multi-équipements ; pas de mutation du pool d'entrée.

### `frontend/algo.test.js`
- `dureeExercice` : formule exacte pour les 4 objectifs, comportement `Math.ceil`.
- `attachParams` : enrichit l'exercice sans le muter.
- `recomputeEstimate` : `nbExos * dureeExercice + 10` (les 10 min d'échauffement).
- `generateTraining` :
  - renvoie la config (`musculaire`, `duree`, `objectif`, `equipement`) et les `params` de l'objectif ;
  - cohérence du `dureeEstimee` avec le nombre d'exercices retournés ;
  - garantit ≥ 3 exercices même pour une durée très courte ;
  - chaque exercice porte `series`, `reps`, `repos`, `dureeTotale` ;
  - aucun id dupliqué dans la sélection ;
  - filtre d'équipement strict (« poids du corps » → seuls des exos « poids du corps ») ;
  - fonctionne sur les 7 groupes musculaires et les 4 objectifs ;
  - appels successifs indépendants.

### `backend/storage.test.js`
- Schéma : présence de la table `sessions` avec les 8 colonnes attendues + index `idx_sessions_created_at`.
- `createSession` : id généré (`s-...`), `createdAt` ISO, nom par défaut `<musculaire> - <objectif>`, nom personnalisé trimmé, fallback si chaîne blanche, persistance des colonnes structurées, ids uniques sur deux appels.
- `listSessions` : `[]` à vide, listing complet, tri `created_at DESC`, désérialisation du JSON.
- `getSession` : `null` si inconnu, entrée correcte sinon.
- `deleteSession` : `false` si inconnu, `true` sinon, suppression ciblée.

### `backend/exercises.storage.test.js`
- Schéma : présence de la table `exercises` avec les 8 colonnes attendues + index `idx_exercises_group`.
- `createExercise` : id généré (`e-...`) ou respecté si fourni, désérialisation correcte du JSON des muscles, équipement vide stocké en `NULL`, vidéo vide → chaîne vide, ids uniques.
- `listExercises` : `[]` à vide, ordre `created_at ASC`, `group_name` cohérent.
- `getExercise` / `deleteExercise` : `null` / `false` si inconnu, sinon retour correct ; suppression ciblée.

### `backend/api.test.js` (Hono testé via `app.fetch(new Request(...))`)
- `GET /api/health` : 200 + `{status, service, version, time}` valide.
- Route inconnue : 404 `{error:"not_found"}`.
- `GET /api/sessions` : `[]`, liste peuplée, tri chronologique inverse.
- `POST /api/sessions` :
  - 201 + payload (id, createdAt, session) ;
  - nom par défaut si non fourni ;
  - 400 si `session` manquant (`missing_session`) ;
  - 400 si `exercises` manquant ou vide (`invalid_session_exercises`) ;
  - 400 si JSON invalide (`invalid_json`).
- `GET /api/sessions/:id` : 200 si trouvé, 404 sinon.
- `DELETE /api/sessions/:id` : 204 avec corps vide, 404 sinon, suppression effective et ciblée.
- CORS : preflight `OPTIONS` → 204 avec `Access-Control-Allow-Origin` reflété, méthodes autorisées ; POST cross-origin → header reflété.
- Bout-en-bout : 5 POST + 5 GET unitaires + GET liste cohérents.

### `backend/exercises.api.test.js`
- `GET /api/exercises` : `[]`, liste peuplée multi-groupes, chaque entrée a les 8 champs attendus (`id`, `group`, `name`, `type`, `equipment`, `muscles`, `video`, `createdAt`).
- `POST /api/exercises` :
  - 201 + id généré (`e-...`) ;
  - 400 sur tous les champs manquants/invalides : `missing_group`, `missing_exercise`, `invalid_exercise_name`, `invalid_exercise_type`, `invalid_exercise_muscles`, `invalid_json` ;
  - équipement vide accepté (retourné en chaîne vide).
- `GET /api/exercises/:id` : 200 / 404.
- `DELETE /api/exercises/:id` : 204 / 404, suppression effective.
- CORS preflight sur `/api/exercises` : 204 avec `Access-Control-Allow-Origin` reflété.

## Isolation de la base de données

Les tests backend utilisent la même instance SQLite que le serveur (`backend/data/soma.db`), mais :

1. Le wrapper [run-tests.js](run-tests.js) sauvegarde la DB de prod **avant** de lancer `bun test` (renommée en `*.test-backup`).
2. `bun test` démarre avec une DB vide. Les modules `db.js` / `storage/sessions.js` sont chargés via `import()` dans les `beforeAll` des fichiers de test.
3. Chaque test commence par un `beforeEach` qui exécute `DELETE FROM sessions` — table vide garantie.
4. À la fin, le wrapper restaure la DB de prod **dans tous les cas** (les `process.on('exit')` ne se déclenchent pas dans `bun test`, d'où le besoin d'un wrapper externe).

→ Aucune donnée locale n'est perdue, et les tests sont indépendants entre eux.

## Polyfill localStorage

Les modules `frontend/src/store/*.js` utilisent `localStorage`, qui n'existe pas dans Bun. Un polyfill en mémoire (`helpers/setup.js`) est chargé via `bunfig.toml [test] preload`, ce qui permet aux imports frontend de fonctionner sans modification du code source.

## Limites connues

- Les composants Solid (`*.jsx`) ne sont pas testés ici — il faudrait un environnement DOM (jsdom + un runner type Vitest avec `vite-plugin-solid`). Seule la logique pure (`data/`) est couverte côté frontend.
- L'algo `generateTraining` utilise `Math.random()` — les tests vérifient des invariants structurels, pas la sélection exacte.
