import { Hono } from "hono";
import {
  listSessions,
  getSession,
  createSession,
  deleteSession,
} from "../storage/sessions.js";

export const sessions = new Hono();

sessions.get("/", (c) => {
  return c.json(listSessions());
});

sessions.post("/", async (c) => {
  let body;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "invalid_json" }, 400);
  }

  const session = body?.session;
  if (!session || typeof session !== "object") {
    return c.json({ error: "missing_session" }, 400);
  }
  if (!Array.isArray(session.exercises) || session.exercises.length === 0) {
    return c.json({ error: "invalid_session_exercises" }, 400);
  }

  const entry = createSession({ name: body?.name, session });
  return c.json(entry, 201);
});

sessions.get("/:id", (c) => {
  const entry = getSession(c.req.param("id"));
  if (!entry) return c.json({ error: "not_found" }, 404);
  return c.json(entry);
});

sessions.delete("/:id", (c) => {
  const ok = deleteSession(c.req.param("id"));
  if (!ok) return c.json({ error: "not_found" }, 404);
  return c.body(null, 204);
});
