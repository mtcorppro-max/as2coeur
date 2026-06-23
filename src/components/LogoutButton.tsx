"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { clearSessionCache } from "@/lib/hooks/useSession";

export function LogoutButton({ className = "" }: { className?: string }) {
  const [busy, setBusy] = useState(false);

  async function deconnexion() {
    if (busy) return;
    setBusy(true);
    // 1. Vide le cache de session (mémoire + localStorage)
    clearSessionCache();
    // 2. Déconnecte Supabase côté navigateur (efface les cookies de session)
    try {
      await createClient().auth.signOut();
    } catch {
      /* on déconnecte quand même côté navigation */
    }
    // 3. Rechargement complet vers /login : repart d'un état propre,
    //    évite l'écran blanc lié à un état React/cache résiduel.
    window.location.href = "/login";
  }

  return (
    <button
      onClick={deconnexion}
      disabled={busy}
      className={`text-sm text-slate-400 hover:text-brand disabled:opacity-50 ${className}`}
      type="button"
    >
      {busy ? "Déconnexion…" : "Déconnexion"}
    </button>
  );
}
