import exercises from "./exo.json";

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

const OBJECTIF_TO_TYPE = {
  force: "force",
  "prise de muscle": "force",
  endurance: "endurance",
  tonification: "tonification",
};

const MUSCLE_ORDER = {
  pectoraux: ["pectoraux", "triceps", "deltoïde antérieur", "grand dentelé"],
  dos: [
    "grand dorsal",
    "trapèze",
    "rhomboïdes",
    "érecteurs du rachis",
    "deltoïde postérieur",
    "biceps",
    "ischio-jambiers",
  ],
  jambes: [
    "quadriceps",
    "ischio-jambiers",
    "grand fessier",
    "adducteurs",
    "gastrocnémiens",
    "soléaire",
  ],
  épaules: [
    "deltoïde médial",
    "deltoïde antérieur",
    "deltoïde postérieur",
    "trapèze supérieur",
    "triceps",
  ],
  bras: [
    "biceps brachial",
    "triceps",
    "brachial",
    "brachioradial",
    "fléchisseurs de l'avant-bras",
  ],
  abdominaux: [
    "grand droit de l'abdomen",
    "grand droit",
    "transverse",
    "obliques",
    "iliopsoas",
  ],
  "full body": [
    "quadriceps",
    "grand dorsal",
    "grand fessier",
    "pectoraux",
    "ischio-jambiers",
    "trapèze",
    "deltoïde",
    "abdominaux",
    "avant-bras",
  ],
};

function normalizeMuscle(muscle) {
  return muscle
    .replace(/\s*\(.*?\)/g, "")
    .trim()
    .toLowerCase();
}

function primaryMuscle(exo) {
  return normalizeMuscle(exo.muscles[0]);
}
function dureeExercice(params) {
  const secondesRepos = params.repos * (params.series - 1);
  return Math.ceil(
    (params.series * params.secondesParSerie + secondesRepos) / 60,
  );
}

function shuffle(arr) {
  return [...arr].sort(() => Math.random() - 0.5);
}

export function generateTraining({ musculaire, duree, objectif }) {
  const params = PARAMS[objectif];
  const pool = exercises[musculaire] || [];
  const muscleOrder = MUSCLE_ORDER[musculaire] || [];

  const minutesDispos = duree - 10; // 10 min pour l'échauffement
  const minutesParExo = dureeExercice(params);
  const targetType = OBJECTIF_TO_TYPE[objectif];
  const maxExos = Math.max(3, Math.floor(minutesDispos / minutesParExo));

  const byMuscle = {};
  for (const exo of pool) {
    const m = primaryMuscle(exo);
    if (!byMuscle[m]) byMuscle[m] = [];
    byMuscle[m].push(exo);
  }
  const selection = [];
  const countPerMuscle = {};

  for (const muscle of muscleOrder) {
    if (selection.length >= maxExos) break;

    const selectedIds = new Set(selection.map((e) => e.id));
    const candidates = (byMuscle[muscle] || []).filter(
      (e) => !selectedIds.has(e.id),
    );
    const slots = Math.min(2, maxExos - selection.length);

    const prioritaires = shuffle(
      candidates.filter((e) => e.type === targetType),
    );
    const secondaires = shuffle(
      candidates.filter((e) => e.type !== targetType),
    );
    const ordonnes = [...prioritaires, ...secondaires];

    for (let i = 0; i < slots && i < ordonnes.length; i++) {
      const exo = ordonnes[i];
      selection.push(exo);
      countPerMuscle[muscle] = (countPerMuscle[muscle] || 0) + 1;
    }
  }

  if (selection.length < maxExos) {
    const selectedIds = new Set(selection.map((e) => e.id));
    const remaining = shuffle(pool).filter((e) => !selectedIds.has(e.id));

    for (const exo of remaining) {
      if (selection.length >= maxExos) break;
      const m = primaryMuscle(exo);
      if ((countPerMuscle[m] || 0) < 2) {
        selection.push(exo);
        countPerMuscle[m] = (countPerMuscle[m] || 0) + 1;
      }
    }
  }
  const exercisesWithParams = selection.map((exo) => ({
    ...exo,
    series: params.series,
    reps: params.reps,
    repos: params.repos,
    dureeTotale: dureeExercice(params),
  }));

  return {
    musculaire,
    duree,
    objectif,
    params,
    exercises: exercisesWithParams,
    dureeEstimee: selection.length * minutesParExo + 10,
  };
}
