import { Show, For, createSignal, onCleanup, onMount } from "solid-js";
import { streamChat, fetchChatStatus, executeChatAction } from "../api/chat.js";

const TOOL_LABEL = {
  hide_exercise: "Masquer un exercice",
  reintroduce_hidden_exercises: "Réactiver les exercices masqués",
  adjust_exercise_load: "Ajuster la charge",
  adjust_exercise_volume: "Ajuster le volume",
  schedule_workout: "Planifier une séance",
};

function nowKey() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

export default function CoachChat(props) {
  // props : { open, onClose }
  const [messages, setMessages] = createSignal([]);
  const [draft, setDraft] = createSignal("");
  const [busy, setBusy] = createSignal(false);
  const [status, setStatus] = createSignal(null);
  const [toolStatus, setToolStatus] = createSignal(null);
  let abortCtrl = null;
  let listRef;

  onMount(async () => {
    setStatus(await fetchChatStatus());
  });

  onCleanup(() => {
    if (abortCtrl) abortCtrl.abort();
  });

  const scrollDown = () => {
    if (!listRef) return;
    requestAnimationFrame(() => {
      listRef.scrollTop = listRef.scrollHeight;
    });
  };

  const append = (msg) => {
    setMessages([...messages(), { id: nowKey(), ...msg }]);
    scrollDown();
  };

  const updateLastAssistant = (patch) => {
    const list = messages();
    for (let i = list.length - 1; i >= 0; i -= 1) {
      if (list[i].role === "assistant") {
        list[i] = { ...list[i], ...patch };
        setMessages([...list]);
        scrollDown();
        return;
      }
    }
  };

  const send = async (e) => {
    e?.preventDefault?.();
    const content = draft().trim();
    if (!content || busy()) return;

    const userMsg = { role: "user", content };
    setDraft("");
    append(userMsg);
    append({ role: "assistant", payload: null, streaming: true, toolCalls: [] });
    setBusy(true);
    setToolStatus("Le coach analyse tes performances…");

    abortCtrl = new AbortController();

    const conversationForApi = messages()
      .filter((m) => m.role === "user" || m.role === "assistant")
      .map((m) => ({
        role: m.role,
        content:
          m.role === "user"
            ? m.content
            : m.payload?.content ??
              (m.payload?.title ? `${m.payload.title} — ${m.payload?.rationale ?? ""}` : ""),
      }));
    conversationForApi.push({ role: "user", content });

    let buffer = "";
    let payload = null;
    const toolCalls = [];

    try {
      await streamChat({
        messages: conversationForApi,
        signal: abortCtrl.signal,
        onEvent: (event) => {
          if (event.type === "text") {
            buffer += event.delta ?? "";
            updateLastAssistant({ streamingText: buffer });
          } else if (event.type === "tool_call") {
            setToolStatus(`${TOOL_LABEL[event.name] ?? event.name}…`);
            toolCalls.push({ name: event.name, args: event.args, result: null });
            updateLastAssistant({ toolCalls: [...toolCalls] });
          } else if (event.type === "tool_result") {
            const last = toolCalls[toolCalls.length - 1];
            if (last && last.name === event.name) {
              last.result = event.result;
            } else {
              toolCalls.push({ name: event.name, args: null, result: event.result });
            }
            updateLastAssistant({ toolCalls: [...toolCalls] });
          } else if (event.type === "payload") {
            payload = event.payload;
            updateLastAssistant({ payload, streaming: false });
          } else if (event.type === "error") {
            updateLastAssistant({
              error: event.message ?? "Erreur",
              streaming: false,
            });
          } else if (event.type === "done") {
            updateLastAssistant({ streaming: false });
          }
        },
      });
    } catch (err) {
      updateLastAssistant({
        error: err?.message ?? "Erreur de connexion",
        streaming: false,
      });
    } finally {
      setBusy(false);
      setToolStatus(null);
      abortCtrl = null;
    }
  };

  const cancel = () => {
    if (abortCtrl) abortCtrl.abort();
  };

  return (
    <Show when={props.open}>
      <div class="coach-overlay" role="dialog" aria-modal="true">
        <div class="coach-panel">
          <header class="coach-header">
            <div>
              <h2 class="coach-title">🤖 Coach SOMA</h2>
              <Show when={status()}>
                <span class="coach-status">
                  Gemini : {status().gemini ? "✓" : "✗"} · Groq :{" "}
                  {status().groq ? "✓" : "✗"}
                </span>
              </Show>
            </div>
            <button
              type="button"
              class="coach-close"
              aria-label="Fermer le coach"
              onClick={() => {
                cancel();
                props.onClose?.();
              }}
            >
              ×
            </button>
          </header>

          <ul class="coach-messages" ref={(el) => (listRef = el)}>
            <Show when={messages().length === 0}>
              <li class="coach-empty">
                <p>Salut ! Je suis ton coach virtuel.</p>
                <p>
                  Demande-moi par exemple « le développé couché me fait mal à
                  l'épaule, qu'est-ce que je fais ? » ou « augmente la charge
                  sur les tractions ».
                </p>
              </li>
            </Show>
            <For each={messages()}>
              {(m) => (
                <Show
                  when={m.role === "user"}
                  fallback={<AssistantMessage msg={m} />}
                >
                  <li class="coach-msg coach-msg-user">
                    <span class="coach-msg-bubble">{m.content}</span>
                  </li>
                </Show>
              )}
            </For>
            <Show when={busy() && toolStatus()}>
              <li class="coach-tool-status">{toolStatus()}</li>
            </Show>
          </ul>

          <form class="coach-input" onSubmit={send}>
            <input
              class="form-input"
              type="text"
              placeholder="Pose ta question au coach…"
              value={draft()}
              onInput={(e) => setDraft(e.target.value)}
              disabled={busy()}
              autofocus
            />
            <Show
              when={busy()}
              fallback={
                <button class="btn-primary coach-send" type="submit" disabled={!draft().trim()}>
                  Envoyer
                </button>
              }
            >
              <button class="btn-secondary coach-send" type="button" onClick={cancel}>
                Annuler
              </button>
            </Show>
          </form>
        </div>
      </div>
    </Show>
  );
}

function ActionButton(props) {
  const [status, setStatus] = createSignal(props.alreadyDone ? "done" : "idle");
  const [feedback, setFeedback] = createSignal(
    props.alreadyDone ? "Déjà appliqué" : null
  );

  const onClick = async () => {
    if (status() === "running" || status() === "done") return;
    setStatus("running");
    setFeedback(null);
    const result = await executeChatAction({
      tool: props.tool,
      args: props.args ?? {},
    });
    if (result?.success) {
      setStatus("done");
      setFeedback(result.message ?? "OK");
    } else {
      setStatus("error");
      setFeedback(result?.message ?? "Erreur");
    }
  };

  return (
    <li>
      <button
        type="button"
        class={`coach-reco-action coach-reco-action-${status()}`}
        onClick={onClick}
        disabled={status() === "running" || status() === "done"}
      >
        <span class="coach-reco-action-label">{props.label}</span>
        <span class="coach-reco-action-tool">
          {TOOL_LABEL[props.tool] ?? props.tool}
        </span>
        <span class="coach-reco-action-cta">
          <Show
            when={status() === "idle"}
            fallback={
              <Show
                when={status() === "running"}
                fallback={
                  <Show
                    when={status() === "done"}
                    fallback={<span class="coach-reco-action-ko">⚠ {feedback()}</span>}
                  >
                    <span class="coach-reco-action-ok">✓ {feedback()}</span>
                  </Show>
                }
              >
                <span class="coach-reco-action-running">…</span>
              </Show>
            }
          >
            <span class="coach-reco-action-go">Exécuter →</span>
          </Show>
        </span>
      </button>
    </li>
  );
}

function AssistantMessage(props) {
  const m = props.msg;
  return (
    <li class="coach-msg coach-msg-assistant">
      <Show when={m.error}>
        <span class="coach-msg-bubble coach-msg-error">⚠ {m.error}</span>
      </Show>

      <Show when={m.toolCalls && m.toolCalls.length > 0}>
        <ul class="coach-tool-list">
          <For each={m.toolCalls}>
            {(tc) => (
              <li class="coach-tool-card">
                <span class="coach-tool-name">
                  {TOOL_LABEL[tc.name] ?? tc.name}
                </span>
                <Show when={tc.result}>
                  <span
                    class={`coach-tool-result ${
                      tc.result.success ? "ok" : "ko"
                    }`}
                  >
                    {tc.result.success ? "✓" : "✗"} {tc.result.message}
                  </span>
                </Show>
              </li>
            )}
          </For>
        </ul>
      </Show>

      <Show when={m.streamingText && !m.payload}>
        <Show
          when={m.streamingText.trimStart().startsWith("{")}
          fallback={
            <span class="coach-msg-bubble">{m.streamingText}</span>
          }
        >
          <span class="coach-msg-bubble coach-msg-pending">
            Le coach formule sa réponse…
          </span>
        </Show>
      </Show>

      <Show when={m.payload?.type === "message"}>
        <span class="coach-msg-bubble">{m.payload.content}</span>
      </Show>

      <Show when={m.payload?.type === "recommendation"}>
        <div class="coach-reco">
          <h3 class="coach-reco-title">{m.payload.title}</h3>
          <p class="coach-reco-rationale">{m.payload.rationale}</p>
          <Show when={m.payload.actions?.length > 0}>
            <ul class="coach-reco-actions">
              <For each={m.payload.actions}>
                {(action) => {
                  const alreadyDone =
                    m.toolCalls?.some(
                      (tc) =>
                        tc.name === action.tool && tc.result?.success
                    ) ?? false;
                  return (
                    <ActionButton
                      label={action.label}
                      tool={action.tool}
                      args={action.args}
                      alreadyDone={alreadyDone}
                    />
                  );
                }}
              </For>
            </ul>
          </Show>
        </div>
      </Show>
    </li>
  );
}
