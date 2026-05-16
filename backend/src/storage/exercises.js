import { db } from "./db.js";

const SELECT_ALL = db.query(
  `SELECT id, group_name, name, type, equipment, muscles_json, video, created_at
   FROM exercises
   ORDER BY created_at ASC`
);

const SELECT_ONE = db.query(
  `SELECT id, group_name, name, type, equipment, muscles_json, video, created_at
   FROM exercises
   WHERE id = ?`
);

const INSERT_ONE = db.query(
  `INSERT INTO exercises
     (id, group_name, name, type, equipment, muscles_json, video, created_at)
   VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
);

const DELETE_ONE = db.query(`DELETE FROM exercises WHERE id = ?`);

function rowToExercise(row) {
  if (!row) return null;
  let muscles = [];
  try {
    const parsed = JSON.parse(row.muscles_json);
    if (Array.isArray(parsed)) muscles = parsed;
  } catch {}
  return {
    id: row.id,
    group: row.group_name,
    name: row.name,
    type: row.type,
    equipment: row.equipment ?? "",
    muscles,
    video: row.video ?? "",
    createdAt: row.created_at,
  };
}

export function listExercises() {
  return SELECT_ALL.all().map(rowToExercise);
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
