"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

// Changement de mot de passe (tous rôles) — utilise Supabase Auth updateUser.
export function ChangerMotDePasse() {
  const [ouvert, setOuvert] = useState(false);
  const [p1, setP1] = useState("");
  const [p2, setP2] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function valider() {
    setErr(null); setMsg(null);
    if (p1.length < 8) { setErr("Le mot de passe doit comporter au moins 8 caractères."); return; }
    if (p1 !== p2) { setErr("Les deux mots de passe ne correspondent pas."); return; }
    setBusy(true);
    const { error } = await createClient().auth.updateUser({ password: p1 });
    setBusy(false);
    if (error) { setErr("Échec : " + error.message); return; }
    setMsg("Mot de passe modifié."); setP1(""); setP2(""); setOuvert(false);
  }

  return (
    <section className="card grid gap-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 text-brand"><rect x="4" y="11" width="16" height="9" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></svg>
          <h2 className="text-sm font-semibold text-slate-600">Mot de passe</h2>
        </div>
        {!ouvert && (
          <button onClick={() => { setOuvert(true); setMsg(null); }} className="text-sm font-medium text-brand hover:underline">Changer</button>
        )}
      </div>
      {msg && <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-ok">{msg}</p>}
      {ouvert && (
        <div className="grid gap-3">
          <div>
            <label className="label">Nouveau mot de passe</label>
            <input type="password" className="input" value={p1} onChange={(e) => setP1(e.target.value)} placeholder="8 caractères minimum" autoComplete="new-password" />
          </div>
          <div>
            <label className="label">Confirmez le mot de passe</label>
            <input type="password" className="input" value={p2} onChange={(e) => setP2(e.target.value)} autoComplete="new-password" onKeyDown={(e) => { if (e.key === "Enter") valider(); }} />
          </div>
          {err && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-critique">{err}</p>}
          <div className="flex gap-2">
            <button onClick={() => { setOuvert(false); setErr(null); setP1(""); setP2(""); }} className="btn-secondary flex-1" disabled={busy}>Annuler</button>
            <button onClick={valider} disabled={busy} className="btn-primary flex-1">{busy ? "Enregistrement…" : "Enregistrer"}</button>
          </div>
        </div>
      )}
    </section>
  );
}
