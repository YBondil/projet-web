import { For, Show, createMemo } from "solid-js";
import { useNavigate } from "@solidjs/router";
import {
  completedSessions,
  completedApiStatus,
  refreshCompletedSessions,
  deleteCompletedSession,
} from "../store/completedSessions.js";
import { allExercises } from "../store/exercises.js";
import {
  aggregateByExercise,
  recordsFor,
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

function formatDuration(seconds) {
  const total = Math.max(0, Math.floor(seconds ?? 0));
  const m = Math.floor(total / 60);
  const s = total % 60;
  if (m === 0) return `${s}s`;
  if (s === 0) return `${m}min`;
  return `${m}min ${s.toString().padStart(2, "0")}`;
}

export default function Progress() {
  const navigate = useNavigate();

  const aggregates = createMemo(() =>
    aggregateByExercise(completedSessions(), allExercises())
  );
  const records = createMemo(() => recordsFor(aggregates()));
  const groups = createMemo(() => groupStats(aggregates(), completedSessions()));
  const sortedGroups = createMemo(() =>
    Object.values(groups()).sort((a, b) => b.sessionCount - a.sessionCount)
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
          <button
            class="progress-nav-card"
            type="button"
            onClick={() => navigate("/progress/records")}
          >
            <span class="progress-nav-icon">🏆</span>
            <span class="progress-nav-body">
              <span class="progress-nav-title">Records personnels</span>
              <span class="progress-nav-desc">
                {records().length} record{records().length > 1 ? "s" : ""} —
                meilleure charge : {records()[0].charge} kg sur «{" "}
                {records()[0].name} »
              </span>
            </span>
            <span class="progress-nav-arrow" aria-hidden="true">
              →
            </span>
          </button>
        </Show>

        <section class="progress-section">
          <h3 class="progress-section-title">💪 Par groupe musculaire</h3>
          <ul class="progress-groups">
            <For each={sortedGroups()}>
              {(g) => (
                <li>
                  <button
                    class="progress-group-card"
                    type="button"
                    onClick={() =>
                      navigate(`/progress/muscle/${encodeURIComponent(g.group)}`)
                    }
                    disabled={
                      g.sessionCount === 0 && g.exercises.length === 0
                    }
                  >
                    <span class="progress-group-name">
                      {LABEL[g.group] ?? g.group}
                    </span>
                    <span class="progress-group-meta">
                      <span>
                        <strong>{g.sessionCount}</strong> séance
                        {g.sessionCount > 1 ? "s" : ""}
                      </span>
                      <span>·</span>
                      <span>
                        <strong>{g.exercises.length}</strong> exo
                        {g.exercises.length > 1 ? "s" : ""}
                      </span>
                      <Show when={g.topCharge > 0}>
                        <span>·</span>
                        <span>
                          PR <strong>{g.topCharge} kg</strong>
                        </span>
                      </Show>
                    </span>
                    <span class="progress-group-arrow" aria-hidden="true">
                      →
                    </span>
                  </button>
                </li>
              )}
            </For>
          </ul>
        </section>

        <section class="progress-section">
          <h3 class="progress-section-title">📅 Séances récentes</h3>
          <ul class="completed-list">
            <For each={completedSessions().slice(0, 5)}>
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
                    <span>{entry.session?.exercises?.length ?? 0} exos</span>
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
          <Show when={completedSessions().length > 5}>
            <button
              class="btn-secondary progress-see-all"
              type="button"
              onClick={() => navigate("/progress/sessions")}
            >
              Voir toutes les séances ({completedSessions().length})
            </button>
          </Show>
        </section>
      </Show>
    </main>
  );
}
