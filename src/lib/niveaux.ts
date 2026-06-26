// Niveaux d'accès (cf. migration 0029)
//   0 = super-admin plateforme (voit tout)
//   1 = région · 2 = agence · 3 = rattaché
export const NIVEAU_LABEL: Record<number, string> = {
  0: "Niveau 0 — plateforme",
  1: "Niveau 1 — manager (région)",
  2: "Niveau 2 — agence",
  3: "Niveau 3 — rattaché",
};

// Peut-on octroyer ce niveau quand on est `createur` ?
//  - on ne peut pas créer plus puissant que soi (n >= createur)
//  - le niveau 1 (manager) est réservé au niveau 0
export function peutOctroyer(createur: number, n: number) {
  if (n < createur) return false;
  if (n === 1 && createur !== 0) return false;
  return true;
}

// Options pour un sélecteur de niveau, selon le niveau du créateur.
export function optionsNiveau(niveauCreateur: number) {
  const tous = [
    { value: "0", label: "Niveau 0 — accès plateforme (tout)" },
    { value: "1", label: "Niveau 1 — manager (toute la région)" },
    { value: "2", label: "Niveau 2 — tous les patients de l'agence" },
    { value: "3", label: "Niveau 3 — uniquement les patients rattachés" },
  ];
  return tous.filter((o) => peutOctroyer(niveauCreateur, Number(o.value)));
}
