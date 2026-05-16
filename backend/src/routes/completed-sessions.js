import { Hono } from "hono";
import {
  listCompletedSessions,
  getCompletedSession,
  createCompletedSession,
  deleteCompletedSession,
} from "../storage/completed-sessions.js";

export const completedSessions = new Hono();

completedSessions.get("/", (c) => c.json(listCompletedSessions()));

completedSessions.post("/", async (c) => {
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

  const feedbacks =
    body?.feedbacks && typeof body.feedbacks === "object" ? body.feedbacks : {};
  const durationSeconds =
    typeof body?.durationSeconds === "number" ? body.durationSeconds : 0;

  const entry = createCompletedSession({ session, feedbacks, durationSeconds });
  return c.json(entry, 201);
});

completedSessions.get("/:id", (c) => {
  const entry = getCompletedSession(c.req.param("id"));
  if (!entry) return c.json({ error: "not_found" }, 404);
  return c.json(entry);
});

completedSessions.delete("/:id", (c) => {
  const ok = deleteCompletedSession(c.req.param("id"));
  if (!ok) return c.json({ error: "not_found" }, 404);
  return c.body(null, 204);
});
