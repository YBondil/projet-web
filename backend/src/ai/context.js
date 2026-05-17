// Construit un contexte JSON compact à injecter dans le prompt système.
// Source : completed_sessions sur les 30 derniers jours + exercices actifs/masqués.
// Objectif : maximiser l'info utile par token (free tier sensible).

import { db } from "../storage/db.js";
import { listActiveHidden } from "../storage/exercises.js";

const SELECT_RECENT_COMPLETED = db.query(
  `SELECT id, finished_at, duration_seconds, musculaire, objectif,
          session_json, feedbacks_json
   FROM completed_sessions
   WHERE finished_at >= ?
   ORDER BY finished_at DESC
   LIMIT 60`
);

function safeParse(text, fallback) {
  try {
    return text == null ? fallback : JSON.parse(text);
  } catch {
    return fallback;
  }
}

function parseNum(v) {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : null;
}

export function buildUserContext({ daysBack = 30, nowIso = new Date().toISOString() } = {}) {
  const since = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000).toISOString();
  const rows = SELECT_RECENT_COMPLETED.all(since);

  let totalSessions = 0;
  let totalMinutes = 0;
  const sessionsByGroup = {};
  // { exoId: { name, points: [{date, charge, reps, difficulte}] } }
  const exoStats = {};

  for (const r of rows) {
    totalSessions += 1;
    totalMinutes += Math.floor((r.duration_seconds ?? 0) / 60);
    const g = r.musculaire ?? "autre";
    sessionsByGroup[g] = (sessionsByGroup[g] ?? 0) + 1;

    const session = safeParse(r.session_json, null);
    const feedbacks = safeParse(r.feedbacks_json, {});
    if (!session?.exercises) continue;
    for (const exo of session.exercises) {
      const fb = feedbacks[exo.id];
      if (!fb) continue;
      if (!exoStats[exo.id]) {
        exoStats[exo.id] = {
          id: exo.id,
          name: exo.name,
          group: g,
          points: [],
        };
      }
      exoStats[exo.id].points.push({
        date: r.finished_at,
        charge: parseNum(fb.charge),
        reps: parseNum(fb.reps),
        difficulte: fb.difficulte ?? null,
      });
    }
  }

  // Pour chaque exercice, on garde : PR, dernière charge, tendance, ratio difficile/facile
  const exos = Object.values(exoStats).map((e) => {
    const points = e.points;
    let pr = null;
    let last = null;
    let hardCount = 0;
    let easyCount = 0;
    for (const p of points) {
      if (p.charge !== null && (pr === null || p.charge > pr)) pr = p.charge;
      if (p.difficulte === "difficile" || p.difficulte === "tres-difficile")
        hardCount += 1;
      if (p.difficulte === "facile") easyCount += 1;
      if (!last || new Date(p.date) > new Date(last.date)) last = p;
    }
    return {
      id: e.id,
      name: e.name,
      group: e.group,
      sessions: points.length,
      pr,
      lastCharge: last?.charge ?? null,
      lastReps: last?.reps ?? null,
      lastDifficulte: last?.difficulte ?? null,
      hardCount,
      easyCount,
    };
  });

  exos.sort((a, b) => b.sessions - a.sessions);

  const hidden = listActiveHidden(nowIso).map((row) => ({
    id: row.id,
    name: row.name,
    hiddenUntil: row.hidden_until,
  }));

  return {
    windowDays: daysBack,
    generatedAt: nowIso,
    summary: {
      totalSessions,
      totalMinutes,
      sessionsByGroup,
    },
    exercises: exos,
    hiddenExercises: hidden,
  };
}

// Cache mémoire 60 s par fenêtre pour limiter les rebuilds dans une même
// conversation (3-4 tours = 1 seul build).
const cache = new Map();

export function getUserContextCached(opts = {}) {
  const key = JSON.stringify(opts);
  const now = Date.now();
  const cached = cache.get(key);
  if (cached && now - cached.t < 60_000) return cached.v;
  const v = buildUserContext(opts);
  cache.set(key, { v, t: now });
  return v;
}
