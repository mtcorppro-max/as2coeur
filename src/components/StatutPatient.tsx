"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { STATUT_PATIENT, STATUTS_PATIENT_OPTIONS } from "@/lib/statutPatient";
import type { StatutDetailPEC } from "@/lib/types";

// Statuts partiels : le patient n'est pas allé au bout du protocole → on demande
// le nombre de perfusions effectuées / prévues + une note.
const AVEC_DETAIL = new Set(["arret_perfusions", "suspendue", "hospitalise", "decede"]);

// Statut de prise en charge : pastille colorée cliquable → menu de statuts.
export function StatutPatient({
  patientId, statut, modifiable, estPostOp = false, statutDetail = null,
}: {
  patientId: string;
  statut: string;
  modifiable: boolean;
  estPostOp?: boolean;
  statutDetail?: StatutDetailPEC | null;
}) {
  const [val, setVal] = useState(statut || "active");
  const [detail, setDetail] = useState<StatutDetailPEC | null>(statutDetail);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [modal, setModal] = useState<string | null>(null); // statut partiel en cours de saisie
  const ref = useRef<HTMLDivElement>(null);
  const meta = STATUT_PATIENT[val] ?? STATUT_PATIENT.active;
  const decede = val === "decede";

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  async function appliquer(s: string, det: StatutDetailPEC | null) {
    const prev = val, prevD = detail;
    setVal(s); setDetail(det); setBusy(true);
    const { error } = await createClient().from("patient").update({ statut: s, statut_detail: det }).eq("id", patientId);
    setBusy(false);
    if (error) { alert("Échec : " + error.message); setVal(prev); setDetail(prevD); return; }
    // Chaque changement de statut est notifié au service comptabilité (facturation),
    // avec le motif et les perfusions effectuées. Non bloquant.
    fetch("/api/statut-notif", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ patient_id: patientId, ancien: prev, nouveau: s, detail: det }),
    }).catch(() => {});
  }

  function choisir(s: string) {
    setOpen(false);
    if (s === val) return;
    // Réactivation impossible pour un patient décédé.
    if (decede && s === "active") return;
    if (AVEC_DETAIL.has(s)) { setModal(s); return; } // ouvre la fenêtre de saisie
    appliquer(s, null); // active / terminée / annulé : pas de détail
  }

  const pilule = (interactif: boolean) => (
    <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-semibold ${interactif ? "transition group-hover:brightness-95" : ""} ${meta.cls}`}>
      <span className="h-2 w-2 rounded-full bg-current opacity-80" />
      {meta.label}
      {busy ? <span className="opacity-60">…</span> : interactif && (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`} aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M6 9l6 6 6-6" /></svg>
      )}
    </span>
  );

  // Détail affiché sous la pastille (statut partiel).
  const detailLigne = detail && AVEC_DETAIL.has(val) && (
    <p className="mt-1 text-right text-xs text-slate-400">
      {(detail.effectuees != null || detail.prevues != null) && (
        <span className="font-medium text-slate-500">{detail.effectuees ?? "?"} / {detail.prevues ?? "?"} perfusions</span>
      )}
      {detail.note ? <span className="block max-w-56 truncate italic">{detail.note}</span> : null}
    </p>
  );

  return (
    <div ref={ref} className="relative">
      {!modifiable ? (
        <>{pilule(false)}{detailLigne}</>
      ) : (
        <>
          <button onClick={() => setOpen((v) => !v)} className="group inline-flex items-center" aria-label="Changer le statut">
            {pilule(true)}
          </button>
          {detailLigne}
          {open && (
            <div className="absolute right-0 z-50 mt-1.5 w-60 overflow-hidden rounded-2xl border border-rose-100 bg-white p-1 shadow-xl">
              <p className="px-2.5 pb-1 pt-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Statut de prise en charge</p>
              {STATUTS_PATIENT_OPTIONS.map((o) => {
                const m = STATUT_PATIENT[o.value];
                const actif = o.value === val;
                const bloque = decede && o.value === "active"; // pas de réactivation d'un décédé
                return (
                  <button
                    key={o.value}
                    onClick={() => !bloque && choisir(o.value)}
                    disabled={bloque}
                    title={bloque ? "Réactivation impossible (patient décédé)" : undefined}
                    className={`flex w-full items-center justify-between gap-2 rounded-xl px-2.5 py-2 text-left text-sm transition ${bloque ? "cursor-not-allowed opacity-40" : "hover:bg-rose-50"} ${actif ? "bg-rose-50" : ""}`}
                  >
                    <span className="flex items-center gap-2">
                      <span className={`h-2.5 w-2.5 rounded-full ${m.cls.split(" ")[1] ?? ""}`} style={{ backgroundColor: "currentColor" }} />
                      <span className={`${m.cls.split(" ")[1] ?? "text-slate-700"} font-medium`}>{o.value === "active" && val !== "active" ? "Réactiver la prise en charge" : o.label}</span>
                    </span>
                    {actif && <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} className="h-4 w-4 text-brand" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M5 12l5 5 9-10" /></svg>}
                  </button>
                );
              })}
            </div>
          )}
        </>
      )}

      {modal && (
        <SaisiePerfusions
          statut={modal}
          estPostOp={estPostOp}
          initial={detail}
          onCancel={() => setModal(null)}
          onValider={(det) => { setModal(null); appliquer(modal, det); }}
        />
      )}
    </div>
  );
}

function SaisiePerfusions({
  statut, estPostOp, initial, onCancel, onValider,
}: {
  statut: string;
  estPostOp: boolean;
  initial: StatutDetailPEC | null;
  onCancel: () => void;
  onValider: (det: StatutDetailPEC) => void;
}) {
  const [eff, setEff] = useState(initial?.effectuees != null ? String(initial.effectuees) : "");
  const [prev, setPrev] = useState(initial?.prevues != null ? String(initial.prevues) : "");
  const [note, setNote] = useState(initial?.note ?? "");
  const label = STATUT_PATIENT[statut]?.label ?? statut;
  const num = (s: string) => (s.trim() === "" ? null : Number(s));

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-auto bg-black/30 p-4 pt-16" onClick={onCancel}>
      <div className="card grid w-full max-w-md gap-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-800">{label}</h2>
          <button onClick={onCancel} className="text-slate-400 hover:text-critique">✕</button>
        </div>
        <p className="text-sm text-slate-500">Le patient n&apos;est pas allé au bout du protocole. Indiquez les perfusions réalisées.</p>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Perfusions effectuées</label>
            <input type="number" min={0} inputMode="numeric" value={eff} onChange={(e) => setEff(e.target.value)} className="input" placeholder="ex. 8" />
          </div>
          <div>
            <label className="label">Total prévu (protocole)</label>
            <input type="number" min={0} inputMode="numeric" value={prev} onChange={(e) => setPrev(e.target.value)} className="input" placeholder="ex. 12" />
          </div>
        </div>
        <div>
          <label className="label">Note (motif, précisions…)</label>
          <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} className="input" placeholder="Motif de l'arrêt, contexte…" />
        </div>

        <p className={`rounded-lg px-3 py-2 text-xs ${estPostOp ? "bg-slate-100 text-slate-600" : "bg-sky-50 text-sky-700"}`}>
          {estPostOp
            ? "Patient post-opératoire : l'arrêt du protocole est en principe définitif (la prise en charge peut toutefois être réactivée si nécessaire)."
            : "Prise en charge aiguë / chronique : le protocole pourra être repris plus tard (réactivation possible)."}
        </p>

        <button onClick={() => onValider({ effectuees: num(eff), prevues: num(prev), note: note.trim() || null, le: new Date().toISOString() })} className="btn-primary py-3">
          Enregistrer le statut « {label} »
        </button>
      </div>
    </div>
  );
}
