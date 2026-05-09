import { useNavigate } from "@solidjs/router";

export default function Home() {
  const navigate = useNavigate();

  return (
    <main class="home">
      <h1>Sportacus</h1>
      <p class="subtitle">Ta séance en 30 secondes.</p>
      <button class="btn-generate" onClick={() => navigate("/selection")}>
        Nouvelle séance
      </button>
      <button class="btn-progress" onClick={() => navigate("/progress")}>
        Voir mon suivi
      </button>
      <button class="btn-exoinspect" onClick={() => navigate("/exercises")}>
        Voir tous les exercices
      </button>
    </main>
  );
}
