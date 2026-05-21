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

export async function apiListExercises() {
  const res = await apiFetch("/api/exercises");
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function apiCreateExercise({ group, exercise }) {
  const res = await apiFetch("/api/exercises", {
    method: "POST",
    body: JSON.stringify({ group, exercise }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function apiDeleteExercise(id) {
  const res = await apiFetch(`/api/exercises/${id}`, { method: "DELETE" });
  if (!res.ok && res.status !== 404) throw new Error(`HTTP ${res.status}`);
  return res.ok;
}
