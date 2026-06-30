"use client";

import Link from "next/link";
import { useProSession } from "@/lib/hooks/useSession";
import { peutNotesFrais } from "@/lib/notesFrais";

// Espace personnel (RH / voiture / formation) — réservé au personnel interne.
// Contenu à venir (placeholder).
export function EspacePlaceholder({ titre, sous, message, retourHref = "/pro/profil", retourLabel = "Mon profil" }: { titre: string; sous: string; message: string; retourHref?: string; retourLabel?: string }) {
  const pro = useProSession();
  if (pro && !peutNotesFrais(pro.role)) {
    return <div className="card text-sm text-slate-500">Cet espace est réservé au personnel interne.</div>;
  }
  return (
    <div className="mx-auto max-w-4xl">
      <Link href={retourHref} prefetch className="text-sm text-slate-400 hover:text-brand">← {retourLabel}</Link>
      <h1 className="mb-1 mt-1 text-2xl font-bold text-slate-800">{titre}</h1>
      <p className="mb-6 text-sm text-slate-500">{sous}</p>
      <div className="card grid place-items-center gap-2 py-16 text-center">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" className="h-10 w-10 text-rose-300" aria-hidden="true">
          <circle cx="12" cy="12" r="9" /><path d="M12 8v4l3 2" />
        </svg>
        <p className="text-sm font-medium text-slate-500">Bientôt disponible</p>
        <p className="max-w-sm text-xs text-slate-400">{message}</p>
      </div>
    </div>
  );
}
