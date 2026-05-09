import { createSignal, For } from "solid-js";
import { useNavigate } from "@solidjs/router";
import { setSessionConfig, setCurrentSession } from "../store/session.js";
import { generateTraining } from "../data/algo.js";
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
const DUREES = [30, 45, 60, 90, 120, 150];
const OBJECTIF = ["endurance", "prise de muscle", "force", "tonification"];

export default function Configure() {
  const navigate = useNavigate();

  const [musculaire, setMusculaire] = createSignal(GROUPES[0]);
  const [duree, setDuree] = createSignal(DUREES[0]);
  const [objectif, setObjectif] = createSignal(OBJECTIF[0]);
  const [equipement, setEquipement] = createSignal([...EQUIPMENTS]);

  const toggleEquip = (eq) => {
    const cur = equipement();
    if (cur.includes(eq)) setEquipement(cur.filter((x) => x !== eq));
    else setEquipement([...cur, eq]);
  };

  const handleSubmit = () => {
    if (equipement().length === 0) return;
    const config = {
      musculaire: musculaire(),
      duree: duree(),
      objectif: objectif(),
      equipement: equipement(),
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
      <label>
        Équipement disponible
        <div class="checkbox-group">
          <For each={EQUIPMENTS}>
            {(eq) => (
              <button
                type="button"
                class={`checkbox-option${equipement().includes(eq) ? " checkbox-active" : ""}`}
                onClick={() => toggleEquip(eq)}
              >
                {EQUIPMENT_LABEL[eq] ?? eq}
              </button>
            )}
          </For>
        </div>
      </label>
      <button
        class="btn-primary"
        onClick={handleSubmit}
        disabled={equipement().length === 0}
      >
        Générer ma séance →
      </button>
    </main>
  );
}
