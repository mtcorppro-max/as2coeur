"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useProSession } from "@/lib/hooks/useSession";
import { Select } from "@/components/Select";
import { libDepense } from "@/lib/notesFrais";

type Bareme = {
  id: string; type_avantage: string; seuil_declaration: number | null; seuil_autorisation: number | null;
  periode: string; actif: boolean;
};
const PERIODES = [
  { value: "par_manifestation", label: "Par manifestation" },
  { value: "par_an", label: "Par an" },
  { value: "unitaire", label: "Unitaire" },
];
const peutBareme = (role: string | undefined, niveau: number | undefined) => niveau === 0 || role === "dirigeant";

export default function BaremeDmosPage() {
  const pro = useProSession();
  const [rows, setRows] = useState<Bareme[]>([]);
  const [pret, setPret] = useState(false);

  const charger = () => createClient().from("dmos_bareme").select("id,type_avantage,seuil_declaration,seuil_autorisation,periode,actif").order("type_avantage").then(({ data }) => { setRows((data ?? []) as Bareme[]); setPret(true); });
  useEffect(() => { charger(); }, []);

  const maj = (id: string, patch: Partial<Bareme>) => setRows((a) => a.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  const persist = async (id: string, patch: Partial<Bareme>) => { await createClient().from("dmos_bareme").update(patch).eq("id", id); };

  if (pro && !peutBareme(pro.role, pro.niveau)) {
    return <div className="card text-sm text-slate-500">Le barème DMOS est réservé à la direction.</div>;
  }

  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/pro/notes-frais/dmos" className="text-sm text-slate-400 hover:text-brand" prefetch>← Suivi DMOS</Link>
      <h1 className="mt-1 mb-1 text-2xl font-bold text-slate-800">Barème DMOS</h1>
      <p className="mb-5 text-sm text-slate-500">
        Seuils par type d&apos;avantage. Au-dessus du seuil d&apos;autorisation → <b>autorisation préalable</b> ; sinon → <b>déclaration</b> ;
        en dessous du seuil de déclaration → rien. Laisser vide = pas de seuil (déclaration par défaut). Montants à confirmer selon l&apos;arrêté en vigueur.
      </p>

      {!pret ? (
        <p className="text-sm text-slate-400">Chargement…</p>
      ) : (
        <div className="grid gap-2">
          {rows.map((r) => (
            <div key={r.id} className="card grid gap-3">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-800">{libDepense(r.type_avantage)}</span>
                <label className="flex cursor-pointer items-center gap-2 text-xs text-slate-500">
                  <input type="checkbox" checked={r.actif} onChange={(e) => { maj(r.id, { actif: e.target.checked }); persist(r.id, { actif: e.target.checked }); }} className="accent-brand" />
                  Actif
                </label>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <div>
                  <label className="label">Seuil déclaration (€)</label>
                  <input className="input" type="number" step="0.01" inputMode="decimal" value={r.seuil_declaration ?? ""} onChange={(e) => maj(r.id, { seuil_declaration: e.target.value === "" ? null : Number(e.target.value) })} onBlur={(e) => persist(r.id, { seuil_declaration: e.target.value === "" ? null : Number(e.target.value) })} />
                </div>
                <div>
                  <label className="label">Seuil autorisation (€)</label>
                  <input className="input" type="number" step="0.01" inputMode="decimal" value={r.seuil_autorisation ?? ""} onChange={(e) => maj(r.id, { seuil_autorisation: e.target.value === "" ? null : Number(e.target.value) })} onBlur={(e) => persist(r.id, { seuil_autorisation: e.target.value === "" ? null : Number(e.target.value) })} />
                </div>
                <div>
                  <label className="label">Période</label>
                  <Select value={r.periode} onChange={(v) => { maj(r.id, { periode: v }); persist(r.id, { periode: v }); }} options={PERIODES} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
