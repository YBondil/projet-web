import { db } from "./db.js";

const SELECT_ALL = db.query(
  `SELECT id, finished_at, duration_seconds, musculaire, objectif, session_json, feedbacks_json
   FROM completed_sessions
   ORDER BY finished_at DESC`
);

const SELECT_ONE = db.query(
  `SELECT id, finished_at, duration_seconds, musculaire, objectif, session_json, feedbacks_json
   FROM completed_sessions
   WHERE id = ?`
);

const INSERT_ONE = db.query(
  `INSERT INTO completed_sessions
     (id, finished_at, duration_seconds, musculaire, objectif, session_json, feedbacks_json)
   VALUES (?, ?, ?, ?, ?, ?, ?)`
);

const DELETE_ONE = db.query(`DELETE FROM completed_sessions WHERE id = ?`);

function safeParse(text, fallback) {
  try {
    const v = JSON.parse(text);
    return v ?? fallback;
  } catch {
    return fallback;
  }
}

function rowToEntry(row) {
  if (!row) return null;
  return {
    id: row.id,
    finishedAt: row.finished_at,
    durationSeconds: row.duration_seconds,
    musculaire: row.musculaire ?? null,
    objectif: row.objectif ?? null,
    session: safeParse(row.session_json, null),
    feedbacks: safeParse(row.feedbacks_json, {}),
  };
}

export function listCompletedSessions() {
  return SELECT_ALL.all().map(rowToEntry);
}

export function getCompletedSession(id) {
  return rowToEntry(SELECT_ONE.get(id));
}

export function createCompletedSession({ session, feedbacks, durationSeconds }) {
  const id = `c-${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 6)}`;
  const finishedAt = new Date().toISOString();

  INSERT_ONE.run(
    id,
    finishedAt,
    Number.isFinite(durationSeconds) ? Math.max(0, Math.floor(durationSeconds)) : 0,
    session?.musculaire ?? null,
    session?.objectif ?? null,
    JSON.stringify(session),
    JSON.stringify(feedbacks ?? {})
  );

  return getCompletedSession(id);
}

export function deleteCompletedSession(id) {
  return DELETE_ONE.run(id).changes > 0;
}
