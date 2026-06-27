"use client";

import { DateField } from "@/components/DateField";
import type { ChampOrdo } from "@/lib/ordonnances";

// Rendu éditable des champs d'un modèle d'ordonnance (réutilisé pour la génération
// et pour les « ordonnances types »). `valeurs` = contenu courant, `set(key, val)`.
export function ChampsOrdonnance({ champs, valeurs, set }: { champs: ChampOrdo[]; valeurs: Record<string, unknown>; set: (key: string, val: unknown) => void }) {
  return (
    <div className="grid gap-3">
      {champs.map((c) => {
        if (c.type === "section") {
          return <p key={c.key} className="mt-1 text-xs font-bold uppercase tracking-widest text-rose-400">{c.label}</p>;
        }
        return (
          <div key={c.key}>
            <label className="label">{c.label}</label>
            <Champ c={c} valeurs={valeurs} set={set} />
          </div>
        );
      })}
    </div>
  );
}

function Champ({ c, valeurs, set }: { c: ChampOrdo; valeurs: Record<string, unknown>; set: (key: string, val: unknown) => void }) {
  const v = valeurs[c.key];
  if (c.type === "valeur_unite") {
    const u = valeurs[c.uniteKey];
    return (
      <div className="flex flex-wrap items-center gap-2">
        <input className="input w-24" inputMode="numeric" placeholder="nombre" value={(v as string) ?? ""} onChange={(e) => set(c.key, e.target.value)} />
        <div className="flex flex-wrap gap-1.5">
          {c.options.map((o) => (
            <button key={o} type="button" onClick={() => set(c.uniteKey, u === o ? "" : o)}
              className={`rounded-lg border px-2.5 py-1 text-sm transition ${u === o ? "border-brand bg-brand text-white" : "border-rose-200 bg-white text-slate-600 hover:border-brand"}`}>
              {o}
            </button>
          ))}
        </div>
      </div>
    );
  }
  if (c.type === "date") return <DateField value={(v as string) ?? ""} onChange={(val) => set(c.key, val)} />;
  if (c.type === "textarea") return <textarea className="input" rows={2} value={(v as string) ?? ""} onChange={(e) => set(c.key, e.target.value)} />;
  if (c.type === "radio")
    return (
      <div className="flex flex-wrap gap-1.5">
        {c.options.map((o) => (
          <button key={o} type="button" onClick={() => set(c.key, v === o ? "" : o)}
            className={`rounded-lg border px-2.5 py-1 text-sm transition ${v === o ? "border-brand bg-brand text-white" : "border-rose-200 bg-white text-slate-600 hover:border-brand"}`}>
            {o}
          </button>
        ))}
      </div>
    );
  if (c.type === "checkboxes") {
    const arr = Array.isArray(v) ? (v as string[]) : [];
    return (
      <div className="grid gap-1 sm:grid-cols-2">
        {c.options.map((o) => (
          <label key={o} className="flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" checked={arr.includes(o)} className="h-4 w-4 accent-brand"
              onChange={(e) => set(c.key, e.target.checked ? [...arr, o] : arr.filter((x) => x !== o))} />
            {o}
          </label>
        ))}
      </div>
    );
  }
  return <input className="input" type="text" inputMode={c.type === "number" ? "numeric" : undefined} value={(v as string) ?? ""} onChange={(e) => set(c.key, e.target.value)} />;
}
