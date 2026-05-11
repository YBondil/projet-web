import { Show, For, createSignal, createMemo, onCleanup } from "solid-js";
import { useNavigate } from "@solidjs/router";
import { currentSession } from "../store/session.js";
import { EQUIPMENT_LABEL } from "../data/equipment.js";

const DIFFICULTE_LEVELS = [
  { value: "facile", label: "Facile" },
  { value: "moyen", label: "Moyen" },
  { value: "difficile", label: "Difficile" },
  { value: "tres-difficile", label: "Très difficile" },
];

const RING_RADIUS = 92;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

function formatTime(totalSeconds) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

export default function TrainingOnGoing() {
  const navigate = useNavigate();

  const [elapsed, setElapsed] = createSignal(0);
  const [exoIndex, setExoIndex] = createSignal(0);
  const [serieDone, setSerieDone] = createSignal(0);
  const [resting, setResting] = createSignal(false);
  const [restLeft, setRestLeft] = createSignal(0);
  const [finished, setFinished] = createSignal(false);

  const [feedback, setFeedback] = createSignal(null);
  const [feedbacks, setFeedbacks] = createSignal({});

  const tick = setInterval(() => {
    if (finished()) return;
    setElapsed((e) => e + 1);
    if (resting()) {
      setRestLeft((s) => {
        if (s <= 1) {
          setResting(false);
          return 0;
        }
        return s - 1;
      });
    }
  }, 1000);
  onCleanup(() => clearInterval(tick));

  const currentExo = createMemo(() => {
    const s = currentSession();
    return s ? s.exercises[exoIndex()] : null;
  });

  const totalExos = () => currentSession()?.exercises.length ?? 0;
  const isLastExo = () => exoIndex() >= totalExos() - 1;
  const restTotal = () => currentExo()?.repos ?? 0;
  const isLastSerie = () => {
    const exo = currentExo();
    return exo ? serieDone() + 1 >= exo.series : false;
  };

  const ringOffset = () => {
    if (!resting()) return 0;
    const t = restTotal();
    if (t === 0) return 0;
    return RING_CIRCUMFERENCE * (1 - restLeft() / t);
  };

  const stopRest = () => {
    setResting(false);
    setRestLeft(0);
  };

  const advance = () => {
    stopRest();
    if (isLastExo()) {
      setFinished(true);
    } else {
      setExoIndex((i) => i + 1);
      setSerieDone(0);
    }
  };

  const openFeedback = () => {
    stopRest();
    setFeedback({ charge: "", reps: "", difficulte: "moyen" });
  };

  const submitFeedback = (e) => {
    e?.preventDefault?.();
    const exo = currentExo();
    if (exo) {
      setFeedbacks({ ...feedbacks(), [exo.id]: { ...feedback() } });
    }
    setFeedback(null);
    advance();
  };

  const skipFeedback = () => {
    setFeedback(null);
    advance();
  };

  const handleSerieDone = () => {
    const exo = currentExo();
    if (!exo) return;
    if (isLastSerie()) {
      openFeedback();
      return;
    }
    setSerieDone(serieDone() + 1);
    setRestLeft(exo.repos);
    setResting(true);
  };

  const handlePrevExo = () => {
    stopRest();
    setFeedback(null);
    if (exoIndex() > 0) {
      setExoIndex((i) => i - 1);
      setSerieDone(0);
    }
  };

  const handleNextExo = () => {
    setFeedback(null);
    advance();
  };

  const quit = () => {
    if (confirm("Quitter la séance en cours ?")) {
      navigate("/training");
    }
  };

  return (
    <main class="ongoing">
      <Show
        when={currentSession()}
        fallback={
          <>
            <p>Aucune séance à démarrer.</p>
            <button class="btn-primary" onClick={() => navigate("/selection")}>
              Générer une séance
            </button>
          </>
        }
      >
        <Show
          when={!finished()}
          fallback={
            <div class="ongoing-finish">
              <div class="ongoing-finish-icon">🏆</div>
              <h2>Séance terminée !</h2>
              <p class="ongoing-finish-time">{formatTime(elapsed())}</p>
              <p class="ongoing-finish-sub">
                {totalExos()} exercices accomplis
              </p>
              <button class="btn-primary" onClick={() => navigate("/")}>
                Retour à l'accueil
              </button>
            </div>
          }
        >
          <header class="ongoing-header">
            <button class="btn-back" onClick={quit}>
              ← Quitter
            </button>
            <span class="ongoing-progress">
              Exercice {exoIndex() + 1} / {totalExos()}
            </span>
          </header>

          <article class="ongoing-card">
            <div class="ongoing-card-head">
              <h2>{currentExo().name}</h2>
              <Show when={currentExo().video}>
                <a
                  class="video-link"
                  href={currentExo().video}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  ▶ Tuto
                </a>
              </Show>
            </div>
            <p class="muscles">{currentExo().muscles.join(" · ")}</p>
            <Show when={currentExo().equipment}>
              <span class="exo-equip-badge exo-equip-inline">
                {EQUIPMENT_LABEL[currentExo().equipment] ??
                  currentExo().equipment}
              </span>
            </Show>
          </article>

          <Show
            when={!feedback()}
            fallback={
              <form class="ongoing-feedback" onSubmit={submitFeedback}>
                <h3>Exercice terminé !</h3>
                <p class="ongoing-feedback-sub">Renseigne ta performance.</p>

                <label class="form-field">
                  <span class="form-field-label">Charge (kg)</span>
                  <input
                    class="form-input"
                    type="number"
                    inputmode="decimal"
                    min="0"
                    step="0.5"
                    placeholder="0 si poids du corps"
                    value={feedback().charge}
                    onInput={(e) =>
                      setFeedback({ ...feedback(), charge: e.target.value })
                    }
                  />
                </label>

                <label class="form-field">
                  <span class="form-field-label">
                    Reps réalisées (par série)
                  </span>
                  <input
                    class="form-input"
                    type="number"
                    min="0"
                    placeholder={`cible : ${currentExo().reps}`}
                    value={feedback().reps}
                    onInput={(e) =>
                      setFeedback({ ...feedback(), reps: e.target.value })
                    }
                  />
                </label>

                <div class="form-field">
                  <span class="form-field-label">Difficulté</span>
                  <div class="difficulte-group">
                    <For each={DIFFICULTE_LEVELS}>
                      {(level) => (
                        <button
                          type="button"
                          class={`difficulte-option${
                            feedback().difficulte === level.value
                              ? " difficulte-active"
                              : ""
                          }`}
                          onClick={() =>
                            setFeedback({
                              ...feedback(),
                              difficulte: level.value,
                            })
                          }
                        >
                          {level.label}
                        </button>
                      )}
                    </For>
                  </div>
                </div>

                <div class="ongoing-feedback-actions">
                  <button class="btn-primary" type="submit">
                    {isLastExo() ? "Terminer la séance" : "Continuer →"}
                  </button>
                  <button
                    class="btn-secondary"
                    type="button"
                    onClick={skipFeedback}
                  >
                    Passer
                  </button>
                </div>
              </form>
            }
          >
            <div class="ongoing-ring-wrap">
              <svg
                class={`ongoing-ring${resting() ? " ongoing-ring-active" : ""}`}
                viewBox="0 0 200 200"
              >
                <circle
                  class="ongoing-ring-bg"
                  cx="100"
                  cy="100"
                  r={RING_RADIUS}
                />
                <circle
                  class="ongoing-ring-fg"
                  cx="100"
                  cy="100"
                  r={RING_RADIUS}
                  stroke-dasharray={RING_CIRCUMFERENCE}
                  stroke-dashoffset={ringOffset()}
                />
              </svg>
              <div class="ongoing-ring-center">
                <span class="ongoing-ring-label">
                  {resting() ? "Récup en cours" : "Récup"}
                </span>
                <span class="ongoing-ring-time">
                  {formatTime(resting() ? restLeft() : restTotal())}
                </span>
                <span class="ongoing-ring-sub">
                  Série <strong>{serieDone() + 1}</strong> /{" "}
                  {currentExo().series} · {currentExo().reps} reps
                </span>
              </div>
            </div>

            <Show
              when={!resting()}
              fallback={
                <button
                  class="btn-secondary ongoing-action"
                  onClick={stopRest}
                >
                  Passer la récup
                </button>
              }
            >
              <button
                class="btn-primary ongoing-action"
                onClick={handleSerieDone}
              >
                {isLastSerie()
                  ? "✓ Terminer l'exercice"
                  : "Commencer la récup"}
              </button>
            </Show>

            <div class="ongoing-nav">
              <button
                class="btn-secondary"
                onClick={handlePrevExo}
                disabled={exoIndex() === 0}
              >
                ← Précédent
              </button>
              <button class="btn-secondary" onClick={handleNextExo}>
                {isLastExo() ? "Terminer" : "Suivant →"}
              </button>
            </div>
          </Show>
        </Show>
      </Show>
    </main>
  );
}
