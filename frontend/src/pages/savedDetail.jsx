import { Show, For, createMemo } from "solid-js";
import { useNavigate, useParams } from "@solidjs/router";
import {
  savedSessions,
  deleteSavedSession,
} from "../store/savedSessions.js";
import { setCurrentSession, setSessionConfig } from "../store/session.js";
import ExerciseCard from "../components/exocard.jsx";

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
      month: "long",
      year: "numeric",
    });
  } catch {
    return "";
  }
}

export default function SavedDetail() {
  const navigate = useNavigate();
  const params = useParams();

  const entry = createMemo(() =>
    savedSessions().find((e) => e.id === params.id)
  );

  const loadIntoStore = () => {
    const e = entry();
    if (!e) return;
    setSessionConfig({
      musculaire: e.session.musculaire,
      duree: e.session.duree,
      objectif: e.session.objectif,
    });
    setCurrentSession(e.session);
  };

  const launch = () => {
    loadIntoStore();
    navigate("/training/ongoing");
  };

  const editSession = () => {
    loadIntoStore();
    navigate("/training");
  };

  const handleDelete = () => {
    const e = entry();
    if (!e) return;
    if (confirm(`Supprimer « ${e.name} » ?`)) {
      deleteSavedSession(e.id);
      navigate("/saved");
    }
  };

  return (
    <main class="saved-detail">
      <header class="exercises-header">
        <button class="btn-back" onClick={() => navigate("/saved")}>
          ← Retour
        </button>
        <h2>Détail</h2>
      </header>

      <Show
        when={entry()}
        fallback={
          <>
            <p>Cette séance n'a pas été trouvée.</p>
            <button class="btn-primary" onClick={() => navigate("/saved")}>
              Retour à mes séances
            </button>
          </>
        }
      >
        <div class="past-training-head">
          <p class="past-training-date">{formatDate(entry().createdAt)}</p>
          <h3 class="past-training-name">{entry().name}</h3>
          <p class="past-training-meta">
            <span class="exo-group-badge">
              {LABEL[entry().session.musculaire] ?? entry().session.musculaire}
            </span>
            <span>{entry().session.objectif}</span>
            <span>·</span>
            <span>{entry().session.exercises.length} exos</span>
            <span>·</span>
            <span>~{entry().session.dureeEstimee} min</span>
          </p>
        </div>

        <ol class="exercise-list">
          <For each={entry().session.exercises}>
            {(exo, i) => <ExerciseCard exercise={exo} index={i() + 1} />}
          </For>
        </ol>

        <div class="saved-detail-actions">
          <button class="btn-primary" onClick={launch}>
            ▶ Lancer cette séance
          </button>
          <button class="btn-secondary" onClick={editSession}>
            Modifier avant de lancer
          </button>
          <button class="btn-secondary saved-delete" onClick={handleDelete}>
            Supprimer
          </button>
        </div>
      </Show>
    </main>
  );
}
