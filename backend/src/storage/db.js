import { Database } from "bun:sqlite";
import { existsSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";

const DB_FILE = resolve(import.meta.dir, "..", "..", "data", "soma.db");

const dir = dirname(DB_FILE);
if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

export const db = new Database(DB_FILE);

db.exec("PRAGMA journal_mode = WAL;");
db.exec("PRAGMA foreign_keys = ON;");

// ------------------------------------------------------------------
// Tables : sessions, exercises, completed_sessions (existantes)
// ------------------------------------------------------------------

db.exec(`
  CREATE TABLE IF NOT EXISTS sessions (
    id            TEXT PRIMARY KEY,
    name          TEXT NOT NULL,
    created_at    TEXT NOT NULL,
    musculaire    TEXT,
    objectif      TEXT,
    duree         INTEGER,
    duree_estimee INTEGER,
    session_json  TEXT NOT NULL
  );
`);
db.exec(`
  CREATE INDEX IF NOT EXISTS idx_sessions_created_at
  ON sessions (created_at DESC);
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS exercises (
    id           TEXT PRIMARY KEY,
    group_name   TEXT NOT NULL,
    name         TEXT NOT NULL,
    type         TEXT NOT NULL,
    equipment    TEXT,
    muscles_json TEXT NOT NULL,
    video        TEXT,
    created_at   TEXT NOT NULL
  );
`);
db.exec(`
  CREATE INDEX IF NOT EXISTS idx_exercises_group
  ON exercises (group_name);
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS completed_sessions (
    id               TEXT PRIMARY KEY,
    finished_at      TEXT NOT NULL,
    duration_seconds INTEGER NOT NULL,
    musculaire       TEXT,
    objectif         TEXT,
    session_json     TEXT NOT NULL,
    feedbacks_json   TEXT NOT NULL
  );
`);
db.exec(`
  CREATE INDEX IF NOT EXISTS idx_completed_sessions_finished_at
  ON completed_sessions (finished_at DESC);
`);

// ------------------------------------------------------------------
// Migrations idempotentes pour le coach IA
// ------------------------------------------------------------------

function addColumnIfMissing(table, column, definition) {
  const cols = db.query(`PRAGMA table_info(${table})`).all();
  if (cols.some((c) => c.name === column)) return false;
  db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  return true;
}

addColumnIfMissing("exercises", "source", "TEXT NOT NULL DEFAULT 'custom'");
addColumnIfMissing("exercises", "target_load_kg", "INTEGER");
addColumnIfMissing("exercises", "target_sets", "INTEGER");
addColumnIfMissing("exercises", "target_reps", "TEXT");
addColumnIfMissing("exercises", "hidden_until", "TEXT");

db.exec(`
  CREATE INDEX IF NOT EXISTS idx_exercises_source
  ON exercises (source);
`);
db.exec(`
  CREATE INDEX IF NOT EXISTS idx_exercises_hidden_until
  ON exercises (hidden_until);
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS agent_actions (
    id                  TEXT PRIMARY KEY,
    created_at          TEXT NOT NULL,
    action_type         TEXT NOT NULL,
    exercise_id         TEXT,
    params_json         TEXT NOT NULL,
    previous_value_json TEXT,
    justification       TEXT NOT NULL,
    reversed_at         TEXT
  );
`);
db.exec(`
  CREATE INDEX IF NOT EXISTS idx_agent_actions_created_at
  ON agent_actions (created_at DESC);
`);
db.exec(`
  CREATE INDEX IF NOT EXISTS idx_agent_actions_exercise
  ON agent_actions (exercise_id);
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS scheduled_workouts (
    id            TEXT PRIMARY KEY,
    scheduled_for TEXT NOT NULL,
    created_at    TEXT NOT NULL,
    created_by    TEXT NOT NULL DEFAULT 'agent',
    musculaire    TEXT,
    objectif      TEXT,
    session_json  TEXT NOT NULL,
    justification TEXT,
    done_at       TEXT
  );
`);
db.exec(`
  CREATE INDEX IF NOT EXISTS idx_scheduled_workouts_for
  ON scheduled_workouts (scheduled_for);
`);

// ------------------------------------------------------------------
// Backfill des exercices built-in (depuis frontend/src/data/exo.json)
// ------------------------------------------------------------------

const EXO_JSON_PATH = resolve(
  import.meta.dir,
  "..",
  "..",
  "..",
  "frontend",
  "src",
  "data",
  "exo.json"
);

if (existsSync(EXO_JSON_PATH)) {
  try {
    const file = Bun.file(EXO_JSON_PATH);
    const data = JSON.parse(await file.text());
    const insert = db.query(`
      INSERT OR IGNORE INTO exercises
        (id, source, group_name, name, type, equipment, muscles_json, video, created_at)
      VALUES (?, 'builtin', ?, ?, ?, ?, ?, ?, ?)
    `);
    const now = new Date().toISOString();
    let inserted = 0;
    for (const [group, exos] of Object.entries(data)) {
      for (const exo of exos) {
        const res = insert.run(
          exo.id,
          group,
          exo.name,
          exo.type,
          exo.equipment ?? null,
          JSON.stringify(exo.muscles ?? []),
          exo.video ?? "",
          now
        );
        if (res.changes > 0) inserted += 1;
      }
    }
    if (inserted > 0) {
      console.log(`[db] backfilled ${inserted} builtin exercises from exo.json`);
    }
  } catch (err) {
    console.error("[db] builtin backfill failed:", err);
  }
}

console.log(`[db] sqlite ready at ${DB_FILE}`);
