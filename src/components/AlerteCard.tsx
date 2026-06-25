"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { MESURES } from "@/lib/constants";
import { dateVisite } from "@/lib/visites";
import type { Alerte, TypeMesure } from "@/lib/types";

export type AlerteEnrichie = Alerte & {
  patient: { id: string; nom: string } | null;
  mesure: { type: TypeMesure; valeur: number; horodatage: string } | null;
};

export function AlerteCard({
  alerte,
  peutTraiter,
  onUpdated,
}: {
  alerte: AlerteEnrichie;
  peutTraiter: boolean;
  proId?: string;
  onUpdated?: () => void;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [checkee, setCheckee] = useState(false);

  const patientId = alerte.patient?.id ?? "";
  const lien = `/pro/patients/${patientId}`;
  const meta = alerte.mesure ? MESURES[alerte.mesure.type] : null;

  // La fiche a-t-elle été consultée depuis le déclenchement de l'alerte ?
  useEffect(() => {
    const v = dateVisite(patientId);
    setCheckee(v != null && v >= new Date(alerte.declenchee_le).getTime());
  }, [patientId, alerte.declenchee_le]);

  async function finAlerte() {
    setBusy(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("alerte")
      .update({ statut: "resolue", resolue_le: new Date().toISOString() })
      .eq("id", alerte.id);
    setBusy(false);
    if (!error) onUpdated?.();
    else alert("Action refusée (droits insuffisants ou erreur réseau).");
  }

  const couleur =
    alerte.statut === "declenchee"
      ? "border-l-critique"
      : alerte.statut === "escaladee"
        ? "border-l-attention"
        : "border-l-rose-300";

  return (
    <div
      role="link"
      tabIndex={0}
      onClick={() => patientId && router.push(lien)}
      onKeyDown={(e) => {
        if ((e.key === "Enter" || e.key === " ") && patientId) {
          e.preventDefault();
          router.push(lien);
        }
      }}
      className={`card cursor-pointer border-l-4 transition hover:shadow-md ${couleur}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-800">
              {alerte.patient?.nom ?? "Patient"}
            </span>
            <StatutBadge statut={alerte.statut} />
          </div>
          {alerte.mesure && meta && (
            <p className="mt-1 text-sm text-slate-600">
              {meta.label} :{" "}
              <span className="font-bold text-critique">
                {Number(alerte.mesure.valeur)} {meta.unite}
              </span>{" "}
              <span className="text-slate-400">
                (hors seuil — {new Date(alerte.mesure.horodatage).toLocaleString("fr-FR")})
              </span>
            </p>
          )}
          <p className="mt-0.5 text-xs text-slate-400">
            Déclenchée le {new Date(alerte.declenchee_le).toLocaleString("fr-FR")}
          </p>
        </div>

        {peutTraiter && (
          <div className="flex flex-col items-end gap-1" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={finAlerte}
              disabled={busy || !checkee}
              title={checkee ? undefined : "Consultez d'abord la fiche du patient"}
              className="btn-primary disabled:cursor-not-allowed disabled:opacity-50"
            >
              {busy ? "…" : "Fin de l'alerte"}
            </button>
            {!checkee && (
              <span className="text-[11px] text-slate-400">
                Ouvrez la fiche patient pour clôturer
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function StatutBadge({ statut }: { statut: Alerte["statut"] }) {
  const map = {
    declenchee: { c: "bg-critique text-white", l: "Déclenchée" },
    acquittee: { c: "bg-amber-100 text-attention", l: "Traitée" },
    escaladee: { c: "bg-orange-100 text-orange-700", l: "Escaladée" },
    resolue: { c: "bg-green-100 text-ok", l: "Résolue" },
  } as const;
  const s = map[statut];
  return <span className={`badge ${s.c}`}>{s.l}</span>;
}
