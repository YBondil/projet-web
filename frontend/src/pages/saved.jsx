import { Show, For } from "solid-js";
import { useNavigate } from "@solidjs/router";
import {
  savedSessions,
  deleteSavedSession,
  apiStatus,
  refreshSavedSessions,
} from "../store/savedSessions.js";
import { setCurrentSession, setSessionConfig } from "../store/session.js";

const LABEL = {
  pectoraux: "Pectoraux",
  dos: "Dos",
  jambes: "Jambes",
  épaules: "Épaules",
  bras: "Bras",
  abdominaux: "Abdominaux",
  "full body": "Full Body",
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

export default function SavedSessions() {
  const navigate = useNavigate();

  const launch = (entry) => {
    setSessionConfig({
      musculaire: entry.session.musculaire,
      duree: entry.session.duree,
      objectif: entry.session.objectif,
    });
    setCurrentSession(entry.session);
    navigate("/training/ongoing");
  };

  return (
    <main class="saved">
      <header class="exercises-header">
        <button class="btn-back" onClick={() => navigate("/")}>
          ← Retour
        </button>
        <h2>Mes séances</h2>
      </header>

      <div class="api-status-bar">
        <Show
          when={apiStatus() === "online"}
          fallback={
            <Show
              when={apiStatus() === "offline"}
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
                onClick={() => refreshSavedSessions()}
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
        when={savedSessions().length > 0}
        fallback={
          <div class="progress-empty">
            <div class="progress-empty-icon">💾</div>
            <p class="progress-empty-title">Aucune séance enregistrée</p>
            <p class="progress-empty-sub">
              Génère une séance puis enregistre-la pour la retrouver ici.
            </p>
          </div>
        }
      >
        <ul class="saved-list">
          <For each={savedSessions()}>
            {(entry) => (
              <li class="saved-item">
                <div class="saved-item-head">
                  <h3 class="saved-item-name">{entry.name}</h3>
                  <span class="saved-item-date">
                    {formatDate(entry.createdAt)}
                  </span>
                </div>
                <p class="saved-item-meta">
                  <span class="exo-group-badge">
                    {LABEL[entry.session.musculaire] ??
                      entry.session.musculaire}
                  </span>
                  <span>{entry.session.objectif}</span>
                  <span>·</span>
                  <span>{entry.session.exercises.length} exos</span>
                  <span>·</span>
                  <span>~{entry.session.dureeEstimee} min</span>
                </p>
                <div class="saved-item-actions">
                  <button class="btn-primary" onClick={() => launch(entry)}>
                    Lancer
                  </button>
                  <button
                    class="btn-secondary saved-delete"
                    onClick={() => {
                      if (confirm(`Supprimer « ${entry.name} » ?`)) {
                        deleteSavedSession(entry.id);
                      }
                    }}
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
