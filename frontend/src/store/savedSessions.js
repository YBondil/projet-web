import { createSignal } from "solid-js";

const STORAGE_KEY = "saved-sessions";

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

const [savedSessions, setSavedSessions] = createSignal(load());

export { savedSessions };

export function saveSession(session, name) {
  const entry = {
    id: `s-${Date.now().toString(36)}`,
    name:
      (name && name.trim()) ||
      `${session.musculaire} - ${session.objectif}`,
    createdAt: new Date().toISOString(),
    session,
  };
  const next = [entry, ...savedSessions()];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  setSavedSessions(next);
  return entry;
}

export function deleteSavedSession(id) {
  const next = savedSessions().filter((s) => s.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  setSavedSessions(next);
}
