"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useProSession } from "@/lib/hooks/useSession";
import { Select } from "@/components/Select";
import { DateField } from "@/components/DateField";
import { TYPES_DEPENSE, libDepense, STATUTS_NDF, eurNdf } from "@/lib/notesFrais";

type Note = {
  id: string; emetteur_id: string; titre: string; periode_debut: string | null; periode_fin: string | null;
  statut: string; valide_le: string | null; motif_rejet: string | null; total_ttc: number; total_ht: number;
  rembourse_le: string | null; emetteur?: { nom: string; prenom: string | null; titre: string | null } | null;
};
type Ligne = { id: string; type: string; montant_ttc: number; montant_ht: number | null; date_depense: string | null; description: string | null; evenement_id: string | null };
type Justif = { id: string; ligne_id: string | null; chemin_stockage: string; libelle: string | null; mime: string | null };
type Evt = { id: string; nom: string };

const nomDe = (e?: Note["emetteur"]) => (e ? [e.titre, e.prenom, e.nom].filter(Boolean).join(" ") : "");

export default function NoteFraisDetail() {
  const pro = useProSession();
  const router = useRouter();
  const id = (useParams().id as string) ?? "";
  const [note, setNote] = useState<Note | null>(null);
  const [lignes, setLignes] = useState<Ligne[]>([]);
  const [justifs, setJustifs] = useState<Justif[]>([]);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [events, setEvents] = useState<Evt[]>([]);
  const [pret, setPret] = useState(false);
  const [busy, setBusy] = useState(false);
  const supabase = createClient();

  const charger = useCallback(async () => {
    const { data: n } = await supabase.from("note_de_frais")
      .select("id,emetteur_id,titre,periode_debut,periode_fin,statut,valide_le,motif_rejet,total_ttc,total_ht,rembourse_le,emetteur:emetteur_id(nom,prenom,titre)")
      .eq("id", id).maybeSingle();
    if (!n) { setNote(null); setPret(true); return; }
    setNote(n as unknown as Note);
    const [{ data: l }, { data: j }, { data: ev }] = await Promise.all([
      supabase.from("note_de_frais_ligne").select("id,type,montant_ttc,montant_ht,date_depense,description,evenement_id").eq("note_id", id).order("created_at"),
      supabase.from("note_de_frais_justificatif").select("id,ligne_id,chemin_stockage,libelle,mime").eq("note_id", id),
      supabase.from("evenement_marketing").select("id,nom").order("date_debut", { ascending: false }),
    ]);
    setLignes((l ?? []) as Ligne[]);
    setJustifs((j ?? []) as Justif[]);
    setEvents((ev ?? []) as Evt[]);
    const chemins = (j ?? []).map((x) => x.chemin_stockage);
    if (chemins.length) {
      const res = await fetch(`/api/notes-frais/justificatif?chemins=${encodeURIComponent(chemins.join(","))}`);
      const data = await res.json().catch(() => ({ urls: {} }));
      setUrls(data.urls ?? {});
    } else setUrls({});
    setPret(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => { charger(); }, [charger]);

  if (pret && !note) return <div className="card text-sm text-slate-500">Note introuvable ou inaccessible.</div>;
  if (!note || !pro) return <p className="text-sm text-slate-400">Chargement…</p>;

  const proId = pro.id;
  const mien = note.emetteur_id === pro.id;
  const editable = mien && note.statut === "brouillon";
  const peutValider = !mien && note.statut === "soumise";
  const peutRembourser = !mien && note.statut === "validee";
  const s = STATUTS_NDF[note.statut] ?? STATUTS_NDF.brouillon;

  // ── Actions note ──
  const majNote = async (patch: Partial<Note>) => { setNote((n) => (n ? { ...n, ...patch } : n)); await supabase.from("note_de_frais").update(patch).eq("id", id); };

  async function ajouterLigne() {
    const { data } = await supabase.from("note_de_frais_ligne").insert({ note_id: id, type: "repas", montant_ttc: 0, date_depense: note?.periode_debut ?? null }).select("id,type,montant_ttc,montant_ht,date_depense,description,evenement_id").single();
    if (data) setLignes((a) => [...a, data as Ligne]);
  }
  const majLigne = (lid: string, patch: Partial<Ligne>) => setLignes((a) => a.map((l) => (l.id === lid ? { ...l, ...patch } : l)));
  const persistLigne = async (lid: string, patch: Partial<Ligne>) => { await supabase.from("note_de_frais_ligne").update(patch).eq("id", lid); recalcTotal(); };
  async function supprimerLigne(lid: string) {
    await supabase.from("note_de_frais_ligne").delete().eq("id", lid);
    setLignes((a) => a.filter((l) => l.id !== lid));
    setJustifs((a) => a.filter((j) => j.ligne_id !== lid));
    recalcTotal();
  }
  const recalcTotal = () => setNote((n) => (n ? { ...n, total_ttc: lignes.reduce((s2, l) => s2 + Number(l.montant_ttc || 0), 0) } : n));

  async function uploadJustif(lid: string, file: File) {
    setBusy(true);
    const fd = new FormData(); fd.append("fichier", file); fd.append("ligne_id", lid);
    const res = await fetch("/api/notes-frais/justificatif", { method: "POST", body: fd });
    setBusy(false);
    if (!res.ok) { const j = await res.json().catch(() => ({})); alert("Échec : " + (j.message ?? "")); return; }
    charger();
  }
  async function suppJustif(jid: string) {
    if (!confirm("Supprimer ce justificatif ?")) return;
    const res = await fetch("/api/notes-frais/justificatif", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: jid }) });
    if (!res.ok) { alert("Échec."); return; }
    charger();
  }

  async function soumettre() {
    if (!lignes.length || lignes.every((l) => Number(l.montant_ttc) <= 0)) { alert("Ajoutez au moins une ligne avec un montant."); return; }
    if (!note?.titre.trim()) { alert("Donnez un titre à la note."); return; }
    setBusy(true);
    await supabase.from("note_de_frais").update({ statut: "soumise" }).eq("id", id);
    setBusy(false);
    router.push("/pro/notes-frais");
  }
  async function supprimerNote() {
    if (!confirm("Supprimer cette note de frais ?")) return;
    await supabase.from("note_de_frais").delete().eq("id", id);
    router.push("/pro/notes-frais");
  }
  async function rouvrir() { await supabase.from("note_de_frais").update({ statut: "brouillon", motif_rejet: null }).eq("id", id); charger(); }

  async function valider() {
    setBusy(true);
    await supabase.from("note_de_frais").update({ statut: "validee", valide_par: proId, valide_le: new Date().toISOString() }).eq("id", id);
    setBusy(false); router.push("/pro/notes-frais");
  }
  async function rejeter() {
    const motif = prompt("Motif du rejet (visible par l'émetteur) :")?.trim();
    if (motif === undefined) return;
    setBusy(true);
    await supabase.from("note_de_frais").update({ statut: "rejetee", motif_rejet: motif || null, valide_par: proId, valide_le: new Date().toISOString() }).eq("id", id);
    setBusy(false); router.push("/pro/notes-frais");
  }
  async function rembourser() {
    setBusy(true);
    await supabase.from("note_de_frais").update({ statut: "remboursee", rembourse_le: new Date().toISOString() }).eq("id", id);
    setBusy(false); router.push("/pro/notes-frais");
  }

  const justifsDe = (lid: string) => justifs.filter((j) => j.ligne_id === lid);
  const total = lignes.reduce((sum, l) => sum + Number(l.montant_ttc || 0), 0);

  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/pro/notes-frais" className="text-sm text-slate-400 hover:text-brand" prefetch>← Notes de frais</Link>

      {/* En-tête */}
      <div className="mt-1 mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          {editable ? (
            <input className="input text-lg font-bold" value={note.titre} onChange={(e) => setNote({ ...note, titre: e.target.value })} onBlur={(e) => majNote({ titre: e.target.value })} />
          ) : (
            <h1 className="text-2xl font-bold text-slate-800">{note.titre}</h1>
          )}
          {!mien && nomDe(note.emetteur) && <p className="mt-1 text-sm text-slate-500">{nomDe(note.emetteur)}</p>}
        </div>
        <span className={`badge ${s.cls}`}>{s.label}</span>
      </div>

      {note.statut === "rejetee" && note.motif_rejet && (
        <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-critique"><b>Rejetée :</b> {note.motif_rejet}</p>
      )}

      {/* Période */}
      {editable && (
        <div className="card mb-4 grid gap-4 sm:grid-cols-2">
          <div><label className="label">Période — début</label><DateField value={note.periode_debut ?? ""} onChange={(v) => majNote({ periode_debut: v || null })} /></div>
          <div><label className="label">Période — fin <span className="text-slate-400">(facultatif)</span></label><DateField value={note.periode_fin ?? ""} onChange={(v) => majNote({ periode_fin: v || null })} /></div>
        </div>
      )}

      {/* Lignes */}
      <div className="grid gap-3">
        {lignes.length === 0 && !editable && <p className="card text-sm text-slate-400">Aucune ligne.</p>}
        {lignes.map((l) => (
          <div key={l.id} className="card grid gap-3">
            {editable ? (
              <>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div><label className="label">Type</label><Select value={l.type} onChange={(v) => { majLigne(l.id, { type: v }); persistLigne(l.id, { type: v }); }} options={TYPES_DEPENSE} /></div>
                  <div><label className="label">Date</label><DateField value={l.date_depense ?? ""} onChange={(v) => { majLigne(l.id, { date_depense: v || null }); persistLigne(l.id, { date_depense: v || null }); }} /></div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div><label className="label">Montant TTC (€)</label><input className="input" type="number" step="0.01" inputMode="decimal" value={l.montant_ttc} onChange={(e) => majLigne(l.id, { montant_ttc: Number(e.target.value) })} onBlur={(e) => persistLigne(l.id, { montant_ttc: Number(e.target.value) || 0 })} /></div>
                  <div><label className="label">Montant HT (€) <span className="text-slate-400">(facultatif)</span></label><input className="input" type="number" step="0.01" inputMode="decimal" value={l.montant_ht ?? ""} onChange={(e) => majLigne(l.id, { montant_ht: e.target.value === "" ? null : Number(e.target.value) })} onBlur={(e) => persistLigne(l.id, { montant_ht: e.target.value === "" ? null : Number(e.target.value) })} /></div>
                </div>
                <div><label className="label">Description</label><input className="input" value={l.description ?? ""} onChange={(e) => majLigne(l.id, { description: e.target.value })} onBlur={(e) => persistLigne(l.id, { description: e.target.value || null })} placeholder="Détail de la dépense" /></div>
                {events.length > 0 && (
                  <div><label className="label">Événement lié <span className="text-slate-400">(facultatif)</span></label>
                    <Select value={l.evenement_id ?? ""} onChange={(v) => { majLigne(l.id, { evenement_id: v || null }); persistLigne(l.id, { evenement_id: v || null }); }} placeholder="— Aucun —" options={[{ value: "", label: "— Aucun —" }, ...events.map((e) => ({ value: e.id, label: e.nom }))]} />
                  </div>
                )}
              </>
            ) : (
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-medium text-slate-700">{libDepense(l.type)}{l.description ? ` — ${l.description}` : ""}</p>
                  <p className="text-xs text-slate-400">{l.date_depense ? new Date(l.date_depense).toLocaleDateString("fr-FR") : ""}</p>
                </div>
                <span className="shrink-0 font-bold text-brand">{eurNdf(l.montant_ttc)}</span>
              </div>
            )}

            {/* Justificatifs de la ligne */}
            <div className="flex flex-wrap items-center gap-2 border-t border-rose-100 pt-2">
              {justifsDe(l.id).map((j) => (
                <span key={j.id} className="inline-flex items-center gap-1 rounded-lg bg-rose-50 px-2 py-1 text-xs">
                  <a href={urls[j.chemin_stockage] ?? "#"} target="_blank" rel="noopener noreferrer" className="font-medium text-brand hover:underline">{j.libelle ?? "Justificatif"}</a>
                  {editable && <button onClick={() => suppJustif(j.id)} className="text-critique" title="Supprimer">✕</button>}
                </span>
              ))}
              {editable && (
                <label className="cursor-pointer rounded-lg border border-dashed border-rose-300 px-2.5 py-1 text-xs font-medium text-brand hover:bg-rose-50">
                  + Justificatif
                  <input type="file" accept="image/*,application/pdf" className="hidden" disabled={busy} onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadJustif(l.id, f); e.target.value = ""; }} />
                </label>
              )}
              {!editable && justifsDe(l.id).length === 0 && <span className="text-xs text-slate-300">Aucun justificatif</span>}
              {editable && <button onClick={() => supprimerLigne(l.id)} className="ml-auto text-xs font-medium text-critique hover:underline">Supprimer la ligne</button>}
            </div>
          </div>
        ))}

        {editable && (
          <button onClick={ajouterLigne} className="justify-self-start rounded-lg border border-dashed border-rose-300 px-4 py-2 text-sm font-semibold text-brand hover:bg-rose-50">+ Ajouter une ligne</button>
        )}
      </div>

      {/* Total */}
      <div className="mt-4 flex items-center justify-between rounded-xl bg-rose-50 px-4 py-3">
        <span className="text-sm font-semibold text-slate-600">Total TTC</span>
        <span className="text-lg font-bold text-brand">{eurNdf(editable ? total : note.total_ttc)}</span>
      </div>

      {/* Actions */}
      <div className="mt-5 flex flex-wrap gap-2">
        {editable && (<>
          <button onClick={soumettre} disabled={busy} className="btn-primary flex-1">Soumettre pour validation</button>
          <button onClick={supprimerNote} className="btn-secondary">Supprimer</button>
        </>)}
        {mien && note.statut === "soumise" && <p className="text-sm text-slate-500">En attente de validation.</p>}
        {mien && note.statut === "rejetee" && <button onClick={rouvrir} className="btn-primary">Corriger (repasser en brouillon)</button>}
        {peutValider && (<>
          <button onClick={valider} disabled={busy} className="btn-primary flex-1">Valider</button>
          <button onClick={rejeter} disabled={busy} className="btn-secondary">Rejeter</button>
        </>)}
        {peutRembourser && <button onClick={rembourser} disabled={busy} className="btn-primary flex-1">Marquer remboursée</button>}
      </div>
    </div>
  );
}
