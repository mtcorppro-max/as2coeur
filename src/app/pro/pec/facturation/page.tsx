"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useProSession } from "@/lib/hooks/useSession";

type Facture = {
  id: string; patient_id: string; statut: string;
  montant_base: number; part_secu: number; part_mutuelle: number; part_patient: number;
  periode_debut: string | null; envoyee_le: string | null;
};

const eur = (n: number) => n.toLocaleString("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
const moisCourt = (d: Date) => d.toLocaleDateString("fr-FR", { month: "short" });
const mkey = (s: string | null) => (s ? s.slice(0, 7) : "");

export default function FacturationDashboardPage() {
  const pro = useProSession();
  const [factures, setFactures] = useState<Facture[]>([]);
  const [pret, setPret] = useState(false);
  const peut = !!pro && (pro.niveau <= 1 || pro.role === "dirigeant");

  useEffect(() => {
    if (!pro) return;
    if (!peut) { setPret(true); return; }
    const supabase = createClient();
    (async () => {
      await supabase.rpc("generer_factures_previsionnelles"); // génération auto (idempotente)
      const { data } = await supabase
        .from("facture_previsionnelle")
        .select("id,patient_id,statut,montant_base,part_secu,part_mutuelle,part_patient,periode_debut,envoyee_le");
      setFactures((data ?? []) as Facture[]);
      setPret(true);
    })();
  }, [pro, peut]);

  const s = useMemo(() => {
    const now = new Date();
    const moisCle = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    let aFacturerMois = 0, dejaFacture = 0, paye = 0, attenteSecu = 0, aFacturerTotal = 0;
    const patientsMois = new Set<string>();
    let delaiSum = 0, delaiN = 0;
    for (const f of factures) {
      const m = mkey(f.periode_debut);
      if (f.statut === "a_facturer") {
        aFacturerTotal += f.montant_base;
        if (m === moisCle) { aFacturerMois += f.montant_base; patientsMois.add(f.patient_id); }
      }
      if (f.statut === "envoyee" || f.statut === "payee") dejaFacture += f.montant_base;
      if (f.statut === "payee") paye += f.montant_base;
      if (f.statut === "envoyee") attenteSecu += f.montant_base;
      if (f.envoyee_le && f.periode_debut) {
        const j = (new Date(f.envoyee_le).getTime() - new Date(f.periode_debut).getTime()) / 86_400_000;
        if (j >= 0) { delaiSum += j; delaiN += 1; }
      }
    }
    const serie: { label: string; total: number }[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const total = factures.filter((f) => mkey(f.periode_debut) === k && f.statut !== "annulee").reduce((a, f) => a + f.montant_base, 0);
      serie.push({ label: moisCourt(d), total });
    }
    return {
      aFacturerMois, dejaFacture, paye, attenteSecu, aFacturerTotal,
      patientsMois: patientsMois.size,
      delaiMoyen: delaiN ? Math.round(delaiSum / delaiN) : null,
      serie,
    };
  }, [factures]);

  if (pro && !peut) return <div className="card text-sm text-slate-500">La facturation prévisionnelle est réservée aux managers et dirigeants.</div>;

  const maxSerie = Math.max(1, ...s.serie.map((x) => x.total));

  return (
    <div className="grid grid-cols-1 gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Facturation prévisionnelle Sécu</h1>
          <p className="mt-1 text-sm text-slate-500">Estimation du chiffre d&apos;affaires. <span className="font-medium text-attention">Outil prévisionnel</span> — n&apos;envoie rien à la Sécu.</p>
        </div>
        <Link href="/pro/pec" className="btn-secondary text-sm">← PEC</Link>
      </div>

      {!pret ? (
        <p className="text-sm text-slate-400">Calcul en cours…</p>
      ) : (
        <>
          {/* ── Indicateurs prioritaires ── */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-rose-200 bg-gradient-to-br from-rose-50 to-white p-4">
              <p className="text-sm text-slate-500">Ce mois-ci</p>
              <p className="mt-1 text-xl font-bold text-brand">Vous générerez {eur(s.aFacturerMois)}</p>
              <p className="text-sm text-slate-500">avec {s.patientsMois} patient(s) actif(s)</p>
            </div>
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
              <p className="text-sm text-slate-500">En attente d&apos;envoi à la Sécu</p>
              <p className="mt-1 text-xl font-bold text-attention">{eur(s.aFacturerTotal)}</p>
              <p className="text-sm text-slate-500">factures à transmettre</p>
            </div>
            <div className="rounded-2xl border border-sky-200 bg-sky-50 p-4">
              <p className="text-sm text-slate-500">Délai moyen livraison → facturation</p>
              <p className="mt-1 text-xl font-bold text-sky-700">{s.delaiMoyen === null ? "—" : `${s.delaiMoyen} j`}</p>
              <p className="text-sm text-slate-500">sur les factures envoyées</p>
            </div>
          </div>

          {/* ── KPIs ── */}
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Kpi label="CA à facturer ce mois" value={eur(s.aFacturerMois)} accent />
            <Kpi label="CA déjà facturé" value={eur(s.dejaFacture)} />
            <Kpi label="CA payé" value={eur(s.paye)} />
            <Kpi label="CA en attente Sécu" value={eur(s.attenteSecu)} />
          </div>

          {/* ── Graphique 12 mois ── */}
          <section className="card grid gap-4">
            <h2 className="text-sm font-semibold text-slate-700">Chiffre d&apos;affaires généré — 12 derniers mois</h2>
            <div className="flex items-end justify-between gap-1.5" style={{ height: 180 }}>
              {s.serie.map((m, i) => (
                <div key={i} className="flex min-w-0 flex-1 flex-col items-center justify-end gap-1">
                  <span className="text-[10px] font-medium text-slate-500">{m.total > 0 ? eur(m.total) : ""}</span>
                  <div
                    className="w-full rounded-t-md bg-brand/80"
                    style={{ height: `${Math.max(2, (m.total / maxSerie) * 140)}px` }}
                    title={`${m.label} : ${eur(m.total)}`}
                  />
                  <span className="text-[10px] text-slate-400">{m.label}</span>
                </div>
              ))}
            </div>
          </section>

          <p className="text-xs text-slate-400">
            Le détail des factures (filtres, envoi à la Sécu, exports) arrive juste après. Calcul à l&apos;unité (codes LPP des articles livrés) ; les forfaits récurrents seront ajoutés ensuite.
          </p>
        </>
      )}
    </div>
  );
}

function Kpi({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="card p-4">
      <p className="text-xs text-slate-400">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${accent ? "text-brand" : "text-slate-800"}`}>{value}</p>
    </div>
  );
}
