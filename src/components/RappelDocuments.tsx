"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { usePatientSession } from "@/lib/hooks/useSession";
import { rappelDocuments } from "@/lib/avatarGuide";
import { AvatarGuide } from "@/components/AvatarGuide";

// À chaque connexion, tant qu'il manque un document (carte Vitale,
// mutuelle), l'avatar-guide le rappelle — ton adapté à l'âge du patient.
export function RappelDocuments() {
  const patient = usePatientSession();
  const [manquants, setManquants] = useState<string[] | null>(null);

  useEffect(() => {
    if (!patient?.id) return;
    createClient()
      .from("patient")
      .select("carte_vitale_chemin,mutuelle_chemin")
      .eq("id", patient.id)
      .maybeSingle()
      .then(({ data }) => {
        const d = (data ?? {}) as { carte_vitale_chemin?: string | null; mutuelle_chemin?: string | null };
        const m: string[] = [];
        if (!d.carte_vitale_chemin) m.push("carte Vitale");
        if (!d.mutuelle_chemin) m.push("mutuelle");
        setManquants(m);
      });
  }, [patient?.id]);

  if (!patient || !manquants || manquants.length === 0) return null;

  return (
    <Link href="/patient/profil" className="block transition hover:opacity-90">
      <AvatarGuide
        dateNaissance={patient.date_naissance}
        sexe={patient.sexe}
        taille={52}
        bulle={
          <div className="flex items-center gap-3">
            <p className="text-sm text-slate-700">{rappelDocuments(patient.date_naissance, manquants)}</p>
            <span className="ml-auto shrink-0 text-brand">→</span>
          </div>
        }
      />
    </Link>
  );
}
