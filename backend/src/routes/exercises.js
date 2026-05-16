import { Hono } from "hono";
import {
  listExercises,
  getExercise,
  createExercise,
  deleteExercise,
} from "../storage/exercises.js";

export const exercises = new Hono();

exercises.get("/", (c) => c.json(listExercises()));

exercises.post("/", async (c) => {
  let body;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "invalid_json" }, 400);
  }

  const group = body?.group;
  const exercise = body?.exercise;

  if (typeof group !== "string" || !group.trim()) {
    return c.json({ error: "missing_group" }, 400);
  }
  if (!exercise || typeof exercise !== "object") {
    return c.json({ error: "missing_exercise" }, 400);
  }
  if (typeof exercise.name !== "string" || !exercise.name.trim()) {
    return c.json({ error: "invalid_exercise_name" }, 400);
  }
  if (typeof exercise.type !== "string" || !exercise.type.trim()) {
    return c.json({ error: "invalid_exercise_type" }, 400);
  }
  if (!Array.isArray(exercise.muscles) || exercise.muscles.length === 0) {
    return c.json({ error: "invalid_exercise_muscles" }, 400);
  }

  const created = createExercise({ group: group.trim(), exercise });
  return c.json(created, 201);
});

exercises.get("/:id", (c) => {
  const exo = getExercise(c.req.param("id"));
  if (!exo) return c.json({ error: "not_found" }, 404);
  return c.json(exo);
});

exercises.delete("/:id", (c) => {
  const ok = deleteExercise(c.req.param("id"));
  if (!ok) return c.json({ error: "not_found" }, 404);
  return c.body(null, 204);
});
