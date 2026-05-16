import { describe, test, expect, beforeAll, beforeEach } from "bun:test";
import { resolve } from "node:path";
import { BACKEND_DIR, DB_MODULE_PATH, sampleSession } from "../helpers/backend.js";

const STORAGE_PATH = resolve(
  BACKEND_DIR,
  "src",
  "storage",
  "completed-sessions.js"
);

let storage;
let db;

beforeAll(async () => {
  const dbMod = await import(DB_MODULE_PATH);
  storage = await import(STORAGE_PATH);
  db = dbMod.db;
});

beforeEach(() => {
  db.exec("DELETE FROM completed_sessions");
});

function makeFeedbacks() {
  return {
    tractions: { charge: "20", reps: "8", difficulte: "moyen" },
  };
}

describe("storage/completed-sessions.js — schéma", () => {
  test("la table completed_sessions a les bonnes colonnes", () => {
    const cols = db.query("PRAGMA table_info(completed_sessions)").all();
    const names = cols.map((c) => c.name).sort();
    expect(names).toEqual(
      [
        "id",
        "finished_at",
        "duration_seconds",
        "musculaire",
        "objectif",
        "session_json",
        "feedbacks_json",
      ].sort()
    );
  });

  test("l'index idx_completed_sessions_finished_at existe", () => {
    const idx = db
      .query(
        "SELECT name FROM sqlite_master WHERE type = 'index' AND tbl_name = 'completed_sessions'"
      )
      .all()
      .map((r) => r.name);
    expect(idx).toContain("idx_completed_sessions_finished_at");
  });
});

describe("createCompletedSession", () => {
  test("retourne une entrée avec id, finishedAt, durationSeconds, session, feedbacks", () => {
    const entry = storage.createCompletedSession({
      session: sampleSession(),
      feedbacks: makeFeedbacks(),
      durationSeconds: 1800,
    });
    expect(entry.id).toMatch(/^c-/);
    expect(new Date(entry.finishedAt).toString()).not.toBe("Invalid Date");
    expect(entry.durationSeconds).toBe(1800);
    expect(entry.session.musculaire).toBe("dos");
    expect(entry.feedbacks.tractions.charge).toBe("20");
  });

  test("musculaire et objectif extraits du payload pour le filtrage", () => {
    storage.createCompletedSession({
      session: sampleSession({ musculaire: "jambes", objectif: "endurance" }),
      feedbacks: {},
      durationSeconds: 600,
    });
    const row = db.query("SELECT * FROM completed_sessions").get();
    expect(row.musculaire).toBe("jambes");
    expect(row.objectif).toBe("endurance");
  });

  test("durationSeconds invalide / NaN devient 0", () => {
    const a = storage.createCompletedSession({
      session: sampleSession(),
      feedbacks: {},
      durationSeconds: NaN,
    });
    const b = storage.createCompletedSession({
      session: sampleSession(),
      feedbacks: {},
      durationSeconds: undefined,
    });
    expect(a.durationSeconds).toBe(0);
    expect(b.durationSeconds).toBe(0);
  });

  test("feedbacks vide accepté et stocké comme {}", () => {
    const entry = storage.createCompletedSession({
      session: sampleSession(),
      feedbacks: undefined,
      durationSeconds: 100,
    });
    expect(entry.feedbacks).toEqual({});
  });

  test("ids uniques pour deux créations consécutives", () => {
    const a = storage.createCompletedSession({
      session: sampleSession(),
      feedbacks: {},
      durationSeconds: 60,
    });
    const b = storage.createCompletedSession({
      session: sampleSession(),
      feedbacks: {},
      durationSeconds: 60,
    });
    expect(a.id).not.toBe(b.id);
  });
});

describe("listCompletedSessions", () => {
  test("retourne [] quand la table est vide", () => {
    expect(storage.listCompletedSessions()).toEqual([]);
  });

  test("trie par finished_at décroissant (plus récent d'abord)", async () => {
    storage.createCompletedSession({
      session: sampleSession({ musculaire: "A" }),
      feedbacks: {},
      durationSeconds: 60,
    });
    await Bun.sleep(5);
    storage.createCompletedSession({
      session: sampleSession({ musculaire: "B" }),
      feedbacks: {},
      durationSeconds: 60,
    });
    await Bun.sleep(5);
    storage.createCompletedSession({
      session: sampleSession({ musculaire: "C" }),
      feedbacks: {},
      durationSeconds: 60,
    });
    const muscles = storage
      .listCompletedSessions()
      .map((e) => e.musculaire);
    expect(muscles).toEqual(["C", "B", "A"]);
  });

  test("désérialise session et feedbacks correctement", () => {
    storage.createCompletedSession({
      session: sampleSession(),
      feedbacks: makeFeedbacks(),
      durationSeconds: 1200,
    });
    const [entry] = storage.listCompletedSessions();
    expect(entry.session.exercises.length).toBeGreaterThan(0);
    expect(entry.feedbacks.tractions.difficulte).toBe("moyen");
  });
});

describe("getCompletedSession", () => {
  test("retourne null si l'id n'existe pas", () => {
    expect(storage.getCompletedSession("inexistant-xyz")).toBeNull();
  });

  test("retourne l'entrée correspondant à l'id", () => {
    const created = storage.createCompletedSession({
      session: sampleSession(),
      feedbacks: makeFeedbacks(),
      durationSeconds: 900,
    });
    const fetched = storage.getCompletedSession(created.id);
    expect(fetched).not.toBeNull();
    expect(fetched.durationSeconds).toBe(900);
    expect(fetched.feedbacks.tractions.charge).toBe("20");
  });
});

describe("deleteCompletedSession", () => {
  test("retourne false si l'id n'existe pas", () => {
    expect(storage.deleteCompletedSession("inexistant-xyz")).toBe(false);
  });

  test("retourne true et supprime effectivement", () => {
    const created = storage.createCompletedSession({
      session: sampleSession(),
      feedbacks: {},
      durationSeconds: 60,
    });
    expect(storage.deleteCompletedSession(created.id)).toBe(true);
    expect(storage.getCompletedSession(created.id)).toBeNull();
    expect(storage.listCompletedSessions()).toEqual([]);
  });

  test("ne supprime que l'id ciblé", () => {
    const a = storage.createCompletedSession({
      session: sampleSession({ musculaire: "A" }),
      feedbacks: {},
      durationSeconds: 60,
    });
    const b = storage.createCompletedSession({
      session: sampleSession({ musculaire: "B" }),
      feedbacks: {},
      durationSeconds: 60,
    });
    storage.deleteCompletedSession(a.id);
    expect(storage.getCompletedSession(a.id)).toBeNull();
    expect(storage.getCompletedSession(b.id)).not.toBeNull();
  });
});
