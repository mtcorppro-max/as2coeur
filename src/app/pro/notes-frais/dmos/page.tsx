"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useProSession } from "@/lib/hooks/useSession";
import { Select } from "@/components/Select";
import { libDepense, eurNdf, STATUTS_NDF } from "@/lib/notesFrais";

const REGIME: Record<string, { label: string; cls: string }> = {
  declaration: { label: "À déclarer", cls: "bg-sky-100 text-sky-700" },
  autorisation: { label: "Autorisation requise", cls: "bg-amber-100 text-attention" },
};
const DECISIONS = [
  { value: "", label: "— En attente —" },
  { value: "declare", label: "Déclaré" },
  { value: "autorise", label: "Autorisé" },
  { value: "tacite", label: "Accord tacite" },
  { value: "refuse", label: "Refusé" },
];
const libDecision = (v: string | null) => DECISIONS.find((d) => d.value === (v ?? ""))?.label ?? "";

type Avantage = {
  id: string; type: string; montant_ttc: number; date_depense: string | null;
  beneficiaire_nom: string | null; beneficiaire_rpps: string | null; beneficiaire_specialite: string | null;
  dmos_regime: string | null; reference_eps: string | null; date_depot: string | null; decision: string | null; publie_transparence: boolean;
  note: { id: string; titre: string; statut: string; emetteur: { nom: string; prenom: string | null; titre: string | null } | null } | null;
  evenement: { nom: string } | null;
};

const peutSuivi = (role: string | undefined, niveau: number | undefined) => niveau === 0 || role === "dirigeant" || role === "manager";
const emetNom = (a: Avantage) => (a.note?.emetteur ? [a.note.emetteur.titre, a.note.emetteur.prenom, a.note.emetteur.nom].filter(Boolean).join(" ") : "");

function telechargerCsv(nom: string, entetes: string[], lignes: (string | number)[][]) {
  const esc = (v: string | number) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const csv = [entetes, ...lignes].map((r) => r.map(esc).join(";")).join("\r\n");
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = nom;
  document.body.appendChild(a); a.click(); a.remove();
}

export default function SuiviDmosPage() {
  const pro = useProSession();
  const [lignes, setLignes] = useState<Avantage[]>([]);
  const [pret, setPret] = useState(false);

  const charger = () => {
    createClient()
      .from("note_de_frais_ligne")
      .select("id,type,montant_ttc,date_depense,beneficiaire_nom,beneficiaire_rpps,beneficiaire_specialite,dmos_regime,reference_eps,date_depot,decision,publie_transparence,note:note_id(id,titre,statut,emetteur:emetteur_id(nom,prenom,titre)),evenement:evenement_id(nom)")
      .eq("est_avantage_ps", true)
      .order("date_depense", { ascending: false })
      .then(({ data }) => { setLignes((data ?? []) as unknown as Avantage[]); setPret(true); });
  };
  useEffect(() => { charger(); }, []);

  if (pro && !peutSuivi(pro.role, pro.niveau)) {
    return <div className="card text-sm text-slate-500">Le suivi DMOS est réservé à la direction et aux managers.</div>;
  }
  const peutEditer = !!pro && (pro.niveau === 0 || pro.role === "dirigeant");

  const maj = async (id: string, patch: Partial<Avantage>) => {
    setLignes((a) => a.map((l) => (l.id === id ? { ...l, ...patch } : l)));
    await createClient().from("note_de_frais_ligne").update(patch).eq("id", id);
  };

  const aDeclarer = lignes.filter((l) => l.dmos_regime === "declaration").length;
  const aAutoriser = lignes.filter((l) => l.dmos_regime === "autorisation").length;
  const total = lignes.reduce((s, l) => s + Number(l.montant_ttc || 0), 0);

  function exportComplet() {
    telechargerCsv("dmos-suivi.csv",
      ["Bénéficiaire", "RPPS", "Spécialité", "Type", "Montant TTC", "Date", "Événement", "Régime", "Émetteur", "Note", "Statut note", "Réf. EPS", "Décision", "Publié Transparence"],
      lignes.map((l) => [l.beneficiaire_nom ?? "", l.beneficiaire_rpps ?? "", l.beneficiaire_specialite ?? "", libDepense(l.type), l.montant_ttc, l.date_depense ?? "", l.evenement?.nom ?? "", l.dmos_regime ? REGIME[l.dmos_regime].label : "", emetNom(l), l.note?.titre ?? "", l.note ? (STATUTS_NDF[l.note.statut]?.label ?? "") : "", l.reference_eps ?? "", libDecision(l.decision), l.publie_transparence ? "Oui" : "Non"]));
  }
  function exportEps() {
    telechargerCsv("dmos-eps.csv",
      ["Bénéficiaire", "RPPS", "Type avantage", "Montant TTC", "Date", "Régime", "Événement", "Réf. EPS", "Décision"],
      lignes.map((l) => [l.beneficiaire_nom ?? "", l.beneficiaire_rpps ?? "", libDepense(l.type), l.montant_ttc, l.date_depense ?? "", l.dmos_regime ? REGIME[l.dmos_regime].label : "", l.evenement?.nom ?? "", l.reference_eps ?? "", libDecision(l.decision)]));
  }
  function exportTransparence() {
    telechargerCsv("transparence-sante.csv",
      ["Bénéficiaire", "RPPS", "Spécialité", "Nature avantage", "Montant TTC", "Date", "Événement"],
      lignes.filter((l) => l.publie_transparence || l.decision).map((l) => [l.beneficiaire_nom ?? "", l.beneficiaire_rpps ?? "", l.beneficiaire_specialite ?? "", libDepense(l.type), l.montant_ttc, l.date_depense ?? "", l.evenement?.nom ?? ""]));
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-1 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-slate-800">Suivi DMOS</h1>
        {pro && (pro.niveau === 0 || pro.role === "dirigeant") && (
          <Link href="/pro/notes-frais/bareme" prefetch className="text-sm font-medium text-brand hover:underline">Barème & paramètres ⚙</Link>
        )}
      </div>
      <p className="mb-4 text-sm text-slate-500">Avantages accordés aux professionnels de santé (issus des notes de frais).</p>

      <div className="mb-4 grid grid-cols-3 gap-3">
        <div className="card p-3"><p className="text-xs text-slate-400">À déclarer</p><p className="text-lg font-bold text-sky-700">{aDeclarer}</p></div>
        <div className="card p-3"><p className="text-xs text-slate-400">Autorisation</p><p className="text-lg font-bold text-attention">{aAutoriser}</p></div>
        <div className="card p-3"><p className="text-xs text-slate-400">Montant total</p><p className="text-lg font-bold text-brand">{eurNdf(total)}</p></div>
      </div>

      {lignes.length > 0 && (
        <div className="mb-5 flex flex-wrap gap-2">
          <button onClick={exportComplet} className="btn-secondary px-3 py-1.5 text-sm">Export CSV</button>
          <button onClick={exportEps} className="btn-secondary px-3 py-1.5 text-sm">Export EPS</button>
          <button onClick={exportTransparence} className="btn-secondary px-3 py-1.5 text-sm">Export Transparence Santé</button>
        </div>
      )}

      {!pret ? (
        <p className="text-sm text-slate-400">Chargement…</p>
      ) : lignes.length === 0 ? (
        <p className="card text-sm text-slate-400">Aucun avantage enregistré.</p>
      ) : (
        <div className="grid gap-2">
          {lignes.map((l) => {
            const sn = l.note ? (STATUTS_NDF[l.note.statut] ?? STATUTS_NDF.brouillon) : null;
            return (
              <div key={l.id} className="card grid gap-2">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-slate-800">{l.beneficiaire_nom ?? "Bénéficiaire non précisé"}</span>
                      {l.dmos_regime && <span className={`badge ${REGIME[l.dmos_regime].cls}`}>{REGIME[l.dmos_regime].label}</span>}
                      {l.publie_transparence && <span className="badge bg-green-100 text-ok">Transparence ✓</span>}
                    </div>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {libDepense(l.type)}
                      {l.beneficiaire_specialite ? ` · ${l.beneficiaire_specialite}` : ""}
                      {l.evenement?.nom ? ` · ${l.evenement.nom}` : ""}
                      {l.date_depense ? ` · ${new Date(l.date_depense).toLocaleDateString("fr-FR")}` : ""}
                    </p>
                    <p className="text-xs text-slate-400">
                      {emetNom(l) ? `${emetNom(l)} · ` : ""}
                      {l.note ? <Link href={`/pro/notes-frais/${l.note.id}`} prefetch className="text-brand hover:underline">{l.note.titre}</Link> : ""}
                      {sn ? <span className={`badge ml-1 ${sn.cls}`}>{sn.label}</span> : null}
                    </p>
                  </div>
                  <span className="shrink-0 font-bold text-brand">{eurNdf(l.montant_ttc)}</span>
                </div>

                {peutEditer && (
                  <div className="grid gap-2 border-t border-rose-100 pt-2 sm:grid-cols-3">
                    <div><label className="label text-[11px]">Décision</label>
                      <Select value={l.decision ?? ""} onChange={(v) => maj(l.id, { decision: (v || null) as Avantage["decision"], date_depot: v ? (l.date_depot ?? new Date().toISOString().slice(0, 10)) : l.date_depot })} options={DECISIONS} />
                    </div>
                    <div><label className="label text-[11px]">Référence EPS</label>
                      <input className="input h-9 py-1 text-sm" value={l.reference_eps ?? ""} onChange={(e) => setLignes((a) => a.map((x) => (x.id === l.id ? { ...x, reference_eps: e.target.value } : x)))} onBlur={(e) => maj(l.id, { reference_eps: e.target.value || null })} placeholder="N° dossier" />
                    </div>
                    <label className="flex cursor-pointer items-center gap-2 self-end pb-2 text-sm text-slate-700">
                      <input type="checkbox" checked={l.publie_transparence} onChange={(e) => maj(l.id, { publie_transparence: e.target.checked })} className="accent-brand" />
                      Publié Transparence
                    </label>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
