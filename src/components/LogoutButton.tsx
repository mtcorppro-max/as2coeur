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
      title="Déconnexion"
      aria-label="Déconnexion"
      className={`grid h-9 w-9 place-items-center rounded-lg text-slate-400 transition hover:bg-rose-50 hover:text-brand disabled:opacity-50 ${className}`}
      type="button"
    >
      {busy ? (
        <svg viewBox="0 0 24 24" className="h-5 w-5 animate-spin" fill="none" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" d="M21 12a9 9 0 1 1-6.2-8.6" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 21H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3" />
          <path d="m16 17 5-5-5-5" />
          <line x1="21" y1="12" x2="9" y2="12" />
        </svg>
      )}
    </button>
  );
}
