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

### Fonctionnalités principales (Scope 1 — version livrée)

- Formulaire de saisie : groupe musculaire, durée, objectif
- Génération d'une séance complète via un algorithme intégré
- Affichage structuré : exercices dans l'ordre, séries × reps, temps de repos
- Estimation de la durée totale de la séance
- Bouton "Regénérer" pour obtenir une variante
- Design responsive (mobile et desktop)

### Fonctionnalités prévues mais non implémentées

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

> À compléter au fil du développement.

- Conception de l'algorithme de génération : trouver un équilibre entre la durée cible, le nombre d'exercices et les temps de repos selon chaque objectif a demandé plusieurs itérations.
- …

---

## 5. Usage de l'IA

> À compléter honnêtement.

- **Claude Code** a été utilisé pour générer la structure initiale du projet (ROADMAP.md, README.md) et proposer un plan de développement en 3 scopes.
- Le code de l'application a été écrit manuellement / avec l'aide de … *(à préciser)*.

---

## 6. Ce qui fonctionne

> À mettre à jour avant le rendu final.

- [ ] Formulaire de saisie complet
- [ ] Algorithme de génération de séance
- [ ] Affichage de la séance générée
- [ ] Design responsive

---

## 7. Ce qui manque

> À mettre à jour avant le rendu final.

- Chronomètre intégré (prévu Scope 2)
- Sauvegarde et historique des séances (prévu Scope 2)
- Adaptation par IA (prévu Scope 3)
- …

---

## Structure du projet

```
.
├── README.md
├── ROADMAP.md
├── frontend/           # Application SolidJS + Vite
│   ├── src/
│   │   ├── App.jsx
│   │   ├── components/
│   │   ├── data/       # Base d'exercices (JSON)
│   │   └── utils/      # Algorithme de génération
│   ├── index.html
│   └── package.json
└── backend/            # API Bun + Hono (Scope 2+)
    ├── src/
    │   └── index.js
    ├── data/           # Stockage JSON des sessions
    └── package.json
```
