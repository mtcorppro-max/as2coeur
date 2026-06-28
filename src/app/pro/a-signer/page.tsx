"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useProSession } from "@/lib/hooks/useSession";
import { SignatureModal, type Ordo } from "@/components/OrdonnancesPatient";

type Row = Ordo & { patient: { nom: string } | { nom: string }[] | null };
const nomPatient = (r: Row) => (Array.isArray(r.patient) ? r.patient[0]?.nom : r.patient?.nom) ?? "Patient";

export default function ASignerPage() {
  const pro = useProSession();
  const [rows, setRows] = useState<Row[]>([]);
  const [pret, setPret] = useState(false);
  const [signer, setSigner] = useState<{ ordo: Ordo; patientNom: string } | null>(null);

  const charger = useCallback(async () => {
    if (!pro) return;
    const { data } = await createClient()
      .from("ordonnance")
      .select("id,type,titre,contenu,destinataire_id,statut,signature,signataire_nom,signee_le,created_at,patient:patient_id(nom)")
      .eq("destinataire_id", pro.id)
      .eq("statut", "a_signer")
      .order("created_at", { ascending: false });
    setRows((data ?? []) as unknown as Row[]);
    setPret(true);
  }, [pro]);

  useEffect(() => { charger(); }, [charger]);

  const monNom = pro ? [pro.titre, pro.prenom, pro.nom].filter(Boolean).join(" ") : "";

  return (
    <div className="grid gap-6">
      <h1 className="text-2xl font-bold text-slate-800">Ordonnances à signer</h1>

      {!pret ? (
        <p className="text-sm text-slate-400">Chargement…</p>
      ) : rows.length === 0 ? (
        <div className="card text-sm text-slate-500">Aucune ordonnance en attente de votre signature. ✓</div>
      ) : (
        <section className="card grid gap-2">
          {rows.map((r) => (
            <div key={r.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rose-100 px-3 py-2">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-slate-800">{r.titre}</span>
                  <span className="badge bg-amber-100 text-attention">En attente</span>
                </div>
                <p className="text-xs text-slate-400">Patient : {nomPatient(r)} · {new Date(r.created_at).toLocaleDateString("fr-FR")}</p>
              </div>
              <button onClick={() => setSigner({ ordo: { ...r, destinataire: null } as Ordo, patientNom: nomPatient(r) })} className="btn-primary px-3 py-1.5 text-sm">
                Lire et signer
              </button>
            </div>
          ))}
        </section>
      )}

      {signer && (
        <SignatureModal
          ordo={signer.ordo}
          patientNom={signer.patientNom}
          signataire={monNom}
          onClose={() => setSigner(null)}
          onSigned={() => { setSigner(null); charger(); }}
        />
      )}
    </div>
  );
}
