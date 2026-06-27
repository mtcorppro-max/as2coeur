// Registre des modèles d'ordonnance. Pour en ajouter une, il suffit d'ajouter
// une entrée ici : le formulaire de saisie et le rendu PDF sont génériques.

export type ChampOrdo =
  | { key: string; label: string; type: "text" | "textarea" | "date" | "number" }
  | { key: string; label: string; type: "radio" | "checkboxes"; options: string[] }
  | { key: string; label: string; type: "valeur_unite"; uniteKey: string; options: string[] }
  | { key: string; label: string; type: "section" };

export type ModeleOrdo = { id: string; label: string; description?: string; champs: ChampOrdo[] };

export const MODELES_ORDONNANCE: ModeleOrdo[] = [
  {
    id: "perfusion_domicile",
    label: "Perfadom",
    champs: [
      { key: "type_demande", label: "Type de demande", type: "radio", options: ["Initiation d'une perfusion à domicile", "Renouvellement ou modification"] },

      { key: "_sec1", label: "Produit à perfuser n°1", type: "section" },
      { key: "produit", label: "Dénomination du produit (dosage, posologie, solvant…)", type: "textarea" },
      { key: "voie", label: "Voie d'abord", type: "radio", options: ["Veineuse centrale (VC)", "Chambre implantable", "Cathéter central", "PICC-line", "Péri-nerveuse", "Veineuse périphérique", "Sous-cutanée"] },
      { key: "mode", label: "Mode d'administration", type: "radio", options: ["Gravité", "Diffuseur", "Système actif électrique", "Transfuseur"] },
      { key: "duree_valeur", uniteKey: "duree_unite", label: "Durée d'une perfusion", type: "valeur_unite", options: ["minutes", "heures"] },
      { key: "nb_perfusions", label: "Nombre total de perfusions", type: "number" },
      { key: "frequence_nb", uniteKey: "frequence_periode", label: "Fréquence (nombre de perfusions par…)", type: "valeur_unite", options: ["jour", "semaine", "mois"] },
      { key: "date_debut", label: "Date de début de la cure", type: "date" },
      { key: "date_fin", label: "Date de fin de la cure", type: "date" },

      { key: "_sec2", label: "Produit à perfuser n°2", type: "section" },
      { key: "produit2", label: "Dénomination du produit (dosage, posologie, solvant…)", type: "textarea" },
      { key: "voie2", label: "Voie d'abord", type: "radio", options: ["Veineuse centrale (VC)", "Chambre implantable", "Cathéter central", "PICC-line", "Péri-nerveuse", "Veineuse périphérique", "Sous-cutanée"] },
      { key: "mode2", label: "Mode d'administration", type: "radio", options: ["Gravité", "Diffuseur", "Système actif électrique", "Transfuseur"] },
      { key: "duree_valeur2", uniteKey: "duree_unite2", label: "Durée d'une perfusion", type: "valeur_unite", options: ["minutes", "heures"] },
      { key: "nb_perfusions2", label: "Nombre total de perfusions", type: "number" },
      { key: "frequence_nb2", uniteKey: "frequence_periode2", label: "Fréquence (nombre de perfusions par…)", type: "valeur_unite", options: ["jour", "semaine", "mois"] },
      { key: "date_debut2", label: "Date de début de la cure", type: "date" },
      { key: "date_fin2", label: "Date de fin de la cure", type: "date" },
    ],
  },
  {
    id: "pharma_perf",
    label: "Pharmacie (perfusion)",
    champs: [
      { key: "serum_100", label: "Sérum physiologique 100 mL (poches/jour)", type: "number" },
      { key: "serum_50", label: "Sérum physiologique 50 mL (poche/jour)", type: "number" },
      { key: "qsp_jours", label: "QSP (jours)", type: "number" },
    ],
  },
  {
    id: "idel_perf",
    label: "IDEL (soins de perfusion)",
    champs: [
      { key: "date_debut_soins", label: "Date de début des soins", type: "date" },
      { key: "voie", label: "Par voie d'abord", type: "radio", options: ["Périphérique", "PICC-line", "Cathéter central", "Chambre Implantable", "Sous cutanée"] },
      { key: "mode", label: "Traitement à administrer par", type: "radio", options: ["Pompe en continu ou discontinu", "Diffuseur", "Gravité", "Pousse seringue électrique"] },
      { key: "perfusion_1", label: "1/ Perfusion de", type: "textarea" },
      { key: "perfusion_2", label: "2/ Perfusion de", type: "textarea" },
      { key: "duree_jours", label: "D'une durée de (jours)", type: "number" },
    ],
  },
];

// Ordonnance type (modèle pré-rempli) rattachée à un protocole.
export type OrdonnanceType = { id: string; nom: string; type: string; contenu: Record<string, unknown> };

export const modeleOrdo = (id: string) => MODELES_ORDONNANCE.find((m) => m.id === id);

// Représentation lisible d'un champ (à partir du contenu complet de l'ordonnance).
export function valeurLisible(champ: ChampOrdo, contenu: Record<string, unknown>): string {
  if (champ.type === "section") return "";
  const v = contenu[champ.key];
  if (champ.type === "checkboxes") return Array.isArray(v) ? v.join(", ") : "";
  if (champ.type === "valeur_unite") {
    const u = contenu[champ.uniteKey];
    return v != null && v !== "" ? `${v} ${u ?? ""}`.trim() : "";
  }
  if (v == null) return "";
  return String(v);
}
