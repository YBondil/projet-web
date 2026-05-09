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

**Statut : terminé**

### Stack

- **SolidJS** + **Vite** (UI réactive)
- **CSS** (dark theme, variables CSS, transitions)
- Pas de backend — tout tourne dans le navigateur

### Fonctionnalités

- [x] Formulaire de saisie :
  - Groupe musculaire (pectoraux, dos, jambes, épaules, bras, abdominaux, full body)
  - Durée d'entraînement (30 / 45 / 60 / 90 / 120 / 150 min)
  - Objectif (endurance, force, prise de muscle, tonification)
- [x] Base d'exercices statique enrichie (~76 exercices, 7 groupes, champs `muscles[]` + `video`)
- [x] Algorithme de génération de séance :
  - Sélection par groupe musculaire primaire (`MUSCLE_ORDER`)
  - Priorisation des exercices dont le type correspond à l'objectif (`OBJECTIF_TO_TYPE`)
  - Fallback sur le pool complet si `MUSCLE_ORDER` ne remplit pas tous les slots
  - Calcul du nombre de séries et répétitions selon l'objectif
  - Calcul des temps de repos selon l'objectif
  - Respect de la durée cible (minimum 3 exercices garanti)
- [x] Affichage de la séance générée :
  - Liste ordonnée des exercices
  - Pour chaque exercice : nom, muscles ciblés, séries × répétitions, temps de repos, temps complet de l'exercice
  - Lien vidéo tutoriel par exercice
  - Durée réellement estimée (calculée, pas juste la durée choisie)
- [x] Bouton "Régénérer" pour obtenir une variante aléatoire
- [x] Page catalogue : tous les exercices par groupe musculaire avec badges de type
- [x] Filtrage du catalogue par type d'exercice (force / endurance / tonification)
- [x] Page "Suivi" : placeholder explicatif des fonctionnalités à venir
- [x] Navigation complète entre toutes les pages
- [x] Design responsive (mobile + desktop) — dark theme violet

### Ce que le Scope 1 ne fait pas

- Pas de chronomètre intégré
- Pas de sauvegarde des séances
- Pas de suivi de progression
- Pas de personnalisation IA
- Pas de personalisation des exerices

### Lancement

```bash
cd frontend
bun install
bun run dev
```

---

## Scope 2 — Chronomètre + Historique (Frontend + Backend)

> Objectif : guider l'utilisateur pendant la séance et garder une trace de ses performances.

**Statut : non commencé**

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

- [ ] Page historique : liste des séances passées (remplace le placeholder actuel)
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
| Affichage exercices + repos + vidéos  | ✅      | ✅      | ✅      |
| Catalogue des exercices               | ✅      | ✅      | ✅      |
| Design responsive dark theme          | ✅      | ✅      | ✅      |
| Chronomètre intégré                   | ❌      | ✅      | ✅      |
| Saisie des performances               | ❌      | ✅      | ✅      |
| Historique des séances                | ❌      | ✅      | ✅      |
| Suivi poids / reps / PR               | ❌      | ✅      | ✅      |
| Backend API                           | ❌      | ✅      | ✅      |
| IA d'adaptation                       | ❌      | ❌      | ✅      |
| Chat avec l'IA                        | ❌      | ❌      | ✅      |
| Graphiques de progression             | ❌      | ❌      | ✅      |
| Profil utilisateur avancé             | ❌      | ❌      | ✅      |

---

## Conventions de développement

- Code en **JavaScript** (pas TypeScript pour rester dans le périmètre du cours)
- Nommage en **camelCase** pour les variables, **kebab-case** pour les fichiers CSS et noms de composants en **PascalCase**
- Pas de `node_modules` dans l'archive de rendu (`.gitignore`)
- Un seul `README.md` à la racine du projet

---

## Ordre de développement — Scope 2

1. Mettre en place le backend (Bun + Hono, route de santé)
2. Implémenter `POST /api/sessions` et `GET /api/sessions`
3. Brancher le frontend sur l'API (fetch après "Fin de séance")
4. Construire le chronomètre (timer par série + repos)
5. Construire la page historique (remplace le placeholder)
6. Ajouter la fiche de progression par exercice
