export const EQUIPMENTS = [
  "poids du corps",
  "haltères",
  "bande de résistance",
  "kettlebell",
  "salle de musculation",
];

export const EQUIPMENT_LABEL = {
  "poids du corps": "Poids du corps",
  haltères: "Haltères",
  "bande de résistance": "Bande de résistance",
  kettlebell: "Kettlebell",
  "salle de musculation": "Salle de musculation",
};

export function filterByEquipment(pool, equipement) {
  if (!equipement || equipement.length === 0) return pool;
  if (equipement.includes("salle de musculation")) return pool;
  const set = new Set(equipement);
  return pool.filter((e) => set.has(e.equipment));
}
