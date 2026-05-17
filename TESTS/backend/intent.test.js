import { describe, test, expect } from "bun:test";
import { resolve } from "node:path";

const { detectIntent } = await import(
  resolve(import.meta.dir, "..", "..", "backend", "src", "ai", "intent.js")
);

function userMsg(content) {
  return [{ role: "user", content }];
}

describe("detectIntent — agentique", () => {
  test("verbe de modification → agentic (FR)", () => {
    expect(detectIntent(userMsg("masque le développé couché stp"))).toBe("agentic");
    expect(detectIntent(userMsg("augmente la charge sur les tractions"))).toBe("agentic");
    expect(detectIntent(userMsg("planifie ma séance de demain"))).toBe("agentic");
    expect(detectIntent(userMsg("retire les pompes pour 2 semaines"))).toBe("agentic");
  });

  test("ressenti négatif sur un exercice → agentic", () => {
    expect(detectIntent(userMsg("le squat est trop difficile en ce moment"))).toBe(
      "agentic"
    );
    expect(detectIntent(userMsg("j'ai mal au genou quand je fais des fentes"))).toBe(
      "agentic"
    );
  });

  test("mots-clés EN → agentic", () => {
    expect(detectIntent(userMsg("hide the bench press"))).toBe("agentic");
    expect(detectIntent(userMsg("schedule my next workout"))).toBe("agentic");
  });
});

describe("detectIntent — conversationnel", () => {
  test("question d'explication → conversational", () => {
    expect(detectIntent(userMsg("comment bien faire un soulevé de terre ?"))).toBe(
      "conversational"
    );
    expect(detectIntent(userMsg("c'est quoi la surcharge progressive ?"))).toBe(
      "conversational"
    );
    expect(detectIntent(userMsg("explique-moi le principe du deload"))).toBe(
      "conversational"
    );
  });

  test("salutation / message vide → conversational", () => {
    expect(detectIntent(userMsg("salut !"))).toBe("conversational");
    expect(detectIntent([])).toBe("conversational");
  });
});

describe("detectIntent — historique", () => {
  test("se base sur le dernier message utilisateur, pas les anciens", () => {
    const messages = [
      { role: "user", content: "augmente la charge" },
      { role: "assistant", content: "Fait." },
      { role: "user", content: "merci, et c'est quoi le deload ?" },
    ];
    expect(detectIntent(messages)).toBe("conversational");
  });

  test("ignore les rôles non-user", () => {
    const messages = [
      { role: "system", content: "masquer le squat" },
      { role: "user", content: "bonjour" },
    ];
    expect(detectIntent(messages)).toBe("conversational");
  });
});
