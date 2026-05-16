import { Database } from "bun:sqlite";
import { existsSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";

const DB_FILE = resolve(import.meta.dir, "..", "..", "data", "soma.db");

const dir = dirname(DB_FILE);
if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

export const db = new Database(DB_FILE);

db.exec("PRAGMA journal_mode = WAL;");
db.exec("PRAGMA foreign_keys = ON;");

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

console.log(`[db] sqlite ready at ${DB_FILE}`);
