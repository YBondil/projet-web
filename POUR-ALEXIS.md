# Pour Alexis — onboarding SOMA

Salut ma belle, un ptit résumé de ce qui à ete fait et de ce que tu peux faire coté backend

---

## 1. Démarrer le projet en 3 minutes

```bash

# récupérer le repo, puis :
cd frontend
bun install
bun run dev
```

Ouvre [http://localhost:5173](http://localhost:5173). 

> Pas besoin de backend pour le moment — tout le Scope 1 tourne dans le navigateur 

---

## 2. Survol du projet

**SOMA = générateur de séances de sport.** L'utilisateur choisit un groupe musculaire, une durée, un objectif et son équipement, et l'app crache une séance complète (exercices, séries, reps, repos, vidéos).

**Stack actuelle :**
- **SolidJS** (signals réactifs, syntaxe proche de React mais sans Virtual DOM)
- **Vite** pour le dev/build
- **Bun** comme package manager et runtime
- **CSS pur** (tout est dans `src/styles/global.css`)
- **localStorage** pour les séances enregistrées et les exercices personnalisés

---

## 3. La structure du code

```
frontend/src/
├── App.jsx                → routeur SolidJS, 6 routes
├── pages/                 → une page = une route
│   ├── home.jsx           → accueil avec 4 boutons
│   ├── configure.jsx      → formulaire de génération
│   ├── training.jsx       → séance générée + édition + save
│   ├── saved.jsx          → liste des séances enregistrées
│   ├── exercises.jsx      → catalogue + création d'exos custom
│   ├── progress.jsx       → placeholder Scope 2
│   └── pastTraining.jsx   → VIDE — à remplir au Scope 2
├── components/
│   ├── exocard.jsx        → carte d'exercice (réutilisée dans training)
│   └── progressbar.jsx    → VIDE — à remplir au Scope 2
├── data/
│   ├── exo.json           → ~76 exercices, 7 groupes musculaires
│   ├── equipment.js       → liste d'équipements + filtre du pool
│   └── algo.js            → generateTraining(), logique pure (pas de React/Solid ici)
├── store/                 → "stores" SolidJS = signals partagés
│   ├── session.js         → config + séance courante
│   ├── exercises.js       → fusion base intégrée + exos custom (localStorage)
│   └── savedSessions.js   → séances enregistrées (localStorage)
└── styles/
    └── global.css         → tout le CSS du projet (dark theme violet)
```

**Pour comprendre le flux principe en express**, :
1. [App.jsx](frontend/src/App.jsx) — le routeur
2. [pages/configure.jsx](frontend/src/pages/configure.jsx) — l'utilisateur renseigne ses paramètres
3. [data/algo.js](frontend/src/data/algo.js) — la logique de génération (purement fonctionnelle)
4. [pages/training.jsx](frontend/src/pages/training.jsx) — affichage et édition de la séance

---

## 4. Concepts SolidJS à connaître (rapide)

```js
import { createSignal } from "solid-js";

const [count, setCount] = createSignal(0);
// lecture : count()  ← attention, on appelle la fonction
// écriture : setCount(count() + 1)
```

Dans le JSX :
- `<For each={list}>{(item) => <li>{item.name}</li>}</For>` au lieu de `.map` -->pour afficher les elmt d'une liste/tableau
- `<Show when={cond}>...</Show>` au lieu de `cond && ...` --> permet d'afficher des truc sous une certaine condition et le fallback sinon

---

## 5. Ce qui est déjà fait (Scope 1)

Va voir [ROADMAP.md](ROADMAP.md) pour le détail complet, mais en résumé :
- Génération de séance avec 4 paramètres (groupe, durée, objectif, équipement)
- Édition de la séance (ajouter/retirer des exercices avec un picker recherchable)
- Régénérer une variante
- Enregistrer une séance avec un nom et la retrouver dans « Mes séances »
- Catalogue avec recherche transverse
- Création d'exercices personnalisés (formulaire avec chips de muscles + autocomplétion)
- Avertissement si la séance dépasse la durée demandée
- Design responsive dark theme

---

## 6. Prochaines étapes — Scope 2

Le but du Scope 2 est de **guider l'utilisateur pendant la séance** et de **garder une trace de ses performances réelles**, avec un vrai backend.

### Ordre suggéré (du plus simple au plus complexe)

1. **Backend minimal** (Bun + Hono)
   - Créer un dossier `backend/` à la racine
   - Une seule route `GET /api/health` qui renvoie `{ ok: true }`
   - Permet de valider la stack avant d'aller plus loin

2. **API des séances**
   - `POST /api/sessions` — sauvegarder une séance terminée (JSON)
   - `GET /api/sessions` — lister
   - `GET /api/sessions/:id` — détail
   - `DELETE /api/sessions/:id` — supprimer
   - Stockage : un simple `data/sessions.json` côté serveur pour démarrer

3. **Brancher le frontend -- je m'en occuperais je pense**
   - Remplacer `store/savedSessions.js` (qui lit le localStorage) par un appel `fetch` vers l'API
   - Garder un fallback localStorage si le backend ne répond pas (mode dégradé)

4. **Chronomètre -- je m'en occupe aussi** (le gros morceau)
   - Composant `Timer` dédié, branché dans `training.jsx`
   - Décompte temps d'exercice + temps de repos
   - Alerte sonore et visuelle entre les phases
   - Boutons « Pause », « Passer », « Précédent »
   - Implémenter `components/progressbar.jsx` (déjà créé vide) pour la progression « exo 2/6, série 3/4 »

5. **Saisie des performances en fin de séance -- je m'en occupe mais faut pouvoir l'enregistrer dans le back**
   - Pour chaque exercice : poids utilisé, reps réellement effectuées, ressenti
   - Envoi au backend via `POST /api/sessions`

6. **Page « Mon suivi » réelle** (remplace `progress.jsx` actuel)
   - Liste des séances passées (composant à mettre dans `pages/pastTraining.jsx`, déjà créé vide)
   - Évolution par exercice (poids, reps au fil du temps)
   - Records personnels (PR) mis en évidence

## 7. Conventions à respecter

Pour les noms de variables : 
- **camelCase** pour les variables et fonctions (ex: const tempsRestant = 10)
- **PascalCase** pour les composants exportés (ex: import DureeEstimee from exercise.js)
- Les **signals partagés** vont dans `src/store/`
- La **logique pure** (algorithme, transformations de données) va dans `src/data/`

---



Courage mon grand t'as ce qui faut et si tu galere tu me dis
