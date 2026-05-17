// Détection d'intent par heuristique sur mots-clés (FR + EN).
//
// Choix : on évite un premier appel Gemini "léger" pour économiser une
// requête sur le free tier (15 RPM). Les faux positifs ne sont pas un
// problème car Gemini avec tools peut très bien répondre conversationnel ;
// les faux négatifs coûtent juste "Le coach n'a pas modifié la BDD" — la
// réponse Groq reste utile à l'utilisateur.

const AGENTIC_KEYWORDS = [
  // FR — modifications
  "masque",
  "masquer",
  "cache",
  "cacher",
  "enlève",
  "enlever",
  "retire",
  "retirer",
  "supprime",
  "supprimer",
  "réintroduis",
  "réintroduire",
  "remets",
  "remettre",
  "réactive",
  "réactiver",
  "augmente",
  "augmenter",
  "diminue",
  "diminuer",
  "baisse",
  "baisser",
  "monte",
  "monter",
  "ajoute du poids",
  "réduis",
  "réduire",
  "change la charge",
  "change le poids",
  "change le nombre",
  "change les reps",
  "change les séries",
  "ajuste",
  "ajuster",
  "modifie",
  "modifier",
  // FR — planification
  "planifie",
  "planifier",
  "programme",
  "programmer",
  "prépare",
  "préparer",
  "prochaine séance",
  "séance pour demain",
  "séance demain",
  "séance lundi",
  "séance mardi",
  "séance mercredi",
  "séance jeudi",
  "séance vendredi",
  "séance samedi",
  "séance dimanche",
  // FR — ressenti / déclencheurs typiques
  "trop dur",
  "trop difficile",
  "trop facile",
  "ça fait mal",
  "j'ai mal",
  "douleur",
  "blessure",
  // EN équivalents
  "hide",
  "remove",
  "reintroduce",
  "increase",
  "decrease",
  "raise",
  "lower",
  "schedule",
  "plan",
  "too hard",
  "too easy",
  "injured",
];

export function detectIntent(messages) {
  const lastUser = [...messages]
    .reverse()
    .find((m) => m.role === "user")?.content;
  if (!lastUser) return "conversational";

  const lower = String(lastUser).toLowerCase();
  const matched = AGENTIC_KEYWORDS.find((kw) => lower.includes(kw));
  return matched ? "agentic" : "conversational";
}
