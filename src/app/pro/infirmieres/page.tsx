"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useProSession } from "@/lib/hooks/useSession";

type Infirmiere = {
  id: string;
  nom: string;
  prenom: string | null;
  email: string | null;
  telephone: string | null;
  zone_exercice: string | null;
};

const nomComplet = (p: { prenom?: string | null; nom: string }) => [p.prenom, p.nom].filter(Boolean).join(" ");

export default function InfirmieresPage() {
  const pro = useProSession();
  const [liste, setListe] = useState<Infirmiere[]>([]);
  const [chargement, setChargement] = useState(true);
  const [suppression, setSuppression] = useState<string | null>(null);

  const charger = useCallback(async () => {
    const { data } = await createClient()
      .from("professionnel")
      .select("id,nom,prenom,email,telephone,zone_exercice")
      .eq("role", "infirmiere_liberale")
      .order("zone_exercice")
      .order("nom");
    setListe((data ?? []) as Infirmiere[]);
    setChargement(false);
  }, []);

  useEffect(() => { charger(); }, [charger]);

  const peutSupprimer = !!pro && pro.niveau <= 1;

  async function supprimer(i: Infirmiere) {
    if (!confirm(`Supprimer le compte de ${nomComplet(i)} ?`)) return;
    setSuppression(i.id);
    const res = await fetch(`/api/soignants/${i.id}`, { method: "DELETE" });
    setSuppression(null);
    if (!res.ok) { alert((await res.json().catch(() => ({}))).message ?? "Échec."); return; }
    setListe((arr) => arr.filter((x) => x.id !== i.id));
  }

  if (pro && (pro.niveau > 2 || pro.role === "chirurgien")) {
    return <div className="card text-sm text-slate-500">Cette page n&apos;est pas accessible à ce compte.</div>;
  }

  // Groupement par zone d'exercice
  const groupes = new Map<string, Infirmiere[]>();
  liste.forEach((i) => {
    const z = i.zone_exercice?.trim() || "Zone non renseignée";
    const arr = groupes.get(z) ?? [];
    arr.push(i);
    groupes.set(z, arr);
  });
  const zones = [...groupes.entries()].sort((a, b) => a[0].localeCompare(b[0]));

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="mb-1 text-2xl font-bold text-slate-800">Infirmières libérales</h1>
      <p className="mb-5 text-sm text-slate-500">Triées par zone d&apos;exercice. Elles interviennent au domicile, quelle que soit l&apos;agence.</p>

      {chargement ? (
        <p className="text-sm text-slate-400">Chargement…</p>
      ) : liste.length === 0 ? (
        <p className="text-sm text-slate-400">Aucune infirmière libérale enregistrée.</p>
      ) : (
        <div className="grid gap-7">
          {zones.map(([zone, items]) => (
            <section key={zone} className="grid gap-3">
              <h2 className="text-xs font-bold uppercase tracking-widest text-rose-400">📍 {zone}</h2>
              {items.map((i) => (
                <div key={i.id} className="card flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-800">{nomComplet(i)}</p>
                    <div className="mt-0.5 flex flex-wrap gap-x-4 gap-y-0.5 text-sm">
                      {i.telephone && <a href={`tel:${i.telephone}`} className="text-brand hover:underline">{i.telephone}</a>}
                      {i.email && <a href={`mailto:${i.email}`} className="text-slate-500 hover:underline">{i.email}</a>}
                    </div>
                  </div>
                  {peutSupprimer && (
                    <button
                      onClick={() => supprimer(i)}
                      disabled={suppression === i.id}
                      className="rounded-lg border border-rose-200 px-3 py-1.5 text-sm font-medium text-critique hover:bg-red-50 disabled:opacity-50"
                    >
                      {suppression === i.id ? "Suppression…" : "Supprimer"}
                    </button>
                  )}
                </div>
              ))}
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
