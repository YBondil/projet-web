import { For, Show, createMemo } from "solid-js";
import { useNavigate, useParams } from "@solidjs/router";
import { completedSessions } from "../store/completedSessions.js";
import { allExercises } from "../store/exercises.js";
import {
  aggregateByExercise,
  statsByExercise,
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

const DIFFICULTE_LABEL = {
  facile: "Facile",
  moyen: "Moyen",
  difficile: "Difficile",
  "tres-difficile": "Très difficile",
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

function BigChart(props) {
  const W = 320;
  const H = 140;
  const PAD = 14;

  const values = () =>
    props.points.map((p) => p.charge).filter((v) => v !== null);

  const compute = () => {
    const vs = values();
    if (vs.length < 2) return null;
    const min = Math.min(...vs);
    const max = Math.max(...vs);
    const range = max - min || 1;
    const stepX = (W - 2 * PAD) / (vs.length - 1);
    const pts = vs.map((v, i) => ({
      x: PAD + i * stepX,
      y: PAD + (H - 2 * PAD) * (1 - (v - min) / range),
      v,
    }));
    return { pts, min, max };
  };

  return (
    <Show
      when={compute()}
      fallback={
        <div class="progress-chart-empty">
          Au moins 2 séances avec charge sont nécessaires pour tracer la
          courbe d'évolution.
        </div>
      }
    >
      <svg
        class="progress-chart-big"
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        role="img"
        aria-label="Évolution de la charge"
      >
        <line
          class="progress-chart-axis"
          x1={PAD}
          y1={H - PAD}
          x2={W - PAD}
          y2={H - PAD}
        />
        <polyline
          class="progress-chart-line"
          points={compute()
            .pts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`)
            .join(" ")}
        />
        <For each={compute().pts}>
          {(p) => (
            <>
              <circle
                class="progress-chart-dot"
                cx={p.x}
                cy={p.y}
                r="3.5"
              />
            </>
          )}
        </For>
        <text x={PAD} y={PAD - 2} class="progress-chart-label">
          {compute().max} kg
        </text>
        <text x={PAD} y={H - PAD + 11} class="progress-chart-label">
          {compute().min} kg
        </text>
      </svg>
    </Show>
  );
}

export default function ProgressExercise() {
  const navigate = useNavigate();
  const params = useParams();

  const exoId = () => decodeURIComponent(params.exoId ?? "");

  const aggregates = createMemo(() =>
    aggregateByExercise(completedSessions(), allExercises())
  );
  const data = createMemo(() => statsByExercise(aggregates(), exoId()));

  const pointsDesc = createMemo(() =>
    data() ? [...data().points].reverse() : []
  );

  return (
    <main class="progress-exercise-page">
      <Show
        when={data()}
        fallback={
          <>
            <header class="exercises-header">
              <button class="btn-back" onClick={() => navigate("/progress")}>
                ← Retour
              </button>
              <h2>Exercice introuvable</h2>
            </header>
            <p>
              Cet exercice n'a pas encore de performance enregistrée.
            </p>
          </>
        }
      >
        <nav class="progress-breadcrumb" aria-label="Fil d'Ariane">
          <button
            class="progress-breadcrumb-link"
            onClick={() => navigate("/progress")}
          >
            Mon suivi
          </button>
          <span class="progress-breadcrumb-sep" aria-hidden="true">/</span>
          <Show when={data().group}>
            <button
              class="progress-breadcrumb-link"
              onClick={() =>
                navigate(`/progress/muscle/${encodeURIComponent(data().group)}`)
              }
            >
              {LABEL[data().group] ?? data().group}
            </button>
            <span class="progress-breadcrumb-sep" aria-hidden="true">/</span>
          </Show>
          <span class="progress-breadcrumb-current">{data().name}</span>
        </nav>

        <header class="exercises-header">
          <button
            class="btn-back"
            onClick={() =>
              data().group
                ? navigate(
                    `/progress/muscle/${encodeURIComponent(data().group)}`
                  )
                : navigate("/progress")
            }
          >
            ← Retour
          </button>
          <h2>{data().name}</h2>
        </header>

        <p class="muscles">{data().muscles.join(" · ")}</p>

        <section class="progress-summary">
          <div class="progress-stat">
            <span class="progress-stat-value">{data().sessionCount}</span>
            <span class="progress-stat-label">Séances</span>
          </div>
          <div class="progress-stat">
            <span class="progress-stat-value">
              {data().pr?.charge ?? "—"}
            </span>
            <span class="progress-stat-label">PR (kg)</span>
          </div>
          <div class="progress-stat">
            <span class="progress-stat-value">{data().totalReps || "—"}</span>
            <span class="progress-stat-label">Reps cumulées</span>
          </div>
        </section>

        <section class="progress-section">
          <h3 class="progress-section-title">Évolution de la charge</h3>
          <div class="progress-chart-card">
            <BigChart points={data().points} />
          </div>
        </section>

        <Show when={data().pr}>
          <section class="progress-section">
            <h3 class="progress-section-title">🏆 Meilleure performance</h3>
            <div class="progress-pr-card">
              <div class="progress-pr-charge">{data().pr.charge} kg</div>
              <Show when={data().pr.reps !== null}>
                <div class="progress-pr-reps">{data().pr.reps} reps</div>
              </Show>
              <div class="progress-pr-date">le {formatDate(data().pr.date)}</div>
            </div>
          </section>
        </Show>

        <section class="progress-section">
          <h3 class="progress-section-title">Historique détaillé</h3>
          <ul class="progress-history-list">
            <For each={pointsDesc()}>
              {(p) => (
                <li class="progress-history-item">
                  <button
                    class="progress-history-btn"
                    type="button"
                    onClick={() =>
                      navigate(`/past-training/${encodeURIComponent(p.sessionId)}`)
                    }
                  >
                    <span class="progress-history-date">
                      {formatDate(p.date)}
                    </span>
                    <span class="progress-history-values">
                      <Show when={p.charge !== null}>
                        <strong>{p.charge} kg</strong>
                      </Show>
                      <Show when={p.reps !== null}>
                        <span>× {p.reps} reps</span>
                      </Show>
                      <Show when={p.difficulte}>
                        <span class="progress-history-diff">
                          {DIFFICULTE_LABEL[p.difficulte] ?? p.difficulte}
                        </span>
                      </Show>
                    </span>
                    <span class="progress-history-arrow" aria-hidden="true">
                      →
                    </span>
                  </button>
                </li>
              )}
            </For>
          </ul>
        </section>
      </Show>
    </main>
  );
}
