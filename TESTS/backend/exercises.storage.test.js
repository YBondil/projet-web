import { describe, test, expect, beforeAll, beforeEach } from "bun:test";
import { resolve } from "node:path";
import { BACKEND_DIR, DB_MODULE_PATH } from "../helpers/backend.js";

const EXERCISES_STORAGE_PATH = resolve(
  BACKEND_DIR,
  "src",
  "storage",
  "exercises.js"
);

let storage;
let db;

beforeAll(async () => {
  const dbMod = await import(DB_MODULE_PATH);
  storage = await import(EXERCISES_STORAGE_PATH);
  db = dbMod.db;
});

beforeEach(() => {
  db.exec("DELETE FROM exercises");
});

function sampleExo(overrides = {}) {
  return {
    id: undefined,
    name: "Pompes diamant",
    type: "force",
    equipment: "poids du corps",
    muscles: ["triceps", "pectoraux (chef sternal)"],
    video: "https://example.com/v.mp4",
    ...overrides,
  };
}

describe("storage/exercises.js — schéma", () => {
  test("la table exercises existe avec les bonnes colonnes", () => {
    const cols = db.query("PRAGMA table_info(exercises)").all();
    const names = cols.map((c) => c.name).sort();
    expect(names).toEqual(
      [
        "id",
        "source",
        "group_name",
        "name",
        "type",
        "equipment",
        "muscles_json",
        "video",
        "target_load_kg",
        "target_sets",
        "target_reps",
        "hidden_until",
        "created_at",
      ].sort()
    );
  });

  test("l'index idx_exercises_group existe", () => {
    const idx = db
      .query(
        "SELECT name FROM sqlite_master WHERE type = 'index' AND tbl_name = 'exercises'"
      )
      .all()
      .map((r) => r.name);
    expect(idx).toContain("idx_exercises_group");
  });
});

describe("createExercise", () => {
  test("renvoie un exo complet avec id, group, name, type, muscles, video, createdAt", () => {
    const created = storage.createExercise({
      group: "pectoraux",
      exercise: sampleExo(),
    });
    expect(created.id).toMatch(/^e-/);
    expect(created.group).toBe("pectoraux");
    expect(created.name).toBe("Pompes diamant");
    expect(created.type).toBe("force");
    expect(created.equipment).toBe("poids du corps");
    expect(created.muscles).toEqual(["triceps", "pectoraux (chef sternal)"]);
    expect(created.video).toBe("https://example.com/v.mp4");
    expect(new Date(created.createdAt).toString()).not.toBe("Invalid Date");
  });

  test("respecte un id fourni explicitement par l'appelant", () => {
    const created = storage.createExercise({
      group: "dos",
      exercise: sampleExo({ id: "mon-exo-custom-1" }),
    });
    expect(created.id).toBe("mon-exo-custom-1");
  });

  test("génère des ids distincts pour deux exos consécutifs sans id explicite", () => {
    const a = storage.createExercise({ group: "dos", exercise: sampleExo() });
    const b = storage.createExercise({ group: "dos", exercise: sampleExo() });
    expect(a.id).not.toBe(b.id);
  });

  test("persiste la liste des muscles en JSON désérialisable", () => {
    const muscles = ["grand dorsal", "rhomboïdes", "trapèze"];
    storage.createExercise({
      group: "dos",
      exercise: sampleExo({ muscles }),
    });
    const row = db.query("SELECT * FROM exercises").get();
    expect(JSON.parse(row.muscles_json)).toEqual(muscles);
  });

  test("équipement vide / absent stocké en NULL", () => {
    const created = storage.createExercise({
      group: "jambes",
      exercise: sampleExo({ equipment: "" }),
    });
    expect(created.equipment).toBe("");
    const row = db.query("SELECT equipment FROM exercises").get();
    expect(row.equipment).toBeNull();
  });

  test("video vide acceptée, retournée comme chaîne vide", () => {
    const created = storage.createExercise({
      group: "bras",
      exercise: sampleExo({ video: "" }),
    });
    expect(created.video).toBe("");
  });
});

describe("listExercises", () => {
  test("retourne [] quand la table est vide", () => {
    expect(storage.listExercises()).toEqual([]);
  });

  test("retourne tous les exercices créés, dans l'ordre createdAt ASC", async () => {
    storage.createExercise({
      group: "pectoraux",
      exercise: sampleExo({ name: "A" }),
    });
    await Bun.sleep(5);
    storage.createExercise({
      group: "dos",
      exercise: sampleExo({ name: "B" }),
    });
    await Bun.sleep(5);
    storage.createExercise({
      group: "jambes",
      exercise: sampleExo({ name: "C" }),
    });
    const names = storage.listExercises().map((e) => e.name);
    expect(names).toEqual(["A", "B", "C"]);
  });

  test("renvoie le bon group_name pour chaque exo", () => {
    storage.createExercise({
      group: "pectoraux",
      exercise: sampleExo({ name: "pecs-exo" }),
    });
    storage.createExercise({
      group: "dos",
      exercise: sampleExo({ name: "dos-exo" }),
    });
    const all = storage.listExercises();
    expect(all.find((e) => e.name === "pecs-exo").group).toBe("pectoraux");
    expect(all.find((e) => e.name === "dos-exo").group).toBe("dos");
  });
});

describe("getExercise", () => {
  test("retourne null si l'id n'existe pas", () => {
    expect(storage.getExercise("inexistant-xyz")).toBeNull();
  });

  test("retourne l'exo créé", () => {
    const created = storage.createExercise({
      group: "abdominaux",
      exercise: sampleExo({ name: "Gainage latéral" }),
    });
    const fetched = storage.getExercise(created.id);
    expect(fetched).not.toBeNull();
    expect(fetched.name).toBe("Gainage latéral");
    expect(fetched.group).toBe("abdominaux");
  });
});

describe("deleteExercise", () => {
  test("retourne false si l'id n'existe pas", () => {
    expect(storage.deleteExercise("inexistant-xyz")).toBe(false);
  });

  test("retourne true et supprime effectivement", () => {
    const created = storage.createExercise({
      group: "dos",
      exercise: sampleExo(),
    });
    expect(storage.deleteExercise(created.id)).toBe(true);
    expect(storage.getExercise(created.id)).toBeNull();
    expect(storage.listExercises()).toEqual([]);
  });

  test("ne supprime que l'id ciblé", () => {
    const a = storage.createExercise({
      group: "pectoraux",
      exercise: sampleExo({ name: "A" }),
    });
    const b = storage.createExercise({
      group: "dos",
      exercise: sampleExo({ name: "B" }),
    });
    storage.deleteExercise(a.id);
    expect(storage.getExercise(a.id)).toBeNull();
    expect(storage.getExercise(b.id)).not.toBeNull();
  });
});
