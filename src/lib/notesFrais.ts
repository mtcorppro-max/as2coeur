// Notes de frais — constantes partagées (types, statuts, formatage, bucket).
import type { RolePro } from "./types";

export const BUCKET_JUSTIFS = "justificatifs";

export const TYPES_DEPENSE: { value: string; label: string }[] = [
  { value: "repas", label: "Repas" },
  { value: "transport", label: "Transport" },
  { value: "hebergement", label: "Hébergement" },
  { value: "peage", label: "Péage" },
  { value: "carburant", label: "Carburant" },
  { value: "inscription", label: "Inscription" },
  { value: "fournitures", label: "Fournitures" },
  { value: "autre", label: "Autre" },
];
export const libDepense = (t: string) => TYPES_DEPENSE.find((x) => x.value === t)?.label ?? t;

export const STATUTS_NDF: Record<string, { label: string; cls: string }> = {
  brouillon: { label: "Brouillon", cls: "bg-slate-100 text-slate-500" },
  soumise: { label: "À valider", cls: "bg-amber-100 text-attention" },
  validee: { label: "Validée", cls: "bg-green-100 text-ok" },
  rejetee: { label: "Rejetée", cls: "bg-red-100 text-critique" },
  remboursee: { label: "Remboursée", cls: "bg-sky-100 text-sky-700" },
};

export const eurNdf = (n: number) =>
  Number(n || 0).toLocaleString("fr-FR", { style: "currency", currency: "EUR", minimumFractionDigits: 2, maximumFractionDigits: 2 });

// Comptes internes qui déposent des notes de frais (tous sauf partenaires externes).
const EXTERNES: RolePro[] = ["chirurgien", "infirmiere_liberale", "pharmacie"];
export const peutNotesFrais = (role: string | undefined | null) =>
  !!role && !EXTERNES.includes(role as RolePro);
