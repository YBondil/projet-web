import { Show } from "solid-js";
import { EQUIPMENT_LABEL } from "../data/equipment.js";

export default function ExerciseCard({
  exercise,
  index,
  onRemove,
  dragHandlers,
  dragState,
}) {
  const draggable = Boolean(dragHandlers);

  const className = () => {
    const parts = ["exercise-card"];
    if (draggable) parts.push("is-draggable");
    if (dragState?.isDragging) parts.push("is-dragging");
    if (dragState?.dropAbove) parts.push("drop-above");
    if (dragState?.dropBelow) parts.push("drop-below");
    return parts.join(" ");
  };

  return (
    <li
      class={className()}
      draggable={draggable}
      onDragStart={dragHandlers?.onDragStart}
      onDragOver={dragHandlers?.onDragOver}
      onDragLeave={dragHandlers?.onDragLeave}
      onDrop={dragHandlers?.onDrop}
      onDragEnd={dragHandlers?.onDragEnd}
    >
      <Show when={draggable}>
        <span
          class="exercise-grip"
          aria-label="Glisser pour réordonner"
          title="Glisser pour réordonner"
        >
          ⋮⋮
        </span>
      </Show>
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
              draggable={false}
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
