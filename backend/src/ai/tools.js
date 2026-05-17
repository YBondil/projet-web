// Tools exposés à Gemini.
// Chaque tool est :
//   - validé via Zod (echec → message d'erreur structuré, pas de crash)
//   - tracé dans la table agent_actions avec previous_value_json pour réversibilité
//   - branché sur les modules storage existants

import { z } from "zod";
import {
  getExercise,
  setExerciseHiddenUntil,
  updateExerciseTargets,
  clearExpiredHidden,
} from "../storage/exercises.js";
import { createScheduledWorkout } from "../storage/scheduled-workouts.js";
import { logAction } from "../storage/agent-actions.js";

// -------- Schémas Zod --------

const HideExerciseInput = z.object({
  exerciseId: z.string().min(1),
  reason: z.string().min(3, "justification trop courte"),
  reintroduceAfterDays: z.number().int().min(1).max(180),
});

const ReintroduceInput = z.object({}).optional();

const AdjustLoadInput = z.object({
  exerciseId: z.string().min(1),
  newLoadKg: z.number().min(0).max(500),
  justification: z.string().min(3),
});

const AdjustVolumeInput = z.object({
  exerciseId: z.string().min(1),
  newSets: z.number().int().min(1).max(20),
  newReps: z.union([z.string(), z.number()]).transform(String),
  justification: z.string().min(3),
});

const ScheduleWorkoutInput = z.object({
  date: z
    .string()
    .refine(
      (v) => !Number.isNaN(new Date(v).getTime()),
      "date invalide : utilise ISO 8601"
    ),
  exercises: z
    .array(
      z.object({
        id: z.string().min(1),
        name: z.string().optional(),
        series: z.number().int().min(1).max(20).optional(),
        reps: z.union([z.string(), z.number()]).optional(),
        repos: z.number().int().min(0).max(600).optional(),
      })
    )
    .min(1, "au moins un exercice"),
  musculaire: z.string().optional(),
  objectif: z.string().optional(),
  justification: z.string().min(3),
});

// -------- Implémentations --------

function ok(message, updatedEntity = null) {
  return { success: true, message, updatedEntity };
}
function ko(message) {
  return { success: false, message };
}

export function hideExercise(rawInput) {
  const parsed = HideExerciseInput.safeParse(rawInput);
  if (!parsed.success) return ko(`invalid_args: ${parsed.error.message}`);
  const { exerciseId, reason, reintroduceAfterDays } = parsed.data;

  const before = getExercise(exerciseId);
  if (!before) return ko(`exercise_not_found: ${exerciseId}`);

  const reintroDate = new Date(
    Date.now() + reintroduceAfterDays * 24 * 60 * 60 * 1000
  ).toISOString();
  const result = setExerciseHiddenUntil(exerciseId, reintroDate);
  if (!result) return ko("update_failed");

  logAction({
    actionType: "hide_exercise",
    exerciseId,
    params: { reason, reintroduceAfterDays, hiddenUntil: reintroDate },
    previousValue: { hiddenUntil: before.hiddenUntil ?? null },
    justification: reason,
  });

  return ok(
    `Exercice "${before.name}" masqué jusqu'au ${reintroDate.slice(0, 10)}.`,
    result.after
  );
}

export function reintroduceHiddenExercises(_rawInput) {
  const _ = ReintroduceInput.safeParse(_rawInput);
  if (!_.success) return ko(`invalid_args: ${_.error.message}`);

  const nowIso = new Date().toISOString();
  const reactivatedIds = clearExpiredHidden(nowIso);
  if (reactivatedIds.length === 0) {
    return ok("Aucun exercice à réactiver pour le moment.", { reactivatedIds: [] });
  }

  logAction({
    actionType: "reintroduce_hidden_exercises",
    params: { reactivatedIds },
    justification: "Fin de la période de masquage automatique.",
  });

  return ok(
    `${reactivatedIds.length} exercice(s) réactivé(s).`,
    { reactivatedIds }
  );
}

export function adjustExerciseLoad(rawInput) {
  const parsed = AdjustLoadInput.safeParse(rawInput);
  if (!parsed.success) return ko(`invalid_args: ${parsed.error.message}`);
  const { exerciseId, newLoadKg, justification } = parsed.data;

  const before = getExercise(exerciseId);
  if (!before) return ko(`exercise_not_found: ${exerciseId}`);

  const result = updateExerciseTargets(exerciseId, { targetLoadKg: newLoadKg });
  if (!result) return ko("update_failed");

  logAction({
    actionType: "adjust_exercise_load",
    exerciseId,
    params: { newLoadKg },
    previousValue: { targetLoadKg: before.targetLoadKg ?? null },
    justification,
  });

  return ok(
    `Charge cible de "${before.name}" mise à ${newLoadKg} kg.`,
    result.after
  );
}

export function adjustExerciseVolume(rawInput) {
  const parsed = AdjustVolumeInput.safeParse(rawInput);
  if (!parsed.success) return ko(`invalid_args: ${parsed.error.message}`);
  const { exerciseId, newSets, newReps, justification } = parsed.data;

  const before = getExercise(exerciseId);
  if (!before) return ko(`exercise_not_found: ${exerciseId}`);

  const result = updateExerciseTargets(exerciseId, {
    targetSets: newSets,
    targetReps: newReps,
  });
  if (!result) return ko("update_failed");

  logAction({
    actionType: "adjust_exercise_volume",
    exerciseId,
    params: { newSets, newReps },
    previousValue: {
      targetSets: before.targetSets ?? null,
      targetReps: before.targetReps ?? null,
    },
    justification,
  });

  return ok(
    `Volume de "${before.name}" mis à ${newSets} × ${newReps} reps.`,
    result.after
  );
}

export function scheduleWorkout(rawInput) {
  const parsed = ScheduleWorkoutInput.safeParse(rawInput);
  if (!parsed.success) return ko(`invalid_args: ${parsed.error.message}`);
  const { date, exercises, musculaire, objectif, justification } = parsed.data;

  const session = {
    musculaire: musculaire ?? null,
    objectif: objectif ?? null,
    exercises,
  };
  const entry = createScheduledWorkout({
    scheduledFor: new Date(date).toISOString(),
    session,
    justification,
    createdBy: "agent",
  });

  logAction({
    actionType: "schedule_workout",
    params: { scheduledWorkoutId: entry.id, date: entry.scheduledFor, nbExos: exercises.length },
    justification,
  });

  return ok(
    `Séance planifiée pour le ${entry.scheduledFor.slice(0, 10)} (${exercises.length} exo${
      exercises.length > 1 ? "s" : ""
    }).`,
    entry
  );
}

// -------- Registre + déclarations pour Gemini --------

export const TOOL_HANDLERS = {
  hide_exercise: hideExercise,
  reintroduce_hidden_exercises: reintroduceHiddenExercises,
  adjust_exercise_load: adjustExerciseLoad,
  adjust_exercise_volume: adjustExerciseVolume,
  schedule_workout: scheduleWorkout,
};

// Schémas pour @google/genai (format functionDeclarations).
// On utilise des descriptions courtes et précises pour économiser des tokens.
export const GEMINI_TOOL_DECLARATIONS = [
  {
    functionDeclarations: [
      {
        name: "hide_exercise",
        description:
          "Masque un exercice du programme pour une durée donnée. " +
          "À utiliser si l'utilisateur signale une douleur, une blessure ou un dégoût récurrent pour cet exercice.",
        parametersJsonSchema: {
          type: "object",
          required: ["exerciseId", "reason", "reintroduceAfterDays"],
          properties: {
            exerciseId: { type: "string", description: "id de l'exercice issu du contexte" },
            reason: { type: "string", description: "Raison physiologique courte" },
            reintroduceAfterDays: {
              type: "integer",
              minimum: 1,
              maximum: 180,
              description: "Durée du masquage en jours",
            },
          },
        },
      },
      {
        name: "reintroduce_hidden_exercises",
        description:
          "Réactive tous les exercices dont la date de masquage est expirée. " +
          "À appeler en début de session si l'utilisateur veut faire le ménage.",
        parametersJsonSchema: { type: "object", properties: {} },
      },
      {
        name: "adjust_exercise_load",
        description:
          "Modifie la charge cible (kg) d'un exercice. " +
          "À utiliser quand l'historique montre une charge stagnante ou un ressenti récurrent 'facile'/'difficile'.",
        parametersJsonSchema: {
          type: "object",
          required: ["exerciseId", "newLoadKg", "justification"],
          properties: {
            exerciseId: { type: "string" },
            newLoadKg: { type: "number", minimum: 0, maximum: 500 },
            justification: { type: "string" },
          },
        },
      },
      {
        name: "adjust_exercise_volume",
        description:
          "Modifie le volume (séries × reps) d'un exercice. " +
          "À utiliser quand l'historique justifie un changement (deload, progression, etc.).",
        parametersJsonSchema: {
          type: "object",
          required: ["exerciseId", "newSets", "newReps", "justification"],
          properties: {
            exerciseId: { type: "string" },
            newSets: { type: "integer", minimum: 1, maximum: 20 },
            newReps: { type: "string", description: "ex: '8' ou '8-12'" },
            justification: { type: "string" },
          },
        },
      },
      {
        name: "schedule_workout",
        description:
          "Planifie une séance pour une date future. " +
          "Liste les exercices issus du contexte.",
        parametersJsonSchema: {
          type: "object",
          required: ["date", "exercises", "justification"],
          properties: {
            date: { type: "string", description: "ISO 8601" },
            musculaire: { type: "string" },
            objectif: { type: "string" },
            exercises: {
              type: "array",
              minItems: 1,
              items: {
                type: "object",
                required: ["id"],
                properties: {
                  id: { type: "string" },
                  name: { type: "string" },
                  series: { type: "integer", minimum: 1, maximum: 20 },
                  reps: { type: "string" },
                  repos: { type: "integer", minimum: 0, maximum: 600 },
                },
              },
            },
            justification: { type: "string" },
          },
        },
      },
    ],
  },
];

export function runTool(name, args) {
  const handler = TOOL_HANDLERS[name];
  if (!handler) return ko(`unknown_tool: ${name}`);
  return handler(args);
}
