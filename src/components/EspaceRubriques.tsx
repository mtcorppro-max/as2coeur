"use client";

import { useState } from "react";
import Link from "next/link";
import { useProSession } from "@/lib/hooks/useSession";
import { peutNotesFrais } from "@/lib/notesFrais";

export type Rubrique = { id: string; label: string; message: string };

// Espace personnel à rubriques (onglets) — réservé au personnel interne.
// Contenu de chaque rubrique à venir (placeholder).
export function EspaceRubriques({ titre, sous, rubriques }: { titre: string; sous: string; rubriques: Rubrique[] }) {
  const pro = useProSession();
  const [onglet, setOnglet] = useState(rubriques[0]?.id ?? "");
  if (pro && !peutNotesFrais(pro.role)) {
    return <div className="card text-sm text-slate-500">Cet espace est réservé au personnel interne.</div>;
  }
  const cur = rubriques.find((r) => r.id === onglet) ?? rubriques[0];
  return (
    <div className="mx-auto max-w-4xl">
      <Link href="/pro/profil" prefetch className="text-sm text-slate-400 hover:text-brand">← Mon profil</Link>
      <h1 className="mb-1 mt-1 text-2xl font-bold text-slate-800">{titre}</h1>
      <p className="mb-5 text-sm text-slate-500">{sous}</p>

      <div className="mb-5 flex flex-wrap gap-2">
        {rubriques.map((r) => (
          <button
            key={r.id}
            onClick={() => setOnglet(r.id)}
            className={`rounded-xl border px-4 py-2 text-sm font-semibold transition ${r.id === cur.id ? "border-brand bg-brand text-white" : "border-rose-200 bg-white text-brand hover:bg-rose-50"}`}
          >
            {r.label}
          </button>
        ))}
      </div>

      <div className="card grid place-items-center gap-2 py-16 text-center">
        <p className="text-sm font-medium text-slate-500">{cur.label}</p>
        <p className="max-w-md text-xs text-slate-400">{cur.message}</p>
        <span className="mt-1 rounded-full bg-rose-50 px-3 py-1 text-[11px] font-medium text-brand">Bientôt disponible</span>
      </div>
    </div>
  );
}
