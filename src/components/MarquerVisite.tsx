"use client";

import { useEffect } from "react";
import { marquerVisite } from "@/lib/visites";

// Enregistre la consultation de la fiche patient à son ouverture.
// Permet ensuite de clôturer les alertes de ce patient (cf. AlerteCard).
export function MarquerVisite({ patientId }: { patientId: string }) {
  useEffect(() => {
    marquerVisite(patientId);
  }, [patientId]);
  return null;
}
