import { createSignal } from "solid-js";
import CoachChat from "./CoachChat.jsx";

// Bouton flottant + modal de chat, persistant sur toutes les pages.
// Monté au niveau de App.jsx pour rester accessible quelle que soit la route.
export default function CoachFab() {
  const [open, setOpen] = createSignal(false);

  return (
    <>
      <button
        type="button"
        class="coach-fab"
        aria-label="Ouvrir le coach SOMA"
        onClick={() => setOpen(true)}
      >
        <span class="coach-fab-icon">💬</span>
        <span class="coach-fab-label">Coach</span>
      </button>

      <CoachChat open={open()} onClose={() => setOpen(false)} />
    </>
  );
}
