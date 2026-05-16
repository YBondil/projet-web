import { describe, test, expect } from "bun:test";
import { resolve } from "node:path";

const algoMod = await import(
  resolve(import.meta.dir, "..", "..", "frontend", "src", "data", "algo.js")
);
const { dureeExercice, attachParams, recomputeEstimate, generateTraining } =
  algoMod;

const PARAMS = {
  endurance: { series: 3, reps: "15-20", repos: 45, secondesParSerie: 40 },
  force: { series: 5, reps: "4-6", repos: 180, secondesParSerie: 20 },
  "prise de muscle": {
    series: 4,
    reps: "8-12",
    repos: 90,
    secondesParSerie: 30,
  },
  tonification: { series: 3, reps: "12-15", repos: 60, secondesParSerie: 35 },
};

describe("dureeExercice", () => {
  test("formule = ceil((series * secParSerie + (series-1) * repos) / 60)", () => {
    expect(dureeExercice(PARAMS.force)).toBe(14);
    expect(dureeExercice(PARAMS.endurance)).toBe(4);
    expect(dureeExercice(PARAMS["prise de muscle"])).toBe(7);
    expect(dureeExercice(PARAMS.tonification)).toBe(4);
  });

  test("arrondit toujours vers le haut (Math.ceil)", () => {
    const p = { series: 2, reps: "x", repos: 30, secondesParSerie: 31 };
    expect(dureeExercice(p)).toBe(Math.ceil((2 * 31 + 1 * 30) / 60));
    expect(dureeExercice(p)).toBe(2);
  });
});

describe("attachParams", () => {
  test("ajoute series, reps, repos et dureeTotale à l'exercice", () => {
    const exo = { id: "x", name: "Test", muscles: ["pecs"] };
    const out = attachParams(exo, PARAMS.force);
    expect(out.id).toBe("x");
    expect(out.name).toBe("Test");
    expect(out.series).toBe(5);
    expect(out.reps).toBe("4-6");
    expect(out.repos).toBe(180);
    expect(out.dureeTotale).toBe(dureeExercice(PARAMS.force));
  });

  test("ne mute pas l'objet d'entrée", () => {
    const exo = { id: "x", name: "Test", muscles: ["pecs"] };
    const before = JSON.stringify(exo);
    attachParams(exo, PARAMS.endurance);
    expect(JSON.stringify(exo)).toBe(before);
  });
});

describe("recomputeEstimate", () => {
  test("renvoie nbExos * dureeExercice + 10 (échauffement)", () => {
    const session = {
      params: PARAMS.force,
      exercises: [{ id: "a" }, { id: "b" }, { id: "c" }],
    };
    expect(recomputeEstimate(session)).toBe(3 * dureeExercice(PARAMS.force) + 10);
  });

  test("retourne 10 pour une séance vide", () => {
    expect(
      recomputeEstimate({ params: PARAMS.force, exercises: [] })
    ).toBe(10);
  });
});

describe("generateTraining", () => {
  const baseInput = {
    musculaire: "dos",
    duree: 60,
    objectif: "force",
    equipement: ["salle de musculation"],
  };

  test("renvoie la config en sortie (musculaire, duree, objectif, equipement)", () => {
    const s = generateTraining(baseInput);
    expect(s.musculaire).toBe("dos");
    expect(s.duree).toBe(60);
    expect(s.objectif).toBe("force");
    expect(s.equipement).toEqual(["salle de musculation"]);
  });

  test("attache les params correspondant à l'objectif", () => {
    const s = generateTraining(baseInput);
    expect(s.params).toEqual(PARAMS.force);
  });

  test("renvoie un dureeEstimee cohérent avec le nb d'exercices", () => {
    const s = generateTraining(baseInput);
    const expected = s.exercises.length * dureeExercice(PARAMS.force) + 10;
    expect(s.dureeEstimee).toBe(expected);
  });

  test("garantit au minimum 3 exercices même si la durée est très courte", () => {
    const s = generateTraining({ ...baseInput, duree: 30 });
    expect(s.exercises.length).toBeGreaterThanOrEqual(3);
  });

  test("chaque exercice porte series/reps/repos/dureeTotale", () => {
    const s = generateTraining(baseInput);
    for (const exo of s.exercises) {
      expect(exo.series).toBe(PARAMS.force.series);
      expect(exo.reps).toBe(PARAMS.force.reps);
      expect(exo.repos).toBe(PARAMS.force.repos);
      expect(exo.dureeTotale).toBe(dureeExercice(PARAMS.force));
    }
  });

  test("les exercices ont chacun un id unique", () => {
    const s = generateTraining(baseInput);
    const ids = s.exercises.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  test("respecte la contrainte d'équipement quand on restreint à 'poids du corps'", () => {
    const s = generateTraining({
      ...baseInput,
      musculaire: "abdominaux",
      equipement: ["poids du corps"],
    });
    expect(s.exercises.length).toBeGreaterThan(0);
    for (const exo of s.exercises) {
      expect(exo.equipment).toBe("poids du corps");
    }
  });

  test("fonctionne pour tous les groupes musculaires", () => {
    const groupes = [
      "pectoraux",
      "dos",
      "jambes",
      "épaules",
      "bras",
      "abdominaux",
      "full body",
    ];
    for (const g of groupes) {
      const s = generateTraining({ ...baseInput, musculaire: g });
      expect(s.exercises.length).toBeGreaterThanOrEqual(3);
    }
  });

  test("fonctionne pour tous les objectifs", () => {
    const objectifs = ["endurance", "force", "prise de muscle", "tonification"];
    for (const o of objectifs) {
      const s = generateTraining({ ...baseInput, objectif: o });
      expect(s.params).toEqual(PARAMS[o]);
      expect(s.exercises.length).toBeGreaterThanOrEqual(3);
    }
  });

  test("appels successifs sont indépendants (pas de pollution d'état)", () => {
    const s1 = generateTraining(baseInput);
    const s2 = generateTraining(baseInput);
    expect(s1.exercises.length).toBeGreaterThan(0);
    expect(s2.exercises.length).toBeGreaterThan(0);
    expect(s1.musculaire).toBe(s2.musculaire);
  });
});
