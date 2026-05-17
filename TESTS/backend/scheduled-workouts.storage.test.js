import { describe, test, expect, beforeAll, beforeEach } from "bun:test";
import { resolve } from "node:path";
import { BACKEND_DIR, DB_MODULE_PATH } from "../helpers/backend.js";

const STORAGE_PATH = resolve(
  BACKEND_DIR,
  "src",
  "storage",
  "scheduled-workouts.js"
);

let storage;
let db;

beforeAll(async () => {
  const dbMod = await import(DB_MODULE_PATH);
  storage = await import(STORAGE_PATH);
  db = dbMod.db;
});

beforeEach(() => {
  db.exec("DELETE FROM scheduled_workouts");
});

function sampleSession(overrides = {}) {
  return {
    musculaire: "dos",
    objectif: "force",
    exercises: [{ id: "tractions", name: "Tractions", series: 4, reps: "6-8" }],
    ...overrides,
  };
}

describe("storage/scheduled-workouts.js — schéma", () => {
  test("la table scheduled_workouts a les bonnes colonnes", () => {
    const cols = db.query("PRAGMA table_info(scheduled_workouts)").all();
    const names = cols.map((c) => c.name).sort();
    expect(names).toEqual(
      [
        "id",
        "scheduled_for",
        "created_at",
        "created_by",
        "musculaire",
        "objectif",
        "session_json",
        "justification",
        "done_at",
      ].sort()
    );
  });
});

describe("createScheduledWorkout", () => {
  test("crée une entrée avec id, scheduledFor ISO et copie de la session", () => {
    const e = storage.createScheduledWorkout({
      scheduledFor: "2026-06-01T10:00:00.000Z",
      session: sampleSession(),
      justification: "Récupération bras travaillés hier",
    });
    expect(e.id).toMatch(/^sw-/);
    expect(e.scheduledFor).toBe("2026-06-01T10:00:00.000Z");
    expect(e.musculaire).toBe("dos");
    expect(e.session.exercises[0].id).toBe("tractions");
    expect(e.justification).toBe("Récupération bras travaillés hier");
    expect(e.doneAt).toBeNull();
  });

  test("createdBy par défaut = 'agent'", () => {
    const e = storage.createScheduledWorkout({
      scheduledFor: "2026-06-01T10:00:00.000Z",
      session: sampleSession(),
    });
    expect(e.createdBy).toBe("agent");
  });
});

describe("listScheduled / listUpcoming", () => {
  test("tri par scheduled_for ascendant", () => {
    storage.createScheduledWorkout({
      scheduledFor: "2026-06-10T10:00:00.000Z",
      session: sampleSession({ musculaire: "B" }),
    });
    storage.createScheduledWorkout({
      scheduledFor: "2026-06-05T10:00:00.000Z",
      session: sampleSession({ musculaire: "A" }),
    });
    const list = storage.listScheduled();
    expect(list.map((e) => e.musculaire)).toEqual(["A", "B"]);
  });

  test("listUpcoming filtre les séances déjà passées", () => {
    storage.createScheduledWorkout({
      scheduledFor: "2020-01-01T00:00:00.000Z",
      session: sampleSession({ musculaire: "passé" }),
    });
    storage.createScheduledWorkout({
      scheduledFor: "2099-01-01T00:00:00.000Z",
      session: sampleSession({ musculaire: "futur" }),
    });
    const upcoming = storage.listUpcoming();
    expect(upcoming.length).toBe(1);
    expect(upcoming[0].musculaire).toBe("futur");
  });
});

describe("getScheduledWorkout / deleteScheduledWorkout / markScheduledDone", () => {
  test("getScheduledWorkout retourne null pour un id inconnu", () => {
    expect(storage.getScheduledWorkout("inexistant")).toBeNull();
  });

  test("deleteScheduledWorkout supprime effectivement", () => {
    const e = storage.createScheduledWorkout({
      scheduledFor: "2026-06-01T10:00:00.000Z",
      session: sampleSession(),
    });
    expect(storage.deleteScheduledWorkout(e.id)).toBe(true);
    expect(storage.getScheduledWorkout(e.id)).toBeNull();
  });

  test("markScheduledDone renseigne done_at", () => {
    const e = storage.createScheduledWorkout({
      scheduledFor: "2026-06-01T10:00:00.000Z",
      session: sampleSession(),
    });
    expect(storage.markScheduledDone(e.id)).toBe(true);
    expect(storage.getScheduledWorkout(e.id).doneAt).not.toBeNull();
  });
});
