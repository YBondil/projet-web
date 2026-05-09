import { Show } from "solid-js";
import { EQUIPMENT_LABEL } from "../data/equipment.js";

export default function ExerciseCard({ exercise, index, onRemove }) {
  return (
    <li class="exercise-card">
      <span class="exercise-number">{index}</span>
      <div class="exercise-info">
        <div class="exercise-info-header">
          <h3>{exercise.name}</h3>
          <Show when={exercise.video}>
            <a
              href={exercise.video}
              target="_blank"
              rel="noopener noreferrer"
              class="video-link"
            >
              ▶ Tuto
            </a>
          </Show>
        </div>
        <p class="muscles">{exercise.muscles.join(" · ")}</p>
        <p class="exercise-meta">
          <strong>{exercise.series}</strong> séries ×{" "}
          <strong>{exercise.reps}</strong> reps
        </p>
        <p class="repos">
          Repos : {exercise.repos}s · ~{exercise.dureeTotale} min
        </p>
        <Show when={exercise.equipment}>
          <span class="exo-equip-badge exo-equip-inline">
            {EQUIPMENT_LABEL[exercise.equipment] ?? exercise.equipment}
          </span>
        </Show>
      </div>
      <Show when={onRemove}>
        <button
          class="exercise-remove"
          type="button"
          onClick={onRemove}
          aria-label={`Retirer ${exercise.name}`}
        >
          ×
        </button>
      </Show>
    </li>
  );
}
