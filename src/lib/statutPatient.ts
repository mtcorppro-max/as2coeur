// Statuts de prise en charge du patient (libellés + couleurs + options).
export const STATUT_PATIENT: Record<string, { label: string; cls: string }> = {
  active: { label: "Actif", cls: "bg-green-100 text-ok" },
  terminee: { label: "Fin de traitement", cls: "bg-slate-100 text-slate-600" },
  arret_perfusions: { label: "Arrêt des perfusions", cls: "bg-amber-100 text-attention" },
  suspendue: { label: "Suspendu", cls: "bg-amber-100 text-attention" },
  hospitalise: { label: "Hospitalisé", cls: "bg-sky-100 text-sky-700" },
  decede: { label: "Décédé(e)", cls: "bg-slate-200 text-slate-500" },
  annule: { label: "Annulé", cls: "bg-red-100 text-critique" },
};

// Ordre d'affichage dans le sélecteur.
export const STATUTS_PATIENT_OPTIONS = ["active", "terminee", "arret_perfusions", "suspendue", "hospitalise", "decede", "annule"]
  .map((v) => ({ value: v, label: STATUT_PATIENT[v].label }));

// Patient en prise en charge active (compté dans suivis / PEC en cours).
export const estActifPatient = (statut: string | null | undefined) => statut === "active";
