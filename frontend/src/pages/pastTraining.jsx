import { For, Show, createMemo } from "solid-js";
import { useNavigate, useParams } from "@solidjs/router";
import {
  completedSessions,
  deleteCompletedSession,
} from "../store/completedSessions.js";
import { EQUIPMENT_LABEL } from "../data/equipment.js";

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
      month: "long",
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

export default function PastTraining() {
  const navigate = useNavigate();
  const params = useParams();

  const entry = createMemo(() =>
    completedSessions().find((e) => e.id === params.id)
  );

  const handleDelete = () => {
    const e = entry();
    if (!e) return;
    if (
      confirm(
        `Supprimer la séance du ${formatDate(e.finishedAt)} ? Cette action est irréversible.`
      )
    ) {
      deleteCompletedSession(e.id);
      navigate("/progress");
    }
  };

  return (
    <main class="past-training">
      <header class="exercises-header">
        <button class="btn-back" onClick={() => navigate("/progress")}>
          ← Retour
        </button>
        <h2>Détail de la séance</h2>
      </header>

      <Show
        when={entry()}
        fallback={
          <>
            <p>Cette séance n'a pas été trouvée.</p>
            <button class="btn-primary" onClick={() => navigate("/progress")}>
              Retour au suivi
            </button>
          </>
        }
      >
        <div class="past-training-head">
          <p class="past-training-date">{formatDate(entry().finishedAt)}</p>
          <h3 class="past-training-name">
            {entry().musculaire ?? "?"} — {entry().objectif ?? "?"}
          </h3>
          <p class="past-training-meta">
            <span>{entry().session?.exercises?.length ?? 0} exos</span>
            <span>·</span>
            <span>{formatDuration(entry().durationSeconds)}</span>
          </p>
        </div>

        <ul class="past-training-list">
          <For each={entry().session?.exercises ?? []}>
            {(exo, i) => {
              const fb = () => entry().feedbacks?.[exo.id];
              return (
                <li class="past-training-item">
                  <div class="past-training-item-head">
                    <span class="exercise-number">{i() + 1}</span>
                    <h4>{exo.name}</h4>
                  </div>
                  <p class="muscles">{exo.muscles?.join(" · ") ?? ""}</p>
                  <p class="exercise-meta">
                    Cible : <strong>{exo.series}</strong> séries ×{" "}
                    <strong>{exo.reps}</strong> reps
                  </p>
                  <Show when={exo.equipment} fallback={null}>
                    <span class="exo-equip-badge exo-equip-inline">
                      {EQUIPMENT_LABEL[exo.equipment] ?? exo.equipment}
                    </span>
                  </Show>

                  <Show
                    when={fb()}
                    fallback={
                      <p class="past-training-no-feedback">
                        Aucune performance saisie.
                      </p>
                    }
                  >
                    <div class="past-training-feedback">
                      <div class="past-training-feedback-row">
                        <span class="past-training-feedback-label">
                          Charge
                        </span>
                        <span class="past-training-feedback-value">
                          {fb().charge !== "" && fb().charge != null
                            ? `${fb().charge} kg`
                            : "—"}
                        </span>
                      </div>
                      <div class="past-training-feedback-row">
                        <span class="past-training-feedback-label">Reps</span>
                        <span class="past-training-feedback-value">
                          {fb().reps !== "" && fb().reps != null
                            ? fb().reps
                            : "—"}
                        </span>
                      </div>
                      <div class="past-training-feedback-row">
                        <span class="past-training-feedback-label">
                          Ressenti
                        </span>
                        <span class="past-training-feedback-value">
                          {DIFFICULTE_LABEL[fb().difficulte] ??
                            fb().difficulte ??
                            "—"}
                        </span>
                      </div>
                    </div>
                  </Show>
                </li>
              );
            }}
          </For>
        </ul>

        <div class="past-training-actions">
          <button class="btn-secondary saved-delete" onClick={handleDelete}>
            Supprimer cette séance
          </button>
        </div>
      </Show>
    </main>
  );
}
