"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useProSession } from "@/lib/hooks/useSession";
import { NouveauPatientForm } from "@/components/NouveauPatientForm";

export default function NouveauPatient() {
  const pro = useProSession();
  const router = useRouter();

  // Réservé à la coordinatrice — redirection si autre rôle.
  useEffect(() => {
    if (pro && pro.role !== "coordinatrice") router.replace("/pro");
  }, [pro, router]);

  if (pro && pro.role !== "coordinatrice") return null;

  return (
    <div className="mx-auto grid max-w-lg gap-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Nouveau patient</h1>
        <p className="mt-1 text-sm text-slate-500">
          Un code unique sera généré : remettez-le au patient pour sa connexion.
        </p>
      </div>
      <NouveauPatientForm />
    </div>
  );
}
