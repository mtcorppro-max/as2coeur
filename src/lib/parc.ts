// Constantes partagées du parc matériel.
export const STATUTS: Record<string, { label: string; cls: string }> = {
  disponible: { label: "Disponible", cls: "bg-green-100 text-ok" },
  affecte: { label: "Affecté", cls: "bg-sky-100 text-sky-700" },
  chez_patient: { label: "Chez le patient", cls: "bg-amber-100 text-attention" },
  en_transit: { label: "En transit", cls: "bg-slate-100 text-slate-600" },
  en_maintenance: { label: "En maintenance", cls: "bg-rose-100 text-rose-600" },
  hors_service: { label: "Hors service", cls: "bg-slate-200 text-slate-500" },
};
