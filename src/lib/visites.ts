"use client";
/**
 * Suivi des fiches patient consultées par le professionnel.
 * Sert à n'autoriser la clôture d'une alerte qu'après avoir réellement
 * ouvert la fiche du patient concerné (depuis le déclenchement de l'alerte).
 *
 * On mémorise l'horodatage de la dernière visite par patient : une alerte
 * n'est clôturable que si la fiche a été consultée APRÈS son déclenchement.
 */
const KEY = "sc_visites_patients";

function lire(): Record<string, number> {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "{}");
  } catch {
    return {};
  }
}

function ecrire(m: Record<string, number>) {
  try {
    localStorage.setItem(KEY, JSON.stringify(m));
  } catch {
    /* mode privé : ignoré */
  }
}

/** Enregistre la consultation de la fiche d'un patient (maintenant). */
export function marquerVisite(patientId: string) {
  if (!patientId) return;
  const m = lire();
  m[patientId] = Date.now();
  ecrire(m);
}

/** Horodatage (ms) de la dernière visite de la fiche, ou null. */
export function dateVisite(patientId: string): number | null {
  if (!patientId) return null;
  return lire()[patientId] ?? null;
}
