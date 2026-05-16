import { createSignal } from "solid-js";
import {
  apiListSessions,
  apiCreateSession,
  apiDeleteSession,
} from "../api/sessions.js";

const STORAGE_KEY = "saved-sessions";

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

const [savedSessions, setSavedSessions] = createSignal(loadLocal());
const [apiStatus, setApiStatus] = createSignal("loading");

export { savedSessions, apiStatus };

export async function refreshSavedSessions() {
  setApiStatus("loading");
  try {
    const remote = await apiListSessions();
    setSavedSessions(remote);
    saveLocal(remote);
    setApiStatus("online");
  } catch {
    setSavedSessions(loadLocal());
    setApiStatus("offline");
  }
}

refreshSavedSessions();

export async function saveSession(session, name) {
  const localEntry = {
    id: `s-${Date.now().toString(36)}-${Math.random()
      .toString(36)
      .slice(2, 6)}`,
    name:
      (name && name.trim()) ||
      `${session.musculaire} - ${session.objectif}`,
    createdAt: new Date().toISOString(),
    session,
  };

  const optimistic = [localEntry, ...savedSessions()];
  setSavedSessions(optimistic);
  saveLocal(optimistic);

  try {
    const remote = await apiCreateSession({
      name: localEntry.name,
      session,
    });
    const next = savedSessions().map((s) =>
      s.id === localEntry.id ? remote : s
    );
    setSavedSessions(next);
    saveLocal(next);
    setApiStatus("online");
    return remote;
  } catch {
    setApiStatus("offline");
    return localEntry;
  }
}

export async function deleteSavedSession(id) {
  const previous = savedSessions();
  const next = previous.filter((s) => s.id !== id);
  setSavedSessions(next);
  saveLocal(next);

  try {
    await apiDeleteSession(id);
    setApiStatus("online");
  } catch {
    setApiStatus("offline");
  }
}
