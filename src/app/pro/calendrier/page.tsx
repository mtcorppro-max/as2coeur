"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useProSession } from "@/lib/hooks/useSession";
import { LIBELLE_ROLE } from "@/lib/roles";
import type { RolePro } from "@/lib/types";

type ProLite = { id: string; nom: string; role: RolePro };
type AbsenceLigne = {
  id: string;
  professionnel_id: string;
  remplacant_id: string | null;
  date_debut: string;
  date_fin: string;
  motif: string | null;
  professionnel: { nom: string; role: RolePro } | null;
  remplacant: { nom: string; role: RolePro } | null;
};

function formatDate(iso: string) {
  const [a, m, j] = iso.split("-");
  return `${j}/${m}/${a}`;
}

function statutPeriode(debut: string, fin: string): "en_cours" | "a_venir" | "passe" {
  const today = new Date().toISOString().slice(0, 10);
  if (today < debut) return "a_venir";
  if (today > fin) return "passe";
  return "en_cours";
}

export default function CalendrierSoignant() {
  const pro = useProSession();
  const [absences, setAbsences] = useState<AbsenceLigne[]>([]);
  const [equipe, setEquipe] = useState<ProLite[]>([]);
  const [ready, setReady] = useState(false);

  // Formulaire
  const [debut, setDebut] = useState("");
  const [fin, setFin] = useState("");
  const [remplacant, setRemplacant] = useState("");
  const [motif, setMotif] = useState("");
  const [busy, setBusy] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  async function charger() {
    const supabase = createClient();
    const [{ data: abs }, { data: pros }] = await Promise.all([
      supabase
        .from("absence")
        .select("*, professionnel:professionnel_id(nom,role), remplacant:remplacant_id(nom,role)")
        .order("date_debut", { ascending: true }),
      supabase.from("professionnel").select("id,nom,role").order("nom"),
    ]);
    setAbsences((abs ?? []) as unknown as AbsenceLigne[]);
    setEquipe((pros ?? []) as ProLite[]);
    setReady(true);
  }

  useEffect(() => {
    charger();
  }, []);

  async function declarer(e: React.FormEvent) {
    e.preventDefault();
    setErreur(null);
    if (!pro) return;
    if (fin < debut) {
      setErreur("La date de fin doit être après la date de début.");
      return;
    }
    setBusy(true);
    const supabase = createClient();
    const { error } = await supabase.from("absence").insert({
      professionnel_id: pro.id,
      remplacant_id: remplacant || null,
      date_debut: debut,
      date_fin: fin,
      motif: motif.trim() || null,
    });
    setBusy(false);
    if (error) {
      setErreur("Enregistrement refusé. Réessayez.");
      return;
    }
    setDebut("");
    setFin("");
    setRemplacant("");
    setMotif("");
    charger();
  }

  async function supprimer(id: string) {
    const supabase = createClient();
    const { error } = await supabase.from("absence").delete().eq("id", id);
    if (!error) setAbsences((prev) => prev.filter((a) => a.id !== id));
  }

  // Masque les absences déjà terminées de la liste principale
  const aVenirEtEnCours = absences.filter((a) => statutPeriode(a.date_debut, a.date_fin) !== "passe");
  const autresPros = equipe.filter((p) => p.id !== pro?.id);

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      {/* ── Liste des congés ── */}
      <div className="grid gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Congés & absences</h1>
          <p className="mt-1 text-sm text-slate-500">
            Calendrier de l&apos;équipe. Pendant une absence, le remplaçant prend le relais sur les patients.
          </p>
        </div>

        {!ready ? (
          <div className="grid gap-3 animate-pulse">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-20 rounded-2xl border border-rose-100 bg-white" />
            ))}
          </div>
        ) : aVenirEtEnCours.length === 0 ? (
          <p className="card p-6 text-center text-slate-400">Aucune absence prévue. 🌿</p>
        ) : (
          <div className="grid gap-3">
            {aVenirEtEnCours.map((a) => {
              const periode = statutPeriode(a.date_debut, a.date_fin);
              const estMienne = a.professionnel_id === pro?.id;
              return (
                <div
                  key={a.id}
                  className={`card border-l-4 ${periode === "en_cours" ? "border-l-attention" : "border-l-rose-300"}`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-800">{a.professionnel?.nom ?? "Soignant"}</span>
                        {periode === "en_cours" ? (
                          <span className="badge bg-amber-100 text-attention">En congé</span>
                        ) : (
                          <span className="badge bg-rose-50 text-rose-400">À venir</span>
                        )}
                      </div>
                      <p className="mt-1 text-sm text-slate-600">
                        Du {formatDate(a.date_debut)} au {formatDate(a.date_fin)}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        Remplacé(e) par :{" "}
                        {a.remplacant ? (
                          <span className="font-medium text-brand">{a.remplacant.nom}</span>
                        ) : (
                          <span className="text-slate-400">non précisé</span>
                        )}
                      </p>
                      {a.motif && <p className="mt-0.5 text-xs text-slate-400">« {a.motif} »</p>}
                    </div>
                    {estMienne && (
                      <button
                        onClick={() => supprimer(a.id)}
                        className="text-xs font-medium text-slate-400 hover:text-critique"
                      >
                        Annuler
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Formulaire de déclaration ── */}
      <aside>
        <form onSubmit={declarer} className="card grid gap-4">
          <h2 className="text-sm font-semibold text-slate-700">Déclarer une absence</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="label">Du *</label>
              <input type="date" className="input" value={debut} onChange={(e) => setDebut(e.target.value)} required />
            </div>
            <div>
              <label className="label">Au *</label>
              <input type="date" className="input" value={fin} onChange={(e) => setFin(e.target.value)} required />
            </div>
          </div>
          <div>
            <label className="label">Remplacé(e) par</label>
            <select className="input" value={remplacant} onChange={(e) => setRemplacant(e.target.value)}>
              <option value="">— Choisir un soignant —</option>
              {autresPros.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nom} ({LIBELLE_ROLE[p.role]})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Motif (optionnel)</label>
            <input className="input" value={motif} onChange={(e) => setMotif(e.target.value)} placeholder="Congés, astreinte…" />
          </div>
          {erreur && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-critique">{erreur}</p>}
          <button className="btn-primary py-2.5" disabled={busy || !pro}>
            {busy ? "Enregistrement…" : "Déclarer l'absence"}
          </button>
        </form>
      </aside>
    </div>
  );
}
