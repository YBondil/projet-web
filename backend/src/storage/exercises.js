import { db } from "./db.js";

// Liste publique : custom uniquement (pour ne pas dupliquer les built-in
// déjà présents dans frontend/src/data/exo.json côté UI).
const SELECT_ALL_CUSTOM = db.query(
  `SELECT id, source, group_name, name, type, equipment, muscles_json, video,
          target_load_kg, target_sets, target_reps, hidden_until, created_at
   FROM exercises
   WHERE source = 'custom'
   ORDER BY created_at ASC`
);

// Pour les tools du coach : tout est visible, custom + builtin.
const SELECT_ALL = db.query(
  `SELECT id, source, group_name, name, type, equipment, muscles_json, video,
          target_load_kg, target_sets, target_reps, hidden_until, created_at
   FROM exercises
   ORDER BY group_name ASC, name ASC`
);

const SELECT_ONE = db.query(
  `SELECT id, source, group_name, name, type, equipment, muscles_json, video,
          target_load_kg, target_sets, target_reps, hidden_until, created_at
   FROM exercises
   WHERE id = ?`
);

const SELECT_HIDDEN_EXPIRED = db.query(
  `SELECT id FROM exercises
   WHERE hidden_until IS NOT NULL AND hidden_until <= ?`
);

const SELECT_HIDDEN_ACTIVE = db.query(
  `SELECT id, name, hidden_until FROM exercises
   WHERE hidden_until IS NOT NULL AND hidden_until > ?`
);

const INSERT_ONE = db.query(
  `INSERT INTO exercises
     (id, source, group_name, name, type, equipment, muscles_json, video, created_at)
   VALUES (?, 'custom', ?, ?, ?, ?, ?, ?, ?)`
);

const DELETE_ONE = db.query(`DELETE FROM exercises WHERE id = ?`);

const UPDATE_TARGETS = db.query(
  `UPDATE exercises
   SET target_load_kg = COALESCE(?, target_load_kg),
       target_sets    = COALESCE(?, target_sets),
       target_reps    = COALESCE(?, target_reps)
   WHERE id = ?`
);

const UPDATE_HIDDEN_UNTIL = db.query(
  `UPDATE exercises SET hidden_until = ? WHERE id = ?`
);

const CLEAR_EXPIRED_HIDDEN = db.query(
  `UPDATE exercises SET hidden_until = NULL
   WHERE hidden_until IS NOT NULL AND hidden_until <= ?`
);

function rowToExercise(row) {
  if (!row) return null;
  let muscles = [];
  try {
    const parsed = JSON.parse(row.muscles_json);
    if (Array.isArray(parsed)) muscles = parsed;
  } catch {}
  return {
    id: row.id,
    source: row.source ?? "custom",
    group: row.group_name,
    name: row.name,
    type: row.type,
    equipment: row.equipment ?? "",
    muscles,
    video: row.video ?? "",
    targetLoadKg: row.target_load_kg ?? null,
    targetSets: row.target_sets ?? null,
    targetReps: row.target_reps ?? null,
    hiddenUntil: row.hidden_until ?? null,
    createdAt: row.created_at,
  };
}

// --- API publique (consomée par la route /api/exercises) ---

export function listExercises() {
  return SELECT_ALL_CUSTOM.all().map(rowToExercise);
}

export function getExercise(id) {
  return rowToExercise(SELECT_ONE.get(id));
}

export function createExercise({ group, exercise }) {
  const id =
    (typeof exercise.id === "string" && exercise.id.trim()) ||
    `e-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
  const createdAt = new Date().toISOString();

  INSERT_ONE.run(
    id,
    group,
    exercise.name.trim(),
    exercise.type.trim(),
    exercise.equipment?.trim?.() || null,
    JSON.stringify(exercise.muscles ?? []),
    exercise.video?.trim?.() || "",
    createdAt
  );

  return getExercise(id);
}

export function deleteExercise(id) {
  return DELETE_ONE.run(id).changes > 0;
}

// --- API utilisée par le coach IA (voit aussi les built-in) ---

export function listAllExercises() {
  return SELECT_ALL.all().map(rowToExercise);
}

export function updateExerciseTargets(
  id,
  { targetLoadKg = null, targetSets = null, targetReps = null }
) {
  const before = getExercise(id);
  if (!before) return null;
  UPDATE_TARGETS.run(targetLoadKg, targetSets, targetReps, id);
  return { before, after: getExercise(id) };
}

export function setExerciseHiddenUntil(id, isoOrNull) {
  const before = getExercise(id);
  if (!before) return null;
  UPDATE_HIDDEN_UNTIL.run(isoOrNull, id);
  return { before, after: getExercise(id) };
}

export function listActiveHidden(nowIso = new Date().toISOString()) {
  return SELECT_HIDDEN_ACTIVE.all(nowIso);
}

export function clearExpiredHidden(nowIso = new Date().toISOString()) {
  const expired = SELECT_HIDDEN_EXPIRED.all(nowIso).map((r) => r.id);
  if (expired.length === 0) return [];
  CLEAR_EXPIRED_HIDDEN.run(nowIso);
  return expired;
}
