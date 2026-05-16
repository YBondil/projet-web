import { For, Show } from "solid-js";
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

export default function ProgressSessions() {
  const navigate = useNavigate();

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
    <main class="progress-sessions-page">
      <nav class="progress-breadcrumb" aria-label="Fil d'Ariane">
        <button
          class="progress-breadcrumb-link"
          onClick={() => navigate("/progress")}
        >
          Mon suivi
        </button>
        <span class="progress-breadcrumb-sep" aria-hidden="true">/</span>
        <span class="progress-breadcrumb-current">Toutes les séances</span>
      </nav>

      <header class="exercises-header">
        <button class="btn-back" onClick={() => navigate("/progress")}>
          ← Retour
        </button>
        <h2>📅 Toutes les séances</h2>
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

      <p class="progress-sessions-count">
        {completedSessions().length} séance
        {completedSessions().length > 1 ? "s" : ""} enregistrée
        {completedSessions().length > 1 ? "s" : ""}
      </p>

      <Show
        when={completedSessions().length > 0}
        fallback={
          <div class="progress-empty">
            <span class="progress-empty-icon">📅</span>
            <p class="progress-empty-title">Aucune séance terminée</p>
            <p class="progress-empty-sub">
              Termine une séance pour la voir apparaître dans ton historique.
            </p>
          </div>
        }
      >
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
                  <span>{entry.session?.exercises?.length ?? 0} exos</span>
                  <span>·</span>
                  <span>{formatDuration(entry.durationSeconds)}</span>
                  <Show when={Object.keys(entry.feedbacks ?? {}).length > 0}>
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
      </Show>
    </main>
  );
}
