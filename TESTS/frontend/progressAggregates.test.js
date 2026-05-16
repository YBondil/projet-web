import { describe, test, expect } from "bun:test";
import { resolve } from "node:path";

const mod = await import(
  resolve(
    import.meta.dir,
    "..",
    "..",
    "frontend",
    "src",
    "data",
    "progressAggregates.js"
  )
);
const {
  findGroupForExo,
  aggregateByExercise,
  recordsFor,
  recordsByGroup,
  groupStats,
  statsByExercise,
} = mod;

// Petit pool d'exercices simulé pour les tests
const ALL_EXOS = {
  pectoraux: [
    { id: "bench", name: "Développé couché", muscles: ["pectoraux"] },
    { id: "incline-press", name: "Développé incliné", muscles: ["pectoraux"] },
  ],
  dos: [
    { id: "tractions", name: "Tractions", muscles: ["dorsaux"] },
    { id: "rowing", name: "Rowing", muscles: ["dorsaux"] },
  ],
  jambes: [{ id: "squat", name: "Squat", muscles: ["quadriceps"] }],
};

function makeCompleted({
  id = "c-x",
  finishedAt,
  musculaire = "dos",
  objectif = "force",
  durationSeconds = 1800,
  exercises = [],
  feedbacks = {},
}) {
  return {
    id,
    finishedAt: finishedAt ?? new Date().toISOString(),
    durationSeconds,
    musculaire,
    objectif,
    session: { musculaire, objectif, exercises },
    feedbacks,
  };
}

// ============================================================
describe("findGroupForExo", () => {
  test("trouve le groupe quand l'exo existe dans le pool", () => {
    expect(findGroupForExo("bench", ALL_EXOS)).toBe("pectoraux");
    expect(findGroupForExo("squat", ALL_EXOS)).toBe("jambes");
  });

  test("retourne le fallback quand l'exo n'est pas dans le pool", () => {
    expect(findGroupForExo("inconnu", ALL_EXOS, "dos")).toBe("dos");
  });

  test("retourne null si pas de fallback et exo absent", () => {
    expect(findGroupForExo("inconnu", ALL_EXOS)).toBeNull();
  });

  test("retourne le fallback (ou null) si allExos est null/undefined", () => {
    expect(findGroupForExo("bench", null, "abdominaux")).toBe("abdominaux");
    expect(findGroupForExo("bench", undefined)).toBeNull();
  });
});

// ============================================================
describe("aggregateByExercise", () => {
  test("retourne [] pour un historique vide", () => {
    expect(aggregateByExercise([], ALL_EXOS)).toEqual([]);
  });

  test("ignore les exercices sans feedback", () => {
    const completed = [
      makeCompleted({
        exercises: [{ id: "bench", name: "Développé couché", muscles: [] }],
        feedbacks: {},
      }),
    ];
    expect(aggregateByExercise(completed, ALL_EXOS)).toEqual([]);
  });

  test("ignore un feedback qui ne contient ni charge ni reps valides", () => {
    const completed = [
      makeCompleted({
        exercises: [{ id: "bench", name: "Développé couché", muscles: [] }],
        feedbacks: { bench: { charge: "abc", reps: "" } },
      }),
    ];
    expect(aggregateByExercise(completed, ALL_EXOS)).toEqual([]);
  });

  test("agrège un exo travaillé sur plusieurs séances", () => {
    const completed = [
      makeCompleted({
        id: "c-1",
        finishedAt: "2025-01-01T10:00:00.000Z",
        exercises: [{ id: "bench", name: "Développé couché", muscles: ["pectoraux"] }],
        feedbacks: { bench: { charge: "60", reps: "8", difficulte: "moyen" } },
      }),
      makeCompleted({
        id: "c-2",
        finishedAt: "2025-02-01T10:00:00.000Z",
        exercises: [{ id: "bench", name: "Développé couché", muscles: ["pectoraux"] }],
        feedbacks: { bench: { charge: "70", reps: "6", difficulte: "difficile" } },
      }),
    ];
    const out = aggregateByExercise(completed, ALL_EXOS);
    expect(out.length).toBe(1);
    expect(out[0].id).toBe("bench");
    expect(out[0].name).toBe("Développé couché");
    expect(out[0].group).toBe("pectoraux");
    expect(out[0].points.length).toBe(2);
  });

  test("trie les points par date croissante (du plus ancien au plus récent)", () => {
    const completed = [
      makeCompleted({
        id: "c-recent",
        finishedAt: "2025-03-01T10:00:00.000Z",
        exercises: [{ id: "bench", name: "Bench", muscles: [] }],
        feedbacks: { bench: { charge: "80", reps: "5" } },
      }),
      makeCompleted({
        id: "c-old",
        finishedAt: "2025-01-01T10:00:00.000Z",
        exercises: [{ id: "bench", name: "Bench", muscles: [] }],
        feedbacks: { bench: { charge: "60", reps: "8" } },
      }),
    ];
    const out = aggregateByExercise(completed, ALL_EXOS);
    expect(out[0].points[0].charge).toBe(60);
    expect(out[0].points[1].charge).toBe(80);
  });

  test("utilise musculaire de la séance comme fallback de group quand l'exo n'est pas dans le pool", () => {
    const completed = [
      makeCompleted({
        musculaire: "abdominaux",
        exercises: [{ id: "exo-inconnu", name: "Exo custom", muscles: [] }],
        feedbacks: { "exo-inconnu": { charge: "10", reps: "10" } },
      }),
    ];
    const out = aggregateByExercise(completed, ALL_EXOS);
    expect(out[0].group).toBe("abdominaux");
  });

  test("conserve les performances charge-seule ou reps-seule", () => {
    const completed = [
      makeCompleted({
        exercises: [{ id: "bench", name: "Bench", muscles: [] }],
        feedbacks: { bench: { charge: "50", reps: "" } },
      }),
      makeCompleted({
        id: "c-2",
        finishedAt: "2025-02-01T10:00:00.000Z",
        exercises: [{ id: "bench", name: "Bench", muscles: [] }],
        feedbacks: { bench: { charge: "", reps: "12" } },
      }),
    ];
    const out = aggregateByExercise(completed, ALL_EXOS);
    expect(out[0].points.length).toBe(2);
    expect(out[0].points.find((p) => p.charge === 50).reps).toBeNull();
    expect(out[0].points.find((p) => p.reps === 12).charge).toBeNull();
  });
});

// ============================================================
describe("recordsFor", () => {
  test("retourne [] pour un agrégat vide", () => {
    expect(recordsFor([])).toEqual([]);
  });

  test("garde la charge max par exercice", () => {
    const aggregates = [
      {
        id: "bench",
        name: "Bench",
        group: "pectoraux",
        points: [
          { date: "2025-01-01", charge: 50, reps: 8, difficulte: null },
          { date: "2025-02-01", charge: 70, reps: 5, difficulte: null },
          { date: "2025-03-01", charge: 65, reps: 6, difficulte: null },
        ],
      },
    ];
    const records = recordsFor(aggregates);
    expect(records.length).toBe(1);
    expect(records[0].charge).toBe(70);
    expect(records[0].date).toBe("2025-02-01");
  });

  test("ignore les exercices qui n'ont aucune charge enregistrée", () => {
    const aggregates = [
      {
        id: "bench",
        name: "Bench",
        group: "pectoraux",
        points: [{ date: "2025-01-01", charge: null, reps: 10, difficulte: null }],
      },
    ];
    expect(recordsFor(aggregates)).toEqual([]);
  });

  test("trie les records par charge décroissante", () => {
    const aggregates = [
      {
        id: "a",
        name: "A",
        group: "pectoraux",
        points: [{ date: "2025-01-01", charge: 30, reps: 10, difficulte: null }],
      },
      {
        id: "b",
        name: "B",
        group: "dos",
        points: [{ date: "2025-01-01", charge: 80, reps: 5, difficulte: null }],
      },
      {
        id: "c",
        name: "C",
        group: "jambes",
        points: [{ date: "2025-01-01", charge: 50, reps: 8, difficulte: null }],
      },
    ];
    const records = recordsFor(aggregates);
    expect(records.map((r) => r.id)).toEqual(["b", "c", "a"]);
  });
});

// ============================================================
describe("recordsByGroup", () => {
  test("regroupe les records par groupe musculaire", () => {
    const aggregates = [
      {
        id: "bench",
        name: "Bench",
        group: "pectoraux",
        points: [{ date: "2025-01-01", charge: 70, reps: 5, difficulte: null }],
      },
      {
        id: "incline",
        name: "Incliné",
        group: "pectoraux",
        points: [{ date: "2025-01-01", charge: 50, reps: 8, difficulte: null }],
      },
      {
        id: "squat",
        name: "Squat",
        group: "jambes",
        points: [{ date: "2025-01-01", charge: 120, reps: 5, difficulte: null }],
      },
    ];
    const byGroup = recordsByGroup(aggregates);
    expect(Object.keys(byGroup).sort()).toEqual(["jambes", "pectoraux"]);
    expect(byGroup.pectoraux.length).toBe(2);
    expect(byGroup.jambes.length).toBe(1);
  });

  test("met les exos sans groupe dans la bucket 'autre'", () => {
    const aggregates = [
      {
        id: "orphan",
        name: "Orphelin",
        group: null,
        points: [{ date: "2025-01-01", charge: 10, reps: 10, difficulte: null }],
      },
    ];
    const byGroup = recordsByGroup(aggregates);
    expect(byGroup.autre.length).toBe(1);
    expect(byGroup.autre[0].name).toBe("Orphelin");
  });
});

// ============================================================
describe("groupStats", () => {
  test("compte les séances par groupe musculaire de la séance", () => {
    const completed = [
      makeCompleted({ id: "c-1", musculaire: "dos" }),
      makeCompleted({ id: "c-2", musculaire: "dos" }),
      makeCompleted({ id: "c-3", musculaire: "pectoraux" }),
    ];
    const stats = groupStats([], completed);
    expect(stats.dos.sessionCount).toBe(2);
    expect(stats.pectoraux.sessionCount).toBe(1);
  });

  test("compte les exercices distincts par groupe + calcule le PR du groupe", () => {
    const aggregates = [
      {
        id: "bench",
        name: "Bench",
        group: "pectoraux",
        points: [{ date: "2025-01-01", charge: 70, reps: 5, difficulte: null }],
      },
      {
        id: "incline",
        name: "Incliné",
        group: "pectoraux",
        points: [
          { date: "2025-01-01", charge: 50, reps: 8, difficulte: null },
          { date: "2025-02-01", charge: 55, reps: 7, difficulte: null },
        ],
      },
    ];
    const stats = groupStats(aggregates, []);
    expect(stats.pectoraux.exercises.length).toBe(2);
    expect(stats.pectoraux.topCharge).toBe(70);
  });

  test("trie les exercices d'un groupe par PR décroissant", () => {
    const aggregates = [
      {
        id: "low",
        name: "Léger",
        group: "pectoraux",
        points: [{ date: "2025-01-01", charge: 40, reps: 10, difficulte: null }],
      },
      {
        id: "high",
        name: "Lourd",
        group: "pectoraux",
        points: [{ date: "2025-01-01", charge: 80, reps: 5, difficulte: null }],
      },
    ];
    const stats = groupStats(aggregates, []);
    expect(stats.pectoraux.exercises.map((e) => e.name)).toEqual([
      "Lourd",
      "Léger",
    ]);
  });

  test("lastDate du groupe = date la plus récente parmi les exos", () => {
    const aggregates = [
      {
        id: "a",
        name: "A",
        group: "dos",
        points: [{ date: "2025-01-10T00:00:00.000Z", charge: 40, reps: 10, difficulte: null }],
      },
      {
        id: "b",
        name: "B",
        group: "dos",
        points: [
          { date: "2025-01-05T00:00:00.000Z", charge: 30, reps: 8, difficulte: null },
          { date: "2025-03-20T00:00:00.000Z", charge: 35, reps: 8, difficulte: null },
        ],
      },
    ];
    const stats = groupStats(aggregates, []);
    expect(stats.dos.lastDate).toBe("2025-03-20T00:00:00.000Z");
  });

  test("regroupe les séances et les exos même quand l'un n'a pas de pendant dans l'autre", () => {
    const aggregates = [
      {
        id: "bench",
        name: "Bench",
        group: "pectoraux",
        points: [{ date: "2025-01-01", charge: 70, reps: 5, difficulte: null }],
      },
    ];
    const completed = [
      makeCompleted({ musculaire: "dos" }),
      makeCompleted({ id: "c-2", musculaire: "dos" }),
    ];
    const stats = groupStats(aggregates, completed);
    expect(stats.pectoraux.sessionCount).toBe(0);
    expect(stats.pectoraux.exercises.length).toBe(1);
    expect(stats.dos.sessionCount).toBe(2);
    expect(stats.dos.exercises.length).toBe(0);
  });
});

// ============================================================
describe("statsByExercise", () => {
  test("retourne null si l'exo n'est pas dans l'agrégat", () => {
    expect(statsByExercise([], "inconnu")).toBeNull();
  });

  test("calcule pr (point avec charge max), lastPoint, sessionCount et totalReps", () => {
    const aggregates = [
      {
        id: "bench",
        name: "Bench",
        group: "pectoraux",
        muscles: ["pectoraux"],
        points: [
          { date: "2025-01-01", charge: 60, reps: 8, difficulte: "moyen" },
          { date: "2025-02-01", charge: 70, reps: 6, difficulte: "difficile" },
          { date: "2025-03-01", charge: 65, reps: 7, difficulte: "moyen" },
        ],
      },
    ];
    const stats = statsByExercise(aggregates, "bench");
    expect(stats.pr.charge).toBe(70);
    expect(stats.pr.date).toBe("2025-02-01");
    expect(stats.lastPoint.date).toBe("2025-03-01");
    expect(stats.sessionCount).toBe(3);
    expect(stats.totalReps).toBe(8 + 6 + 7);
  });

  test("pr null si aucune charge enregistrée", () => {
    const aggregates = [
      {
        id: "bench",
        name: "Bench",
        group: "pectoraux",
        muscles: [],
        points: [
          { date: "2025-01-01", charge: null, reps: 10, difficulte: null },
        ],
      },
    ];
    const stats = statsByExercise(aggregates, "bench");
    expect(stats.pr).toBeNull();
    expect(stats.sessionCount).toBe(1);
    expect(stats.totalReps).toBe(10);
  });
});
