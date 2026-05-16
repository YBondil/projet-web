import { For, Show, createMemo } from "solid-js";
import { useNavigate, useParams } from "@solidjs/router";
import { completedSessions } from "../store/completedSessions.js";
import { allExercises } from "../store/exercises.js";
import {
  aggregateByExercise,
  groupStats,
} from "../data/progressAggregates.js";

const LABEL = {
  pectoraux: "Pectoraux",
  dos: "Dos",
  jambes: "Jambes",
  épaules: "Épaules",
  bras: "Bras",
  abdominaux: "Abdominaux",
  "full body": "Full Body",
  autre: "Autres",
};

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

function MiniChart(props) {
  const W = 220;
  const H = 56;
  const PAD = 4;
  const values = () =>
    props.points.map((p) => p.charge).filter((v) => v !== null);
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

export default function ProgressMuscle() {
  const navigate = useNavigate();
  const params = useParams();

  const group = () => decodeURIComponent(params.group ?? "");

  const aggregates = createMemo(() =>
    aggregateByExercise(completedSessions(), allExercises())
  );
  const stats = createMemo(() => groupStats(aggregates(), completedSessions()));
  const bucket = createMemo(() => stats()[group()] ?? null);

  return (
    <main class="progress-muscle-page">
      <nav class="progress-breadcrumb" aria-label="Fil d'Ariane">
        <button class="progress-breadcrumb-link" onClick={() => navigate("/progress")}>
          Mon suivi
        </button>
        <span class="progress-breadcrumb-sep" aria-hidden="true">/</span>
        <span class="progress-breadcrumb-current">
          {LABEL[group()] ?? group()}
        </span>
      </nav>

      <header class="exercises-header">
        <button class="btn-back" onClick={() => navigate("/progress")}>
          ← Retour
        </button>
        <h2>{LABEL[group()] ?? group()}</h2>
      </header>

      <Show
        when={bucket() && (bucket().sessionCount > 0 || bucket().exercises.length > 0)}
        fallback={
          <div class="progress-empty">
            <span class="progress-empty-icon">💪</span>
            <p class="progress-empty-title">Aucune séance pour ce groupe</p>
            <p class="progress-empty-sub">
              Termine une séance ciblant ce groupe musculaire pour la voir
              apparaître ici.
            </p>
          </div>
        }
      >
        <section class="progress-summary">
          <div class="progress-stat">
            <span class="progress-stat-value">{bucket().sessionCount}</span>
            <span class="progress-stat-label">Séances</span>
          </div>
          <div class="progress-stat">
            <span class="progress-stat-value">{bucket().exercises.length}</span>
            <span class="progress-stat-label">Exercices</span>
          </div>
          <div class="progress-stat">
            <span class="progress-stat-value">{bucket().topCharge || "—"}</span>
            <span class="progress-stat-label">PR (kg)</span>
          </div>
        </section>

        <Show when={bucket().exercises.length > 0}>
          <section class="progress-section">
            <h3 class="progress-section-title">Exercices travaillés</h3>
            <ul class="progress-exercises-list">
              <For each={bucket().exercises}>
                {(exo) => (
                  <li>
                    <button
                      class="progress-exercise-card"
                      type="button"
                      onClick={() =>
                        navigate(`/progress/exercise/${encodeURIComponent(exo.id)}`)
                      }
                    >
                      <div class="progress-exercise-head">
                        <span class="progress-exercise-name">{exo.name}</span>
                        <span class="progress-exercise-count">
                          {exo.points.length} séance
                          {exo.points.length > 1 ? "s" : ""}
                        </span>
                      </div>
                      <Show when={exo.points.length >= 2}>
                        <MiniChart points={exo.points} />
                      </Show>
                      <div class="progress-exercise-foot">
                        <span>
                          PR <strong>{exo.pr || "—"} kg</strong>
                        </span>
                        <Show when={exo.lastDate}>
                          <span>Dernière : {formatDate(exo.lastDate)}</span>
                        </Show>
                      </div>
                    </button>
                  </li>
                )}
              </For>
            </ul>
          </section>
        </Show>
      </Show>
    </main>
  );
}
