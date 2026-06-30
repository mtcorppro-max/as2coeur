"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useProSession } from "@/lib/hooks/useSession";
import { libDepense, eurNdf, STATUTS_NDF } from "@/lib/notesFrais";

const REGIME: Record<string, { label: string; cls: string }> = {
  declaration: { label: "À déclarer", cls: "bg-sky-100 text-sky-700" },
  autorisation: { label: "Autorisation requise", cls: "bg-amber-100 text-attention" },
};

type Avantage = {
  id: string; type: string; montant_ttc: number; date_depense: string | null; description: string | null;
  beneficiaire_nom: string | null; beneficiaire_specialite: string | null; dmos_regime: string | null;
  note: { id: string; titre: string; statut: string; emetteur: { nom: string; prenom: string | null; titre: string | null } | null } | null;
  evenement: { nom: string } | null;
};

const peutSuivi = (role: string | undefined, niveau: number | undefined) => niveau === 0 || role === "dirigeant" || role === "manager";

export default function SuiviDmosPage() {
  const pro = useProSession();
  const [lignes, setLignes] = useState<Avantage[]>([]);
  const [pret, setPret] = useState(false);

  useEffect(() => {
    createClient()
      .from("note_de_frais_ligne")
      .select("id,type,montant_ttc,date_depense,description,beneficiaire_nom,beneficiaire_specialite,dmos_regime,note:note_id(id,titre,statut,emetteur:emetteur_id(nom,prenom,titre)),evenement:evenement_id(nom)")
      .eq("est_avantage_ps", true)
      .order("date_depense", { ascending: false })
      .then(({ data }) => { setLignes((data ?? []) as unknown as Avantage[]); setPret(true); });
  }, []);

  if (pro && !peutSuivi(pro.role, pro.niveau)) {
    return <div className="card text-sm text-slate-500">Le suivi DMOS est réservé à la direction et aux managers.</div>;
  }

  const aDeclarer = lignes.filter((l) => l.dmos_regime === "declaration").length;
  const aAutoriser = lignes.filter((l) => l.dmos_regime === "autorisation").length;
  const total = lignes.reduce((s, l) => s + Number(l.montant_ttc || 0), 0);

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-1 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-slate-800">Suivi DMOS</h1>
        {pro && (pro.niveau === 0 || pro.role === "dirigeant") && (
          <Link href="/pro/notes-frais/bareme" prefetch className="text-sm font-medium text-brand hover:underline">Barème ⚙</Link>
        )}
      </div>
      <p className="mb-4 text-sm text-slate-500">Avantages accordés aux professionnels de santé (issus des notes de frais).</p>

      <div className="mb-5 grid grid-cols-3 gap-3">
        <div className="card p-3"><p className="text-xs text-slate-400">À déclarer</p><p className="text-lg font-bold text-sky-700">{aDeclarer}</p></div>
        <div className="card p-3"><p className="text-xs text-slate-400">Autorisation</p><p className="text-lg font-bold text-attention">{aAutoriser}</p></div>
        <div className="card p-3"><p className="text-xs text-slate-400">Montant total</p><p className="text-lg font-bold text-brand">{eurNdf(total)}</p></div>
      </div>

      {!pret ? (
        <p className="text-sm text-slate-400">Chargement…</p>
      ) : lignes.length === 0 ? (
        <p className="card text-sm text-slate-400">Aucun avantage enregistré.</p>
      ) : (
        <div className="grid gap-2">
          {lignes.map((l) => {
            const sn = l.note ? (STATUTS_NDF[l.note.statut] ?? STATUTS_NDF.brouillon) : null;
            const emet = l.note?.emetteur ? [l.note.emetteur.titre, l.note.emetteur.prenom, l.note.emetteur.nom].filter(Boolean).join(" ") : "";
            return (
              <div key={l.id} className="card flex flex-wrap items-start justify-between gap-3 py-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-slate-800">{l.beneficiaire_nom ?? "Bénéficiaire non précisé"}</span>
                    {l.dmos_regime && <span className={`badge ${REGIME[l.dmos_regime].cls}`}>{REGIME[l.dmos_regime].label}</span>}
                  </div>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {libDepense(l.type)}
                    {l.beneficiaire_specialite ? ` · ${l.beneficiaire_specialite}` : ""}
                    {l.evenement?.nom ? ` · ${l.evenement.nom}` : ""}
                    {l.date_depense ? ` · ${new Date(l.date_depense).toLocaleDateString("fr-FR")}` : ""}
                  </p>
                  <p className="text-xs text-slate-400">
                    {emet ? `${emet} · ` : ""}
                    {l.note ? <Link href={`/pro/notes-frais/${l.note.id}`} prefetch className="text-brand hover:underline">{l.note.titre}</Link> : ""}
                    {sn ? <span className={`badge ml-1 ${sn.cls}`}>{sn.label}</span> : null}
                  </p>
                </div>
                <span className="shrink-0 font-bold text-brand">{eurNdf(l.montant_ttc)}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
