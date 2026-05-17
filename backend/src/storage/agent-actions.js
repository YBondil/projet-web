import { db } from "./db.js";

const INSERT_ONE = db.query(
  `INSERT INTO agent_actions
     (id, created_at, action_type, exercise_id, params_json, previous_value_json, justification, reversed_at)
   VALUES (?, ?, ?, ?, ?, ?, ?, NULL)`
);

const SELECT_ALL = db.query(
  `SELECT id, created_at, action_type, exercise_id, params_json,
          previous_value_json, justification, reversed_at
   FROM agent_actions
   ORDER BY created_at DESC`
);

const SELECT_ONE = db.query(
  `SELECT id, created_at, action_type, exercise_id, params_json,
          previous_value_json, justification, reversed_at
   FROM agent_actions
   WHERE id = ?`
);

const MARK_REVERSED = db.query(
  `UPDATE agent_actions SET reversed_at = ? WHERE id = ?`
);

function rowToAction(row) {
  if (!row) return null;
  return {
    id: row.id,
    createdAt: row.created_at,
    actionType: row.action_type,
    exerciseId: row.exercise_id,
    params: safeParse(row.params_json, {}),
    previousValue: safeParse(row.previous_value_json, null),
    justification: row.justification,
    reversedAt: row.reversed_at ?? null,
  };
}

function safeParse(text, fallback) {
  try {
    return text == null ? fallback : JSON.parse(text);
  } catch {
    return fallback;
  }
}

export function logAction({
  actionType,
  exerciseId = null,
  params = {},
  previousValue = null,
  justification,
}) {
  const id = `a-${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 6)}`;
  const createdAt = new Date().toISOString();
  INSERT_ONE.run(
    id,
    createdAt,
    actionType,
    exerciseId,
    JSON.stringify(params ?? {}),
    previousValue == null ? null : JSON.stringify(previousValue),
    justification ?? ""
  );
  return { id, createdAt };
}

export function listActions() {
  return SELECT_ALL.all().map(rowToAction);
}

export function getAction(id) {
  return rowToAction(SELECT_ONE.get(id));
}

export function markReversed(id, isoNow = new Date().toISOString()) {
  return MARK_REVERSED.run(isoNow, id).changes > 0;
}
