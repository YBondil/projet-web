import { For, Show, createMemo } from "solid-js";
import { useNavigate } from "@solidjs/router";
import {
  completedSessions,
  completedApiStatus,
  refreshCompletedSessions,
  deleteCompletedSession,
} from "../store/completedSessions.js";

function formatDate(iso) {
  try {
    return new Date(iso).toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "";
  }
}

function formatDuration(seconds) {
  const total = Math.max(0, Math.floor(seconds ?? 0));
  const m = Math.floor(total / 60);
  const s = total % 60;
  if (m === 0) return `${s}s`;
  if (s === 0) return `${m}min`;
  return `${m}min ${s.toString().padStart(2, "0")}`;
}

function parseCharge(v) {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : null;
}

function parseReps(v) {
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : null;
}

function aggregateByExercise(allCompleted) {
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

function recordsFor(aggregates) {
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
      charge: best.charge,
      reps: best.reps,
      date: best.date,
    });
  }
  return out.sort((a, b) => b.charge - a.charge);
}

function MiniChart(props) {
  const W = 220;
  const H = 56;
  const PAD = 4;
  const values = () =>
    props.points.map((p) => p[props.metric]).filter((v) => v !== null);
  const polyline = () => {
    const vs = values();
    if (vs.length < 2) return "";
    const min = Math.min(...vs);
    const max = Math.max(...vs);
    const range = max - min || 1;
    const stepX = (W - 2 * PAD) / (vs.length - 1);
    return vs
      .map((v, i) => {
        const x = PAD + i * stepX;
        const y = PAD + (H - 2 * PAD) * (1 - (v - min) / range);
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(" ");
  };
  const dots = () => {
    const vs = values();
    if (vs.length < 2) return [];
    const min = Math.min(...vs);
    const max = Math.max(...vs);
    const range = max - min || 1;
    const stepX = (W - 2 * PAD) / (vs.length - 1);
    return vs.map((v, i) => ({
      x: PAD + i * stepX,
      y: PAD + (H - 2 * PAD) * (1 - (v - min) / range),
    }));
  };

  return (
    <Show when={values().length >= 2}>
      <svg
        class="progress-chart"
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        role="img"
        aria-label="Évolution"
      >
        <polyline class="progress-chart-line" points={polyline()} />
        <For each={dots()}>
          {(d) => <circle class="progress-chart-dot" cx={d.x} cy={d.y} r="2.8" />}
        </For>
      </svg>
    </Show>
  );
}

export default function Progress() {
  const navigate = useNavigate();

  const aggregates = createMemo(() => aggregateByExercise(completedSessions()));
  const records = createMemo(() => recordsFor(aggregates()));
  const evolutions = createMemo(() =>
    aggregates().filter((a) => a.points.length >= 2)
  );

  const totalSessions = () => completedSessions().length;
  const totalExos = createMemo(() => {
    let sum = 0;
    for (const s of completedSessions())
      sum += s.session?.exercises?.length ?? 0;
    return sum;
  });
  const totalMinutes = createMemo(() => {
    let sum = 0;
    for (const s of completedSessions()) sum += s.durationSeconds ?? 0;
    return Math.floor(sum / 60);
  });

  const handleDelete = (entry) => {
    if (
      confirm(
        `Supprimer la séance du ${formatDate(entry.finishedAt)} ? Cette action est irréversible.`
      )
    ) {
      deleteCompletedSession(entry.id);
    }
  };

  return (
    <main class="progress">
      <header class="exercises-header">
        <button class="btn-back" onClick={() => navigate("/")}>
          ← Retour
        </button>
        <h2>Mon suivi</h2>
      </header>

      <div class="api-status-bar">
        <Show
          when={completedApiStatus() === "online"}
          fallback={
            <Show
              when={completedApiStatus() === "offline"}
              fallback={
                <span class="api-status api-status-loading">
                  <span class="api-status-dot" aria-hidden="true" />
                  Connexion au serveur…
                </span>
              }
            >
              <span class="api-status api-status-ko">
                <span class="api-status-dot" aria-hidden="true" />
                Hors ligne — mode local
              </span>
              <button
                class="api-status-retry"
                type="button"
                onClick={() => refreshCompletedSessions()}
              >
                Réessayer
              </button>
            </Show>
          }
        >
          <span class="api-status api-status-ok">
            <span class="api-status-dot" aria-hidden="true" />
            Synchronisé avec le serveur
          </span>
        </Show>
      </div>

      <Show
        when={totalSessions() > 0}
        fallback={
          <>
            <div class="progress-empty">
              <span class="progress-empty-icon">📊</span>
              <p class="progress-empty-title">Aucune séance terminée</p>
              <p class="progress-empty-sub">
                Termine une séance pour voir ton historique, tes records et ton
                évolution apparaître ici.
              </p>
            </div>
            <button
              class="btn-secondary"
              onClick={() => navigate("/selection")}
            >
              Faire une séance maintenant
            </button>
          </>
        }
      >
        <section class="progress-summary">
          <div class="progress-stat">
            <span class="progress-stat-value">{totalSessions()}</span>
            <span class="progress-stat-label">Séances</span>
          </div>
          <div class="progress-stat">
            <span class="progress-stat-value">{totalExos()}</span>
            <span class="progress-stat-label">Exercices</span>
          </div>
          <div class="progress-stat">
            <span class="progress-stat-value">{totalMinutes()}</span>
            <span class="progress-stat-label">Minutes</span>
          </div>
        </section>

        <Show when={records().length > 0}>
          <section class="progress-section">
            <h3 class="progress-section-title">🏆 Records personnels</h3>
            <ul class="progress-records">
              <For each={records()}>
                {(r) => (
                  <li class="progress-record">
                    <span class="progress-record-name">{r.name}</span>
                    <span class="progress-record-meta">
                      <strong>{r.charge} kg</strong>
                      <Show when={r.reps !== null}>
                        {" "}
                        × {r.reps} reps
                      </Show>
                      <span class="progress-record-date">
                        {formatDate(r.date)}
                      </span>
                    </span>
                  </li>
                )}
              </For>
            </ul>
          </section>
        </Show>

        <Show when={evolutions().length > 0}>
          <section class="progress-section">
            <h3 class="progress-section-title">📈 Évolution par exercice</h3>
            <ul class="progress-evolutions">
              <For each={evolutions()}>
                {(agg) => (
                  <li class="progress-evolution">
                    <div class="progress-evolution-head">
                      <span class="progress-evolution-name">{agg.name}</span>
                      <span class="progress-evolution-count">
                        {agg.points.length} séances
                      </span>
                    </div>
                    <MiniChart points={agg.points} metric="charge" />
                    <div class="progress-evolution-foot">
                      <span>
                        Début : <strong>{agg.points[0].charge ?? "—"} kg</strong>
                      </span>
                      <span>
                        Dernier :{" "}
                        <strong>
                          {agg.points[agg.points.length - 1].charge ?? "—"} kg
                        </strong>
                      </span>
                    </div>
                  </li>
                )}
              </For>
            </ul>
          </section>
        </Show>

        <section class="progress-section">
          <h3 class="progress-section-title">📅 Séances passées</h3>
          <ul class="completed-list">
            <For each={completedSessions()}>
              {(entry) => (
                <li class="completed-item">
                  <div class="completed-item-head">
                    <span class="completed-item-name">
                      {entry.musculaire ?? "?"} — {entry.objectif ?? "?"}
                    </span>
                    <span class="completed-item-date">
                      {formatDate(entry.finishedAt)}
                    </span>
                  </div>
                  <p class="completed-item-meta">
                    <span>
                      {entry.session?.exercises?.length ?? 0} exos
                    </span>
                    <span>·</span>
                    <span>{formatDuration(entry.durationSeconds)}</span>
                    <Show
                      when={Object.keys(entry.feedbacks ?? {}).length > 0}
                    >
                      <span>·</span>
                      <span>
                        {Object.keys(entry.feedbacks).length} feedback(s)
                      </span>
                    </Show>
                  </p>
                  <div class="completed-item-actions">
                    <button
                      class="btn-secondary"
                      onClick={() => navigate(`/past-training/${entry.id}`)}
                    >
                      Voir le détail
                    </button>
                    <button
                      class="btn-secondary saved-delete"
                      onClick={() => handleDelete(entry)}
                    >
                      Supprimer
                    </button>
                  </div>
                </li>
              )}
            </For>
          </ul>
        </section>
      </Show>
    </main>
  );
}
