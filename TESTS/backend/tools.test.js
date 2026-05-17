import {
  describe,
  test,
  expect,
  beforeAll,
  beforeEach,
} from "bun:test";
import { resolve } from "node:path";
import { BACKEND_DIR, DB_MODULE_PATH } from "../helpers/backend.js";

const TOOLS_PATH = resolve(BACKEND_DIR, "src", "ai", "tools.js");
const EXERCISES_STORAGE_PATH = resolve(
  BACKEND_DIR,
  "src",
  "storage",
  "exercises.js"
);
const SCHEDULED_STORAGE_PATH = resolve(
  BACKEND_DIR,
  "src",
  "storage",
  "scheduled-workouts.js"
);
const ACTIONS_STORAGE_PATH = resolve(
  BACKEND_DIR,
  "src",
  "storage",
  "agent-actions.js"
);

let tools;
let exos;
let scheduled;
let actions;
let db;

beforeAll(async () => {
  const dbMod = await import(DB_MODULE_PATH);
  db = dbMod.db;
  tools = await import(TOOLS_PATH);
  exos = await import(EXERCISES_STORAGE_PATH);
  scheduled = await import(SCHEDULED_STORAGE_PATH);
  actions = await import(ACTIONS_STORAGE_PATH);
});

beforeEach(() => {
  db.exec("DELETE FROM exercises");
  db.exec("DELETE FROM agent_actions");
  db.exec("DELETE FROM scheduled_workouts");
  // Un exo custom utilisé par tous les tests
  exos.createExercise({
    group: "pectoraux",
    exercise: {
      id: "bench",
      name: "Développé couché",
      type: "force",
      equipment: "salle de musculation",
      muscles: ["pectoraux"],
    },
  });
});

describe("hideExercise", () => {
  test("masque un exo + log + previous_value capturé", () => {
    const res = tools.hideExercise({
      exerciseId: "bench",
      reason: "Douleur épaule droite à l'amplitude max",
      reintroduceAfterDays: 7,
    });
    expect(res.success).toBe(true);
    expect(res.updatedEntity.hiddenUntil).not.toBeNull();
    expect(new Date(res.updatedEntity.hiddenUntil).getTime()).toBeGreaterThan(
      Date.now()
    );

    const log = actions.listActions();
    expect(log.length).toBe(1);
    expect(log[0].actionType).toBe("hide_exercise");
    expect(log[0].previousValue.hiddenUntil).toBeNull();
  });

  test("refuse les arguments invalides (Zod)", () => {
    const res = tools.hideExercise({ exerciseId: "bench" }); // pas de reason ni reintro
    expect(res.success).toBe(false);
    expect(res.message).toMatch(/invalid_args/);
    expect(actions.listActions().length).toBe(0);
  });

  test("refuse un exerciseId inconnu", () => {
    const res = tools.hideExercise({
      exerciseId: "inconnu",
      reason: "test",
      reintroduceAfterDays: 5,
    });
    expect(res.success).toBe(false);
    expect(res.message).toMatch(/exercise_not_found/);
  });
});

describe("reintroduceHiddenExercises", () => {
  test("réactive les exos dont la date de masquage est passée", () => {
    // On force un hidden_until expiré directement en DB
    db.exec(
      `UPDATE exercises SET hidden_until = '2020-01-01T00:00:00.000Z' WHERE id = 'bench'`
    );
    const res = tools.reintroduceHiddenExercises({});
    expect(res.success).toBe(true);
    expect(res.updatedEntity.reactivatedIds).toContain("bench");
    expect(exos.getExercise("bench").hiddenUntil).toBeNull();
  });

  test("retourne success même si rien à réactiver", () => {
    const res = tools.reintroduceHiddenExercises({});
    expect(res.success).toBe(true);
    expect(res.updatedEntity.reactivatedIds).toEqual([]);
  });
});

describe("adjustExerciseLoad", () => {
  test("met à jour target_load_kg + log avec previousValue", () => {
    const res = tools.adjustExerciseLoad({
      exerciseId: "bench",
      newLoadKg: 80,
      justification: "PR stable depuis 3 semaines, on monte de 2.5%",
    });
    expect(res.success).toBe(true);
    expect(res.updatedEntity.targetLoadKg).toBe(80);
    const log = actions.listActions();
    expect(log[0].actionType).toBe("adjust_exercise_load");
    expect(log[0].previousValue.targetLoadKg).toBeNull();
  });

  test("refuse une charge négative", () => {
    const res = tools.adjustExerciseLoad({
      exerciseId: "bench",
      newLoadKg: -10,
      justification: "test",
    });
    expect(res.success).toBe(false);
  });
});

describe("adjustExerciseVolume", () => {
  test("met à jour target_sets / target_reps", () => {
    const res = tools.adjustExerciseVolume({
      exerciseId: "bench",
      newSets: 4,
      newReps: "8-12",
      justification: "Passage en hypertrophie",
    });
    expect(res.success).toBe(true);
    expect(res.updatedEntity.targetSets).toBe(4);
    expect(res.updatedEntity.targetReps).toBe("8-12");
  });

  test("accepte newReps numérique et le coerce en string", () => {
    const res = tools.adjustExerciseVolume({
      exerciseId: "bench",
      newSets: 3,
      newReps: 10,
      justification: "test",
    });
    expect(res.success).toBe(true);
    expect(res.updatedEntity.targetReps).toBe("10");
  });
});

describe("scheduleWorkout", () => {
  test("crée une séance planifiée + log + retour structuré", () => {
    const res = tools.scheduleWorkout({
      date: "2099-12-01T08:00:00.000Z",
      exercises: [{ id: "bench", name: "Développé couché", series: 4, reps: "6-8" }],
      musculaire: "pectoraux",
      objectif: "force",
      justification: "Séance lourde planifiée pour début de cycle",
    });
    expect(res.success).toBe(true);
    expect(res.updatedEntity.id).toMatch(/^sw-/);
    expect(res.updatedEntity.scheduledFor).toBe("2099-12-01T08:00:00.000Z");
    expect(scheduled.listScheduled().length).toBe(1);
    expect(actions.listActions()[0].actionType).toBe("schedule_workout");
  });

  test("refuse une date invalide", () => {
    const res = tools.scheduleWorkout({
      date: "n'importe quoi",
      exercises: [{ id: "bench" }],
      justification: "test",
    });
    expect(res.success).toBe(false);
    expect(res.message).toMatch(/invalid_args/);
  });

  test("refuse une liste d'exercices vide", () => {
    const res = tools.scheduleWorkout({
      date: "2099-12-01T08:00:00.000Z",
      exercises: [],
      justification: "test",
    });
    expect(res.success).toBe(false);
  });
});

describe("runTool — registre", () => {
  test("dispatch par nom", () => {
    const res = tools.runTool("reintroduce_hidden_exercises", {});
    expect(res.success).toBe(true);
  });

  test("nom inconnu → unknown_tool", () => {
    const res = tools.runTool("inexistant", {});
    expect(res.success).toBe(false);
    expect(res.message).toMatch(/unknown_tool/);
  });
});
