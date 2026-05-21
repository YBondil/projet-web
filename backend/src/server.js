import { Hono } from "hono";
import { cors } from "hono/cors";
import { health } from "./routes/health.js";
import { sessions } from "./routes/sessions.js";
import { exercises } from "./routes/exercises.js";
import { completedSessions } from "./routes/completed-sessions.js";
import { chat } from "./routes/chat.js";

const PORT = 3000;

const app = new Hono();

app.use(
  "/api/*",
  cors({
    origin: (origin) => origin ?? "*",
    allowMethods: ["GET", "POST", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type"],
  }),
);

app.route("/api/health", health);
app.route("/api/sessions", sessions);
app.route("/api/exercises", exercises);
app.route("/api/completed-sessions", completedSessions);
app.route("/api/chat", chat);

app.notFound((c) => c.json({ error: "not_found" }, 404));

app.onError((err, c) => {
  console.error("[server] unhandled error:", err);
  return c.json({ error: "internal_error", message: err.message }, 500);
});

console.log(`[server] SOMA API listening on http://localhost:${PORT}`);

export default {
  port: PORT,
  host: "0.0.0.0",
  fetch: app.fetch,
};
