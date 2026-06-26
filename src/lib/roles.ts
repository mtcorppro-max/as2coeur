import type { RolePro } from "./types";

export const LIBELLE_ROLE: Record<RolePro, string> = {
  coordinatrice: "Coordinatrice",
  manager: "Manager",
  chirurgien: "Chirurgien",
  delegue: "Délégué médical",
};

// Un manager a les mêmes droits qu'une coordinatrice (+ des fonctions en plus).
export const estCoordOuManager = (r: string | undefined | null) =>
  r === "coordinatrice" || r === "manager";

// Matrice des droits (cf. §4 du cahier des charges).
export const peut = {
  ecrirePatient: (r: RolePro) => r === "coordinatrice",
  parametrerSeuils: (r: RolePro) => r === "coordinatrice",
  traiterAlerte: (r: RolePro) => r === "coordinatrice",
  saisirMesure: (r: RolePro) => r === "coordinatrice",
  messagerie: (r: RolePro) => r === "coordinatrice" || r === "manager" || r === "chirurgien",
};
