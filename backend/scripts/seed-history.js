// Génère un historique de séances réalistes pour tester l'app.
//
// Lancer (depuis backend/) :
//   bun run scripts/seed-history.js          → seed normal
//   bun run scripts/seed-history.js --reset  → wipe avant seed
//
// Le script écrit directement en SQLite via db.js. Il pose des dates de
// `finished_at` dans le passé pour simuler un usage étalé sur 8 semaines.

import { resolve } from "node:path";
import { db } from "../src/storage/db.js";

const RESET = process.argv.includes("--reset");

// ------------------------------------------------------------------
// 1. Charge exo.json pour avoir les vrais ids / muscles / équipements
// ------------------------------------------------------------------

const exoPath = resolve(
  import.meta.dir,
  "..",
  "..",
  "frontend",
  "src",
  "data",
  "exo.json"
);
const exoData = await Bun.file(exoPath).json();

const byId = {};
for (const [g, exos] of Object.entries(exoData)) {
  for (const exo of exos) byId[exo.id] = { ...exo, group: g };
}
function exoById(id) {
  if (!byId[id]) throw new Error(`unknown exo id: ${id}`);
  return byId[id];
}

// ------------------------------------------------------------------
// 2. Programmes hebdomadaires (split push/pull/legs + shoulders)
//    days: 0=dim, 1=lundi, ... 6=samedi
// ------------------------------------------------------------------

const programmes = [
  {
    day: 1, // lundi : push
    musculaire: "pectoraux",
    objectif: "force",
    exercises: [
      { id: "bench-press", baseLoad: 60, baseReps: 8, sets: 4, repos: 150 },
      { id: "incline-bench-press", baseLoad: 50, baseReps: 8, sets: 3, repos: 120 },
      { id: "dumbbell-press", baseLoad: 22, baseReps: 10, sets: 3, repos: 90 },
      { id: "tricep-pushdown", baseLoad: 25, baseReps: 12, sets: 3, repos: 60 },
    ],
  },
  {
    day: 2, // mardi : pull
    musculaire: "dos",
    objectif: "prise de muscle",
    exercises: [
      { id: "pull-up", baseLoad: 0, baseReps: 6, sets: 4, repos: 120 },
      { id: "row-barbell", baseLoad: 55, baseReps: 8, sets: 4, repos: 120 },
      { id: "lat-pulldown", baseLoad: 50, baseReps: 10, sets: 3, repos: 90 },
      { id: "bicep-curl-bar", baseLoad: 25, baseReps: 10, sets: 3, repos: 60 },
    ],
  },
  {
    day: 4, // jeudi : legs
    musculaire: "jambes",
    objectif: "force",
    exercises: [
      { id: "squat", baseLoad: 80, baseReps: 6, sets: 4, repos: 180 },
      { id: "deadlift", baseLoad: 100, baseReps: 5, sets: 3, repos: 180 },
      { id: "lunge", baseLoad: 18, baseReps: 10, sets: 3, repos: 90 },
      { id: "leg-press", baseLoad: 120, baseReps: 10, sets: 3, repos: 120 },
    ],
  },
  {
    day: 5, // vendredi : shoulders + arms + abs
    musculaire: "épaules",
    objectif: "tonification",
    exercises: [
      { id: "ohp", baseLoad: 40, baseReps: 6, sets: 4, repos: 120 },
      { id: "lateral-raise", baseLoad: 10, baseReps: 12, sets: 3, repos: 60 },
      { id: "hammer-curl", baseLoad: 14, baseReps: 12, sets: 3, repos: 60 },
      { id: "plank", baseLoad: 0, baseReps: 60, sets: 3, repos: 60 },
    ],
  },
];

// ------------------------------------------------------------------
// 3. Stratégies de progression / signaux pour le coach
// ------------------------------------------------------------------

const DIFF = ["facile", "moyen", "difficile", "tres-difficile"];

// Renvoie { charge, reps, difficulte } pour un exo donné à la semaine w
function computePerf(p, w) {
  const exo = exoById(p.id);
  let charge = p.baseLoad;
  let reps = p.baseReps;
  let difficulte = "moyen";

  switch (p.id) {
    // --- BENCH PRESS : progression linéaire 60→72.5kg puis stagnation +
    //                   ressenti "difficile/très difficile" sur les 3 dernières semaines
    case "bench-press": {
      const ladder = [60, 62.5, 65, 65, 67.5, 70, 70, 72.5]; // 8 sem
      charge = ladder[w] ?? p.baseLoad;
      reps = w >= 5 ? 6 : p.baseReps;
      if (w === 5) difficulte = "difficile";
      else if (w >= 6) difficulte = "tres-difficile";
      else difficulte = w >= 3 ? "moyen" : "moyen";
      break;
    }
    // --- LATERAL RAISE : aucune progression, ressenti "facile" partout
    //                     → l'IA devrait suggérer d'augmenter la charge
    case "lateral-raise":
      charge = 10;
      reps = 12;
      difficulte = "facile";
      break;
    // --- DEADLIFT : progression 100→125 puis ressenti "très difficile" sur les 2 dernières
    //                → signal de deload ou de masquage
    case "deadlift": {
      const ladder = [100, 105, 110, 115, 120, 120, 125, 125];
      charge = ladder[w] ?? p.baseLoad;
      reps = 5;
      if (w >= 6) difficulte = "tres-difficile";
      else if (w >= 4) difficulte = "difficile";
      else difficulte = "moyen";
      break;
    }
    // --- SQUAT : progression saine
    case "squat": {
      charge = 80 + Math.floor(w * 2.5);
      reps = 6;
      difficulte = w % 3 === 0 ? "difficile" : "moyen";
      break;
    }
    // --- PULL UP : poids corps + lest progressif
    case "pull-up": {
      charge = w >= 4 ? Math.floor((w - 3) * 2.5) : 0; // 0,0,0,0,2.5,5,7.5,10
      reps = 6 + Math.min(w, 4);
      difficulte = "moyen";
      break;
    }
    // --- OHP : progression douce
    case "ohp": {
      charge = 40 + Math.floor(w * 1.25);
      reps = 6;
      difficulte = w >= 5 ? "difficile" : "moyen";
      break;
    }
    // --- PLANK : durée croissante
    case "plank":
      charge = 0;
      reps = 45 + w * 5;
      difficulte = w >= 4 ? "difficile" : "moyen";
      break;
    // --- Défaut : progression standard +2.5% par semaine
    default: {
      const inc = exo.equipment === "salle de musculation" ? 2.5 : 1.5;
      charge = Math.max(0, Math.round((p.baseLoad + w * inc) * 10) / 10);
      reps = p.baseReps;
      difficulte = DIFF[Math.min(1 + Math.floor(w / 4), 3)];
      break;
    }
  }

  return { charge, reps, difficulte };
}

// Durée d'un exo : approximative, séries × ~35s + repos × (séries-1), en minutes
function exoMinutes(sets, repos) {
  const totalSec = sets * 35 + Math.max(0, sets - 1) * repos;
  return Math.ceil(totalSec / 60);
}

// ------------------------------------------------------------------
// 4. (Re)set + génération
// ------------------------------------------------------------------

if (RESET) {
  db.exec("DELETE FROM completed_sessions");
  db.exec("DELETE FROM sessions");
  db.exec("DELETE FROM scheduled_workouts");
  db.exec("DELETE FROM agent_actions");
  console.log("[seed] reset effectué : completed_sessions, sessions, scheduled_workouts, agent_actions");
}

const insertCompleted = db.query(`
  INSERT INTO completed_sessions
    (id, finished_at, duration_seconds, musculaire, objectif, session_json, feedbacks_json)
  VALUES (?, ?, ?, ?, ?, ?, ?)
`);

const insertSaved = db.query(`
  INSERT INTO sessions
    (id, name, created_at, musculaire, objectif, duree, duree_estimee, session_json)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`);

const insertScheduled = db.query(`
  INSERT INTO scheduled_workouts
    (id, scheduled_for, created_at, created_by, musculaire, objectif, session_json, justification, done_at)
  VALUES (?, ?, ?, 'agent', ?, ?, ?, ?, NULL)
`);

const WEEKS = 8;
const startTs = Date.now() - WEEKS * 7 * 86400 * 1000;
const startDate = new Date(startTs);
startDate.setHours(0, 0, 0, 0);

let inserted = 0;

for (let w = 0; w < WEEKS; w++) {
  for (const prog of programmes) {
    const finishedAt = new Date(startDate);
    finishedAt.setDate(finishedAt.getDate() + w * 7 + prog.day);
    finishedAt.setHours(18, 30 + Math.floor(Math.random() * 30), 0, 0);

    const exercises = prog.exercises.map((p) => {
      const exo = exoById(p.id);
      const minutes = exoMinutes(p.sets, p.repos);
      return {
        id: exo.id,
        name: exo.name,
        type: exo.type,
        equipment: exo.equipment,
        muscles: exo.muscles,
        video: exo.video ?? "",
        series: p.sets,
        reps: String(p.baseReps),
        repos: p.repos,
        dureeTotale: minutes,
      };
    });

    const feedbacks = {};
    for (const p of prog.exercises) {
      const perf = computePerf(p, w);
      feedbacks[p.id] = {
        charge: String(perf.charge),
        reps: String(perf.reps),
        difficulte: perf.difficulte,
      };
    }

    const totalMinutes =
      exercises.reduce((s, e) => s + e.dureeTotale, 0) + 10; // +10min échauffement
    const durationSeconds = totalMinutes * 60 + Math.floor(Math.random() * 180);

    const session = {
      musculaire: prog.musculaire,
      objectif: prog.objectif,
      duree: totalMinutes,
      dureeEstimee: totalMinutes,
      equipement: ["salle de musculation"],
      params: { series: 0, reps: 0, repos: 0, secondesParSerie: 0 },
      exercises,
    };

    const id = `c-seed-w${w}-d${prog.day}`;
    insertCompleted.run(
      id,
      finishedAt.toISOString(),
      durationSeconds,
      prog.musculaire,
      prog.objectif,
      JSON.stringify(session),
      JSON.stringify(feedbacks)
    );
    inserted += 1;
  }
}

// ------------------------------------------------------------------
// 5. Quelques séances enregistrées (modèles relançables)
// ------------------------------------------------------------------

const savedTemplates = [
  programmes[0], // push
  programmes[1], // pull
  programmes[2], // legs
];

let savedCount = 0;
for (const prog of savedTemplates) {
  const exercises = prog.exercises.map((p) => {
    const exo = exoById(p.id);
    return {
      id: exo.id,
      name: exo.name,
      type: exo.type,
      equipment: exo.equipment,
      muscles: exo.muscles,
      video: exo.video ?? "",
      series: p.sets,
      reps: String(p.baseReps),
      repos: p.repos,
      dureeTotale: exoMinutes(p.sets, p.repos),
    };
  });
  const totalMinutes = exercises.reduce((s, e) => s + e.dureeTotale, 0) + 10;
  const session = {
    musculaire: prog.musculaire,
    objectif: prog.objectif,
    duree: totalMinutes,
    dureeEstimee: totalMinutes,
    equipement: ["salle de musculation"],
    params: { series: 0, reps: 0, repos: 0, secondesParSerie: 0 },
    exercises,
  };
  const id = `s-seed-${prog.musculaire}`;
  insertSaved.run(
    id,
    `Séance ${prog.musculaire} (${prog.objectif})`,
    new Date().toISOString(),
    prog.musculaire,
    prog.objectif,
    totalMinutes,
    totalMinutes,
    JSON.stringify(session)
  );
  savedCount += 1;
}

// ------------------------------------------------------------------
// 6. 1 séance planifiée par l'agent (pour montrer la fonctionnalité)
// ------------------------------------------------------------------

const tomorrow = new Date();
tomorrow.setDate(tomorrow.getDate() + 1);
tomorrow.setHours(18, 0, 0, 0);
const recoveryExos = [
  { id: "lateral-raise", series: 3, reps: "15", repos: 45 },
  { id: "plank", series: 3, reps: "45", repos: 45 },
  { id: "bicep-curl-bar", series: 3, reps: "12", repos: 60 },
];
const recoverySession = {
  musculaire: "épaules",
  objectif: "tonification",
  exercises: recoveryExos.map((p) => {
    const exo = exoById(p.id);
    return {
      id: exo.id,
      name: exo.name,
      type: exo.type,
      muscles: exo.muscles,
      equipment: exo.equipment,
      series: p.series,
      reps: p.reps,
      repos: p.repos,
    };
  }),
};
insertScheduled.run(
  "sw-seed-recovery",
  tomorrow.toISOString(),
  new Date().toISOString(),
  "épaules",
  "tonification",
  JSON.stringify(recoverySession),
  "Séance légère planifiée après deux semaines de charges lourdes."
);

// ------------------------------------------------------------------
// 7. Résumé
// ------------------------------------------------------------------

const completedCount = db
  .query("SELECT COUNT(*) AS n FROM completed_sessions")
  .get().n;
const savedTotal = db.query("SELECT COUNT(*) AS n FROM sessions").get().n;
const scheduledCount = db
  .query("SELECT COUNT(*) AS n FROM scheduled_workouts")
  .get().n;

console.log("");
console.log("✓ seed terminé");
console.log(`  - ${inserted} séances terminées insérées (${completedCount} au total)`);
console.log(`  - ${savedCount} séances enregistrées (${savedTotal} au total)`);
console.log(`  - ${scheduledCount} séance(s) planifiée(s)`);
console.log("");
console.log("Signaux exploitables par le coach :");
console.log("  • bench-press : stagnation autour de 70kg + ressenti 'très difficile'");
console.log("  • lateral-raise : 10kg × 12 'facile' depuis 8 semaines → augmenter charge");
console.log("  • deadlift : progression 100→125kg puis 'très difficile' → deload");
