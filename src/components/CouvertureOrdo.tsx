"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { trousCouverture, type OrdoCouv, type Trou } from "@/lib/couvertureOrdo";

// Pastille rouge « FAE » : le patient est actif mais sa prise en charge n'est pas
// entièrement couverte par une ordonnance. Au clic → les dates non couvertes.
export function CouvertureOrdo({ patientId, statut, dateOperation }: { patientId: string; statut: string; dateOperation: string | null }) {
  const [trous, setTrous] = useState<Trou[] | null>(null);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const charger = useCallback(async () => {
    if (statut !== "active") { setTrous(null); return; }
    const { data } = await createClient()
      .from("ordonnance")
      .select("type,titre,contenu,created_at")
      .eq("patient_id", patientId);
    const res = trousCouverture((data ?? []) as OrdoCouv[], dateOperation);
    setTrous(res ? res.trous : null);
  }, [patientId, statut, dateOperation]);

  useEffect(() => { charger(); }, [charger]);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  if (!trous || trous.length === 0) return null; // couvert (ou non évaluable)

  const fmt = (d: Date) => d.toLocaleDateString("fr-FR");
  const ligne = (t: Trou) => (t.debut.getTime() === t.fin.getTime() ? `le ${fmt(t.debut)}` : `du ${fmt(t.debut)} au ${fmt(t.fin)}`);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        title="Prise en charge non couverte par une ordonnance"
        className="inline-flex items-center gap-1.5 rounded-full bg-red-100 px-3 py-1.5 text-sm font-bold text-critique transition hover:brightness-95"
      >
        <span className="h-2 w-2 rounded-full bg-current opacity-80" />
        FAE
      </button>
      {open && (
        <div className="absolute right-0 z-50 mt-1.5 w-72 overflow-hidden rounded-2xl border border-red-100 bg-white p-3 shadow-xl">
          <p className="text-xs font-semibold uppercase tracking-wide text-critique">Périodes sans ordonnance</p>
          <p className="mt-0.5 text-[11px] text-slate-400">Prise en charge non couverte par une ordonnance :</p>
          <ul className="mt-2 grid gap-1">
            {trous.map((t, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-critique" />
                <span>{ligne(t)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
