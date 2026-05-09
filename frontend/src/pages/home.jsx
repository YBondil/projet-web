import { useNavigate } from "@solidjs/router";

export default function Home() {
  const navigate = useNavigate();

  return (
    <main class="home">
      <div class="home-hero">
        <h1>Sportacus</h1>
        <p class="home-tagline">Ta séance en 30 secondes.</p>
      </div>

      <button class="btn-generate" onClick={() => navigate("/selection")}>
        Nouvelle séance
      </button>

      <nav class="home-actions" aria-label="Navigation principale">
        <button class="home-action" onClick={() => navigate("/saved")}>
          <span class="home-action-icon">💾</span>
          <span class="home-action-label">Mes séances</span>
        </button>
        <button class="home-action" onClick={() => navigate("/progress")}>
          <span class="home-action-icon">📊</span>
          <span class="home-action-label">Mon suivi</span>
        </button>
        <button class="home-action" onClick={() => navigate("/exercises")}>
          <span class="home-action-icon">🏋️</span>
          <span class="home-action-label">Exercices</span>
        </button>
      </nav>
    </main>
  );
}
