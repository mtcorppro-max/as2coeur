"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useProSession } from "@/lib/hooks/useSession";

const eur = (n: number) => n.toLocaleString("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });

// CA généré + CA prévisionnel jusqu'à la fin de PEC (côté pro, prévisionnel).
export function FacturationPatient({ patientId }: { patientId: string }) {
  const pro = useProSession();
  const [genere, setGenere] = useState(0);
  const [projection, setProjection] = useState<number | null>(null);
  const [pret, setPret] = useState(false);
  const peut = !!pro && (pro.niveau <= 1 || ["dirigeant", "coordinatrice"].includes(pro.role));

  useEffect(() => {
    if (!peut) return;
    const supabase = createClient();
    (async () => {
      const [{ data: facts }, { data: pat }] = await Promise.all([
        supabase.from("facture_previsionnelle").select("montant_base,statut").eq("patient_id", patientId),
        supabase.from("patient").select("date_operation,duree_prise_en_charge").eq("id", patientId).maybeSingle(),
      ]);
      const g = ((facts ?? []) as { montant_base: number; statut: string }[])
        .filter((f) => f.statut !== "annulee")
        .reduce((a, f) => a + Number(f.montant_base), 0);
      setGenere(g);
      // Projection linéaire jusqu'à fin de PEC (estimation, hors forfaits).
      const p = pat as { date_operation?: string | null; duree_prise_en_charge?: number | null } | null;
      if (p?.date_operation && p?.duree_prise_en_charge && g > 0) {
        const debut = new Date(p.date_operation).getTime();
        const ecoule = Math.max(1, (Date.now() - debut) / 86_400_000);
        const total = p.duree_prise_en_charge;
        if (ecoule < total) setProjection(Math.round((g / ecoule) * total));
        else setProjection(g);
      } else {
        setProjection(null);
      }
      setPret(true);
    })();
  }, [patientId, peut]);

  if (!peut || !pret) return null;

  return (
    <section className="card grid gap-2">
      <h2 className="text-sm font-semibold text-slate-600">Facturation prévisionnelle Sécu</h2>
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-rose-100 p-3">
          <p className="text-xs text-slate-400">CA déjà généré</p>
          <p className="mt-0.5 text-xl font-bold text-brand">{eur(genere)}</p>
        </div>
        <div className="rounded-xl border border-rose-100 p-3">
          <p className="text-xs text-slate-400">CA prévisionnel fin de PEC</p>
          <p className="mt-0.5 text-xl font-bold text-slate-800">{projection === null ? "—" : eur(projection)}</p>
          {projection !== null && <p className="text-[11px] text-slate-400">estimation (hors forfaits)</p>}
        </div>
      </div>
    </section>
  );
}
