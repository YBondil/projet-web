import { db } from "./db.js";

const INSERT_ONE = db.query(
  `INSERT INTO scheduled_workouts
     (id, scheduled_for, created_at, created_by, musculaire, objectif, session_json, justification, done_at)
   VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL)`
);

const SELECT_ALL = db.query(
  `SELECT id, scheduled_for, created_at, created_by, musculaire, objectif,
          session_json, justification, done_at
   FROM scheduled_workouts
   ORDER BY scheduled_for ASC`
);

const SELECT_UPCOMING = db.query(
  `SELECT id, scheduled_for, created_at, created_by, musculaire, objectif,
          session_json, justification, done_at
   FROM scheduled_workouts
   WHERE done_at IS NULL AND scheduled_for >= ?
   ORDER BY scheduled_for ASC`
);

const SELECT_ONE = db.query(
  `SELECT id, scheduled_for, created_at, created_by, musculaire, objectif,
          session_json, justification, done_at
   FROM scheduled_workouts
   WHERE id = ?`
);

const DELETE_ONE = db.query(`DELETE FROM scheduled_workouts WHERE id = ?`);

const MARK_DONE = db.query(
  `UPDATE scheduled_workouts SET done_at = ? WHERE id = ?`
);

function safeParse(text, fallback) {
  try {
    return text == null ? fallback : JSON.parse(text);
  } catch {
    return fallback;
  }
}

function rowToScheduled(row) {
  if (!row) return null;
  return {
    id: row.id,
    scheduledFor: row.scheduled_for,
    createdAt: row.created_at,
    createdBy: row.created_by,
    musculaire: row.musculaire ?? null,
    objectif: row.objectif ?? null,
    session: safeParse(row.session_json, null),
    justification: row.justification ?? null,
    doneAt: row.done_at ?? null,
  };
}

export function createScheduledWorkout({
  scheduledFor,
  session,
  justification = null,
  createdBy = "agent",
}) {
  const id = `sw-${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 6)}`;
  const createdAt = new Date().toISOString();
  INSERT_ONE.run(
    id,
    scheduledFor,
    createdAt,
    createdBy,
    session?.musculaire ?? null,
    session?.objectif ?? null,
    JSON.stringify(session ?? {}),
    justification
  );
  return getScheduledWorkout(id);
}

export function listScheduled() {
  return SELECT_ALL.all().map(rowToScheduled);
}

export function listUpcoming(nowIso = new Date().toISOString()) {
  return SELECT_UPCOMING.all(nowIso).map(rowToScheduled);
}

export function getScheduledWorkout(id) {
  return rowToScheduled(SELECT_ONE.get(id));
}

export function deleteScheduledWorkout(id) {
  return DELETE_ONE.run(id).changes > 0;
}

export function markScheduledDone(id, isoNow = new Date().toISOString()) {
  return MARK_DONE.run(isoNow, id).changes > 0;
}
