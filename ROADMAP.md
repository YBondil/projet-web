# ROADMAP — Sportacus

Générateur de séances de sport personnalisées.

---

## Vue d'ensemble

Le projet est découpé en **3 scopes progressifs**. Chaque scope est une version fonctionnelle à 100% — elle tourne, elle se lance, elle rend un vrai service. Les scopes suivants ajoutent des fonctionnalités sans rien casser.

```
Scope 1 ──► Scope 2 ──► Scope 3
Frontend    + Backend   + IA
statique    + Chrono    + Suivi avancé
            + Historique
```

---

## Scope 1 — Générateur de séance (Frontend seul)

> Objectif : à partir de 3 paramètres, afficher une séance complète prête à suivre.

### Stack

- **SolidJS** + **Vite** (UI réactive)
- **CSS** (mise en page, design)
- Pas de backend — tout tourne dans le navigateur

### Fonctionnalités

- [ ] Formulaire de saisie :
  - Groupe musculaire (pectoraux, dos, jambes, épaules, bras, full body…)
  - Durée d'entraînement (30 / 45 / 60 / 90 min)
  - Objectif (endurance, force, prise de muscle, tonification)
- [ ] Base d'exercices statique intégrée (JSON embarqué dans l'appli)
- [ ] Algorithme de génération de séance :
  - Sélection des exercices adaptés au groupe musculaire
  - Calcul du nombre de séries et répétitions selon l'objectif
  - Calcul des temps de repos selon l'objectif
  - Respect de la durée cible
- [ ] Affichage de la séance générée :
  - Liste des exercices dans l'ordre
  - Pour chaque exercice : nom, séries × répétitions, temps de repos
  - Durée totale estimée
- [ ] Bouton "Regénérer" pour obtenir une variante
- [ ] Design responsive (mobile + desktop)

### Ce que le Scope 1 ne fait pas

- Pas de chronomètre intégré
- Pas de sauvegarde des séances
- Pas de suivi de progression
- Pas de personnalisation IA

### Lancement

```bash
cd frontend
bun install
bun run dev
```

---

## Scope 2 — Chronomètre + Historique (Frontend + Backend)

> Objectif : guider l'utilisateur pendant la séance et garder une trace de ses performances.

### Stack ajoutée

- **Bun** + **Hono** (API backend)
- Stockage JSON côté serveur (fichier `data/sessions.json`)

### Nouvelles fonctionnalités

#### Chronomètre intégré

- [ ] Mode "Séance en cours" :
  - Affichage de l'exercice actuel avec les consignes
  - Décompte du temps d'exercice (si durée fixe) ou minuteur libre
  - Décompte du temps de repos entre les séries
  - Alerte visuelle et sonore à la fin de chaque phase
  - Bouton "Passer" pour sauter un exercice ou une série
  - Progression dans la séance (exercice 2/6, série 3/4…)

#### Enregistrement des performances

- [ ] En fin de séance, saisie des données réelles :
  - Poids utilisé par exercice
  - Nombre de répétitions réellement effectuées
  - Ressenti (trop facile / bien / trop difficile)
- [ ] API backend :
  - `POST /api/sessions` — sauvegarder une séance
  - `GET /api/sessions` — récupérer l'historique
  - `GET /api/sessions/:id` — détail d'une séance

#### Historique et progression

- [ ] Page historique : liste des séances passées
- [ ] Fiche par exercice : évolution du poids et des reps au fil du temps
- [ ] Records personnels (PR) mis en évidence

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
  - Au lieu de l'algorithme statique, l'IA génère la séance en tenant compte du passé

#### Suivi avancé de la progression

- [ ] Graphiques d'évolution (charge, volume, fréquence)
- [ ] Rapport hebdomadaire automatique
- [ ] Indicateur de récupération (temps depuis la dernière séance par groupe musculaire)
- [ ] Suggestions de groupes musculaires à travailler selon la récupération

#### Profil utilisateur

- [ ] Informations personnelles (niveau, matériel disponible, fréquence souhaitée)
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

| Fonctionnalité                        | Scope 1 | Scope 2 | Scope 3 |
|---------------------------------------|:-------:|:-------:|:-------:|
| Formulaire groupe / durée / objectif  | ✅      | ✅      | ✅      |
| Génération de séance (algorithme)     | ✅      | ✅      | ✅      |
| Affichage exercices + repos           | ✅      | ✅      | ✅      |
| Design responsive                     | ✅      | ✅      | ✅      |
| Chronomètre intégré                   | ❌       | ✅      | ✅      |
| Saisie des performances               | ❌       | ✅      | ✅      |
| Historique des séances                | ❌       | ✅      | ✅      |
| Suivi poids / reps / PR               | ❌       | ✅      | ✅      |
| Backend API                           | ❌       | ✅      | ✅      |
| IA d'adaptation                       | ❌       | ❌       | ✅      |
| Chat avec l'IA                        | ❌       | ❌       | ✅      |
| Graphiques de progression             | ❌       | ❌       | ✅      |
| Profil utilisateur avancé             | ❌       | ❌       | ✅      |

---

## Conventions de développement

- Code en **JavaScript** (pas TypeScript pour rester dans le périmètre du cours)
- Nommage en **camelCase** pour les variables, **kebab-case** pour les fichiers
- Pas de `node_modules` dans l'archive de rendu (`git archive` ou `.gitignore`)
- Un seul `README.md` à la racine du projet

---

## Ordre de développement suggéré (Scope 1)

1. Mettre en place le projet Vite + SolidJS
2. Créer la base de données d'exercices (JSON)
3. Coder l'algorithme de génération
4. Construire le formulaire
5. Afficher le résultat
6. Soigner le CSS
