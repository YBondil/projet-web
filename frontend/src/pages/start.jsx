import { useNavigate } from "@solidjs/router";
import { savedSessions } from "../store/savedSessions.js";

export default function Start() {
  const navigate = useNavigate();

  return (
    <main class="start">
      <header class="exercises-header">
        <button class="btn-back" onClick={() => navigate("/")}>
          ← Retour
        </button>
        <h2>Nouvelle séance</h2>
      </header>

      <p class="start-intro">Comment veux-tu commencer ?</p>

      <div class="start-choices">
        <button
          class="start-choice"
          type="button"
          onClick={() => navigate("/selection")}
        >
          <span class="start-choice-icon">🎲</span>
          <span class="start-choice-title">Générer une séance</span>
          <span class="start-choice-desc">
            Choisis ton groupe musculaire, ta durée, ton objectif et ton
            équipement. On te crée une séance sur-mesure.
          </span>
        </button>

        <button
          class="start-choice"
          type="button"
          onClick={() => navigate("/saved")}
        >
          <span class="start-choice-icon">📁</span>
          <span class="start-choice-title">Reprendre une séance</span>
          <span class="start-choice-desc">
            Relance ou modifie une séance déjà enregistrée
            {savedSessions().length > 0
              ? ` (${savedSessions().length} disponible${
                  savedSessions().length > 1 ? "s" : ""
                }).`
              : "."}
          </span>
        </button>
      </div>
    </main>
  );
}
