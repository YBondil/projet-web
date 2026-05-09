import { useNavigate } from "@solidjs/router";

const FEATURES = [
  {
    icon: "📅",
    titre: "Historique de séances",
    desc: "Retrouve toutes tes séances passées avec les exercices effectués.",
  },
  {
    icon: "📈",
    titre: "Évolution par exercice",
    desc: "Visualise la progression du poids et des répétitions au fil du temps.",
  },
  {
    icon: "🏆",
    titre: "Records personnels",
    desc: "Tes meilleures performances mises en évidence pour chaque exercice.",
  },
];

export default function Progress() {
  const navigate = useNavigate();

  return (
    <main class="progress">
      <header class="exercises-header">
        <button class="btn-back" onClick={() => navigate("/")}>
          ← Retour
        </button>
        <h2>Mon suivi</h2>
      </header>

      <div class="progress-empty">
        <span class="progress-empty-icon">📊</span>
        <p class="progress-empty-title">Bientôt disponible</p>
        <p class="progress-empty-sub">
          Le suivi de progression arrive avec le Scope 2.
        </p>
      </div>

      <ul class="progress-features">
        {FEATURES.map((f) => (
          <li class="progress-feature">
            <span class="progress-feature-icon">{f.icon}</span>
            <div>
              <h3>{f.titre}</h3>
              <p>{f.desc}</p>
            </div>
          </li>
        ))}
      </ul>

      <button class="btn-secondary" onClick={() => navigate("/selection")}>
        Faire une séance maintenant
      </button>
    </main>
  );
}
