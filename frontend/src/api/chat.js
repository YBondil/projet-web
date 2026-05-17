// Wrapper fetch streaming pour /api/chat.
// On utilise `fetch` + ReadableStream (pas EventSource — il ne supporte pas POST).
// On parse manuellement le format SSE : lignes "data: <json>\n\n".

const API_URL = "http://localhost:3000";

export async function fetchChatStatus() {
  try {
    const res = await fetch(`${API_URL}/api/chat/status`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  } catch {
    return { gemini: false, groq: false, error: true };
  }
}

export async function executeChatAction({ tool, args }) {
  const res = await fetch(`${API_URL}/api/chat/execute-action`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tool, args }),
  });
  let json = null;
  try {
    json = await res.json();
  } catch {}
  if (!res.ok) {
    return {
      success: false,
      message: json?.message ?? json?.error ?? `HTTP ${res.status}`,
    };
  }
  return json ?? { success: false, message: "empty_response" };
}

// streamChat({ messages, signal, onEvent })
//   - messages: [{role:"user"|"assistant", content:string}, ...]
//   - signal:   AbortSignal pour annuler
//   - onEvent:  callback appelé pour chaque event SSE parsé
export async function streamChat({ messages, signal, onEvent }) {
  const res = await fetch(`${API_URL}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "text/event-stream" },
    body: JSON.stringify({ messages }),
    signal,
  });

  if (!res.ok) {
    // Erreur HTTP avant le stream : on parse le JSON d'erreur
    let detail = `HTTP ${res.status}`;
    try {
      const j = await res.json();
      if (j?.message) detail = j.message;
    } catch {}
    onEvent({ type: "error", message: detail });
    onEvent({ type: "done" });
    return;
  }

  if (!res.body) {
    onEvent({ type: "error", message: "empty_stream" });
    onEvent({ type: "done" });
    return;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      // SSE : events séparés par \n\n
      let sep;
      while ((sep = buffer.indexOf("\n\n")) !== -1) {
        const chunk = buffer.slice(0, sep);
        buffer = buffer.slice(sep + 2);
        const dataLine = chunk
          .split("\n")
          .find((l) => l.startsWith("data:"));
        if (!dataLine) continue;
        const json = dataLine.slice(5).trim();
        if (!json) continue;
        try {
          onEvent(JSON.parse(json));
        } catch {
          // ignore lignes mal formées
        }
      }
    }
  } catch (err) {
    if (err.name !== "AbortError") {
      onEvent({ type: "error", message: err.message ?? "stream_error" });
      onEvent({ type: "done" });
    }
  } finally {
    try {
      reader.releaseLock();
    } catch {}
  }
}
