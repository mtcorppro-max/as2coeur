"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { usePatientSession } from "@/lib/hooks/useSession";

// Présente automatiquement le bilan les jours de suivi (J2 + jours du protocole),
// sauf si une alerte est active (l'infirmière coordinatrice appelle alors).
export function RappelBilanPatient() {
  const patient = usePatientSession();
  const [etat, setEtat] = useState<"rien" | "bilan" | "alerte" | "envoye" | "lu">("rien");

  useEffect(() => {
    if (!patient?.id) return;
    const supabase = createClient();
    const debutJour = (() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; })();
    (async () => {
      const [{ data: p }, { data: bilans }, { data: al }] = await Promise.all([
        supabase.from("patient").select("date_operation,jours_suivi,statut").eq("id", patient.id).maybeSingle(),
        supabase.from("bilan_etat").select("id,lu_le").eq("patient_id", patient.id).gte("created_at", debutJour.toISOString()).order("created_at", { ascending: false }),
        supabase.from("alerte").select("id").eq("patient_id", patient.id).in("statut", ["declenchee", "escaladee"]),
      ]);
      // Alerte active → pas de bilan auto (suivi en direct par l'infirmière).
      if (al && al.length > 0) { setEtat("alerte"); return; }
      // Bilan du jour déjà rempli → transmis, voire lu par l'infirmière.
      const bilanJour = (bilans ?? [])[0] as { lu_le: string | null } | undefined;
      if (bilanJour) { setEtat(bilanJour.lu_le ? "lu" : "envoye"); return; }
      const pp = p as { date_operation: string | null; jours_suivi: number[] | null; statut: string } | null;
      if (!pp?.date_operation || pp.statut !== "active") { setEtat("rien"); return; }
      const base = new Date(pp.date_operation); base.setHours(0, 0, 0, 0);
      const dayNum = Math.round((debutJour.getTime() - base.getTime()) / 86_400_000);
      const jours = new Set<number>([2, ...((pp.jours_suivi ?? []))]); // J2 = après la 1re nuit + protocole
      setEtat(jours.has(dayNum) ? "bilan" : "rien");
    })();
  }, [patient?.id]);

  if (etat === "lu") {
    return (
      <div className="mb-4 flex items-center gap-3 rounded-2xl border border-green-200 bg-green-50 px-4 py-3">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6 shrink-0 text-ok"><circle cx="12" cy="12" r="9" /><path d="m8.5 12 2.2 2.2 4.8-4.8" /></svg>
        <p className="text-sm text-slate-700">Votre rapport d&apos;aujourd&apos;hui a bien été <b>reçu et lu par votre infirmière</b>.</p>
      </div>
    );
  }
  if (etat === "envoye") {
    return (
      <div className="mb-4 flex items-center gap-3 rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6 shrink-0 text-sky-600"><path d="m5 12 5 5L20 7" /></svg>
        <p className="text-sm text-slate-700">Votre bilan du jour a bien été <b>transmis à votre équipe de soins</b>.</p>
      </div>
    );
  }
  if (etat === "alerte") {
    return (
      <div className="mb-4 flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6 shrink-0 text-attention"><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" /><path d="M12 9v4M12 17h.01" /></svg>
        <p className="text-sm text-attention">Une alerte a été détectée sur vos dernières mesures. <b>Votre infirmière coordinatrice va vous contacter</b> pour un suivi. En cas d&apos;urgence, appelez le 15.</p>
      </div>
    );
  }
  if (etat === "bilan") {
    return (
      <Link href="/patient/bilan" prefetch className="flex items-center gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 transition hover:border-brand">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6 shrink-0 text-brand"><rect x="8" y="3" width="8" height="4" rx="1" /><path d="M16 5h2a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h2" /><path d="m9 13 2 2 4-4" /></svg>
        <div className="text-sm">
          <p className="font-semibold text-slate-800">Le bilan du jour est disponible</p>
          <p className="text-slate-600">Quelques questions rapides sur votre état général.</p>
        </div>
        <span className="ml-auto text-brand">→</span>
      </Link>
    );
  }
  return null;
}
