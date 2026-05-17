import { describe, test, expect, beforeAll, beforeEach } from "bun:test";
import { resolve } from "node:path";
import { BACKEND_DIR, DB_MODULE_PATH } from "../helpers/backend.js";

const STORAGE_PATH = resolve(
  BACKEND_DIR,
  "src",
  "storage",
  "agent-actions.js"
);

let storage;
let db;

beforeAll(async () => {
  const dbMod = await import(DB_MODULE_PATH);
  storage = await import(STORAGE_PATH);
  db = dbMod.db;
});

beforeEach(() => {
  db.exec("DELETE FROM agent_actions");
});

describe("storage/agent-actions.js — schéma", () => {
  test("la table agent_actions a les bonnes colonnes", () => {
    const cols = db.query("PRAGMA table_info(agent_actions)").all();
    const names = cols.map((c) => c.name).sort();
    expect(names).toEqual(
      [
        "id",
        "created_at",
        "action_type",
        "exercise_id",
        "params_json",
        "previous_value_json",
        "justification",
        "reversed_at",
      ].sort()
    );
  });
});

describe("logAction", () => {
  test("crée un id et un createdAt, sérialise params + previousValue", () => {
    const { id, createdAt } = storage.logAction({
      actionType: "hide_exercise",
      exerciseId: "bench",
      params: { reintroduceAfterDays: 7 },
      previousValue: { hiddenUntil: null },
      justification: "Douleur à l'épaule",
    });
    expect(id).toMatch(/^a-/);
    expect(new Date(createdAt).toString()).not.toBe("Invalid Date");

    const fetched = storage.getAction(id);
    expect(fetched.actionType).toBe("hide_exercise");
    expect(fetched.exerciseId).toBe("bench");
    expect(fetched.params).toEqual({ reintroduceAfterDays: 7 });
    expect(fetched.previousValue).toEqual({ hiddenUntil: null });
    expect(fetched.justification).toBe("Douleur à l'épaule");
    expect(fetched.reversedAt).toBeNull();
  });

  test("getAction retourne null pour un id inconnu", () => {
    expect(storage.getAction("inexistant")).toBeNull();
  });
});

describe("listActions", () => {
  test("ordre chronologique décroissant (plus récent d'abord)", async () => {
    storage.logAction({
      actionType: "adjust_exercise_load",
      params: {},
      justification: "ancien",
    });
    await Bun.sleep(5);
    storage.logAction({
      actionType: "schedule_workout",
      params: {},
      justification: "récent",
    });
    const list = storage.listActions();
    expect(list[0].justification).toBe("récent");
    expect(list[1].justification).toBe("ancien");
  });
});

describe("markReversed", () => {
  test("renseigne reversed_at", () => {
    const { id } = storage.logAction({
      actionType: "hide_exercise",
      params: {},
      justification: "test",
    });
    expect(storage.markReversed(id)).toBe(true);
    expect(storage.getAction(id).reversedAt).not.toBeNull();
  });

  test("retourne false si l'id est inconnu", () => {
    expect(storage.markReversed("inexistant")).toBe(false);
  });
});
