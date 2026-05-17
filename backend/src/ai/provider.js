// Wrappers minces autour des SDKs officiels Google (@google/genai) et Groq.
// Stratégies :
//  - Clés API lues via process.env (à fournir au lancement, jamais commitées).
//  - Si une clé manque, le provider correspondant est désactivé proprement
//    (le serveur démarre quand même, l'endpoint renvoie une erreur 503).
//  - Backoff exponentiel sur les erreurs 429/quota pour rester dans le free tier.

import { GoogleGenAI } from "@google/genai";
import Groq from "groq-sdk";

const GEMINI_KEY = process.env.GEMINI_API_KEY ?? "";
const GROQ_KEY = process.env.GROQ_API_KEY ?? "";
export const GEMINI_MODEL =
  process.env.COACH_MODEL_GEMINI ?? "gemini-2.5-flash";
export const GROQ_MODEL =
  process.env.COACH_MODEL_GROQ ?? "llama-3.3-70b-versatile";

export const hasGemini = () => Boolean(GEMINI_KEY);
export const hasGroq = () => Boolean(GROQ_KEY);

export const gemini = GEMINI_KEY
  ? new GoogleGenAI({ apiKey: GEMINI_KEY })
  : null;
export const groq = GROQ_KEY ? new Groq({ apiKey: GROQ_KEY }) : null;

if (!hasGemini()) {
  console.warn(
    "[ai] GEMINI_API_KEY absent — le coach agentique est désactivé. " +
      "Lance le serveur avec GEMINI_API_KEY=... bun run dev"
  );
}
if (!hasGroq()) {
  console.warn(
    "[ai] GROQ_API_KEY absent — le coach conversationnel utilisera Gemini en fallback. " +
      "Lance le serveur avec GROQ_API_KEY=... bun run dev"
  );
}

function isRetryable(err) {
  const status = err?.status ?? err?.response?.status;
  if (status === 429 || status === 503) return true;
  const msg = String(err?.message ?? err).toLowerCase();
  return (
    msg.includes("rate") ||
    msg.includes("quota") ||
    msg.includes("overload") ||
    msg.includes("unavailable")
  );
}

export async function withBackoff(fn, { maxAttempts = 4, baseMs = 800 } = {}) {
  let attempt = 0;
  while (true) {
    try {
      return await fn();
    } catch (err) {
      attempt += 1;
      if (!isRetryable(err) || attempt >= maxAttempts) throw err;
      const delay = baseMs * 2 ** (attempt - 1) + Math.floor(Math.random() * 250);
      console.warn(
        `[ai] retry #${attempt} after ${delay}ms (${err?.message ?? "rate limit"})`
      );
      await new Promise((r) => setTimeout(r, delay));
    }
  }
}

// --- Gemini : un seul tour avec tools + system instruction ---
//   contents : Array<{ role: "user"|"model", parts: [{ text } | { functionResponse }] }>
//   tools    : Array<{ functionDeclarations: [...] }>  (cf @google/genai)
export async function geminiGenerate({ systemInstruction, contents, tools }) {
  if (!gemini) throw new Error("gemini_unavailable");
  return withBackoff(() =>
    gemini.models.generateContent({
      model: GEMINI_MODEL,
      contents,
      config: {
        systemInstruction,
        tools,
        // Free tier friendly : on reste court pour ménager les tokens.
        maxOutputTokens: 1500,
        temperature: 0.5,
      },
    })
  );
}

// --- Groq : streaming texte pour les réponses conversationnelles ---
//   messages : [{ role: "system"|"user"|"assistant", content: string }]
export async function* groqStreamText({ messages }) {
  if (!groq) throw new Error("groq_unavailable");
  const stream = await withBackoff(() =>
    groq.chat.completions.create({
      model: GROQ_MODEL,
      messages,
      stream: true,
      temperature: 0.5,
      max_tokens: 1024,
    })
  );
  for await (const chunk of stream) {
    const delta = chunk.choices?.[0]?.delta?.content;
    if (delta) yield delta;
  }
}

// Fallback : si Groq KO, on utilise Gemini en mode non-streaming pour
// répondre comme un texte simple (free tier reste OK).
export async function geminiGenerateText({ systemInstruction, userMessage }) {
  if (!gemini) throw new Error("gemini_unavailable");
  const res = await withBackoff(() =>
    gemini.models.generateContent({
      model: GEMINI_MODEL,
      contents: [{ role: "user", parts: [{ text: userMessage }] }],
      config: { systemInstruction, maxOutputTokens: 1024, temperature: 0.5 },
    })
  );
  return res?.text ?? "";
}
