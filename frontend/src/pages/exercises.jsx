import { For, createSignal, createMemo, Show } from "solid-js";
import { useNavigate } from "@solidjs/router";
import { allExercises, addExercise } from "../store/exercises.js";
import { EQUIPMENTS, EQUIPMENT_LABEL } from "../data/equipment.js";

const GROUPES = [
  "pectoraux",
  "dos",
  "jambes",
  "épaules",
  "bras",
  "abdominaux",
  "full body",
];
const TYPES = ["tous", "force", "endurance", "tonification", "prise de muscle"];
const TYPES_AJOUT = ["force", "endurance", "tonification", "prise de muscle"];

const LABEL = {
  pectoraux: "Pectoraux",
  dos: "Dos",
  jambes: "Jambes",
  épaules: "Épaules",
  bras: "Bras",
  abdominaux: "Abdominaux",
  "full body": "Full Body",
};

function makeId(name) {
  const slug = name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `${slug || "exo"}-${Date.now().toString(36)}`;
}

function normalize(s) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export default function ExercisesInspect() {
  const navigate = useNavigate();
  const [groupe, setGroupe] = createSignal(GROUPES[0]);
  const [type, setType] = createSignal("tous");
  const [search, setSearch] = createSignal("");

  const [showForm, setShowForm] = createSignal(false);
  const [formName, setFormName] = createSignal("");
  const [formGroupe, setFormGroupe] = createSignal(GROUPES[0]);
  const [formType, setFormType] = createSignal("force");
  const [formEquipment, setFormEquipment] = createSignal(EQUIPMENTS[0]);
  const [formVideo, setFormVideo] = createSignal("");
  const [formError, setFormError] = createSignal("");

  const [muscleChips, setMuscleChips] = createSignal([]);
  const [muscleInput, setMuscleInput] = createSignal("");

  const allMuscleNames = createMemo(() => {
    const set = new Set();
    const exos = allExercises();
    for (const group of Object.keys(exos)) {
      for (const exo of exos[group]) {
        for (const m of exo.muscles) set.add(m);
      }
    }
    return [...set].sort((a, b) => a.localeCompare(b, "fr"));
  });

  const muscleSuggestions = createMemo(() => {
    const q = normalize(muscleInput().trim());
    if (!q) return [];
    const chosen = new Set(muscleChips());
    return allMuscleNames()
      .filter((m) => !chosen.has(m) && normalize(m).includes(q))
      .slice(0, 6);
  });

  const filteredExos = createMemo(() => {
    const all = allExercises()[groupe()] ?? [];
    if (type() === "tous") return all;
    return all.filter((e) => e.type === type());
  });

  const searchResults = createMemo(() => {
    const q = normalize(search().trim());
    if (!q) return [];
    const out = [];
    const exos = allExercises();
    for (const group of Object.keys(exos)) {
      for (const exo of exos[group]) {
        const inName = normalize(exo.name).includes(q);
        const inMuscles = exo.muscles.some((m) => normalize(m).includes(q));
        const inEquipment = normalize(exo.equipment).includes(q);
        if (inName || inMuscles || inEquipment)
          out.push({ ...exo, _group: group });
      }
    }
    return out;
  });

  const isSearching = () => search().trim().length > 0;
  const displayed = () => (isSearching() ? searchResults() : filteredExos());

  const openForm = () => {
    setFormName("");
    setFormGroupe(groupe());
    setFormType(type() === "tous" ? "force" : type());
    setFormEquipment(EQUIPMENTS[0]);
    setFormVideo("");
    setFormError("");
    setMuscleChips([]);
    setMuscleInput("");
    setShowForm(true);
  };

  const addMuscleChip = (m) => {
    const v = m.trim();
    if (!v || muscleChips().includes(v)) return;
    setMuscleChips([...muscleChips(), v]);
    setMuscleInput("");
  };

  const removeMuscleChip = (m) =>
    setMuscleChips(muscleChips().filter((x) => x !== m));

  const handleMuscleKey = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addMuscleChip(muscleInput());
    } else if (
      e.key === "Backspace" &&
      muscleInput() === "" &&
      muscleChips().length > 0
    ) {
      setMuscleChips(muscleChips().slice(0, -1));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const name = formName().trim();
    const trailing = muscleInput().trim();
    const muscles = trailing
      ? [...muscleChips(), trailing]
      : [...muscleChips()];

    if (!name) {
      setFormError("Le nom est requis.");
      return;
    }
    if (muscles.length === 0) {
      setFormError("Indique au moins un muscle ciblé.");
      return;
    }

    const exo = {
      id: makeId(name),
      name,
      type: formType(),
      equipment: formEquipment(),
      muscles,
      video: formVideo().trim(),
    };

    addExercise(formGroupe(), exo);
    setSearch("");
    setGroupe(formGroupe());
    if (type() !== "tous" && type() !== formType()) setType(formType());
    setShowForm(false);
  };

  return (
    <main class="exercises">
      <header class="exercises-header">
        <button class="btn-back" onClick={() => navigate("/")}>
          ← Retour
        </button>
        <h2>Exercices</h2>
      </header>

      <input
        class="exo-search"
        type="search"
        placeholder="🔍 Rechercher un exercice ou un muscle..."
        value={search()}
        onInput={(e) => setSearch(e.target.value)}
      />

      <Show when={!isSearching()}>
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
      </Show>

      <div class="exo-toolbar">
        <p class="exo-count">
          {displayed().length} {isSearching() ? "résultat" : "exercice"}
          {displayed().length > 1 ? "s" : ""}
        </p>
        <button
          class="btn-add-exo"
          onClick={() => (showForm() ? setShowForm(false) : openForm())}
        >
          {showForm() ? "Annuler" : "+ Ajouter"}
        </button>
      </div>

      <Show when={showForm()}>
        <form class="exo-form" onSubmit={handleSubmit}>
          <label>
            Nom de l'exercice
            <input
              class="form-input"
              value={formName()}
              onInput={(e) => setFormName(e.target.value)}
              placeholder="ex : Curl marteau"
            />
          </label>
          <label>
            Groupe musculaire
            <select
              value={formGroupe()}
              onInput={(e) => setFormGroupe(e.target.value)}
            >
              <For each={GROUPES}>
                {(g) => <option value={g}>{LABEL[g] ?? g}</option>}
              </For>
            </select>
          </label>
          <label>
            Type
            <select
              value={formType()}
              onInput={(e) => setFormType(e.target.value)}
            >
              <For each={TYPES_AJOUT}>
                {(t) => <option value={t}>{t}</option>}
              </For>
            </select>
          </label>
          <label>
            Équipement requis
            <select
              value={formEquipment()}
              onInput={(e) => setFormEquipment(e.target.value)}
            >
              <For each={EQUIPMENTS}>
                {(eq) => (
                  <option value={eq}>{EQUIPMENT_LABEL[eq] ?? eq}</option>
                )}
              </For>
            </select>
          </label>

          <div class="form-field">
            <div class="form-field-label">Muscles ciblés</div>
            <Show when={muscleChips().length > 0}>
              <div class="chip-list">
                <For each={muscleChips()}>
                  {(m) => (
                    <span class="chip">
                      {m}
                      <button
                        type="button"
                        class="chip-remove"
                        onClick={() => removeMuscleChip(m)}
                        aria-label={`Retirer ${m}`}
                      >
                        ×
                      </button>
                    </span>
                  )}
                </For>
              </div>
            </Show>
            <input
              class="form-input"
              value={muscleInput()}
              onInput={(e) => setMuscleInput(e.target.value)}
              onKeyDown={handleMuscleKey}
              placeholder={
                muscleChips().length === 0
                  ? "ex : biceps brachial"
                  : "ajouter un autre muscle"
              }
              autocomplete="off"
            />
            <Show when={muscleSuggestions().length > 0}>
              <ul class="suggestions">
                <For each={muscleSuggestions()}>
                  {(m) => (
                    <li
                      class="suggestion"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        addMuscleChip(m);
                      }}
                    >
                      {m}
                    </li>
                  )}
                </For>
              </ul>
            </Show>
            <p class="form-hint">
              Tape pour voir des suggestions, valide avec Entrée.
            </p>
          </div>

          <label>
            URL vidéo (optionnel)
            <input
              class="form-input"
              type="url"
              value={formVideo()}
              onInput={(e) => setFormVideo(e.target.value)}
              placeholder="https://..."
            />
          </label>
          <Show when={formError()}>
            <p class="form-error">{formError()}</p>
          </Show>
          <button class="btn-primary" type="submit">
            Ajouter l'exercice
          </button>
        </form>
      </Show>

      <Show
        when={displayed().length > 0}
        fallback={
          <p class="exo-empty">
            {isSearching()
              ? "Aucun exercice ne correspond à ta recherche."
              : "Aucun exercice de ce type pour ce groupe."}
          </p>
        }
      >
        <ol class="exo-list">
          <For each={displayed()}>
            {(exo) => (
              <li class="exo-item">
                <div class="exo-item-header">
                  <h3>{exo.name}</h3>
                  <span class={`exo-type type-${exo.type}`}>{exo.type}</span>
                </div>
                <p class="exo-muscles">{exo.muscles.join(" · ")}</p>
                <div class="exo-item-footer">
                  <Show when={exo._group}>
                    <span class="exo-group-badge">
                      {LABEL[exo._group] ?? exo._group}
                    </span>
                  </Show>
                  <Show when={exo.equipment}>
                    <span class="exo-equip-badge">
                      {EQUIPMENT_LABEL[exo.equipment] ?? exo.equipment}
                    </span>
                  </Show>
                  <Show when={exo.video}>
                    <a
                      class="exo-muscle"
                      href={exo.video}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      ▶ Voir la vidéo
                    </a>
                  </Show>
                </div>
              </li>
            )}
          </For>
        </ol>
      </Show>
    </main>
  );
}
