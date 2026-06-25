"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { LIBELLE_ROLE } from "@/lib/roles";
import { AdresseAutocomplete } from "@/components/AdresseAutocomplete";
import type { RolePro } from "@/lib/types";

type Soignant = { id: string; nom: string; role: RolePro; niveau: number; telephone: string | null };

const VIDE = {
  prenom: "",
  nom: "",
  date_naissance: "",
  code_postal: "",
  ville: "",
  telephone: "",
  email: "",
  adresse: "",
  operation: "",
  date_operation: "",
  duree_prise_en_charge: "",
  chirurgien: "",
  pharmacie: "",
  pharmacie_tel: "",
  infirmiere_nom: "",
  infirmiere_tel: "",
  proche_nom: "",
  proche_tel: "",
  alerte_1_nom: "",
  tel_alerte_1: "",
  alerte_2_nom: "",
  tel_alerte_2: "",
};

export function NouveauPatientForm() {
  const [form, setForm] = useState({ ...VIDE });
  const [code, setCode] = useState<string | null>(null);
  const [patientId, setPatientId] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [soignants, setSoignants] = useState<Soignant[]>([]);
  const [rattachements, setRattachements] = useState<string[]>([]);

  useEffect(() => {
    createClient()
      .from("professionnel")
      .select("id,nom,role,niveau,telephone")
      .order("nom")
      .then(({ data }) => setSoignants((data ?? []) as Soignant[]));
  }, []);

  // Seuls les soignants de niveau 2 ont besoin d'un rattachement explicite
  // (les niveau 1 et la coordinatrice voient déjà tous les patients).
  const aRattacher = soignants.filter((s) => s.niveau === 2 && s.role !== "coordinatrice");
  const coordinatrices = soignants.filter((s) => s.role === "coordinatrice");
  const chirurgiens = soignants.filter((s) => s.role === "chirurgien");

  // Choix d'une coordinatrice pour une alerte : on enregistre son nom + son
  // téléphone (déjà saisi à la création de son compte).
  const choisirAlerte = (champNom: "alerte_1_nom" | "alerte_2_nom", champTel: "tel_alerte_1" | "tel_alerte_2") =>
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const c = coordinatrices.find((s) => s.nom === e.target.value);
      setForm((f) => ({ ...f, [champNom]: e.target.value, [champTel]: c?.telephone ?? "" }));
    };
  const toggleRattachement = (id: string) =>
    setRattachements((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));
  const setVal = (k: keyof typeof form, v: string) =>
    setForm((f) => ({ ...f, [k]: v }));

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErreur(null);
    setBusy(true);
    try {
      const res = await fetch("/api/patients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, rattachements }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.message ?? "Erreur.");
      setCode(j.code);
      setPatientId(j.patientId);
    } catch (err) {
      setErreur(err instanceof Error ? err.message : "Erreur.");
    } finally {
      setBusy(false);
    }
  }

  if (code) {
    return (
      <div className="card grid gap-4 text-center">
        <p className="text-sm text-slate-500">Patient créé ✓ — code d&apos;accès :</p>
        <p className="rounded-xl bg-rose-50 py-4 font-mono text-3xl font-bold tracking-[0.2em] text-brand">
          {code}
        </p>
        <p className="text-xs text-slate-400">
          À remettre au patient. Connexion sur l&apos;écran « Je suis patient ».
        </p>
        <div className="flex gap-2">
          <Link href={`/pro/patients/${patientId}`} className="btn-primary flex-1">
            Ouvrir la fiche
          </Link>
          <button
            onClick={() => {
              setCode(null);
              setForm({ ...VIDE });
              setRattachements([]);
            }}
            className="btn-secondary flex-1"
          >
            Créer un autre
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="card grid gap-5">
      {/* ── Identité ── */}
      <div className="grid gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label">Prénom du patient *</label>
            <input className="input" value={form.prenom} onChange={set("prenom")} required />
          </div>
          <div>
            <label className="label">Nom du patient *</label>
            <input className="input" value={form.nom} onChange={set("nom")} required />
          </div>
        </div>
        <div>
          <label className="label">Date de naissance</label>
          <input type="date" className="input" value={form.date_naissance} onChange={set("date_naissance")} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label">Téléphone *</label>
            <input className="input" value={form.telephone} onChange={set("telephone")} placeholder="06…" inputMode="tel" required />
          </div>
          <div>
            <label className="label">Adresse mail</label>
            <input className="input" value={form.email} onChange={set("email")} placeholder="nom@email.fr" inputMode="email" />
          </div>
        </div>
        <AdresseAutocomplete
          required
          adresse={form.adresse}
          codePostal={form.code_postal}
          ville={form.ville}
          onChange={(v) => setForm((f) => ({ ...f, adresse: v.adresse, code_postal: v.code_postal, ville: v.ville }))}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label">Personne proche à appeler</label>
            <input className="input" value={form.proche_nom} onChange={set("proche_nom")} placeholder="Nom (conjoint, enfant…)" />
          </div>
          <div>
            <label className="label">Tél. personne proche</label>
            <input className="input" value={form.proche_tel} onChange={set("proche_tel")} placeholder="06…" inputMode="tel" />
          </div>
        </div>
      </div>

      {/* ── Environnement de soins ── */}
      <div className="grid gap-4 border-t border-rose-100 pt-4">
        <p className="text-xs font-bold uppercase tracking-widest text-rose-400">Environnement de soins</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label">Opération subie</label>
            <input className="input" value={form.operation} onChange={set("operation")} placeholder="ex. appendicectomie" />
          </div>
          <div>
            <label className="label">Date de l&apos;opération</label>
            <input type="date" className="input" value={form.date_operation} onChange={set("date_operation")} />
          </div>
        </div>
        <div>
          <label className="label">Nombre total de jours de prise en charge</label>
          <input
            className="input"
            value={form.duree_prise_en_charge}
            onChange={set("duree_prise_en_charge")}
            placeholder="ex. 30"
            inputMode="numeric"
          />
        </div>
        <div>
          <label className="label">Chirurgien (qui a opéré)</label>
          <select className="select" value={form.chirurgien} onChange={(e) => setVal("chirurgien", e.target.value)}>
            <option value="">— Choisir un chirurgien / médecin —</option>
            {chirurgiens.map((s) => (
              <option key={s.id} value={s.nom}>{s.nom}</option>
            ))}
            {form.chirurgien && !chirurgiens.some((s) => s.nom === form.chirurgien) && (
              <option value={form.chirurgien}>{form.chirurgien}</option>
            )}
          </select>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label">Pharmacie</label>
            <input className="input" value={form.pharmacie} onChange={set("pharmacie")} placeholder="Nom / ville de la pharmacie" />
          </div>
          <div>
            <label className="label">Tél. pharmacie</label>
            <input className="input" value={form.pharmacie_tel} onChange={set("pharmacie_tel")} placeholder="0…" inputMode="tel" />
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label">Infirmière libérale</label>
            <input className="input" value={form.infirmiere_nom} onChange={set("infirmiere_nom")} placeholder="Nom" />
          </div>
          <div>
            <label className="label">Tél. infirmière libérale</label>
            <input className="input" value={form.infirmiere_tel} onChange={set("infirmiere_tel")} placeholder="06…" inputMode="tel" />
          </div>
        </div>
        <div>
          <label className="label">Alerte 1 — infirmière coordinatrice</label>
          <select className="select" value={form.alerte_1_nom} onChange={choisirAlerte("alerte_1_nom", "tel_alerte_1")}>
            <option value="">— Choisir une infirmière coordinatrice —</option>
            {coordinatrices.map((s) => (
              <option key={s.id} value={s.nom}>{s.nom}</option>
            ))}
            {form.alerte_1_nom && !coordinatrices.some((s) => s.nom === form.alerte_1_nom) && (
              <option value={form.alerte_1_nom}>{form.alerte_1_nom}</option>
            )}
          </select>
        </div>
        <div>
          <label className="label">Alerte 2 (backup) — infirmière coordinatrice</label>
          <select className="select" value={form.alerte_2_nom} onChange={choisirAlerte("alerte_2_nom", "tel_alerte_2")}>
            <option value="">— Choisir une infirmière coordinatrice —</option>
            {coordinatrices.map((s) => (
              <option key={s.id} value={s.nom}>{s.nom}</option>
            ))}
            {form.alerte_2_nom && !coordinatrices.some((s) => s.nom === form.alerte_2_nom) && (
              <option value={form.alerte_2_nom}>{form.alerte_2_nom}</option>
            )}
          </select>
        </div>
      </div>

      {/* ── Rattachement (soignants niveau 2) ── */}
      {aRattacher.length > 0 && (
        <div className="grid gap-3 border-t border-rose-100 pt-4">
          <p className="text-xs font-bold uppercase tracking-widest text-rose-400">Rattachement du patient</p>
          <p className="-mt-1 text-xs text-slate-400">
            Sélectionnez les soignants en charge de ce patient. Les comptes niveau 1
            et la coordinatrice y ont déjà accès automatiquement.
          </p>
          <div className="flex flex-wrap gap-2">
            {aRattacher.map((s) => {
              const actif = rattachements.includes(s.id);
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => toggleRattachement(s.id)}
                  className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition ${
                    actif
                      ? "border-brand bg-brand text-white"
                      : "border-rose-200 bg-white text-slate-600 hover:border-brand hover:text-brand"
                  }`}
                >
                  {s.nom} ({LIBELLE_ROLE[s.role]})
                </button>
              );
            })}
          </div>
        </div>
      )}

      {erreur && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-critique">{erreur}</p>
      )}
      <button className="btn-primary py-3" disabled={busy}>
        {busy ? "Création…" : "Créer le patient & générer le code"}
      </button>
    </form>
  );
}
