import { describe, test, expect, beforeAll, beforeEach } from "bun:test";
import {
  SERVER_PATH,
  DB_MODULE_PATH,
  sampleSession,
} from "../helpers/backend.js";

let server;
let db;

beforeAll(async () => {
  const dbMod = await import(DB_MODULE_PATH);
  db = dbMod.db;
  const mod = await import(SERVER_PATH);
  server = mod.default;
});

beforeEach(() => {
  db.exec("DELETE FROM completed_sessions");
});

function call(method, path, body, headers = {}) {
  const init = { method, headers: { ...headers } };
  if (body !== undefined) {
    init.body = JSON.stringify(body);
    init.headers["Content-Type"] = "application/json";
  }
  return server.fetch(new Request(`http://localhost${path}`, init));
}

function fullBody(overrides = {}) {
  return {
    session: sampleSession(),
    feedbacks: {
      tractions: { charge: "30", reps: "5", difficulte: "moyen" },
    },
    durationSeconds: 1850,
    ...overrides,
  };
}

describe("GET /api/completed-sessions", () => {
  test("renvoie [] quand aucune séance terminée", async () => {
    const res = await call("GET", "/api/completed-sessions");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([]);
  });

  test("renvoie les séances terminées dans l'ordre chronologique inverse", async () => {
    await call(
      "POST",
      "/api/completed-sessions",
      fullBody({ session: sampleSession({ musculaire: "Plus ancien" }) })
    );
    await Bun.sleep(5);
    await call(
      "POST",
      "/api/completed-sessions",
      fullBody({ session: sampleSession({ musculaire: "Plus récent" }) })
    );
    const list = await (await call("GET", "/api/completed-sessions")).json();
    expect(list.length).toBe(2);
    expect(list[0].musculaire).toBe("Plus récent");
    expect(list[1].musculaire).toBe("Plus ancien");
  });
});

describe("POST /api/completed-sessions", () => {
  test("201 + payload (id, finishedAt, durationSeconds, session, feedbacks)", async () => {
    const res = await call("POST", "/api/completed-sessions", fullBody());
    expect(res.status).toBe(201);
    const entry = await res.json();
    expect(entry.id).toMatch(/^c-/);
    expect(new Date(entry.finishedAt).toString()).not.toBe("Invalid Date");
    expect(entry.durationSeconds).toBe(1850);
    expect(entry.session.musculaire).toBe("dos");
    expect(entry.feedbacks.tractions.charge).toBe("30");
  });

  test("400 si session manquant (missing_session)", async () => {
    const res = await call("POST", "/api/completed-sessions", {
      feedbacks: {},
      durationSeconds: 100,
    });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("missing_session");
  });

  test("400 si exercises manquant ou vide (invalid_session_exercises)", async () => {
    const res1 = await call("POST", "/api/completed-sessions", {
      session: { musculaire: "dos" },
      feedbacks: {},
      durationSeconds: 100,
    });
    expect(res1.status).toBe(400);
    expect((await res1.json()).error).toBe("invalid_session_exercises");

    const res2 = await call("POST", "/api/completed-sessions", {
      session: { musculaire: "dos", exercises: [] },
      feedbacks: {},
      durationSeconds: 100,
    });
    expect(res2.status).toBe(400);
  });

  test("400 si JSON invalide", async () => {
    const res = await server.fetch(
      new Request("http://localhost/api/completed-sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{nope",
      })
    );
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("invalid_json");
  });

  test("feedbacks absent → stocké comme {}", async () => {
    const res = await call("POST", "/api/completed-sessions", {
      session: sampleSession(),
      durationSeconds: 60,
    });
    expect(res.status).toBe(201);
    const entry = await res.json();
    expect(entry.feedbacks).toEqual({});
  });

  test("durationSeconds non numérique → stocké comme 0", async () => {
    const res = await call("POST", "/api/completed-sessions", {
      session: sampleSession(),
      feedbacks: {},
      durationSeconds: "not-a-number",
    });
    expect(res.status).toBe(201);
    const entry = await res.json();
    expect(entry.durationSeconds).toBe(0);
  });
});

describe("GET /api/completed-sessions/:id", () => {
  test("200 + détail si trouvé", async () => {
    const created = await (
      await call("POST", "/api/completed-sessions", fullBody())
    ).json();
    const res = await call("GET", `/api/completed-sessions/${created.id}`);
    expect(res.status).toBe(200);
    const fetched = await res.json();
    expect(fetched.id).toBe(created.id);
    expect(fetched.feedbacks.tractions.reps).toBe("5");
  });

  test("404 si l'id n'existe pas", async () => {
    const res = await call(
      "GET",
      "/api/completed-sessions/inexistant-xyz"
    );
    expect(res.status).toBe(404);
    expect((await res.json()).error).toBe("not_found");
  });
});

describe("DELETE /api/completed-sessions/:id", () => {
  test("204 et corps vide quand la suppression réussit", async () => {
    const created = await (
      await call("POST", "/api/completed-sessions", fullBody())
    ).json();
    const res = await call("DELETE", `/api/completed-sessions/${created.id}`);
    expect(res.status).toBe(204);
    expect(await res.text()).toBe("");
  });

  test("404 si l'id n'existe pas", async () => {
    const res = await call(
      "DELETE",
      "/api/completed-sessions/inexistant-xyz"
    );
    expect(res.status).toBe(404);
  });

  test("après DELETE, GET /:id renvoie 404 et la liste ne contient plus l'entrée", async () => {
    const created = await (
      await call("POST", "/api/completed-sessions", fullBody())
    ).json();
    await call("DELETE", `/api/completed-sessions/${created.id}`);
    expect(
      (await call("GET", `/api/completed-sessions/${created.id}`)).status
    ).toBe(404);
    const list = await (await call("GET", "/api/completed-sessions")).json();
    expect(list.length).toBe(0);
  });
});
