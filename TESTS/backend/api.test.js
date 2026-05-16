import { describe, test, expect, beforeAll, beforeEach } from "bun:test";
import { sampleSession, SERVER_PATH, DB_MODULE_PATH } from "../helpers/backend.js";

let server;
let db;

beforeAll(async () => {
  const dbMod = await import(DB_MODULE_PATH);
  db = dbMod.db;
  const mod = await import(SERVER_PATH);
  server = mod.default;
});

beforeEach(() => {
  db.exec("DELETE FROM sessions");
});

function call(method, path, body, headers = {}) {
  const init = { method, headers: { ...headers } };
  if (body !== undefined) {
    init.body = JSON.stringify(body);
    init.headers["Content-Type"] = "application/json";
  }
  return server.fetch(new Request(`http://localhost${path}`, init));
}

describe("GET /api/health", () => {
  test("retourne 200 avec status, service, version et time ISO", async () => {
    const res = await call("GET", "/api/health");
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.status).toBe("ok");
    expect(data.service).toBe("soma-backend");
    expect(typeof data.version).toBe("string");
    expect(new Date(data.time).toString()).not.toBe("Invalid Date");
  });
});

describe("Route inconnue", () => {
  test("renvoie 404 avec un body JSON {error}", async () => {
    const res = await call("GET", "/api/inexistant");
    expect(res.status).toBe(404);
    const data = await res.json();
    expect(data.error).toBe("not_found");
  });
});

describe("GET /api/sessions", () => {
  test("renvoie [] quand aucune séance n'est enregistrée", async () => {
    const res = await call("GET", "/api/sessions");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([]);
  });

  test("renvoie toutes les séances enregistrées", async () => {
    await call("POST", "/api/sessions", {
      name: "A",
      session: sampleSession(),
    });
    await call("POST", "/api/sessions", {
      name: "B",
      session: sampleSession(),
    });
    const res = await call("GET", "/api/sessions");
    const data = await res.json();
    expect(data.length).toBe(2);
  });

  test("renvoie les séances dans l'ordre chronologique inverse (plus récent d'abord)", async () => {
    await call("POST", "/api/sessions", {
      name: "Plus ancien",
      session: sampleSession(),
    });
    await Bun.sleep(5);
    await call("POST", "/api/sessions", {
      name: "Plus récent",
      session: sampleSession(),
    });
    const data = await (await call("GET", "/api/sessions")).json();
    expect(data[0].name).toBe("Plus récent");
    expect(data[1].name).toBe("Plus ancien");
  });
});

describe("POST /api/sessions", () => {
  test("201 + entrée renvoyée avec id généré, name, createdAt et session", async () => {
    const res = await call("POST", "/api/sessions", {
      name: "Dos lourd",
      session: sampleSession(),
    });
    expect(res.status).toBe(201);
    const entry = await res.json();
    expect(entry.id).toMatch(/^s-/);
    expect(entry.name).toBe("Dos lourd");
    expect(new Date(entry.createdAt).toString()).not.toBe("Invalid Date");
    expect(entry.session.musculaire).toBe("dos");
  });

  test("nom par défaut '<musculaire> - <objectif>' si pas fourni", async () => {
    const res = await call("POST", "/api/sessions", {
      session: sampleSession({ musculaire: "jambes", objectif: "endurance" }),
    });
    const entry = await res.json();
    expect(entry.name).toBe("jambes - endurance");
  });

  test("400 si pas de session dans le body", async () => {
    const res = await call("POST", "/api/sessions", { name: "x" });
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("missing_session");
  });

  test("400 si session sans exercises", async () => {
    const res = await call("POST", "/api/sessions", {
      session: { musculaire: "dos" },
    });
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("invalid_session_exercises");
  });

  test("400 si la liste d'exercises est vide", async () => {
    const res = await call("POST", "/api/sessions", {
      session: { musculaire: "dos", exercises: [] },
    });
    expect(res.status).toBe(400);
  });

  test("400 si le body n'est pas du JSON valide", async () => {
    const res = await server.fetch(
      new Request("http://localhost/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "ceci-n-est-pas-du-json",
      })
    );
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("invalid_json");
  });
});

describe("GET /api/sessions/:id", () => {
  test("200 + détail si la séance existe", async () => {
    const created = await (
      await call("POST", "/api/sessions", { session: sampleSession() })
    ).json();
    const res = await call("GET", `/api/sessions/${created.id}`);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.id).toBe(created.id);
    expect(data.session.exercises.length).toBeGreaterThan(0);
  });

  test("404 si l'id n'existe pas", async () => {
    const res = await call("GET", "/api/sessions/inexistant-xyz");
    expect(res.status).toBe(404);
    const data = await res.json();
    expect(data.error).toBe("not_found");
  });
});

describe("DELETE /api/sessions/:id", () => {
  test("204 et corps vide quand la suppression réussit", async () => {
    const created = await (
      await call("POST", "/api/sessions", { session: sampleSession() })
    ).json();
    const res = await call("DELETE", `/api/sessions/${created.id}`);
    expect(res.status).toBe(204);
    const text = await res.text();
    expect(text).toBe("");
  });

  test("404 si l'id n'existe pas", async () => {
    const res = await call("DELETE", "/api/sessions/inexistant-xyz");
    expect(res.status).toBe(404);
  });

  test("après DELETE, GET /:id renvoie 404 et la liste ne contient plus l'entrée", async () => {
    const created = await (
      await call("POST", "/api/sessions", { session: sampleSession() })
    ).json();
    await call("DELETE", `/api/sessions/${created.id}`);
    expect((await call("GET", `/api/sessions/${created.id}`)).status).toBe(404);
    const list = await (await call("GET", "/api/sessions")).json();
    expect(list.length).toBe(0);
  });

  test("ne supprime que l'id ciblé", async () => {
    const a = await (
      await call("POST", "/api/sessions", { name: "A", session: sampleSession() })
    ).json();
    const b = await (
      await call("POST", "/api/sessions", { name: "B", session: sampleSession() })
    ).json();
    await call("DELETE", `/api/sessions/${a.id}`);
    expect((await call("GET", `/api/sessions/${b.id}`)).status).toBe(200);
  });
});

describe("CORS", () => {
  test("preflight OPTIONS retourne 204 avec Access-Control-Allow-Origin reflété", async () => {
    const res = await server.fetch(
      new Request("http://localhost/api/sessions", {
        method: "OPTIONS",
        headers: {
          Origin: "http://localhost:5173",
          "Access-Control-Request-Method": "POST",
          "Access-Control-Request-Headers": "Content-Type",
        },
      })
    );
    expect(res.status).toBe(204);
    expect(res.headers.get("access-control-allow-origin")).toBe(
      "http://localhost:5173"
    );
    const allowMethods = res.headers.get("access-control-allow-methods") ?? "";
    for (const m of ["GET", "POST", "DELETE", "OPTIONS"]) {
      expect(allowMethods).toContain(m);
    }
  });

  test("réponse POST cross-origin contient Access-Control-Allow-Origin reflété", async () => {
    const res = await call(
      "POST",
      "/api/sessions",
      { session: sampleSession() },
      { Origin: "http://localhost:5173" }
    );
    expect(res.status).toBe(201);
    expect(res.headers.get("access-control-allow-origin")).toBe(
      "http://localhost:5173"
    );
  });
});

describe("Persistance bout-en-bout", () => {
  test("plusieurs POST + GET liste : tout est cohérent et renvoyable individuellement", async () => {
    const ids = [];
    for (let i = 0; i < 5; i++) {
      const entry = await (
        await call("POST", "/api/sessions", {
          name: `Session ${i}`,
          session: sampleSession(),
        })
      ).json();
      ids.push(entry.id);
    }
    const list = await (await call("GET", "/api/sessions")).json();
    expect(list.length).toBe(5);
    for (const id of ids) {
      const res = await call("GET", `/api/sessions/${id}`);
      expect(res.status).toBe(200);
    }
  });
});
