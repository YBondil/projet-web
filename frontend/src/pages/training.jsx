import { Show, For, createSignal, createMemo } from "solid-js";
import { useNavigate } from "@solidjs/router";
import {
  currentSession,
  sessionConfig,
  setCurrentSession,
} from "../store/session";
import {
  generateTraining,
  attachParams,
  recomputeEstimate,
} from "../data/algo";
import { allExercises } from "../store/exercises.js";
import { saveSession } from "../store/savedSessions.js";
import { EQUIPMENT_LABEL } from "../data/equipment.js";
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

function normalize(s) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export default function Training() {
  const navigate = useNavigate();

  const [showPicker, setShowPicker] = createSignal(false);
  const [pickerSearch, setPickerSearch] = createSignal("");
  const [warningDismissed, setWarningDismissed] = createSignal(false);

  const [showSave, setShowSave] = createSignal(false);
  const [saveName, setSaveName] = createSignal("");
  const [saveDone, setSaveDone] = createSignal(false);

  const regenerer = () => {
    const nouvelle = generateTraining(sessionConfig());
    setCurrentSession(nouvelle);
    setWarningDismissed(false);
  };

  const updateExercises = (newExercises) => {
    const updated = { ...currentSession(), exercises: newExercises };
    updated.dureeEstimee = recomputeEstimate(updated);
    setCurrentSession(updated);
    setWarningDismissed(false);
  };

  const removeExo = (id) => {
    updateExercises(currentSession().exercises.filter((e) => e.id !== id));
  };

  const addExo = (exo) => {
    const withParams = attachParams(exo, currentSession().params);
    updateExercises([...currentSession().exercises, withParams]);
    setShowPicker(false);
    setPickerSearch("");
  };

  const isOvertime = createMemo(() => {
    const s = currentSession();
    return s ? s.dureeEstimee > s.duree : false;
  });

  const showWarning = () => isOvertime() && !warningDismissed();

  const pickerCandidates = createMemo(() => {
    if (!currentSession()) return [];
    const q = normalize(pickerSearch().trim());
    const usedIds = new Set(currentSession().exercises.map((e) => e.id));
    const out = [];
    const exos = allExercises();
    for (const group of Object.keys(exos)) {
      for (const exo of exos[group]) {
        if (usedIds.has(exo.id)) continue;
        if (q) {
          try {
            const inName = normalize(exo.name).includes(q);
            const inType = normalize(exo.type).includes(q);
            const inEquipment = normalize(exo.equipment).includes(q);
            const inMuscles = exo.muscles.some((m) => normalize(m).includes(q));
            if (!inName && !inType && !inEquipment && !inMuscles) continue;
          } catch (e) {
            console.log(e);
            continue;
          }
        }
        out.push({ ...exo, _group: group });
      }
    }
    return out.slice(0, 30);
  });

  const handleSave = (e) => {
    e?.preventDefault?.();
    saveSession(currentSession(), saveName());
    setShowSave(false);
    setSaveName("");
    setSaveDone(true);
    setTimeout(() => setSaveDone(false), 2200);
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
          <span class={`duree${isOvertime() ? " duree-over" : ""}`}>
            ~{currentSession().dureeEstimee} min
            <Show when={currentSession().duree}>
              {" "}
              / {currentSession().duree} min
            </Show>
          </span>
        </header>

        <Show when={showWarning()}>
          <div class="session-warning" role="alert">
            <span class="session-warning-icon">⚠</span>
            <div class="session-warning-text">
              Tu dépasses la durée prévue (~
              {currentSession().dureeEstimee} min vs {currentSession().duree}
              {" min"} demandées).
            </div>
            <button
              class="session-warning-close"
              type="button"
              onClick={() => setWarningDismissed(true)}
              aria-label="Ignorer l'avertissement"
            >
              ×
            </button>
          </div>
        </Show>

        <ol class="exercise-list">
          <For each={currentSession().exercises}>
            {(exo, i) => (
              <ExerciseCard
                exercise={exo}
                index={i() + 1}
                onRemove={() => removeExo(exo.id)}
              />
            )}
          </For>
        </ol>

        <div class="session-edit">
          <button
            class="btn-add-exo session-add"
            type="button"
            onClick={() => {
              setShowPicker(!showPicker());
              setPickerSearch("");
            }}
          >
            {showPicker() ? "Annuler" : "+ Ajouter un exercice"}
          </button>
        </div>

        <Show when={showPicker()}>
          <div class="picker">
            <input
              class="exo-search"
              type="search"
              placeholder="🔍 Rechercher dans tous les exercices..."
              value={pickerSearch()}
              onInput={(e) => setPickerSearch(e.target.value)}
            />
            <Show
              when={pickerCandidates().length > 0}
              fallback={<p class="exo-empty">Aucun exercice à ajouter.</p>}
            >
              <ul class="picker-list">
                <For each={pickerCandidates()}>
                  {(exo) => (
                    <li class="picker-item">
                      <button
                        class="picker-item-btn"
                        type="button"
                        onClick={() => addExo(exo)}
                      >
                        <div class="picker-item-main">
                          <span class="picker-item-name">{exo.name}</span>
                          <span class={`exo-type type-${exo.type}`}>
                            {exo.type}
                          </span>
                        </div>
                        <div class="picker-item-meta">
                          <span class="exo-group-badge">
                            {LABEL[exo._group] ?? exo._group}
                          </span>
                          <Show when={exo.equipment}>
                            <span class="exo-equip-badge">
                              {EQUIPMENT_LABEL[exo.equipment] ?? exo.equipment}
                            </span>
                          </Show>
                          <span class="picker-item-muscles">
                            {exo.muscles.slice(0, 2).join(" · ")}
                          </span>
                        </div>
                      </button>
                    </li>
                  )}
                </For>
              </ul>
            </Show>
          </div>
        </Show>

        <div class="session-actions">
          <button
            class="btn-primary"
            onClick={() => navigate("/training/ongoing")}
          >
            ▶ Démarrer la séance
          </button>
          <Show
            when={!showSave()}
            fallback={
              <form class="save-form" onSubmit={handleSave}>
                <input
                  class="form-input"
                  placeholder="Nom de la séance (optionnel)"
                  value={saveName()}
                  onInput={(e) => setSaveName(e.target.value)}
                  autofocus
                />
                <div class="save-form-actions">
                  <button class="btn-primary" type="submit">
                    Enregistrer
                  </button>
                  <button
                    class="btn-secondary"
                    type="button"
                    onClick={() => {
                      setShowSave(false);
                      setSaveName("");
                    }}
                  >
                    Annuler
                  </button>
                </div>
              </form>
            }
          >
            <button class="btn-primary" onClick={() => setShowSave(true)}>
              {saveDone() ? "✓ Séance enregistrée" : "💾 Enregistrer la séance"}
            </button>
          </Show>
          <button class="btn-secondary" onClick={() => regenerer()}>
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
