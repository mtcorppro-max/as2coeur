"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { invalidate } from "@/lib/hooks/useData";
import { usePatientSession } from "@/lib/hooks/useSession";
import { encouragement } from "@/lib/avatarGuide";
import { AvatarGuide } from "@/components/AvatarGuide";
import { MESURES } from "@/lib/constants";
import type { TypeMesure } from "@/lib/types";

type Choix = "temperature" | "tension" | "spo2" | "bpm" | "poids";

const CHOIX: { key: Choix; label: string }[] = [
  { key: "temperature", label: "Température" },
  { key: "tension", label: "Tension" },
  { key: "spo2", label: "Saturation O₂" },
  { key: "bpm", label: "Pouls" },
  { key: "poids", label: "Poids" },
];

// Icônes de constantes (style ligne, couleur du site).
function IconeConstante({ type }: { type: Choix }) {
  const p = { fill: "none", stroke: "currentColor", strokeWidth: 1.7, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  const paths: Record<Choix, React.ReactNode> = {
    temperature: (<><path d="M10 13.8V5a2 2 0 1 1 4 0v8.8a3.5 3.5 0 1 1-4 0Z" /><line x1="12" y1="9" x2="12" y2="14.5" /></>),
    tension: (<><path d="M3.5 13a8.5 8.5 0 0 1 17 0" /><path d="M12 13l4.5-3.2" /><circle cx="12" cy="13" r="1.3" /></>),
    spo2: (<><path d="M12 3.5v9" /><path d="M11 8.5c0 0-3 .8-3 6 0 3 .2 5.5 1.7 5.5S12 18 12 15" /><path d="M13 8.5c0 0 3 .8 3 6 0 3-.2 5.5-1.7 5.5S12 18 12 15" /></>),
    bpm: (<><path d="M3 12h4l2-6 3.5 12 2.5-6H21" /></>),
    poids: (<><path d="M12 4.2v15.6" /><path d="M5 7.5h14" /><path d="M5 7.5 2.4 13a3 3 0 0 0 5.2 0L5 7.5Z" /><path d="M19 7.5 16.4 13a3 3 0 0 0 5.2 0L19 7.5Z" /><path d="M8.5 20h7" /></>),
  };
  return (
    <svg viewBox="0 0 24 24" className="h-8 w-8 text-brand" {...p} aria-hidden="true">{paths[type]}</svg>
  );
}

export function SaisieMesure({ patientId, pro, onSaved }: { patientId: string; pro?: boolean; onSaved?: () => void }) {
  const router = useRouter();
  const patient = usePatientSession(); // null côté pro (avatar-guide patient uniquement)
  const [choix, setChoix] = useState<Choix | null>(null);
  const [v1, setV1] = useState("");
  const [v2, setV2] = useState(""); // diastolique pour la tension
  const [etat, setEtat] = useState<"idle" | "envoi" | "ok" | "erreur">("idle");
  const [message, setMessage] = useState("");
  const [encou, setEncou] = useState(""); // encouragement scripté (fixé au succès)

  function reset() {
    setChoix(null);
    setV1("");
    setV2("");
    setEtat("idle");
    setMessage("");
  }

  async function enregistrer() {
    setEtat("envoi");
    setMessage("");
    const supabase = createClient();

    const lignes: { patient_id: string; type: TypeMesure; valeur: number }[] = [];
    if (choix === "tension") {
      lignes.push({ patient_id: patientId, type: "ta_systolique", valeur: Number(v1) });
      lignes.push({ patient_id: patientId, type: "ta_diastolique", valeur: Number(v2) });
    } else if (choix) {
      lignes.push({ patient_id: patientId, type: choix as TypeMesure, valeur: Number(v1) });
    }

    const { error } = await supabase.from("mesure").insert(lignes);
    if (error) {
      setEtat("erreur");
      setMessage("Échec de l'enregistrement. Réessayez.");
      return;
    }
    setEtat("ok");
    setMessage("Mesure enregistrée ✓");
    setEncou(encouragement());
    // Côté pro : on rafraîchit la fiche et on réinitialise (pas de redirection patient).
    if (pro) {
      invalidate(`pro:patient-courbes:${patientId}`);
      onSaved?.();
      setTimeout(reset, 900);
      return;
    }
    // Invalide les caches client pour que la nouvelle mesure apparaisse,
    // sans router.refresh() (qui repasse par le serveur et casse la session).
    invalidate(`patient:accueil:${patientId}`);
    invalidate(`patient:suivi:${patientId}`);
    // Délai un peu plus long : le temps de lire l'encouragement de l'avatar.
    setTimeout(() => {
      router.push("/patient");
    }, 1800);
  }

  if (!choix) {
    return (
      <div className="grid grid-cols-2 gap-3">
        {CHOIX.map((c) => (
          <button
            key={c.key}
            onClick={() => setChoix(c.key)}
            className="card flex flex-col items-center gap-2 py-6 text-base font-semibold text-slate-700 hover:border-brand"
          >
            <IconeConstante type={c.key} />
            {c.label}
          </button>
        ))}
      </div>
    );
  }

  const meta =
    choix === "tension" ? MESURES.ta_systolique : MESURES[choix as TypeMesure];
  const valide =
    choix === "tension" ? v1 !== "" && v2 !== "" : v1 !== "";

  return (
    <div className="card grid gap-4">
      {choix === "tension" ? (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Systolique (mmHg)</label>
            <input
              type="number"
              inputMode="decimal"
              className="input text-center text-2xl font-bold"
              value={v1}
              onChange={(e) => setV1(e.target.value)}
              placeholder="120"
              autoFocus
            />
          </div>
          <div>
            <label className="label">Diastolique (mmHg)</label>
            <input
              type="number"
              inputMode="decimal"
              className="input text-center text-2xl font-bold"
              value={v2}
              onChange={(e) => setV2(e.target.value)}
              placeholder="80"
            />
          </div>
        </div>
      ) : (
        <div>
          <label className="label">
            {MESURES[choix as TypeMesure].label} ({meta.unite})
          </label>
          <input
            type="number"
            inputMode="decimal"
            step={meta.pas}
            className="input text-center text-3xl font-bold"
            value={v1}
            onChange={(e) => setV1(e.target.value)}
            autoFocus
          />
        </div>
      )}

      {message && etat === "ok" && !pro && patient ? (
        /* Encouragement scripté de l'avatar-guide (côté patient) */
        <AvatarGuide
          dateNaissance={patient.date_naissance}
          sexe={patient.sexe}
          taille={52}
          bulle={
            <div className="grid gap-0.5">
              <p className="text-sm font-semibold text-ok">{message}</p>
              {encou && <p className="text-sm text-slate-600">{encou}</p>}
            </div>
          }
        />
      ) : message ? (
        <p
          className={`rounded-lg px-3 py-2 text-sm ${
            etat === "ok"
              ? "bg-green-50 text-ok"
              : "bg-red-50 text-critique"
          }`}
        >
          {message}
        </p>
      ) : null}

      <div className="flex gap-3">
        <button onClick={reset} className="btn-secondary flex-1">
          Annuler
        </button>
        <button
          onClick={enregistrer}
          disabled={!valide || etat === "envoi" || etat === "ok"}
          className="btn-primary flex-1"
        >
          {etat === "envoi" ? "Enregistrement…" : "Enregistrer"}
        </button>
      </div>
    </div>
  );
}
