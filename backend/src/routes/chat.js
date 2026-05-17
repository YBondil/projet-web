// Route POST /api/chat : streaming SSE vers le frontend.
// Format des events SSE :
//   { type: "text",        delta: "..." }            – chunks de texte
//   { type: "tool_call",   name, args }              – appel de tool décidé par Gemini
//   { type: "tool_result", name, result }            – résultat d'exécution
//   { type: "payload",     payload: {type,...} }     – JSON structuré final du coach
//   { type: "error",       message }                 – erreur fatale
//   { type: "done" }                                 – fin de stream

import { Hono } from "hono";
import { streamSSE } from "hono/streaming";

import {
  hasGemini,
  hasGroq,
  geminiGenerate,
  geminiGenerateText,
  groqStreamText,
} from "../ai/provider.js";
import { detectIntent } from "../ai/intent.js";
import { getUserContextCached } from "../ai/context.js";
import {
  buildSystemInstruction,
  buildTextSystemInstruction,
  COACH_SYSTEM_PROMPT,
} from "../ai/prompt.js";
import { GEMINI_TOOL_DECLARATIONS, runTool } from "../ai/tools.js";

export const chat = new Hono();

chat.post("/", async (c) => {
  let body;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "invalid_json" }, 400);
  }

  const messages = Array.isArray(body?.messages) ? body.messages : null;
  if (!messages || messages.length === 0) {
    return c.json({ error: "missing_messages" }, 400);
  }

  const intent = detectIntent(messages);
  const userContext = getUserContextCached();
  // Prompt JSON-strict pour le mode agentique (tools + JSON structuré),
  // prompt texte naturel pour le mode conversationnel (streaming Groq).
  const systemInstruction = buildSystemInstruction(userContext);
  const systemInstructionText = buildTextSystemInstruction(userContext);

  if (intent === "agentic" && !hasGemini()) {
    return c.json(
      { error: "gemini_unavailable", message: "Fournis GEMINI_API_KEY pour activer le coach agentique." },
      503
    );
  }
  if (intent === "conversational" && !hasGroq() && !hasGemini()) {
    return c.json(
      { error: "ai_unavailable", message: "Aucune clé API IA configurée." },
      503
    );
  }

  return streamSSE(c, async (stream) => {
    const send = (event) =>
      stream.writeSSE({
        data: JSON.stringify(event),
        event: event.type,
      });

    try {
      if (intent === "agentic") {
        await runAgenticTurn({ messages, systemInstruction, send });
      } else {
        await runConversationalTurn({
          messages,
          systemInstruction: systemInstructionText,
          send,
        });
      }
      await send({ type: "done" });
    } catch (err) {
      console.error("[chat] error:", err);
      await send({ type: "error", message: err?.message ?? "unknown_error" });
      await send({ type: "done" });
    }
  });
});

// ---------------------------------------------------------------
// Agentique : Gemini avec tools.
// Boucle : appel Gemini → si tool_calls → exécuter → renvoyer le résultat
// jusqu'à obtenir un texte final que l'on parse en JSON structuré.
// ---------------------------------------------------------------

async function runAgenticTurn({ messages, systemInstruction, send }) {
  // Conversion des messages vers le format @google/genai
  const contents = messages
    .filter((m) => m.role === "user" || m.role === "assistant")
    .map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: String(m.content ?? "") }],
    }));

  const maxRounds = 4;
  for (let round = 0; round < maxRounds; round += 1) {
    const response = await geminiGenerate({
      systemInstruction,
      contents,
      tools: GEMINI_TOOL_DECLARATIONS,
    });

    const candidate = response?.candidates?.[0];
    const parts = candidate?.content?.parts ?? [];
    const calls = parts.filter((p) => p.functionCall);

    if (calls.length > 0) {
      // Push le message du modèle dans la conversation pour conserver le contexte
      contents.push({ role: "model", parts });
      const responseParts = [];
      for (const part of calls) {
        const { name, args } = part.functionCall;
        await send({ type: "tool_call", name, args });
        const result = runTool(name, args ?? {});
        await send({ type: "tool_result", name, result });
        responseParts.push({
          functionResponse: {
            name,
            response: { result },
          },
        });
      }
      contents.push({ role: "user", parts: responseParts });
      continue; // boucle pour laisser Gemini commenter le résultat
    }

    // Plus de tool_calls : on a une réponse texte finale.
    const text = parts.map((p) => p.text ?? "").join("").trim();
    await emitPayload(text, send);
    return;
  }

  // Sécurité : trop de rounds, on coupe.
  await send({
    type: "payload",
    payload: {
      type: "message",
      content:
        "Désolé, je n'ai pas réussi à finaliser ma recommandation en quelques tours. Reformule ta demande ?",
    },
  });
}

// ---------------------------------------------------------------
// Conversationnel : Groq streaming, fallback Gemini non-stream si Groq KO.
// ---------------------------------------------------------------

async function runConversationalTurn({ messages, systemInstruction, send }) {
  const lastUser = [...messages].reverse().find((m) => m.role === "user");
  if (!lastUser) {
    await send({
      type: "payload",
      payload: { type: "message", content: "Pose-moi une question pour commencer !" },
    });
    return;
  }

  if (hasGroq()) {
    try {
      const groqMessages = [
        { role: "system", content: systemInstruction },
        ...messages
          .filter((m) => m.role === "user" || m.role === "assistant")
          .map((m) => ({ role: m.role, content: String(m.content ?? "") })),
      ];
      let buffer = "";
      for await (const delta of groqStreamText({ messages: groqMessages })) {
        buffer += delta;
        await send({ type: "text", delta });
      }
      // Mode conversationnel : prompt système demande du texte naturel.
      // Si malgré tout le LLM renvoie un JSON (message OU recommendation,
      // potentiellement tronqué par max_tokens), extractPayload normalise.
      await send({ type: "payload", payload: extractPayload(buffer) });
      return;
    } catch (err) {
      console.warn("[chat] groq failed, fallback gemini:", err?.message);
    }
  }

  // Fallback : Gemini sans streaming (texte naturel aussi)
  if (hasGemini()) {
    const text = await geminiGenerateText({
      systemInstruction,
      userMessage: String(lastUser.content ?? ""),
    });
    if (text) await send({ type: "text", delta: text });
    await send({ type: "payload", payload: extractPayload(text) });
    return;
  }

  await send({
    type: "error",
    message: "Aucun provider IA disponible. Fournis GEMINI_API_KEY ou GROQ_API_KEY.",
  });
}

// ---------------------------------------------------------------
// Extraction robuste d'un payload structuré depuis un buffer texte.
//
// Cas couverts :
//   - Texte naturel        → { type:"message", content }
//   - JSON message complet → idem
//   - JSON recommendation  → { type:"recommendation", title, rationale, actions }
//   - JSON tronqué (max_tokens atteint) → regex tolérante pour récupérer
//     `content`, `title`, `rationale` même avec guillemets non fermés
//   - Sinon → message d'erreur explicite, jamais de JSON brut visible
// ---------------------------------------------------------------

function safeUnescape(rawString) {
  try {
    return JSON.parse(`"${rawString}"`);
  } catch {
    return rawString;
  }
}

function extractStringField(text, field) {
  const closed = new RegExp(
    `"${field}"\\s*:\\s*"((?:[^"\\\\]|\\\\.)*)"`,
    "i"
  );
  let m = text.match(closed);
  if (m) return safeUnescape(m[1]);
  // Champ tronqué : guillemet de fin manquant
  const open = new RegExp(`"${field}"\\s*:\\s*"((?:[^"\\\\]|\\\\.)*)$`, "i");
  m = text.match(open);
  return m ? safeUnescape(m[1]) : null;
}

function stripCodeFences(text) {
  const trimmed = text.trim();
  if (!trimmed.startsWith("```")) return trimmed;
  return trimmed
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();
}

export function extractPayload(buffer) {
  const raw = String(buffer ?? "").trim();
  if (!raw) return { type: "message", content: "(réponse vide)" };

  // 1. Texte naturel (pas du JSON)
  if (!raw.startsWith("{") && !raw.startsWith("```")) {
    return { type: "message", content: raw };
  }

  const stripped = stripCodeFences(raw);

  // 2. Parsing JSON complet
  try {
    const parsed = JSON.parse(stripped);
    if (parsed?.type === "message" && typeof parsed.content === "string") {
      return { type: "message", content: parsed.content };
    }
    if (parsed?.type === "recommendation") {
      return {
        type: "recommendation",
        title: parsed.title ?? "Recommandation",
        rationale: parsed.rationale ?? "",
        actions: Array.isArray(parsed.actions) ? parsed.actions : [],
      };
    }
    return { type: "message", content: JSON.stringify(parsed) };
  } catch {}

  // 3. JSON tronqué → extraction regex
  const content = extractStringField(stripped, "content");
  if (content) return { type: "message", content };

  const title = extractStringField(stripped, "title");
  const rationale = extractStringField(stripped, "rationale");
  if (title || rationale) {
    return {
      type: "message",
      content:
        [title, rationale].filter(Boolean).join("\n\n") +
        "\n\n…(réponse tronquée, reformule pour plus de détail)",
    };
  }

  // 4. Indéchiffrable : on n'affiche jamais le JSON brut à l'utilisateur
  return {
    type: "message",
    content:
      "Désolé, je n'ai pas réussi à formuler une réponse exploitable. Peux-tu reformuler ta demande ?",
  };
}

async function emitPayload(text, send) {
  await send({ type: "payload", payload: extractPayload(text) });
}

// Petite route GET pour diagnostiquer la config IA depuis le frontend
chat.get("/status", (c) => {
  return c.json({
    gemini: hasGemini(),
    groq: hasGroq(),
    systemPromptChars: COACH_SYSTEM_PROMPT.length,
  });
});

// Exécution manuelle d'une action depuis l'UI (clic sur une carte de recommandation).
// Body : { tool: "hide_exercise"|..., args: {...} }
// Le tool valide lui-même les args via Zod ; tout est tracé dans agent_actions
// comme une exécution agent normale (le clic = consentement de l'utilisateur).
chat.post("/execute-action", async (c) => {
  let body;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "invalid_json" }, 400);
  }

  const { tool, args } = body ?? {};
  if (typeof tool !== "string" || !tool.trim()) {
    return c.json({ error: "missing_tool" }, 400);
  }

  const result = runTool(tool, args ?? {});
  if (!result.success) {
    // On renvoie quand même 200 avec success=false pour que l'UI affiche le détail
    return c.json(result);
  }
  return c.json(result);
});
