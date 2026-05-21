import { API_URL } from "./base.js";
const TIMEOUT_MS = 3000;

async function apiFetch(path, options = {}) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    return await fetch(`${API_URL}${path}`, {
      ...options,
      signal: ctrl.signal,
      headers: {
        "Content-Type": "application/json",
        ...(options.headers ?? {}),
      },
    });
  } finally {
    clearTimeout(timer);
  }
}

export async function apiListCompletedSessions() {
  const res = await apiFetch("/api/completed-sessions");
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function apiCreateCompletedSession({
  session,
  feedbacks,
  durationSeconds,
}) {
  const res = await apiFetch("/api/completed-sessions", {
    method: "POST",
    body: JSON.stringify({ session, feedbacks, durationSeconds }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function apiDeleteCompletedSession(id) {
  const res = await apiFetch(`/api/completed-sessions/${id}`, {
    method: "DELETE",
  });
  if (!res.ok && res.status !== 404) throw new Error(`HTTP ${res.status}`);
  return res.ok;
}
