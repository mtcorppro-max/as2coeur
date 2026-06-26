"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useProSession } from "@/lib/hooks/useSession";

type Patient = {
  id: string;
  nom: string;
  date_operation: string | null;
  duree_prise_en_charge: number | null;
  chirurgien: string | null;
  agence_id: string | null;
  statut: string;
};
type Coord = { id: string; nom: string; prenom: string | null; titre: string | null; agence_id: string | null };

const nomComplet = (p: { titre?: string | null; prenom?: string | null; nom: string }) =>
  [p.titre, p.prenom, p.nom].filter(Boolean).join(" ");

function jour(d: Date) { return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }
function addJours(d: Date, n: number) { const x = new Date(d); x.setDate(x.getDate() + n); return x; }

export default function PecPage() {
  const pro = useProSession();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [coords, setCoords] = useState<Coord[]>([]);
  const [liaisons, setLiaisons] = useState<string[]>([]);
  const [agenceNom, setAgenceNom] = useState<Map<string, string>>(new Map());
  const [pret, setPret] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    Promise.all([
      supabase.from("patient").select("id,nom,date_operation,duree_prise_en_charge,chirurgien,agence_id,statut"),
      supabase.from("professionnel").select("id,nom,prenom,titre,agence_id").eq("role", "coordinatrice"),
      supabase.from("patient_soignant").select("professionnel_id"),
      supabase.from("agence").select("id,nom"),
    ]).then(([{ data: pts }, { data: cs }, { data: ls }, { data: ags }]) => {
      setPatients((pts ?? []) as Patient[]);
      setCoords((cs ?? []) as Coord[]);
      setLiaisons((ls ?? []).map((l) => l.professionnel_id as string));
      setAgenceNom(new Map((ags ?? []).map((a) => [a.id as string, a.nom as string])));
      setPret(true);
    });
  }, []);

  const stats = useMemo(() => {
    const today = jour(new Date());
    const lundi = addJours(today, -((today.getDay() + 6) % 7)); // lundi de la semaine
    const moisDebut = new Date(today.getFullYear(), today.getMonth(), 1);
    const anneeDebut = new Date(today.getFullYear(), 0, 1);

    const avecDate = patients.filter((p) => p.date_operation);
    const dOp = (p: Patient) => jour(new Date(p.date_operation!));
    const finPec = (p: Patient) => addJours(dOp(p), p.duree_prise_en_charge ?? 0);

    const dansPeriode = (debut: Date) => avecDate.filter((p) => dOp(p) >= debut && dOp(p) <= today).length;

    const enCours = avecDate.filter((p) => p.statut !== "terminee" && dOp(p) <= today && finPec(p) >= today);
    const aVenir = avecDate
      .filter((p) => dOp(p) > today)
      .sort((a, b) => dOp(a).getTime() - dOp(b).getTime());

    // Par médecin
    const parMedecin = new Map<string, number>();
    patients.forEach((p) => { const m = p.chirurgien?.trim() || "Non renseigné"; parMedecin.set(m, (parMedecin.get(m) ?? 0) + 1); });

    // Par agence
    const parAgence = new Map<string, number>();
    patients.forEach((p) => { const a = p.agence_id ? (agenceNom.get(p.agence_id) ?? "Agence ?") : "Non rattaché"; parAgence.set(a, (parAgence.get(a) ?? 0) + 1); });

    // Par coordinatrice (nb de patients rattachés)
    const compteParPro = new Map<string, number>();
    liaisons.forEach((id) => compteParPro.set(id, (compteParPro.get(id) ?? 0) + 1));

    const tri = (m: Map<string, number>) => [...m.entries()].sort((a, b) => b[1] - a[1]);

    return {
      total: patients.length,
      semaine: dansPeriode(lundi),
      mois: dansPeriode(moisDebut),
      annee: dansPeriode(anneeDebut),
      enCours: enCours.length,
      aVenir,
      parMedecin: tri(parMedecin),
      parAgence: tri(parAgence),
      parCoord: coords
        .map((c) => ({ c, n: compteParPro.get(c.id) ?? 0 }))
        .sort((a, b) => b.n - a.n),
    };
  }, [patients, coords, liaisons, agenceNom]);

  if (pro && pro.niveau > 1) {
    return <div className="card text-sm text-slate-500">La page PEC est réservée aux managers (niveau 1) et à l&apos;administration (niveau 0).</div>;
  }

  if (!pret) return <p className="text-sm text-slate-400">Chargement…</p>;

  return (
    <div className="grid gap-6">
      <h1 className="text-2xl font-bold text-slate-800">Prises en charge (PEC)</h1>

      {/* Chiffres clés */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Stat label="Total" value={stats.total} />
        <Stat label="En cours" value={stats.enCours} accent />
        <Stat label="À venir" value={stats.aVenir.length} />
        <Stat label="Cette semaine" value={stats.semaine} />
        <Stat label="Ce mois" value={stats.mois} />
        <Stat label="Cette année" value={stats.annee} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Bloc titre="PEC par agence (où ?)" lignes={stats.parAgence} />
        <Bloc titre="PEC par médecin (qui donne ?)" lignes={stats.parMedecin} />
      </div>

      {/* Par coordinatrice */}
      <section className="card grid gap-3">
        <h2 className="text-sm font-semibold text-slate-700">Patients gérés par coordinatrice (qui gère ?)</h2>
        {stats.parCoord.length === 0 ? (
          <p className="text-sm text-slate-400">Aucune coordinatrice.</p>
        ) : (
          <div className="grid gap-1.5">
            {stats.parCoord.map(({ c, n }) => (
              <div key={c.id} className="flex items-center justify-between text-sm">
                <span className="text-slate-700">
                  {nomComplet(c)}
                  {c.agence_id && <span className="text-slate-400"> · {agenceNom.get(c.agence_id)}</span>}
                </span>
                <span className="badge bg-rose-100 text-brand">{n} patient(s)</span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* PEC à venir */}
      <section className="card grid gap-3">
        <h2 className="text-sm font-semibold text-slate-700">Prises en charge à venir</h2>
        {stats.aVenir.length === 0 ? (
          <p className="text-sm text-slate-400">Aucune PEC programmée à venir.</p>
        ) : (
          <div className="grid gap-1.5">
            {stats.aVenir.slice(0, 30).map((p) => (
              <div key={p.id} className="flex items-center justify-between text-sm">
                <span className="font-medium text-slate-700">{p.nom}</span>
                <span className="text-slate-500">
                  {p.chirurgien ? `${p.chirurgien} · ` : ""}
                  {new Date(p.date_operation!).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" })}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <div className="card p-4">
      <p className="text-xs text-slate-400">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${accent ? "text-brand" : "text-slate-800"}`}>{value}</p>
    </div>
  );
}

function Bloc({ titre, lignes }: { titre: string; lignes: [string, number][] }) {
  return (
    <section className="card grid gap-3">
      <h2 className="text-sm font-semibold text-slate-700">{titre}</h2>
      {lignes.length === 0 ? (
        <p className="text-sm text-slate-400">Aucune donnée.</p>
      ) : (
        <div className="grid gap-1.5">
          {lignes.map(([nom, n]) => (
            <div key={nom} className="flex items-center justify-between text-sm">
              <span className="text-slate-700">{nom}</span>
              <span className="badge bg-rose-100 text-brand">{n}</span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
