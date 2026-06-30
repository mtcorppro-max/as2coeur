"use client";

import { EspaceRubriques } from "@/components/EspaceRubriques";

export default function EspaceRhPage() {
  return (
    <EspaceRubriques
      titre="Espace RH"
      sous="Mes démarches RH."
      rubriques={[
        { id: "entretien", label: "Demander un entretien", message: "Formulaire de demande d'entretien (manager / RH), avec motif et créneaux souhaités." },
        { id: "postes", label: "Postes à pourvoir", message: "Tous les postes ouverts au sein de l'entreprise, avec possibilité de candidater en interne." },
      ]}
    />
  );
}
