import { describe, test, expect, beforeAll, beforeEach } from "bun:test";
import { sampleSession, STORAGE_PATH, DB_MODULE_PATH } from "../helpers/backend.js";

let storage;
let db;

beforeAll(async () => {
  const dbMod = await import(DB_MODULE_PATH);
  storage = await import(STORAGE_PATH);
  db = dbMod.db;
});

beforeEach(() => {
  db.exec("DELETE FROM sessions");
});

describe("storage/sessions.js — schéma & init", () => {
  test("la table sessions existe avec les bonnes colonnes", () => {
    const cols = db.query("PRAGMA table_info(sessions)").all();
    const names = cols.map((c) => c.name).sort();
    expect(names).toEqual(
      [
        "id",
        "name",
        "created_at",
        "musculaire",
        "objectif",
        "duree",
        "duree_estimee",
        "session_json",
      ].sort()
    );
  });

  test("l'index idx_sessions_created_at existe", () => {
    const idx = db
      .query(
        "SELECT name FROM sqlite_master WHERE type = 'index' AND tbl_name = 'sessions'"
      )
      .all()
      .map((r) => r.name);
    expect(idx).toContain("idx_sessions_created_at");
  });
});

describe("createSession", () => {
  test("retourne une entrée avec id, name, createdAt et session", () => {
    const entry = storage.createSession({ session: sampleSession() });
    expect(entry.id).toMatch(/^s-/);
    expect(typeof entry.name).toBe("string");
    expect(new Date(entry.createdAt).toString()).not.toBe("Invalid Date");
    expect(entry.session).toEqual(sampleSession());
  });

  test("génère un nom par défaut '<musculaire> - <objectif>' si pas fourni", () => {
    const entry = storage.createSession({
      session: sampleSession({ musculaire: "jambes", objectif: "endurance" }),
    });
    expect(entry.name).toBe("jambes - endurance");
  });

  test("garde le nom fourni s'il n'est pas vide", () => {
    const entry = storage.createSession({
      name: "  Push lundi  ",
      session: sampleSession(),
    });
    expect(entry.name).toBe("Push lundi");
  });

  test("retombe sur le nom par défaut si la chaîne fournie est vide / blanche", () => {
    const entry = storage.createSession({
      name: "   ",
      session: sampleSession({ musculaire: "bras", objectif: "force" }),
    });
    expect(entry.name).toBe("bras - force");
  });

  test("persiste les colonnes structurées (musculaire, objectif, duree, duree_estimee)", () => {
    storage.createSession({
      session: sampleSession({
        musculaire: "pectoraux",
        objectif: "prise de muscle",
        duree: 90,
        dureeEstimee: 82,
      }),
    });
    const row = db.query("SELECT * FROM sessions").get();
    expect(row.musculaire).toBe("pectoraux");
    expect(row.objectif).toBe("prise de muscle");
    expect(row.duree).toBe(90);
    expect(row.duree_estimee).toBe(82);
  });

  test("génère des ids distincts pour deux créations successives", () => {
    const e1 = storage.createSession({ session: sampleSession() });
    const e2 = storage.createSession({ session: sampleSession() });
    expect(e1.id).not.toBe(e2.id);
  });
});

describe("listSessions", () => {
  test("retourne [] quand la table est vide", () => {
    expect(storage.listSessions()).toEqual([]);
  });

  test("retourne toutes les sessions enregistrées", () => {
    storage.createSession({ name: "A", session: sampleSession() });
    storage.createSession({ name: "B", session: sampleSession() });
    storage.createSession({ name: "C", session: sampleSession() });
    expect(storage.listSessions().length).toBe(3);
  });

  test("trie par created_at décroissant (plus récent d'abord)", async () => {
    storage.createSession({ name: "A", session: sampleSession() });
    await Bun.sleep(5);
    storage.createSession({ name: "B", session: sampleSession() });
    await Bun.sleep(5);
    storage.createSession({ name: "C", session: sampleSession() });
    const names = storage.listSessions().map((e) => e.name);
    expect(names[0]).toBe("C");
    expect(names[names.length - 1]).toBe("A");
  });

  test("désérialise correctement le payload session", () => {
    const session = sampleSession();
    storage.createSession({ session });
    const [entry] = storage.listSessions();
    expect(entry.session.exercises.length).toBe(session.exercises.length);
    expect(entry.session.exercises[0].id).toBe(session.exercises[0].id);
  });
});

describe("getSession", () => {
  test("retourne null si l'id n'existe pas", () => {
    expect(storage.getSession("inexistant-xyz")).toBeNull();
  });

  test("retourne l'entrée correspondant à l'id", () => {
    const created = storage.createSession({
      name: "Test",
      session: sampleSession(),
    });
    const fetched = storage.getSession(created.id);
    expect(fetched).not.toBeNull();
    expect(fetched.id).toBe(created.id);
    expect(fetched.name).toBe("Test");
  });
});

describe("deleteSession", () => {
  test("retourne false si l'id n'existe pas", () => {
    expect(storage.deleteSession("inexistant-xyz")).toBe(false);
  });

  test("retourne true et supprime effectivement", () => {
    const created = storage.createSession({ session: sampleSession() });
    expect(storage.deleteSession(created.id)).toBe(true);
    expect(storage.getSession(created.id)).toBeNull();
    expect(storage.listSessions()).toEqual([]);
  });

  test("ne supprime que l'id ciblé", () => {
    const a = storage.createSession({ name: "A", session: sampleSession() });
    const b = storage.createSession({ name: "B", session: sampleSession() });
    storage.deleteSession(a.id);
    expect(storage.getSession(a.id)).toBeNull();
    expect(storage.getSession(b.id)).not.toBeNull();
  });
});
