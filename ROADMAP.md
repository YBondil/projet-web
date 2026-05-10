# ROADMAP — Sportacus

Générateur de séances de sport personnalisées.

---

## Vue d'ensemble

Le projet est découpé en **3 scopes progressifs**. Chaque scope est une version fonctionnelle à 100% — elle tourne, elle se lance, elle rend un vrai service. Les scopes suivants ajoutent des fonctionnalités sans rien casser.

```
Scope 1 ──► Scope 2 ──► Scope 3
Frontend    + Backend   + IA
statique    + Chrono    + Suivi avancé
+ Stockage  + Historique
  local
```

---

## Scope 1 — Générateur de séance (Frontend seul)

> Objectif : à partir de 4 paramètres, afficher une séance complète prête à suivre, et permettre d'éditer/sauvegarder/recharger en local.

**Statut : terminé**

### Stack

- **SolidJS** + **Vite** (UI réactive)
- **CSS** (dark theme, variables CSS, transitions)
- **localStorage** pour la persistance (séances enregistrées, exercices personnalisés)
- Pas de backend — tout tourne dans le navigateur

### Fonctionnalités

- [x] Formulaire de saisie :
  - Groupe musculaire (pectoraux, dos, jambes, épaules, bras, abdominaux, full body)
  - Durée d'entraînement (30 / 45 / 60 / 90 / 120 / 150 min)
  - Objectif (endurance, force, prise de muscle, tonification)
  - Équipement disponible (poids du corps, haltères, bande de résistance, kettlebell, salle de musculation)
- [x] Base d'exercices statique enrichie (~76 exercices, 7 groupes, champs `muscles[]` + `equipment` + `video`)
- [x] Algorithme de génération de séance :
  - Filtrage du pool par équipement disponible (la salle de musculation déverrouille tout)
  - Sélection par groupe musculaire primaire (`MUSCLE_ORDER`)
  - Priorisation des exercices dont le type correspond à l'objectif (`OBJECTIF_TO_TYPE`)
  - Calcul du nombre de séries et répétitions selon l'objectif
  - Calcul des temps de repos selon l'objectif
  - Respect de la durée cible (minimum 3 exercices garanti)
- [x] Affichage de la séance générée :
  - Liste ordonnée des exercices
  - Pour chaque exercice : nom, muscles ciblés, séries × répétitions, temps de repos, temps complet de l'exercice, équipement, lien vidéo
  - Durée réellement estimée (recalculée à chaque modification)
  - Avertissement visuel quand la séance dépasse la durée demandée
- [x] Édition de la séance en temps réel :
  - Retirer un exercice
  - Ajouter un exercice via picker recherchable (par nom, type, équipement, muscle)
- [x] Bouton « Régénérer » pour obtenir une variante aléatoire
- [x] Sauvegarde locale des séances (localStorage) avec nom personnalisable, listées dans « Mes séances », relançables ou supprimables
- [x] Page catalogue : tous les exercices par groupe musculaire avec badges de type
- [x] Filtrage du catalogue par type d'exercice et recherche transverse (nom, muscle, équipement)
- [x] Création d'exercices personnalisés (formulaire avec chips de muscles + autocomplétion), persistés en localStorage et fusionnés à la base intégrée
- [x] Page « Suivi » : placeholder explicatif des fonctionnalités à venir
- [x] Navigation complète entre toutes les pages
- [x] Design responsive (mobile + desktop) — dark theme violet

### Ce que le Scope 1 ne fait pas

- Pas de chronomètre intégré
- Pas de saisie des performances réelles (poids soulevé, reps effectives, ressenti)
- Pas de suivi de progression historique
- Pas de personnalisation IA
- Pas de partage entre appareils (tout est local au navigateur)

### Lancement

```bash
cd frontend
bun install
bun run dev
```

---

## Scope 2 — Chronomètre + Historique (Frontend + Backend)

> Objectif : guider l'utilisateur pendant la séance et garder une trace de ses performances réelles, partagée entre appareils.

**Statut : non commencé**

### Stack ajoutée

- **Bun** + **Hono** (API backend)
- Stockage JSON côté serveur (fichier `data/sessions.json`) — possibilité de migrer vers SQLite plus tard
- Réutilisation des fichiers vides déjà préparés : `pages/pastTraining.jsx`, `components/progressbar.jsx`

### Nouvelles fonctionnalités

#### Chronomètre intégré

- [ ] Mode « Séance en cours » :
  - Affichage de l'exercice actuel avec les consignes
  - Décompte du temps d'exercice (si durée fixe) ou minuteur libre
  - Décompte du temps de repos entre les séries
  - Alerte visuelle et sonore à la fin de chaque phase
  - Bouton « Passer » pour sauter un exercice ou une série
  - Progression dans la séance (exercice 2/6, série 3/4…) — composant `ProgressBar` à implémenter

#### Enregistrement des performances

- [ ] En fin de séance, saisie des données réelles :
  - Poids utilisé par exercice
  - Nombre de répétitions réellement effectuées
  - Ressenti (trop facile / bien / trop difficile)
- [ ] API backend :
  - `GET /api/health` — sanity check
  - `POST /api/sessions` — sauvegarder une séance terminée
  - `GET /api/sessions` — récupérer l'historique
  - `GET /api/sessions/:id` — détail d'une séance
  - `DELETE /api/sessions/:id` — supprimer une séance
- [ ] Migration des séances actuellement en localStorage (« Mes séances ») vers le backend
  - Garder un mode dégradé localStorage si le backend est down

#### Historique et progression

- [ ] Page « Mon suivi » : remplace le placeholder actuel
  - Liste des séances passées (`pastTraining.jsx`)
  - Fiche par exercice : évolution du poids et des reps au fil du temps
  - Records personnels (PR) mis en évidence

### Lancement

```bash
# Terminal 1 — backend
cd backend
bun install
bun run dev

# Terminal 2 — frontend
cd frontend
bun install
bun run dev
```

---

## Scope 3 — IA + Personnalisation avancée

> Objectif : adapter automatiquement les séances à la progression et aux besoins réels de l'utilisateur.

**Statut : non commencé**

### Stack ajoutée

- **API Claude** (Anthropic) pour l'intelligence artificielle
- Stockage enrichi (profil utilisateur, historique long terme)

### Nouvelles fonctionnalités

#### IA d'adaptation

- [ ] Analyse automatique de l'historique :
  - Détection des exercices trop faciles / trop difficiles
  - Suggestion d'augmentation de charge ou de volume
  - Ajustement de la difficulté des prochaines séances
- [ ] Chat avec l'IA :
  - L'utilisateur peut poser des questions sur les exercices
  - L'IA répond en tenant compte de l'historique personnel
  - Suggestions d'alternatives si un exercice n'est pas adapté (matériel manquant, blessure…)
- [ ] Génération de séance IA :
  - Au lieu (ou en complément) de l'algorithme statique, l'IA génère la séance en tenant compte du passé

#### Suivi avancé de la progression

- [ ] Graphiques d'évolution (charge, volume, fréquence)
- [ ] Rapport hebdomadaire automatique
- [ ] Indicateur de récupération (temps depuis la dernière séance par groupe musculaire)
- [ ] Suggestions de groupes musculaires à travailler selon la récupération

#### Profil utilisateur

- [ ] Informations personnelles (niveau, matériel disponible par défaut, fréquence souhaitée)
- [ ] Objectifs à long terme
- [ ] Support multi-utilisateur (plusieurs profils locaux)

### Lancement

```bash
# Ajouter la clé API dans le fichier .env du backend
echo "ANTHROPIC_API_KEY=sk-..." > backend/.env

# Terminal 1 — backend
cd backend
bun install
bun run dev

# Terminal 2 — frontend
cd frontend
bun install
bun run dev
```

---

## Récapitulatif par scope

| Fonctionnalité                            | Scope 1 | Scope 2 | Scope 3 |
|-------------------------------------------|:-------:|:-------:|:-------:|
| Formulaire groupe / durée / objectif      | ✅      | ✅      | ✅      |
| Filtrage par équipement                   | ✅      | ✅      | ✅      |
| Génération de séance (algorithme)         | ✅      | ✅      | ✅      |
| Édition de séance (ajout / retrait exo)   | ✅      | ✅      | ✅      |
| Avertissement de dépassement de durée     | ✅      | ✅      | ✅      |
| Affichage exercices + repos + vidéos      | ✅      | ✅      | ✅      |
| Catalogue + recherche d'exercices         | ✅      | ✅      | ✅      |
| Création d'exercices personnalisés        | ✅      | ✅      | ✅      |
| Sauvegarde locale des séances             | ✅      | ✅      | ✅      |
| Design responsive dark theme              | ✅      | ✅      | ✅      |
| Chronomètre intégré                       | ❌      | ✅      | ✅      |
| Saisie des performances réelles           | ❌      | ✅      | ✅      |
| Historique des séances (côté serveur)     | ❌      | ✅      | ✅      |
| Suivi poids / reps / PR                   | ❌      | ✅      | ✅      |
| Backend API                               | ❌      | ✅      | ✅      |
| IA d'adaptation                           | ❌      | ❌      | ✅      |
| Chat avec l'IA                            | ❌      | ❌      | ✅      |
| Graphiques de progression                 | ❌      | ❌      | ✅      |
| Profil utilisateur avancé                 | ❌      | ❌      | ✅      |

---

## Conventions de développement

- Code en **JavaScript** (pas TypeScript pour rester dans le périmètre du cours)
- Nommage en **camelCase** pour les variables, **kebab-case** pour les fichiers, **PascalCase** pour les composants exportés
- Pas de `node_modules` dans l'archive de rendu (`.gitignore`)
- Un seul `README.md` à la racine du projet
- Les signals partagés vivent dans `src/store/`, la logique pure dans `src/data/`, les composants UI dans `src/components/` ou `src/pages/`

---

## Ordre de développement — Scope 2

1. Mettre en place le backend (Bun + Hono, route `GET /api/health`)
2. Implémenter `POST /api/sessions` et `GET /api/sessions` (stockage JSON simple pour démarrer)
3. Adapter `store/savedSessions.js` pour fetch l'API au lieu de lire le localStorage (avec fallback local si l'API ne répond pas)
4. Construire le chronomètre (timer par série + repos) — composant dédié, à brancher dans `training.jsx`
5. Implémenter `components/progressbar.jsx` pour afficher la progression dans la séance
6. Ajouter l'écran de saisie des performances en fin de séance
7. Construire `pages/pastTraining.jsx` : détail d'une séance passée avec performances saisies
8. Remplacer le placeholder `pages/progress.jsx` par la vraie page de suivi (liste + évolution par exercice + PR)
