import { For, Show, createMemo } from "solid-js";
import { useNavigate } from "@solidjs/router";
import { completedSessions } from "../store/completedSessions.js";
import { allExercises } from "../store/exercises.js";
import {
  aggregateByExercise,
  recordsByGroup,
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

const GROUP_ORDER = [
  "pectoraux",
  "dos",
  "jambes",
  "épaules",
  "bras",
  "abdominaux",
  "full body",
  "autre",
];

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

export default function ProgressRecords() {
  const navigate = useNavigate();

  const aggregates = createMemo(() =>
    aggregateByExercise(completedSessions(), allExercises())
  );
  const byGroup = createMemo(() => recordsByGroup(aggregates()));
  const orderedGroups = createMemo(() => {
    const groups = byGroup();
    const present = Object.keys(groups);
    return GROUP_ORDER.filter((g) => present.includes(g)).concat(
      present.filter((g) => !GROUP_ORDER.includes(g))
    );
  });

  const totalRecords = createMemo(() =>
    Object.values(byGroup()).reduce((acc, arr) => acc + arr.length, 0)
  );

  return (
    <main class="progress-records-page">
      <nav class="progress-breadcrumb" aria-label="Fil d'Ariane">
        <button class="progress-breadcrumb-link" onClick={() => navigate("/progress")}>
          Mon suivi
        </button>
        <span class="progress-breadcrumb-sep" aria-hidden="true">/</span>
        <span class="progress-breadcrumb-current">Records personnels</span>
      </nav>

      <header class="exercises-header">
        <button class="btn-back" onClick={() => navigate("/progress")}>
          ← Retour
        </button>
        <h2>🏆 Records personnels</h2>
      </header>

      <Show
        when={totalRecords() > 0}
        fallback={
          <div class="progress-empty">
            <span class="progress-empty-icon">🏆</span>
            <p class="progress-empty-title">Aucun record pour l'instant</p>
            <p class="progress-empty-sub">
              Saisis une charge à la fin d'une séance pour voir tes records
              apparaître ici.
            </p>
          </div>
        }
      >
        <For each={orderedGroups()}>
          {(group) => (
            <section class="progress-records-group">
              <h3 class="progress-records-group-title">
                {LABEL[group] ?? group}
                <span class="progress-records-group-count">
                  {byGroup()[group].length}
                </span>
              </h3>
              <ul class="progress-records-list">
                <For each={byGroup()[group]}>
                  {(r) => (
                    <li>
                      <button
                        class="progress-record-card"
                        type="button"
                        onClick={() =>
                          navigate(`/progress/exercise/${encodeURIComponent(r.id)}`)
                        }
                      >
                        <span class="progress-record-card-name">{r.name}</span>
                        <span class="progress-record-card-charge">
                          <strong>{r.charge} kg</strong>
                          <Show when={r.reps !== null}>
                            <span> × {r.reps} reps</span>
                          </Show>
                        </span>
                        <span class="progress-record-card-date">
                          {formatDate(r.date)}
                        </span>
                        <span class="progress-record-card-arrow" aria-hidden="true">
                          →
                        </span>
                      </button>
                    </li>
                  )}
                </For>
              </ul>
            </section>
          )}
        </For>
      </Show>
    </main>
  );
}
