function parseCharge(v) {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : null;
}

function parseReps(v) {
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : null;
}

export function findGroupForExo(exoId, allExos, fallback) {
  if (!allExos) return fallback ?? null;
  for (const [group, exos] of Object.entries(allExos)) {
    if (exos.some((e) => e.id === exoId)) return group;
  }
  return fallback ?? null;
}

export function aggregateByExercise(allCompleted, allExos) {
  const byExo = {};
  for (const entry of allCompleted) {
    const session = entry.session;
    if (!session?.exercises) continue;
    for (const exo of session.exercises) {
      const fb = entry.feedbacks?.[exo.id];
      if (!fb) continue;
      const charge = parseCharge(fb.charge);
      const reps = parseReps(fb.reps);
      if (charge === null && reps === null) continue;

      if (!byExo[exo.id]) {
        byExo[exo.id] = {
          id: exo.id,
          name: exo.name,
          group: findGroupForExo(exo.id, allExos, entry.musculaire),
          muscles: exo.muscles ?? [],
          points: [],
        };
      }
      byExo[exo.id].points.push({
        date: entry.finishedAt,
        sessionId: entry.id,
        charge,
        reps,
        difficulte: fb.difficulte ?? null,
      });
    }
  }
  for (const e of Object.values(byExo)) {
    e.points.sort((a, b) => new Date(a.date) - new Date(b.date));
  }
  return Object.values(byExo);
}

export function recordsFor(aggregates) {
  const out = [];
  for (const agg of aggregates) {
    let best = null;
    for (const p of agg.points) {
      if (p.charge === null) continue;
      if (best === null || p.charge > best.charge) best = p;
    }
    if (best === null) continue;
    out.push({
      id: agg.id,
      name: agg.name,
      group: agg.group,
      charge: best.charge,
      reps: best.reps,
      date: best.date,
    });
  }
  return out.sort((a, b) => b.charge - a.charge);
}

export function recordsByGroup(aggregates) {
  const byGroup = {};
  for (const r of recordsFor(aggregates)) {
    const g = r.group ?? "autre";
    if (!byGroup[g]) byGroup[g] = [];
    byGroup[g].push(r);
  }
  return byGroup;
}

export function groupStats(aggregates, allCompleted) {
  const stats = {};
  function ensure(g) {
    if (!stats[g]) {
      stats[g] = {
        group: g,
        sessionCount: 0,
        exercises: [],
        lastDate: null,
        topCharge: 0,
      };
    }
    return stats[g];
  }

  for (const agg of aggregates) {
    const g = agg.group ?? "autre";
    const bucket = ensure(g);
    const lastPoint = agg.points[agg.points.length - 1];
    let pr = 0;
    for (const p of agg.points) {
      if (p.charge !== null && p.charge > pr) pr = p.charge;
    }
    bucket.exercises.push({
      id: agg.id,
      name: agg.name,
      lastDate: lastPoint?.date ?? null,
      pr,
      points: agg.points,
    });
    if (pr > bucket.topCharge) bucket.topCharge = pr;
    if (
      lastPoint &&
      (!bucket.lastDate ||
        new Date(lastPoint.date) > new Date(bucket.lastDate))
    ) {
      bucket.lastDate = lastPoint.date;
    }
  }

  for (const entry of allCompleted) {
    const g = entry.musculaire ?? "autre";
    ensure(g).sessionCount += 1;
  }

  for (const bucket of Object.values(stats)) {
    bucket.exercises.sort((a, b) => b.pr - a.pr);
  }

  return stats;
}

export function statsByExercise(aggregates, exoId) {
  const agg = aggregates.find((a) => a.id === exoId);
  if (!agg) return null;
  let pr = null;
  let totalReps = 0;
  let lastPoint = null;
  for (const p of agg.points) {
    if (p.charge !== null && (pr === null || p.charge > pr.charge)) pr = p;
    if (p.reps !== null) totalReps += p.reps;
    lastPoint = p;
  }
  return {
    ...agg,
    pr,
    lastPoint,
    sessionCount: agg.points.length,
    totalReps,
  };
}
