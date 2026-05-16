import { createSignal } from "solid-js";
import builtIn from "../data/exo.json";
import {
  apiListExercises,
  apiCreateExercise,
} from "../api/exercises.js";

const STORAGE_KEY = "user-exercises";

function loadLocal() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveLocal(byGroup) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(byGroup));
  } catch {}
}

function arrayToByGroup(arr) {
  const out = {};
  for (const exo of arr) {
    const g = exo.group;
    if (!g) continue;
    const { group: _drop, createdAt: _drop2, ...inner } = exo;
    if (!out[g]) out[g] = [];
    out[g].push(inner);
  }
  return out;
}

function merge(custom) {
  const out = {};
  for (const group of Object.keys(builtIn)) {
    out[group] = [...builtIn[group], ...(custom[group] ?? [])];
  }
  for (const group of Object.keys(custom)) {
    if (!out[group]) out[group] = [...custom[group]];
  }
  return out;
}

const [customExercises, setCustomExercises] = createSignal(loadLocal());
const [exercisesApiStatus, setExercisesApiStatus] = createSignal("loading");

export const allExercises = () => merge(customExercises());
export { exercisesApiStatus };

export async function refreshExercises() {
  setExercisesApiStatus("loading");
  try {
    const remote = await apiListExercises();
    const byGroup = arrayToByGroup(remote);
    setCustomExercises(byGroup);
    saveLocal(byGroup);
    setExercisesApiStatus("online");
  } catch {
    setCustomExercises(loadLocal());
    setExercisesApiStatus("offline");
  }
}

refreshExercises();

export async function addExercise(group, exo) {
  const optimistic = { ...customExercises() };
  optimistic[group] = [...(optimistic[group] ?? []), exo];
  setCustomExercises(optimistic);
  saveLocal(optimistic);

  try {
    const remote = await apiCreateExercise({ group, exercise: exo });
    const remoteInner = {
      id: remote.id,
      name: remote.name,
      type: remote.type,
      equipment: remote.equipment,
      muscles: remote.muscles,
      video: remote.video,
    };
    const next = { ...customExercises() };
    next[group] = (next[group] ?? []).map((e) =>
      e.id === exo.id ? remoteInner : e
    );
    setCustomExercises(next);
    saveLocal(next);
    setExercisesApiStatus("online");
    return remoteInner;
  } catch {
    setExercisesApiStatus("offline");
    return exo;
  }
}
