import { existsSync, renameSync, rmSync } from "node:fs";
import { resolve } from "node:path";

export const BACKEND_DIR = resolve(import.meta.dir, "..", "..", "backend");
export const DB_DIR = resolve(BACKEND_DIR, "data");
const DB_FILES = [
  "soma.db",
  "soma.db-wal",
  "soma.db-shm",
  "soma.db-journal",
];
const BAK_SUFFIX = ".test-backup";

export function cleanDbFiles() {
  for (const f of DB_FILES) {
    const p = resolve(DB_DIR, f);
    if (existsSync(p)) rmSync(p);
  }
}

export function backupDbFiles() {
  for (const f of DB_FILES) {
    const p = resolve(DB_DIR, f);
    if (!existsSync(p)) continue;
    if (existsSync(p + BAK_SUFFIX)) {
      rmSync(p);
    } else {
      renameSync(p, p + BAK_SUFFIX);
    }
  }
}

export function restoreDbFiles() {
  const hasBackup = DB_FILES.some((f) =>
    existsSync(resolve(DB_DIR, f) + BAK_SUFFIX)
  );
  if (!hasBackup) return;

  cleanDbFiles();
  for (const f of DB_FILES) {
    const p = resolve(DB_DIR, f);
    if (existsSync(p + BAK_SUFFIX)) renameSync(p + BAK_SUFFIX, p);
  }
}

export function sampleSession(overrides = {}) {
  return {
    musculaire: "dos",
    objectif: "force",
    duree: 60,
    dureeEstimee: 55,
    equipement: ["salle de musculation"],
    params: { series: 5, reps: "4-6", repos: 180, secondesParSerie: 20 },
    exercises: [
      {
        id: "tractions",
        name: "Tractions",
        type: "force",
        muscles: ["grand dorsal"],
        equipment: "salle de musculation",
        series: 5,
        reps: "4-6",
        repos: 180,
        dureeTotale: 14,
      },
    ],
    ...overrides,
  };
}

export const SERVER_PATH = resolve(BACKEND_DIR, "src", "server.js");
export const STORAGE_PATH = resolve(BACKEND_DIR, "src", "storage", "sessions.js");
export const DB_MODULE_PATH = resolve(BACKEND_DIR, "src", "storage", "db.js");
