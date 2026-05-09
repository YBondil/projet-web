import { Show, For } from "solid-js";
import { useNavigate } from "@solidjs/router";
import {
  currentSession,
  sessionConfig,
  setCurrentSession,
  setSessionConfig,
} from "../store/session";
import { generateTraining } from "../data/algo";
import ExerciseCard from "../components/exocard.jsx";

export default function Training() {
  const navigate = useNavigate();

  const regenerer = () => {
    const nouvelle = generateTraining(sessionConfig());
    setCurrentSession(nouvelle);
  };
  return (
    <main class="session">
      <header class="exercises-header">
        <button class="btn-back" onClick={() => navigate("/")}>
          ← Retour
        </button>
        <h2>Ma séance</h2>
      </header>

      <Show
        when={currentSession()}
        fallback={
          <>
            <p>Aucune séance générée.</p>
            <button class="btn-primary" onClick={() => navigate("/selection")}>
              Générer une séance
            </button>
          </>
        }
      >
        <header class="session-header">
          <h2>
            {currentSession().musculaire} - {currentSession().objectif}
          </h2>
          <span class="duree">~{currentSession().dureeEstimee} min</span>
        </header>
        <ol class="exercise-list">
          <For each={currentSession().exercises}>
            {(exo, i) => <ExerciseCard exercise={exo} index={i() + 1} />}
          </For>
        </ol>
        <div class="session-actions">
          <button class="btn-primary" onClick={() => regenerer()}>
            Régénerer
          </button>
          <button class="btn-secondary" onClick={() => navigate("/selection")}>
            Nouvelle séance
          </button>
        </div>
      </Show>
    </main>
  );
}
