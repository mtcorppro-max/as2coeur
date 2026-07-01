"use client";

import { useRef, useState } from "react";

// Bouton « Intégrer une ordonnance » : dépose une ordonnance déjà remplie
// (PDF ou photo) depuis l'ordinateur ou le téléphone. Sur mobile, l'appareil
// photo est proposé en plus de la sélection de fichier.
export function IntegrerOrdonnance({ patientId, onCreated }: { patientId: string; onCreated?: () => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function envoyer(f: File | null) {
    if (!f) return;
    setBusy(true);
    const data = new FormData();
    data.append("fichier", f);
    data.append("patient_id", patientId);
    const res = await fetch("/api/ordonnance-import", { method: "POST", body: data });
    setBusy(false);
    if (inputRef.current) inputRef.current.value = "";
    if (!res.ok) {
      const { message } = await res.json().catch(() => ({ message: "" }));
      alert(message || "Échec de l'import. Réessayez.");
      return;
    }
    onCreated?.();
  }

  return (
    <>
      <button onClick={() => inputRef.current?.click()} disabled={busy} className="btn-secondary inline-flex items-center gap-2 text-sm disabled:opacity-50">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-4 w-4">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 16V4m0 0 4 4m-4-4-4 4M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
        </svg>
        {busy ? "Import…" : "Intégrer une ordonnance"}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf,image/*"
        className="hidden"
        onChange={(e) => envoyer(e.target.files?.[0] ?? null)}
      />
    </>
  );
}
