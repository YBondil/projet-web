# Sportacus

Générateur de séances de sport personnalisées.  
Entrez un groupe musculaire, une durée et un objectif — obtenez une séance complète avec exercices, séries, répétitions et temps de repos.

---

## 1. Participants

- BONDIL Yoan
- LAUVERGNE Alexis

---

## 2. Ce que fait le projet

### Idée générale

Sportacus génère des séances de sport adaptées à trois paramètres : le groupe musculaire ciblé, la durée disponible et l'objectif (endurance, force, prise de muscle, tonification). L'application calcule automatiquement le nombre de séries, de répétitions et les temps de repos en fonction de ces paramètres.

### Fonctionnalités disponibles (Scope 1 — terminé)

- Formulaire de configuration : groupe musculaire (7 groupes, dont abdominaux et full body), durée (30 à 150 min), objectif (endurance / force / prise de muscle / tonification)
- Génération de séance via algorithme intégré avec priorisation par type d'exercice
- Affichage structuré : exercices ordonnés, séries × reps, temps de repos, durée estimée par exercice et durée totale
- Lien vidéo tutoriel pour chaque exercice
- Bouton "Régénérer" pour obtenir une variante aléatoire
- Catalogue complet des exercices par groupe musculaire avec filtre par type
- Page de suivi (placeholder) qui annonce les fonctionnalités du Scope 2
- Design sombre responsive avec thème violet

### Fonctionnalités prévues

Voir [ROADMAP.md](ROADMAP.md) pour le détail des Scopes 2 et 3 :
- Chronomètre guidé pendant la séance (Scope 2)
- Enregistrement des performances et historique (Scope 2)
- IA d'adaptation basée sur la progression (Scope 3)

---

## 3. Comment lancer le projet

### Prérequis

- [Bun](https://bun.sh) installé (`bun --version` doit répondre)
- Un navigateur moderne (Chrome ou Firefox)

### Lancement (Scope 1 — frontend uniquement)

```bash
cd frontend
bun install
bun run dev
```

L'application est disponible sur [http://localhost:5173](http://localhost:5173).

### Lancement (Scope 2 — frontend + backend)

```bash
# Terminal 1
cd backend
bun install
bun run dev   # API sur http://localhost:3000

# Terminal 2
cd frontend
bun install
bun run dev   # UI sur http://localhost:5173
```

---

## 4. Difficultés rencontrées

- Bugs de typo silencieux en JSX (`math.floor` au lieu de `Math.floor`, `Maths.max` au lieu de `Math.max`) difficiles à traquer.

---

## 5. Usage de l'IA

- **Claude Code** a été utilisé pour la rédaction des fichiers `.md`, la détection et la correction de bugs, la complétion du CSS.

---

## 6. Ce qui fonctionne

- [x] Formulaire de saisie complet (groupe, durée, objectif)
- [x] Algorithme de génération de séance (priorisation par type, fallback pool)
- [x] Base d'exercices enrichie (7 groupes, ~76 exercices, champs muscles + vidéo)
- [x] Affichage de la séance générée avec durée estimée réelle
- [x] Liens vidéo tutoriel sur chaque exercice
- [x] Bouton "Régénérer"
- [x] Page catalogue des exercices par groupe musculaire
- [x] Filtre du catalogue par type (force / endurance / tonification)
- [x] Compteur d'exercices et état vide géré dans le catalogue
- [x] Page "Suivi" (placeholder explicatif des fonctionnalités du Scope 2)
- [x] Navigation complète entre toutes les pages
- [x] Design responsive — dark theme avec transitions

---

## 7. Ce qui manque (Scope 2 et au-delà)

- [ ] Chronomètre intégré pendant la séance
- [ ] Persistance des séances (backend requis)
- [ ] Historique et progression par exercice
- [ ] IA d'adaptation (Scope 3)

---

## Structure du projet

```
frontend/
└── src/
    ├── index.jsx              → point d'entrée, monte le DOM
    ├── App.jsx                → routeur (5 routes)
    ├── store/
    │   └── session.js         → signals partagés (config + séance courante)
    ├── data/
    │   ├── exo.json           → base d'exercices (7 groupes, ~70 exos)
    │   └── algo.js            → generateTraining() — logique pure
    ├── pages/
    │   ├── home.jsx           → page d'accueil
    │   ├── configure.jsx      → formulaire → génère la séance → store
    │   ├── training.jsx       → affiche la séance, propose de régénérer
    │   ├── exercises.jsx      → catalogue complet par groupe musculaire
    │   └── progress.jsx       → placeholder (Scope 2)
    ├── components/
    │   └── exocard.jsx        → carte d'un exercice (props only)
    └── styles/
        └── global.css         → tout le CSS (dark theme, variables, transitions)
```
