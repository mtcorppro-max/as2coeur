"use client";

import { EspaceRubriques } from "@/components/EspaceRubriques";

export default function EspaceFormationPage() {
  return (
    <EspaceRubriques
      titre="Espace formation"
      sous="Mes formations par thème."
      rubriques={[
        { id: "perfusion-nutrition", label: "Perfusion / Nutrition", message: "Modules de formation Perfusion et Nutrition (à domicile)." },
        { id: "oxygenotherapie", label: "Oxygénothérapie", message: "Modules de formation Oxygénothérapie." },
        { id: "plaie-cicatrisation", label: "Plaie & cicatrisation", message: "Modules de formation Plaies et cicatrisation." },
        { id: "parkinson", label: "Parkinson", message: "Modules de formation Parkinson." },
        { id: "insulinotherapie", label: "Insulinothérapie", message: "Modules de formation Insulinothérapie." },
      ]}
    />
  );
}
