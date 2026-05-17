# SOMA Coach — Architecture

Coach sportif IA agentique branché sur la base SQLite de SOMA. Il peut :
- répondre conversationnellement (Groq Llama 3.3 70B en streaming),
- modifier le programme via du **function calling** (Gemini 2.5 Flash + tools),
- justifier chaque action et la tracer dans une table d'audit réversible.

Toute la stack est **gratuite à l'usage** (free tiers Google AI Studio + Groq).

---

## 1. Stack et choix techniques

| Couche | Choix | Pourquoi |
|---|---|---|
| LLM agentique | `@google/genai` (Gemini 2.5 Flash) | Free tier 15 RPM / 1500 RPD, tool-calling natif, JSON structuré |
| LLM conversationnel | `groq-sdk` (Llama 3.3 70B versatile) | Free tier 30 RPM, streaming ultra rapide |
| Validation | `zod` | Léger, idiomatique, déjà compatible Bun |
| Stockage | `bun:sqlite` natif | Cohérent avec le reste du projet (pas d'ORM) |
| Streaming HTTP | `hono/streaming` (`streamSSE`) | Hono déjà en place |
| Frontend | SolidJS + `fetch` + `ReadableStream` | Pas d'EventSource (ne supporte pas POST) |

**Pas de LangChain / Vercel AI SDK** : SDKs officiels uniquement, dépendances minimales.

---

## 2. Configuration (clés API)

Les clés sont lues via `process.env` au boot. Aucun fichier `.env` n'est versionné.

```bash
GEMINI_API_KEY=AIza... \
GROQ_API_KEY=gsk_... \
bun run dev
```

Variables optionnelles :
- `COACH_MODEL_GEMINI` (défaut : `gemini-2.5-flash`)
- `COACH_MODEL_GROQ` (défaut : `llama-3.3-70b-versatile`)

Si une clé manque, le serveur démarre quand même avec un warning et l'endpoint `/api/chat` renvoie un 503 explicite.

---

## 3. Schéma BDD ajouté

### Nouvelles colonnes sur `exercises`
| Colonne | Type | Rôle |
|---|---|---|
| `source` | `TEXT` (`builtin` ou `custom`) | Distingue les exos backfillés de `exo.json` des exos utilisateur |
| `target_load_kg` | `INTEGER NULL` | Charge cible courante (modifiable par le coach) |
| `target_sets` | `INTEGER NULL` | Volume cible (séries) |
| `target_reps` | `TEXT NULL` | Volume cible (reps, supporte `8-12`) |
| `hidden_until` | `TEXT NULL` | Timestamp ISO 8601 jusqu'auquel l'exo est masqué |

### Nouvelle table `agent_actions` (audit + réversibilité)
```sql
agent_actions (
  id                  TEXT PRIMARY KEY,
  created_at          TEXT NOT NULL,
  action_type         TEXT NOT NULL,
  exercise_id         TEXT,
  params_json         TEXT NOT NULL,
  previous_value_json TEXT,                -- état avant l'action
  justification       TEXT NOT NULL,
  reversed_at         TEXT
)
```

### Nouvelle table `scheduled_workouts`
```sql
scheduled_workouts (
  id, scheduled_for, created_at, created_by,
  musculaire, objectif, session_json, justification, done_at
)
```

### Backfill
Au boot, `db.js` charge `frontend/src/data/exo.json` et `INSERT OR IGNORE` les ~76 exos built-in avec `source = 'builtin'`. La route `GET /api/exercises` filtre `source = 'custom'` pour ne pas changer le comportement frontend.

---

## 4. Endpoint `/api/chat`

### `POST /api/chat`

Corps :
```json
{
  "messages": [
    {"role": "user", "content": "le développé couché me fait mal à l'épaule"}
  ]
}
```

Réponse : flux **SSE** (`text/event-stream`). Chaque event a un champ `event` et un `data` JSON :

| `event` | `data` | Quand ? |
|---|---|---|
| `text` | `{type:"text", delta:"..."}` | Chunks de texte (mode conversationnel) |
| `tool_call` | `{type:"tool_call", name, args}` | Gemini demande d'exécuter un tool |
| `tool_result` | `{type:"tool_result", name, result:{success, message, updatedEntity}}` | Résultat de l'exécution |
| `payload` | `{type:"payload", payload:{type:"message"\|"recommendation", ...}}` | JSON structuré final |
| `error` | `{type:"error", message}` | Erreur fatale |
| `done` | `{type:"done"}` | Fin de stream |

### `GET /api/chat/status`

Renvoie `{ gemini: bool, groq: bool, systemPromptChars: number }` — utilisé par le frontend pour afficher l'état de configuration.

---

## 5. Détection d'intent

Heuristique mots-clés (FR + EN) dans [`backend/src/ai/intent.js`](backend/src/ai/intent.js).

**Justification du choix vs un appel Gemini léger** :
- Un appel Gemini préalable coûterait une requête sur les 15 RPM du free tier.
- Les faux positifs sont absorbés : Gemini avec tools peut très bien répondre conversationnellement.
- Les faux négatifs coûtent juste « le coach n'a pas modifié la BDD » — la réponse Groq reste utile.
- La liste de mots-clés est centralisée et facile à étendre.

Mots-clés qui déclenchent l'agentique : `masquer`, `enlever`, `augmenter`, `diminuer`, `planifier`, `programme`, `trop dur`, `trop facile`, `j'ai mal`, etc. + équivalents EN.

---

## 6. Contexte utilisateur

`backend/src/ai/context.js` interroge `completed_sessions` sur les 30 derniers jours et produit un JSON compact :

```json
{
  "windowDays": 30,
  "summary": {
    "totalSessions": 12,
    "totalMinutes": 540,
    "sessionsByGroup": {"dos": 4, "pectoraux": 3, "jambes": 5}
  },
  "exercises": [
    {
      "id": "bench",
      "name": "Développé couché",
      "group": "pectoraux",
      "sessions": 3,
      "pr": 80,
      "lastCharge": 75,
      "lastReps": 6,
      "lastDifficulte": "difficile",
      "hardCount": 2,
      "easyCount": 0
    }
  ],
  "hiddenExercises": [
    {"id": "squat", "name": "Squat", "hiddenUntil": "2026-05-24T10:00:00.000Z"}
  ]
}
```

**Cache mémoire de 60 s par fenêtre** pour éviter de re-construire le contexte à chaque tour d'une même conversation.

---

## 7. Tools Gemini

5 tools dans [`backend/src/ai/tools.js`](backend/src/ai/tools.js), tous validés Zod et tracés dans `agent_actions` :

| Nom | Action SQL | `previous_value_json` capturé |
|---|---|---|
| `hide_exercise` | `UPDATE exercises SET hidden_until = ?` | `{hiddenUntil}` |
| `reintroduce_hidden_exercises` | `UPDATE exercises SET hidden_until = NULL WHERE hidden_until <= now` | ids réactivés |
| `adjust_exercise_load` | `UPDATE exercises SET target_load_kg = ?` | `{targetLoadKg}` |
| `adjust_exercise_volume` | `UPDATE exercises SET target_sets = ?, target_reps = ?` | `{targetSets, targetReps}` |
| `schedule_workout` | `INSERT INTO scheduled_workouts` | (la création est elle-même réversible par DELETE) |

Chaque tool retourne `{ success, message, updatedEntity }` que le modèle peut commenter dans son tour suivant.

---

## 8. Prompt système

Voir [`backend/src/ai/prompt.js`](backend/src/ai/prompt.js). En résumé :
- Rôle : « SOMA Coach, expert biomécanique et programmation »
- Principes : surcharge progressive raisonnable, deload toutes les 4-6 semaines, gestion de la douleur, forme avant charge, spécificité
- Règles strictes : tutoiement, ton motivant + factuel, **un tool uniquement si justification physiologique explicite et data-driven**
- Réponse au format **JSON strict** : `{type:"message"|"recommendation", ...}`
- Contexte utilisateur injecté en fin de prompt système (pas dans le message user)

---

## 9. Gestion des rate limits

- **Backoff exponentiel** dans `withBackoff()` ([`provider.js`](backend/src/ai/provider.js)) sur les 429 / 503 / messages contenant `rate`, `quota`, `overload` : 4 tentatives, base 800 ms, jitter aléatoire.
- **Fallback Groq → Gemini** : si Groq échoue en mode conversationnel, on bascule sur Gemini non-streaming.
- **Cache de contexte 60 s** pour limiter les rebuilds.
- **`maxOutputTokens: 1500`** côté Gemini, `max_tokens: 1024` côté Groq pour ménager les quotas.

---

## 10. Frontend

[`frontend/src/components/CoachChat.jsx`](frontend/src/components/CoachChat.jsx) : modal flottant déclenché par un FAB sur la home.

- État via `createSignal<ChatMessage[]>([])`
- Streaming via `fetch + ReadableStream.getReader()` + parsing manuel SSE dans [`api/chat.js`](frontend/src/api/chat.js)
- Rendu différencié :
  - Bulle simple pour `type:"message"`
  - Carte avec titre + rationale + actions pour `type:"recommendation"`
  - Cards de tools (✓/✗) pour les `tool_call` / `tool_result`
- Indicateur live « Le coach analyse… » / « Masquer un exercice… » selon le tool en cours
- Annulation via `AbortController`

---

## 11. Exemple de conversation agentique

**Utilisateur** : « le développé couché me fait mal à l'épaule droite quand je descends trop, qu'est-ce que je fais ? »

**Détection d'intent** : `agentic` (mot-clé `mal`).

**Tour 1 Gemini** :
- `text` : (rien en agentique)
- `tool_call` : `hide_exercise({exerciseId: "bench-press", reason: "Douleur épaule droite à l'amplitude max", reintroduceAfterDays: 14})`

**Backend** :
- Validation Zod ✓
- `UPDATE exercises SET hidden_until = '2026-05-31T...' WHERE id = 'bench-press'`
- `INSERT INTO agent_actions (..., previous_value_json='{"hiddenUntil":null}', justification='Douleur épaule droite...')`
- Émet `tool_result: { success: true, message: 'Exercice "Développé couché" masqué jusqu'au 2026-05-31.', updatedEntity: {...} }`

**Tour 2 Gemini** (avec le tool result en contexte) :
```json
{
  "type": "recommendation",
  "title": "Mise au repos du développé couché",
  "rationale": "Une douleur à l'épaule droite en amplitude max sur un mouvement compound est un signal d'alerte. Je masque l'exercice 14 jours pour laisser l'articulation récupérer, puis je proposerai une réintroduction progressive. En attendant, on peut le remplacer par du développé incliné ou des pompes à amplitude réduite.",
  "actions": [
    {"label": "Exercice masqué 14 jours", "tool": "hide_exercise", "args": {"exerciseId": "bench-press"}}
  ]
}
```

Le frontend rend une **carte de recommandation** avec titre, rationale et la liste des actions exécutées (l'action est déjà appliquée).

---

## 12. Tests

| Fichier | Couverture |
|---|---|
| `TESTS/backend/agent-actions.storage.test.js` | Schéma, `logAction`, `listActions`, `markReversed` |
| `TESTS/backend/scheduled-workouts.storage.test.js` | Schéma, CRUD, `listUpcoming`, `markScheduledDone` |
| `TESTS/backend/intent.test.js` | Détection agentique vs conversationnel (FR + EN, historique) |
| `TESTS/backend/tools.test.js` | Chacun des 5 tools : succès, validation Zod, exo inconnu, logging |

Total après ajout : **183 tests** en `bun test`, 0 fail.

---

## 13. Limites connues

- **Pas d'authentification** : single-user. Le `userId` du payload `/api/chat` est ignoré pour l'instant (placeholder).
- **Frontend et `target_*`** : la table `exercises` contient maintenant les targets ajustés par le coach, mais le frontend continue d'utiliser `exo.json` comme base. Pour que l'utilisateur voie les changements de charge/volume dans `/exercises` ou `/saved`, il faudra migrer le frontend à consommer la table en lieu et place du JSON statique. C'est une étape v2 non bloquante pour le coach.
- **Réversibilité automatique** : `previous_value_json` est capturé, mais l'endpoint d'annulation (`POST /api/agent-actions/:id/reverse`) n'est pas exposé. À ajouter si besoin.
- **Pas de mémoire long terme** : chaque appel reconstitue le contexte depuis `completed_sessions`. Pas de fine-tuning ni de RAG.
