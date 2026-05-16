import { db } from "./db.js";

const SELECT_ALL = db.query(
  `SELECT id, name, created_at, session_json
   FROM sessions
   ORDER BY created_at DESC`
);

const SELECT_ONE = db.query(
  `SELECT id, name, created_at, session_json
   FROM sessions
   WHERE id = ?`
);

const INSERT_ONE = db.query(
  `INSERT INTO sessions
     (id, name, created_at, musculaire, objectif, duree, duree_estimee, session_json)
   VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
);

const DELETE_ONE = db.query(`DELETE FROM sessions WHERE id = ?`);

function rowToEntry(row) {
  if (!row) return null;
  let session = null;
  try {
    session = JSON.parse(row.session_json);
  } catch {
    session = null;
  }
  return {
    id: row.id,
    name: row.name,
    createdAt: row.created_at,
    session,
  };
}

export function listSessions() {
  return SELECT_ALL.all().map(rowToEntry);
}

export function getSession(id) {
  return rowToEntry(SELECT_ONE.get(id));
}

export function createSession({ name, session }) {
  const id = `s-${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 6)}`;
  const finalName =
    (typeof name === "string" && name.trim()) ||
    `${session?.musculaire ?? "séance"} - ${session?.objectif ?? "?"}`;
  const createdAt = new Date().toISOString();

  INSERT_ONE.run(
    id,
    finalName,
    createdAt,
    session?.musculaire ?? null,
    session?.objectif ?? null,
    Number.isFinite(session?.duree) ? session.duree : null,
    Number.isFinite(session?.dureeEstimee) ? session.dureeEstimee : null,
    JSON.stringify(session)
  );

  return { id, name: finalName, createdAt, session };
}

export function deleteSession(id) {
  const result = DELETE_ONE.run(id);
  return result.changes > 0;
}
