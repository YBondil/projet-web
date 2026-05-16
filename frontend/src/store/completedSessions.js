import { createSignal } from "solid-js";
import {
  apiListCompletedSessions,
  apiCreateCompletedSession,
  apiDeleteCompletedSession,
} from "../api/completed-sessions.js";

const STORAGE_KEY = "completed-sessions";

function loadLocal() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocal(items) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {}
}

const [completedSessions, setCompletedSessions] = createSignal(loadLocal());
const [completedApiStatus, setCompletedApiStatus] = createSignal("loading");

export { completedSessions, completedApiStatus };

export async function refreshCompletedSessions() {
  setCompletedApiStatus("loading");
  try {
    const remote = await apiListCompletedSessions();
    setCompletedSessions(remote);
    saveLocal(remote);
    setCompletedApiStatus("online");
  } catch {
    setCompletedSessions(loadLocal());
    setCompletedApiStatus("offline");
  }
}

refreshCompletedSessions();

export async function saveCompletedSession({
  session,
  feedbacks,
  durationSeconds,
}) {
  const localEntry = {
    id: `c-${Date.now().toString(36)}-${Math.random()
      .toString(36)
      .slice(2, 6)}`,
    finishedAt: new Date().toISOString(),
    durationSeconds: Math.max(0, Math.floor(durationSeconds ?? 0)),
    musculaire: session?.musculaire ?? null,
    objectif: session?.objectif ?? null,
    session,
    feedbacks: feedbacks ?? {},
  };

  const optimistic = [localEntry, ...completedSessions()];
  setCompletedSessions(optimistic);
  saveLocal(optimistic);

  try {
    const remote = await apiCreateCompletedSession({
      session,
      feedbacks,
      durationSeconds,
    });
    const next = completedSessions().map((e) =>
      e.id === localEntry.id ? remote : e
    );
    setCompletedSessions(next);
    saveLocal(next);
    setCompletedApiStatus("online");
    return remote;
  } catch {
    setCompletedApiStatus("offline");
    return localEntry;
  }
}

export async function deleteCompletedSession(id) {
  const next = completedSessions().filter((e) => e.id !== id);
  setCompletedSessions(next);
  saveLocal(next);

  try {
    await apiDeleteCompletedSession(id);
    setCompletedApiStatus("online");
  } catch {
    setCompletedApiStatus("offline");
  }
}

export function getCompletedSessionById(id) {
  return completedSessions().find((e) => e.id === id) ?? null;
}
