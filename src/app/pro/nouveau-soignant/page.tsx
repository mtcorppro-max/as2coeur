"use client";

import { useProSession } from "@/lib/hooks/useSession";
import { SoignantForm } from "@/components/SoignantForm";

export default function NouveauSoignant() {
  const pro = useProSession();

  // Réservé aux comptes gestionnaires (niveau 0/1/2, hors médecins / chirurgiens)
  if (pro && (pro.niveau > 2 || pro.role === "chirurgien")) {
    return (
      <div className="card text-sm text-slate-500">
        La création de comptes soignants n&apos;est pas accessible à ce compte.
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-5 text-2xl font-bold text-slate-800">Nouveau compte soignant</h1>
      <SoignantForm />
    </div>
  );
}
