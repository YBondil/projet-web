import { For, createSignal, createMemo, Show } from "solid-js";
import { useNavigate } from "@solidjs/router";
import exercises from "../data/exo.json";

const GROUPES = Object.keys(exercises);
const TYPES = ["tous", "force", "endurance", "tonification"];

const LABEL = {
  pectoraux: "Pectoraux",
  dos: "Dos",
  jambes: "Jambes",
  épaules: "Épaules",
  bras: "Bras",
  abdominaux: "Abdominaux",
  "full body": "Full Body",
};

export default function ExercisesInspect() {
  const navigate = useNavigate();
  const [groupe, setGroupe] = createSignal(GROUPES[0]);
  const [type, setType] = createSignal("tous");

  const filteredExos = createMemo(() => {
    const all = exercises[groupe()] ?? [];
    if (type() === "tous") return all;
    return all.filter((e) => e.type === type());
  });

  return (
    <main class="exercises">
      <header class="exercises-header">
        <button class="btn-back" onClick={() => navigate("/")}>
          ← Retour
        </button>
        <h2>Exercices</h2>
      </header>

      <div class="filter-label">Groupe musculaire</div>
      <div class="tab-group">
        <For each={GROUPES}>
          {(g) => (
            <button
              class={`tab${groupe() === g ? " tab-active" : ""}`}
              onClick={() => setGroupe(g)}
            >
              {LABEL[g] ?? g}
            </button>
          )}
        </For>
      </div>

      <div class="filter-label">Type</div>
      <div class="tab-group">
        <For each={TYPES}>
          {(t) => (
            <button
              class={`tab${type() === t ? " tab-active" : ""}`}
              onClick={() => setType(t)}
            >
              {t}
            </button>
          )}
        </For>
      </div>

      <p class="exo-count">
        {filteredExos().length} exercice
        {filteredExos().length > 1 ? "s" : ""}
      </p>

      <Show
        when={filteredExos().length > 0}
        fallback={
          <p class="exo-empty">Aucun exercice de ce type pour ce groupe.</p>
        }
      >
        <ol class="exo-list">
          <For each={filteredExos()}>
            {(exo) => (
              <li class="exo-item">
                <div class="exo-item-header">
                  <h3>{exo.name}</h3>
                  <span class={`exo-type type-${exo.type}`}>{exo.type}</span>
                </div>
                <p class="exo-muscles">{exo.muscles.join(" · ")}</p>
                <a
                  class="exo-muscle"
                  href={exo.video}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  ▶ Voir la vidéo
                </a>
              </li>
            )}
          </For>
        </ol>
      </Show>
    </main>
  );
}
