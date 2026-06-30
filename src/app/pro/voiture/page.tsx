"use client";

import { EspaceRubriques } from "@/components/EspaceRubriques";

export default function EspaceVoiturePage() {
  return (
    <EspaceRubriques
      titre="Espace voiture"
      sous="Mon véhicule et le parc automobile."
      rubriques={[
        { id: "ma-voiture", label: "Ma voiture", message: "Véhicule attribué, entretien, assurance, carte carburant et documents." },
        { id: "parc-auto", label: "Parc auto", message: "Le parc automobile de l'entreprise : véhicules disponibles, attribution, réservation." },
      ]}
    />
  );
}
