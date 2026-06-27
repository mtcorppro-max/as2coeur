// Registre des modèles d'ordonnance. Pour en ajouter une, il suffit d'ajouter
// une entrée ici : le formulaire de saisie et le rendu PDF sont génériques.

export type ChampOrdo =
  | { key: string; label: string; type: "text" | "textarea" | "date" | "number" }
  | { key: string; label: string; type: "radio" | "checkboxes"; options: string[] }
  | { key: string; label: string; type: "valeur_unite"; uniteKey: string; options: string[] };

export type ModeleOrdo = { id: string; label: string; description?: string; champs: ChampOrdo[] };

export const MODELES_ORDONNANCE: ModeleOrdo[] = [
  {
    id: "perfusion_domicile",
    label: "Prescription de perfusion à domicile",
    description: "Formulaire de prescription de perfusion à domicile (ville ou hôpital).",
    champs: [
      { key: "type_demande", label: "Type de demande", type: "radio", options: ["Initiation d'une perfusion à domicile", "Renouvellement ou modification"] },
      { key: "produit", label: "Dénomination du produit (dosage, posologie, solvant…)", type: "textarea" },
      { key: "voie", label: "Voie d'abord", type: "radio", options: ["Veineuse centrale (VC)", "Chambre implantable", "Cathéter central", "PICC-line", "Péri-nerveuse", "Veineuse périphérique", "Sous-cutanée"] },
      { key: "mode", label: "Mode d'administration", type: "radio", options: ["Gravité", "Diffuseur", "Système actif électrique", "Transfuseur"] },
      { key: "duree_valeur", uniteKey: "duree_unite", label: "Durée d'une perfusion", type: "valeur_unite", options: ["minutes", "heures"] },
      { key: "nb_perfusions", label: "Nombre total de perfusions", type: "number" },
      { key: "frequence_nb", uniteKey: "frequence_periode", label: "Fréquence (nombre de perfusions par…)", type: "valeur_unite", options: ["jour", "semaine", "mois"] },
      { key: "date_debut", label: "Date de début de la cure", type: "date" },
      { key: "date_fin", label: "Date de fin de la cure", type: "date" },
    ],
  },
];

export const modeleOrdo = (id: string) => MODELES_ORDONNANCE.find((m) => m.id === id);

// Représentation lisible d'un champ (à partir du contenu complet de l'ordonnance).
export function valeurLisible(champ: ChampOrdo, contenu: Record<string, unknown>): string {
  const v = contenu[champ.key];
  if (champ.type === "checkboxes") return Array.isArray(v) ? v.join(", ") : "";
  if (champ.type === "valeur_unite") {
    const u = contenu[champ.uniteKey];
    return v != null && v !== "" ? `${v} ${u ?? ""}`.trim() : "";
  }
  if (v == null) return "";
  return String(v);
}
