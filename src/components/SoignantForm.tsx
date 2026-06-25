"use client";

import { useState } from "react";

type Prestataire = { id: string; nom: string };

const VIDE = {
  nom: "",
  email: "",
  motDePasse: "",
  role: "chirurgien",
  prestataire_id: "",
  // Consignes chirurgien / médecin
  specialite: "",
  cabinets: "",
  telephone: "",
  secretariat_nom: "",
  secretariat_email: "",
  secretariat_tel: "",
  duree_prise_en_charge: "",
  nb_suivis: "",
  protocole: "",
};

// Formulaire de création d'un compte soignant.
// Si `prestataires` est fourni (contexte admin), un sélecteur de prestataire
// est affiché et envoyé ; sinon le compte est rattaché au prestataire de la
// coordinatrice connectée (géré côté API).
export function SoignantForm({ prestataires }: { prestataires?: Prestataire[] }) {
  const [form, setForm] = useState({ ...VIDE });
  const [erreur, setErreur] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [cree, setCree] = useState<{ email: string; motDePasse: string } | null>(null);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const estChirurgien = form.role === "chirurgien";

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErreur(null);
    setBusy(true);
    try {
      const res = await fetch("/api/soignants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.message ?? "Erreur.");
      setCree({ email: j.email, motDePasse: j.motDePasse });
    } catch (err) {
      setErreur(err instanceof Error ? err.message : "Erreur.");
    } finally {
      setBusy(false);
    }
  }

  if (cree) {
    return (
      <div className="card grid gap-4 text-center">
        <p className="text-sm text-slate-500">Compte soignant créé ✓ — identifiants de connexion :</p>
        <div className="grid gap-2 rounded-xl bg-rose-50 p-4 text-left">
          <p className="text-sm"><span className="text-slate-400">Email : </span><span className="font-mono font-semibold text-brand">{cree.email}</span></p>
          <p className="text-sm"><span className="text-slate-400">Mot de passe : </span><span className="font-mono font-semibold text-brand">{cree.motDePasse}</span></p>
        </div>
        <p className="text-xs text-slate-400">
          À transmettre au soignant. Connexion sur l&apos;écran « Équipe médicale ».
        </p>
        <button onClick={() => { setCree(null); setForm({ ...VIDE }); }} className="btn-secondary">
          Créer un autre compte
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="card grid gap-5">
      {/* ── Identité & connexion ── */}
      <div className="grid gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label">Nom *</label>
            <input className="input" value={form.nom} onChange={set("nom")} placeholder="Dr STOURBE Olivier" required />
          </div>
          <div>
            <label className="label">Rôle *</label>
            <select className="select" value={form.role} onChange={set("role")}>
              <option value="chirurgien">Chirurgien / Médecin</option>
              <option value="coordinatrice">Coordinatrice</option>
              <option value="delegue">Délégué médical</option>
            </select>
          </div>
        </div>
        {prestataires && (
          <div>
            <label className="label">Prestataire *</label>
            <select className="select" value={form.prestataire_id} onChange={set("prestataire_id")} required>
              <option value="">— Choisir un prestataire —</option>
              {prestataires.map((p) => (
                <option key={p.id} value={p.id}>{p.nom}</option>
              ))}
            </select>
          </div>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label">Email de connexion *</label>
            <input className="input" type="email" value={form.email} onChange={set("email")} placeholder="nom@email.fr" inputMode="email" required />
          </div>
          <div>
            <label className="label">Mot de passe</label>
            <input className="input" value={form.motDePasse} onChange={set("motDePasse")} placeholder="Laisser vide pour générer" />
          </div>
        </div>
      </div>

      {/* ── Consignes chirurgien / médecin ── */}
      {estChirurgien && (
        <>
          <div className="grid gap-4 border-t border-rose-100 pt-4">
            <p className="text-xs font-bold uppercase tracking-widest text-rose-400">Coordonnées du médecin</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="label">Spécialité</label>
                <input className="input" value={form.specialite} onChange={set("specialite")} placeholder="ex. Chirurgien orthopédique" />
              </div>
              <div>
                <label className="label">Téléphone (personnel)</label>
                <input className="input" value={form.telephone} onChange={set("telephone")} placeholder="06…" inputMode="tel" />
              </div>
            </div>
            <div>
              <label className="label">Adresse du / des cabinets</label>
              <input className="input" value={form.cabinets} onChange={set("cabinets")} placeholder="Clinique du Parc à Castelnau-le-Lez / …" />
            </div>
          </div>

          <div className="grid gap-4 border-t border-rose-100 pt-4">
            <p className="text-xs font-bold uppercase tracking-widest text-rose-400">Secrétariat</p>
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label className="label">Nom</label>
                <input className="input" value={form.secretariat_nom} onChange={set("secretariat_nom")} placeholder="Nathalie" />
              </div>
              <div>
                <label className="label">Email</label>
                <input className="input" value={form.secretariat_email} onChange={set("secretariat_email")} placeholder="secretariat@…" inputMode="email" />
              </div>
              <div>
                <label className="label">Téléphone</label>
                <input className="input" value={form.secretariat_tel} onChange={set("secretariat_tel")} placeholder="0…" inputMode="tel" />
              </div>
            </div>
          </div>

          <div className="grid gap-4 border-t border-rose-100 pt-4">
            <p className="text-xs font-bold uppercase tracking-widest text-rose-400">Prise en charge</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="label">Nombre de jours de prise en charge</label>
                <input className="input" value={form.duree_prise_en_charge} onChange={set("duree_prise_en_charge")} placeholder="ex. 30" inputMode="numeric" />
              </div>
              <div>
                <label className="label">Nombre de suivis souhaités</label>
                <input className="input" value={form.nb_suivis} onChange={set("nb_suivis")} placeholder="ex. 3" inputMode="numeric" />
              </div>
            </div>
            <div>
              <label className="label">Protocole / consignes</label>
              <textarea
                className="input"
                rows={6}
                value={form.protocole}
                onChange={set("protocole")}
                placeholder={"Molécules, dosages, débits, nombre de fois par jour\nPansement\nSuivi (ex. appel J1 obligatoire)\nAutres consignes…"}
              />
            </div>
          </div>
        </>
      )}

      {erreur && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-critique">{erreur}</p>
      )}
      <button className="btn-primary py-3" disabled={busy}>
        {busy ? "Création…" : "Créer le compte soignant"}
      </button>
    </form>
  );
}
