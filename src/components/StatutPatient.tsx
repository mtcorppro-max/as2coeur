"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { STATUT_PATIENT, STATUTS_PATIENT_OPTIONS } from "@/lib/statutPatient";

// Statut de prise en charge : pastille colorée cliquable → menu de statuts.
export function StatutPatient({ patientId, statut, modifiable }: { patientId: string; statut: string; modifiable: boolean }) {
  const [val, setVal] = useState(statut || "active");
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const meta = STATUT_PATIENT[val] ?? STATUT_PATIENT.active;

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  async function changer(s: string) {
    setOpen(false);
    if (s === val) return;
    const prev = val;
    setVal(s); setBusy(true);
    const { error } = await createClient().from("patient").update({ statut: s }).eq("id", patientId);
    setBusy(false);
    if (error) { alert("Échec : " + error.message); setVal(prev); }
  }

  // Pastille colorée (le « dot » prend la couleur du texte du statut).
  const pastille = (
    <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-semibold ${meta.cls}`}>
      <span className="h-2 w-2 rounded-full bg-current opacity-80" />
      {meta.label}
      {busy && <span className="opacity-60">…</span>}
    </span>
  );

  if (!modifiable) return pastille;

  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen((v) => !v)} className="group inline-flex items-center" aria-label="Changer le statut">
        <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-semibold transition group-hover:brightness-95 ${meta.cls}`}>
          <span className="h-2 w-2 rounded-full bg-current opacity-80" />
          {meta.label}
          {busy ? <span className="opacity-60">…</span> : (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`} aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M6 9l6 6 6-6" /></svg>
          )}
        </span>
      </button>
      {open && (
        <div className="absolute right-0 z-50 mt-1.5 w-56 overflow-hidden rounded-2xl border border-rose-100 bg-white p-1 shadow-xl">
          <p className="px-2.5 pb-1 pt-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Statut de prise en charge</p>
          {STATUTS_PATIENT_OPTIONS.map((o) => {
            const m = STATUT_PATIENT[o.value];
            const actif = o.value === val;
            return (
              <button
                key={o.value}
                onClick={() => changer(o.value)}
                className={`flex w-full items-center justify-between gap-2 rounded-xl px-2.5 py-2 text-left text-sm transition hover:bg-rose-50 ${actif ? "bg-rose-50" : ""}`}
              >
                <span className="flex items-center gap-2">
                  <span className={`h-2.5 w-2.5 rounded-full ${m.cls.split(" ")[1] ?? ""}`} style={{ backgroundColor: "currentColor" }} />
                  <span className={`${m.cls.split(" ")[1] ?? "text-slate-700"} font-medium`}>{o.label}</span>
                </span>
                {actif && <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} className="h-4 w-4 text-brand" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M5 12l5 5 9-10" /></svg>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
