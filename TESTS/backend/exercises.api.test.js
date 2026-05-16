import { describe, test, expect, beforeAll, beforeEach } from "bun:test";
import { SERVER_PATH, DB_MODULE_PATH } from "../helpers/backend.js";

let server;
let db;

beforeAll(async () => {
  const dbMod = await import(DB_MODULE_PATH);
  db = dbMod.db;
  const mod = await import(SERVER_PATH);
  server = mod.default;
});

beforeEach(() => {
  db.exec("DELETE FROM exercises");
});

function call(method, path, body, headers = {}) {
  const init = { method, headers: { ...headers } };
  if (body !== undefined) {
    init.body = JSON.stringify(body);
    init.headers["Content-Type"] = "application/json";
  }
  return server.fetch(new Request(`http://localhost${path}`, init));
}

function sampleBody(overrides = {}) {
  const { exercise: exerciseOverrides, ...rest } = overrides;
  return {
    group: "pectoraux",
    exercise: {
      name: "Pompes serrées",
      type: "force",
      equipment: "poids du corps",
      muscles: ["triceps", "pectoraux"],
      video: "https://example.com/v.mp4",
      ...(exerciseOverrides ?? {}),
    },
    ...rest,
  };
}

describe("GET /api/exercises", () => {
  test("renvoie [] quand aucun exo n'est enregistré", async () => {
    const res = await call("GET", "/api/exercises");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([]);
  });

  test("renvoie tous les exos créés, avec leur group", async () => {
    await call("POST", "/api/exercises", sampleBody({ group: "pectoraux" }));
    await call("POST", "/api/exercises", sampleBody({ group: "dos" }));
    const list = await (await call("GET", "/api/exercises")).json();
    expect(list.length).toBe(2);
    expect(list.map((e) => e.group).sort()).toEqual(["dos", "pectoraux"]);
  });

  test("chaque entrée contient id, group, name, type, equipment, muscles, video, createdAt", async () => {
    await call("POST", "/api/exercises", sampleBody());
    const [exo] = await (await call("GET", "/api/exercises")).json();
    for (const k of [
      "id",
      "group",
      "name",
      "type",
      "equipment",
      "muscles",
      "video",
      "createdAt",
    ]) {
      expect(exo).toHaveProperty(k);
    }
  });
});

describe("POST /api/exercises", () => {
  test("201 + exercice renvoyé avec id généré (e-...)", async () => {
    const res = await call("POST", "/api/exercises", sampleBody());
    expect(res.status).toBe(201);
    const exo = await res.json();
    expect(exo.id).toMatch(/^e-/);
    expect(exo.name).toBe("Pompes serrées");
    expect(exo.muscles).toEqual(["triceps", "pectoraux"]);
  });

  test("400 si group manquant ou vide", async () => {
    const res1 = await call("POST", "/api/exercises", {
      exercise: sampleBody().exercise,
    });
    expect(res1.status).toBe(400);
    expect((await res1.json()).error).toBe("missing_group");

    const res2 = await call("POST", "/api/exercises", {
      group: "  ",
      exercise: sampleBody().exercise,
    });
    expect(res2.status).toBe(400);
  });

  test("400 si exercise manquant", async () => {
    const res = await call("POST", "/api/exercises", { group: "dos" });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("missing_exercise");
  });

  test("400 si exercise.name vide", async () => {
    const res = await call(
      "POST",
      "/api/exercises",
      sampleBody({ exercise: { name: "  " } })
    );
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("invalid_exercise_name");
  });

  test("400 si exercise.type vide", async () => {
    const res = await call(
      "POST",
      "/api/exercises",
      sampleBody({ exercise: { type: "" } })
    );
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("invalid_exercise_type");
  });

  test("400 si exercise.muscles vide ou pas un tableau", async () => {
    const res1 = await call(
      "POST",
      "/api/exercises",
      sampleBody({ exercise: { muscles: [] } })
    );
    expect(res1.status).toBe(400);
    expect((await res1.json()).error).toBe("invalid_exercise_muscles");

    const res2 = await call(
      "POST",
      "/api/exercises",
      sampleBody({ exercise: { muscles: "triceps" } })
    );
    expect(res2.status).toBe(400);
  });

  test("400 si le body n'est pas du JSON valide", async () => {
    const res = await server.fetch(
      new Request("http://localhost/api/exercises", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{not-json",
      })
    );
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("invalid_json");
  });

  test("équipement vide accepté (devient chaîne vide en sortie)", async () => {
    const res = await call(
      "POST",
      "/api/exercises",
      sampleBody({ exercise: { equipment: "" } })
    );
    expect(res.status).toBe(201);
    const exo = await res.json();
    expect(exo.equipment).toBe("");
  });
});

describe("GET /api/exercises/:id", () => {
  test("200 + détail si l'exo existe", async () => {
    const created = await (await call("POST", "/api/exercises", sampleBody())).json();
    const res = await call("GET", `/api/exercises/${created.id}`);
    expect(res.status).toBe(200);
    const fetched = await res.json();
    expect(fetched.id).toBe(created.id);
    expect(fetched.name).toBe("Pompes serrées");
  });

  test("404 si l'id n'existe pas", async () => {
    const res = await call("GET", "/api/exercises/inexistant-xyz");
    expect(res.status).toBe(404);
    expect((await res.json()).error).toBe("not_found");
  });
});

describe("DELETE /api/exercises/:id", () => {
  test("204 et corps vide quand la suppression réussit", async () => {
    const created = await (await call("POST", "/api/exercises", sampleBody())).json();
    const res = await call("DELETE", `/api/exercises/${created.id}`);
    expect(res.status).toBe(204);
    expect(await res.text()).toBe("");
  });

  test("404 si l'id n'existe pas", async () => {
    const res = await call("DELETE", "/api/exercises/inexistant-xyz");
    expect(res.status).toBe(404);
  });

  test("après DELETE, GET /:id renvoie 404", async () => {
    const created = await (await call("POST", "/api/exercises", sampleBody())).json();
    await call("DELETE", `/api/exercises/${created.id}`);
    expect((await call("GET", `/api/exercises/${created.id}`)).status).toBe(404);
  });
});

describe("CORS sur /api/exercises", () => {
  test("preflight OPTIONS retourne 204 avec Access-Control-Allow-Origin reflété", async () => {
    const res = await server.fetch(
      new Request("http://localhost/api/exercises", {
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
  });
});
