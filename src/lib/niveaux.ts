// Niveaux d'accès (cf. migration 0029)
//   0 = super-admin plateforme (voit tout)
//   1 = région · 2 = agence · 3 = rattaché
export const NIVEAU_LABEL: Record<number, string> = {
  0: "Niveau 0 — plateforme",
  1: "Niveau 1 — région",
  2: "Niveau 2 — agence",
  3: "Niveau 3 — rattaché",
};

// Options pour un sélecteur de niveau, limitées à « ≥ le niveau du créateur »
// (on ne peut pas créer un compte plus puissant que soi).
export function optionsNiveau(niveauCreateur: number) {
  const tous = [
    { value: "0", label: "Niveau 0 — accès plateforme (tout)" },
    { value: "1", label: "Niveau 1 — tous les patients de la région" },
    { value: "2", label: "Niveau 2 — tous les patients de l'agence" },
    { value: "3", label: "Niveau 3 — uniquement les patients rattachés" },
  ];
  return tous.filter((o) => Number(o.value) >= niveauCreateur);
}
