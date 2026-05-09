export default function ExerciseCard({ exercise, index }) {
  return (
    <li class="exercise-card">
      <span class="exercise-number">{index}</span>
      <div class="exercise-info">
        <div class="exercise-info-header">
          <h3>{exercise.name}</h3>
          <a
            href={exercise.video}
            target="_blank"
            rel="noopener noreferrer"
            class="video-link"
          >
            ▶ Tuto
          </a>
        </div>
        <p class="muscles">{exercise.muscles.join(" · ")}</p>
        <p class="exercise-meta">
          <strong>{exercise.series}</strong> séries ×{" "}
          <strong>{exercise.reps}</strong> reps
        </p>
        <p class="repos">
          Repos : {exercise.repos}s · ~{exercise.dureeTotale} min
        </p>
      </div>
    </li>
  );
}
