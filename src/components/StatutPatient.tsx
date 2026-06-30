"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Select } from "@/components/Select";
import { STATUT_PATIENT, STATUTS_PATIENT_OPTIONS } from "@/lib/statutPatient";

// Statut de prise en charge du patient : badge en lecture, sélecteur si modifiable.
export function StatutPatient({ patientId, statut, modifiable }: { patientId: string; statut: string; modifiable: boolean }) {
  const [val, setVal] = useState(statut || "active");
  const [busy, setBusy] = useState(false);
  const meta = STATUT_PATIENT[val] ?? STATUT_PATIENT.active;

  async function changer(s: string) {
    if (s === val) return;
    const prev = val;
    setVal(s); setBusy(true);
    const { error } = await createClient().from("patient").update({ statut: s }).eq("id", patientId);
    setBusy(false);
    if (error) { alert("Échec : " + error.message); setVal(prev); }
  }

  if (!modifiable) return <span className={`badge ${meta.cls}`}>{meta.label}</span>;

  return (
    <div className="grid gap-1">
      <span className="text-xs font-medium text-slate-400">Statut</span>
      <div className="flex items-center gap-2">
        <span className={`badge ${meta.cls}`}>{meta.label}</span>
        <div className="w-44"><Select value={val} onChange={changer} options={STATUTS_PATIENT_OPTIONS} /></div>
        {busy && <span className="text-xs text-slate-400">…</span>}
      </div>
    </div>
  );
}
