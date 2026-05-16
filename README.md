# Sportacus

Générateur de séances de sport personnalisées.
Entrez un groupe musculaire, une durée, un objectif et l'équipement disponible — obtenez une séance complète avec exercices, séries, répétitions et temps de repos.

---

## 1. Participants

- BONDIL Yoan
- LAUVERGNE Alexis

---

## 2. Ce que fait le projet

### Idée générale

Sportacus génère des séances de sport adaptées à quatre paramètres : le groupe musculaire ciblé, la durée disponible, l'objectif (endurance, force, prise de muscle, tonification) et l'équipement à disposition. L'application calcule automatiquement le nombre de séries, de répétitions et les temps de repos en fonction de ces paramètres.

### Fonctionnalités disponibles (Scope 1 — terminé)

- Formulaire de configuration : groupe musculaire (7 groupes), durée (30 à 150 min), objectif (endurance / force / prise de muscle / tonification), équipement (5 types)
- Filtrage du pool d'exercices par équipement disponible (le mode « salle de musculation » donne accès à tout)
- Génération de séance via algorithme intégré avec priorisation par type d'exercice et ordre des muscles primaires
- Affichage structuré : exercices ordonnés, séries × reps, temps de repos, durée estimée par exercice et durée totale
- Avertissement visuel si la durée estimée dépasse la durée demandée
- Édition de la séance en temps réel : retirer un exercice, ajouter un exercice via un picker avec recherche
- Bouton « Régénérer » pour obtenir une variante aléatoire
- Enregistrement local des séances (localStorage) avec nom personnalisé, listing dans « Mes séances », relance ou suppression
- Catalogue complet des exercices par groupe musculaire avec filtre par type et recherche transverse
- Création d'exercices personnalisés (nom, groupe, type, équipement, muscles ciblés avec autocomplétion, vidéo) persistés en localStorage et fusionnés avec la base intégrée
- Lien vidéo tutoriel pour chaque exercice
- Page de suivi (placeholder) qui annonce les fonctionnalités du Scope 2
- Design sombre responsive avec thème violet

### Fonctionnalités prévues

Voir [ROADMAP.md](ROADMAP.md) pour le détail des Scopes 2 et 3 :
- Chronomètre guidé pendant la séance (Scope 2)
- Backend + persistance des performances réelles (Scope 2)
- Historique de progression et records personnels (Scope 2)
- IA d'adaptation basée sur la progression (Scope 3)

---

## 3. Comment lancer le projet

### Prérequis

- [Bun](https://bun.sh) installé 
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

> Le dossier `backend/` n'existe pas encore — il sera créé au début du Scope 2.

---

## 4. Difficultés rencontrées

- Bugs de typo silencieux en JSX (`math.floor` au lieu de `Math.floor`, `Maths.max` au lieu de `Math.max`) difficiles à traquer.
- Gerer les éléments visuels un peu complexes notements les barres de recherche etc

---

## 5. Usage de l'IA

- **Claude Code** a été utilisé pour la rédaction des fichiers `.md`, la détection et la correction de bugs, la complétion du CSS et l'enrichissement de la base d'exercices.
- **Claude Code** a également été utilisé pour la gestion des barre de recherche.

---

## 6. Ce qui fonctionne

- [x] Formulaire de saisie complet (groupe, durée, objectif, équipement)
- [x] Filtrage par équipement disponible
- [x] Algorithme de génération de séance (priorisation par type, ordre des muscles, fallback pool)
- [x] Base d'exercices intégrée + exercices personnalisés (localStorage)
- [x] Affichage de la séance générée avec durée estimée réelle
- [x] Détection et avertissement quand la séance dépasse la durée demandée
- [x] Édition de la séance : retrait et ajout d'exercices avec picker recherchable
- [x] Liens vidéo tutoriel sur chaque exercice
- [x] Bouton « Régénérer »
- [x] Sauvegarde des séances en local (« Mes séances » : créer, relancer, supprimer)
- [x] Page catalogue des exercices avec filtre par groupe et type
- [x] Recherche transverse dans tout le catalogue
- [x] Formulaire d'ajout d'exercice personnalisé (avec chips de muscles + autocomplétion)
- [x] Page « Suivi » (placeholder explicatif des fonctionnalités du Scope 2)
- [x] Navigation complète entre toutes les pages
- [x] Design responsive — dark theme avec transitions

---

## 7. Ce qui manque (Scope 2 et au-delà)

- [ ] Chronomètre intégré pendant la séance
- [ ] Backend (Bun + Hono) et persistance serveur
- [ ] Saisie des performances réelles (poids, reps, ressenti)
- [ ] Historique et progression par exercice (page « Suivi »)
- [ ] Records personnels (PR)
- [ ] IA d'adaptation (Scope 3)

---

## Structure du projet

```
frontend/
└── src/
    ├── index.jsx              → point d'entrée, monte le DOM
    ├── App.jsx                → routeur (6 routes)
    ├── store/
    │   ├── session.js         → signals partagés (config + séance courante)
    │   ├── exercises.js       → fusion base intégrée + exos custom (localStorage)
    │   └── savedSessions.js   → CRUD des séances enregistrées (localStorage)
    ├── data/
    │   ├── exo.json           → base d'exercices (7 groupes, ~76 exos)
    │   ├── equipment.js       → liste d'équipements + filtre du pool
    │   └── algo.js            → generateTraining() — logique pure
    ├── pages/
    │   ├── home.jsx           → page d'accueil (4 actions principales)
    │   ├── configure.jsx      → formulaire → génère la séance → store
    │   ├── training.jsx       → affiche/édite la séance, régénère, enregistre
    │   ├── saved.jsx          → liste des séances enregistrées (localStorage)
    │   ├── exercises.jsx      → catalogue + recherche + création d'exos
    │   └── progress.jsx       → placeholder (Scope 2)
    ├── components/
    │   └── exocard.jsx        → carte d'un exercice (props only)
    └── styles/
        └── global.css         → tout le CSS (dark theme, variables, transitions)
```

> Quelques fichiers vides existent pour préparer la suite : `pages/pastTraining.jsx`, `components/progressbar.jsx`. Ils seront utilisés au Scope 2.
