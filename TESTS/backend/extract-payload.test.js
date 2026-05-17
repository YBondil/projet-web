import { describe, test, expect } from "bun:test";
import { resolve } from "node:path";

const { extractPayload } = await import(
  resolve(import.meta.dir, "..", "..", "backend", "src", "routes", "chat.js")
);

describe("extractPayload — texte naturel", () => {
  test("texte simple → message", () => {
    const p = extractPayload("Bonjour, comment progresser au bench ?");
    expect(p.type).toBe("message");
    expect(p.content).toContain("Bonjour");
  });

  test("texte vide → message d'erreur", () => {
    const p = extractPayload("");
    expect(p.type).toBe("message");
    expect(p.content).toContain("réponse vide");
  });
});

describe("extractPayload — JSON complet", () => {
  test('{"type":"message","content":"..."} → message', () => {
    const p = extractPayload(
      '{"type":"message","content":"Augmente la charge progressivement"}'
    );
    expect(p.type).toBe("message");
    expect(p.content).toBe("Augmente la charge progressivement");
  });

  test('{"type":"recommendation",...} → recommendation', () => {
    const p = extractPayload(
      JSON.stringify({
        type: "recommendation",
        title: "Deload bench",
        rationale: "Stagnation depuis 3 semaines.",
        actions: [{ label: "Réduire 10%", tool: "adjust_exercise_load" }],
      })
    );
    expect(p.type).toBe("recommendation");
    expect(p.title).toBe("Deload bench");
    expect(p.rationale).toContain("Stagnation");
    expect(p.actions.length).toBe(1);
  });

  test("JSON entouré de code fences ```json", () => {
    const p = extractPayload(
      '```json\n{"type":"message","content":"hello"}\n```'
    );
    expect(p.type).toBe("message");
    expect(p.content).toBe("hello");
  });
});

describe("extractPayload — JSON tronqué (max_tokens)", () => {
  test('"content" non fermé → extraction du texte partiel', () => {
    const truncated =
      '{"type":"message","content":"Tes sessions ont été jugées difficiles à quatre reprises';
    const p = extractPayload(truncated);
    expect(p.type).toBe("message");
    expect(p.content).toContain("Tes sessions");
    expect(p.content).not.toContain('"type"');
    expect(p.content).not.toContain('"content"');
  });

  test('"recommendation" tronquée sur rationale → message reconstitué', () => {
    const truncated =
      '{"type":"recommendation","title":"Ajustement de charge",' +
      '"rationale":"Tes sessions de Soulevé de terre ont été jugées très-difficile';
    const p = extractPayload(truncated);
    expect(p.type).toBe("message");
    expect(p.content).toContain("Ajustement de charge");
    expect(p.content).toContain("Soulevé de terre");
    expect(p.content).toContain("réponse tronquée");
    expect(p.content).not.toContain('"type"');
  });

  test("JSON indéchiffrable → message d'erreur, jamais de JSON brut", () => {
    const garbage = '{"foo":}{{}}{"bar":';
    const p = extractPayload(garbage);
    expect(p.type).toBe("message");
    expect(p.content).not.toMatch(/^\{/);
    expect(p.content.toLowerCase()).toContain("reformul");
  });

  test("échappements JSON dans le content extrait", () => {
    const truncated =
      '{"type":"message","content":"Salut !\\nBienvenue dans SOMA';
    const p = extractPayload(truncated);
    expect(p.content).toContain("\n"); // bien échappé
    expect(p.content).toContain("SOMA");
  });
});
