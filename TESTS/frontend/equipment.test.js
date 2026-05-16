import { describe, test, expect } from "bun:test";
import { resolve } from "node:path";

const equipmentMod = await import(
  resolve(import.meta.dir, "..", "..", "frontend", "src", "data", "equipment.js")
);
const { filterByEquipment, EQUIPMENTS, EQUIPMENT_LABEL } = equipmentMod;

const POOL = [
  { id: "a", name: "Pompes", equipment: "poids du corps" },
  { id: "b", name: "Curl haltère", equipment: "haltères" },
  { id: "c", name: "Tirage élastique", equipment: "bande de résistance" },
  { id: "d", name: "Swing", equipment: "kettlebell" },
  { id: "e", name: "Squat à la barre", equipment: "salle de musculation" },
];

describe("EQUIPMENTS", () => {
  test("expose les 5 équipements attendus", () => {
    expect(EQUIPMENTS).toEqual([
      "poids du corps",
      "haltères",
      "bande de résistance",
      "kettlebell",
      "salle de musculation",
    ]);
  });

  test("EQUIPMENT_LABEL contient un label pour chaque équipement", () => {
    for (const eq of EQUIPMENTS) {
      expect(typeof EQUIPMENT_LABEL[eq]).toBe("string");
      expect(EQUIPMENT_LABEL[eq].length).toBeGreaterThan(0);
    }
  });
});

describe("filterByEquipment", () => {
  test("retourne tout le pool si aucun équipement n'est précisé (undefined)", () => {
    expect(filterByEquipment(POOL, undefined)).toEqual(POOL);
  });

  test("retourne tout le pool si l'équipement est une liste vide", () => {
    expect(filterByEquipment(POOL, [])).toEqual(POOL);
  });

  test("retourne tout le pool si la salle de musculation est cochée (déverrouille tout)", () => {
    expect(filterByEquipment(POOL, ["salle de musculation"])).toEqual(POOL);
    expect(
      filterByEquipment(POOL, ["poids du corps", "salle de musculation"])
    ).toEqual(POOL);
  });

  test("ne garde que les exercices dont l'équipement est inclus dans la liste", () => {
    const res = filterByEquipment(POOL, ["poids du corps"]);
    expect(res).toEqual([{ id: "a", name: "Pompes", equipment: "poids du corps" }]);
  });

  test("filtre avec plusieurs équipements compatibles", () => {
    const res = filterByEquipment(POOL, ["poids du corps", "haltères"]);
    expect(res.map((e) => e.id).sort()).toEqual(["a", "b"]);
  });

  test("renvoie une liste vide si aucun exercice ne correspond", () => {
    expect(filterByEquipment(POOL, ["machine-fictive"])).toEqual([]);
  });

  test("ne mute pas le pool d'entrée", () => {
    const before = JSON.stringify(POOL);
    filterByEquipment(POOL, ["haltères"]);
    expect(JSON.stringify(POOL)).toBe(before);
  });
});
