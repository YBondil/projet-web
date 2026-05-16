import { Hono } from "hono";

export const health = new Hono();

health.get("/", (c) =>
  c.json({
    status: "ok",
    service: "soma-backend",
    version: "0.1.0",
    time: new Date().toISOString(),
  })
);
