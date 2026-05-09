import { createSignal } from "solid-js";
import builtIn from "../data/exo.json";

const STORAGE_KEY = "user-exercises";

function loadCustom() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
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

const [customExercises, setCustomExercises] = createSignal(loadCustom());

export const allExercises = () => merge(customExercises());

export function addExercise(group, exo) {
  const next = { ...customExercises() };
  next[group] = [...(next[group] ?? []), exo];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  setCustomExercises(next);
}
