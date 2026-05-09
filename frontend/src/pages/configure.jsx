import { createSignal } from "solid-js";
import { useNavigate } from "@solidjs/router";
import { setSessionConfig, setCurrentSession } from "../store/session.js";
import { generateTraining } from "../data/algo.js";
import { For } from "solid-js";

const GROUPES = [
  "pectoraux",
  "dos",
  "jambes",
  "épaules",
  "bras",
  "abdominaux",
  "full body",
];
const DUREES = [30, 45, 60, 90, 120, 150];
const OBJECTIF = ["endurance", "prise de muscle", "force", "tonification"];

export default function Configure() {
  const navigate = useNavigate();

  const [musculaire, setMusculaire] = createSignal(GROUPES[0]);
  const [duree, setDuree] = createSignal(DUREES[0]);
  const [objectif, setObjectif] = createSignal(OBJECTIF[0]);

  const handleSubmit = () => {
    const config = {
      musculaire: musculaire(),
      duree: duree(),
      objectif: objectif(),
    };
    const training = generateTraining(config);
    setSessionConfig(config);
    setCurrentSession(training);
    navigate("/training");
  };
  return (
    <main class="configure">
      <header class="exercises-header">
        <button class="btn-back" onClick={() => navigate("/")}>
          ← Retour
        </button>
        <h2>Ta séance</h2>
      </header>
      <label>
        Groupe musculaire
        <select onInput={(e) => setMusculaire(e.target.value)}>
          <For each={GROUPES}>{(g) => <option value={g}>{g}</option>}</For>
        </select>
      </label>
      <label>
        Durée
        <div class="radio-group">
          <For each={DUREES}>
            {(d) => (
              <label class="radio-option">
                <input
                  type="radio"
                  name="duree"
                  value={d}
                  checked={duree() === d}
                  onChange={() => setDuree(d)}
                />
                {d} min
              </label>
            )}
          </For>
        </div>
      </label>
      <label>
        Objectif
        <select onInput={(e) => setObjectif(e.target.value)}>
          <For each={OBJECTIF}>{(o) => <option value={o}>{o}</option>}</For>
        </select>
      </label>
      <button class="btn-primary" onClick={handleSubmit}>
        Générer ma séance →
      </button>
    </main>
  );
}
