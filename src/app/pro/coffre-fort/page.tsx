"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useProSession } from "@/lib/hooks/useSession";
import { peutNotesFrais } from "@/lib/notesFrais";
import { formatTaille, type CoffreDocument } from "@/lib/coffre";

export default function CoffreFortPage() {
  const pro = useProSession();
  const interne = peutNotesFrais(pro?.role);
  const [docs, setDocs] = useState<CoffreDocument[]>([]);
  const [pret, setPret] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const charger = useCallback(async () => {
    const { data } = await createClient().from("coffre_document").select("id,libelle,chemin_stockage,mime,taille,created_at").order("created_at", { ascending: false });
    setDocs((data ?? []) as CoffreDocument[]);
    setPret(true);
  }, []);

  useEffect(() => { if (pro?.id) charger(); }, [pro?.id, charger]);

  async function envoyer(files: FileList | null) {
    if (!files || files.length === 0) return;
    setBusy(true); setErr(null);
    for (const f of Array.from(files)) {
      const fd = new FormData();
      fd.append("fichier", f);
      const res = await fetch("/api/coffre", { method: "POST", body: fd });
      if (!res.ok) { setErr((await res.json().catch(() => ({}))).message ?? "Échec de l'envoi."); break; }
    }
    setBusy(false);
    if (inputRef.current) inputRef.current.value = "";
    charger();
  }

  async function ouvrir(d: CoffreDocument) {
    const res = await fetch(`/api/coffre?chemins=${encodeURIComponent(d.chemin_stockage)}`);
    const url = (await res.json().catch(() => ({}))).urls?.[d.chemin_stockage];
    if (url) window.open(url, "_blank", "noopener,noreferrer");
    else alert("Impossible d'ouvrir le document.");
  }

  async function supprimer(d: CoffreDocument) {
    if (!confirm(`Supprimer « ${d.libelle} » ?`)) return;
    const res = await fetch("/api/coffre", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: d.id }) });
    if (!res.ok) { alert("Échec de la suppression."); return; }
    setDocs((arr) => arr.filter((x) => x.id !== d.id));
  }

  if (pro && !interne) {
    return (
      <div className="mx-auto max-w-2xl">
        <Link href="/pro/profil" prefetch className="text-sm text-slate-400 hover:text-brand">← Mon profil</Link>
        <p className="card mt-3 text-sm text-slate-500">Le coffre-fort est réservé au personnel interne de l&apos;entreprise.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <Link href="/pro/profil" prefetch className="text-sm text-slate-400 hover:text-brand">← Mon profil</Link>
      <h1 className="mb-1 mt-1 text-2xl font-bold text-slate-800">🔒 Coffre-fort</h1>
      <p className="mb-5 text-sm text-slate-500">Vos documents personnels sécurisés (fiche de paie, contrat, attestations…). Visibles uniquement par vous.</p>

      {/* Dépôt */}
      <label className={`mb-4 flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-rose-200 bg-rose-50/40 px-4 py-8 text-center transition hover:bg-rose-50 ${busy ? "pointer-events-none opacity-60" : ""}`}>
        <span className="grid h-12 w-12 place-items-center rounded-full bg-rose-100 text-2xl text-brand">＋</span>
        <span className="text-sm font-semibold text-slate-700">{busy ? "Envoi en cours…" : "Déposer un document"}</span>
        <span className="text-xs text-slate-400">Image ou PDF · 20 Mo max</span>
        <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp,image/heic,application/pdf" multiple className="hidden" onChange={(e) => envoyer(e.target.files)} disabled={busy} />
      </label>
      {err && <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-critique">{err}</p>}

      {/* Liste */}
      {!pret ? (
        <p className="text-sm text-slate-400">Chargement…</p>
      ) : docs.length === 0 ? (
        <p className="card text-sm text-slate-400">Aucun document. Déposez votre premier fichier ci-dessus.</p>
      ) : (
        <div className="grid gap-2">
          {docs.map((d) => (
            <div key={d.id} className="card flex items-center justify-between gap-3 py-3">
              <button onClick={() => ouvrir(d)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-rose-100 text-brand">
                  {d.mime === "application/pdf" ? "PDF" : <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-5 w-5"><path strokeLinecap="round" strokeLinejoin="round" d="M4 5a2 2 0 0 1 2-2h7l5 5v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z" /><path strokeLinecap="round" strokeLinejoin="round" d="M13 3v5h5" /></svg>}
                </span>
                <span className="min-w-0">
                  <span className="block truncate font-medium text-slate-700">{d.libelle}</span>
                  <span className="block text-xs text-slate-400">{new Date(d.created_at).toLocaleDateString("fr-FR")}{d.taille ? ` · ${formatTaille(d.taille)}` : ""}</span>
                </span>
              </button>
              <div className="flex shrink-0 items-center gap-2">
                <button onClick={() => ouvrir(d)} className="btn-secondary px-3 py-1.5 text-sm">Voir</button>
                <button onClick={() => supprimer(d)} className="rounded-lg border border-rose-200 px-2 py-1.5 text-sm text-critique hover:bg-red-50">✕</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
