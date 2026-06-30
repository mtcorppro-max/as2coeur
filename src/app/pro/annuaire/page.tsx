"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useProSession } from "@/lib/hooks/useSession";
import { Avatar } from "@/components/Avatar";
import { LIBELLE_ROLE } from "@/lib/roles";

type Pro = {
  id: string;
  nom: string;
  prenom: string | null;
  titre: string | null;
  role: string;
  email: string | null;
  telephone: string | null;
  photo_url: string | null;
  agence_id: string | null;
  region_id: string | null;
};
type Region = { id: string; nom: string };
type Agence = { id: string; nom: string; region_id: string };

const nomComplet = (p: Pro) => [p.titre, p.prenom, p.nom].filter(Boolean).join(" ") || p.nom;
const libRole = (r: string) => LIBELLE_ROLE[r as keyof typeof LIBELLE_ROLE] ?? r;

// Groupe = un en-tête (région · agence, ou « Direction & support ») + ses membres.
type Groupe = { cle: string; titre: string; sousTitre?: string; membres: Pro[] };

export default function AnnuairePage() {
  const pro = useProSession();
  const [pros, setPros] = useState<Pro[]>([]);
  const [regions, setRegions] = useState<Region[]>([]);
  const [agences, setAgences] = useState<Agence[]>([]);
  const [pret, setPret] = useState(false);
  const [q, setQ] = useState("");

  useEffect(() => {
    const supabase = createClient();
    Promise.all([
      supabase.from("professionnel").select("id,nom,prenom,titre,role,email,telephone,photo_url,agence_id,region_id").order("nom"),
      supabase.from("region").select("id,nom").order("nom"),
      supabase.from("agence").select("id,nom,region_id").order("nom"),
    ]).then(([{ data: ps }, { data: rs }, { data: ags }]) => {
      setPros((ps ?? []) as Pro[]);
      setRegions((rs ?? []) as Region[]);
      setAgences((ags ?? []) as Agence[]);
      setPret(true);
    });
  }, []);

  const groupes = useMemo<Groupe[]>(() => {
    const f = q.trim().toLowerCase();
    const visibles = f
      ? pros.filter((p) => nomComplet(p).toLowerCase().includes(f) || libRole(p.role).toLowerCase().includes(f) || (p.email ?? "").toLowerCase().includes(f))
      : pros;

    const nomRegion = new Map(regions.map((r) => [r.id, r.nom]));
    const out: Groupe[] = [];

    // Région par région, puis agence par agence.
    for (const r of regions) {
      const regionAgences = agences.filter((a) => a.region_id === r.id);
      // Membres rattachés à la région (sans agence) — typiquement les managers.
      const regionaux = visibles.filter((p) => p.region_id === r.id && !p.agence_id);
      if (regionaux.length) out.push({ cle: `r-${r.id}`, titre: r.nom, sousTitre: "Équipe régionale", membres: regionaux });
      for (const a of regionAgences) {
        const m = visibles.filter((p) => p.agence_id === a.id);
        if (m.length) out.push({ cle: `a-${a.id}`, titre: a.nom, sousTitre: r.nom, membres: m });
      }
    }

    // Direction & support : ni agence ni région (dirigeants, RH, administration…).
    const support = visibles.filter((p) => !p.agence_id && !p.region_id);
    if (support.length) out.push({ cle: "support", titre: "Direction & support", sousTitre: "Hors agence", membres: support });

    // Sécurité : membres avec une agence introuvable (orphelins).
    const idsClasses = new Set(out.flatMap((g) => g.membres.map((m) => m.id)));
    const autres = visibles.filter((p) => !idsClasses.has(p.id));
    if (autres.length) out.push({ cle: "autres", titre: "Autres", membres: autres });

    // Annoter l'agence orpheline avec sa région si connue (cosmétique).
    void nomRegion;
    return out;
  }, [pros, regions, agences, q]);

  // Réservé au RH et à l'administration (niveau 0).
  if (pro && pro.role !== "rh" && pro.niveau !== 0) {
    return <div className="card text-sm text-slate-500">Cette page est réservée aux ressources humaines.</div>;
  }

  const total = pros.length;

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="mb-1 text-2xl font-bold text-slate-800">Annuaire des équipes</h1>
      <p className="mb-4 text-sm text-slate-500">Tout le personnel interne de la société — {total} compte{total > 1 ? "s" : ""}.</p>

      <input
        className="input mb-5"
        placeholder="Rechercher un nom, un rôle, un email…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />

      {!pret ? (
        <p className="text-sm text-slate-400">Chargement…</p>
      ) : groupes.length === 0 ? (
        <p className="card text-sm text-slate-400">Aucun résultat.</p>
      ) : (
        <div className="grid gap-5">
          {groupes.map((g) => (
            <section key={g.cle} className="grid gap-3">
              <div className="flex items-baseline justify-between gap-3">
                <h2 className="text-lg font-bold text-slate-800">{g.titre}</h2>
                <span className="text-xs text-slate-400">{g.sousTitre ? `${g.sousTitre} · ` : ""}{g.membres.length} membre{g.membres.length > 1 ? "s" : ""}</span>
              </div>
              <div className="grid gap-2">
                {g.membres.map((m) => (
                  <div key={m.id} className="card flex flex-wrap items-center gap-3 py-3">
                    <Avatar url={m.photo_url} prenom={m.prenom} nom={m.nom} taille="sm" />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-slate-800">{nomComplet(m)}</span>
                        <span className="badge bg-rose-100 text-brand">{libRole(m.role)}</span>
                        {m.id === pro?.id && <span className="badge bg-slate-100 text-slate-500">Vous</span>}
                      </div>
                      <p className="truncate text-xs text-slate-400">
                        {[m.email, m.telephone].filter(Boolean).join(" · ") || "—"}
                      </p>
                    </div>
                    <div className="flex shrink-0 gap-1.5">
                      {m.email && <a href={`mailto:${m.email}`} className="btn-secondary px-3 py-1.5 text-xs" title="Envoyer un email">Email</a>}
                      {m.telephone && <a href={`tel:${m.telephone}`} className="btn-secondary px-3 py-1.5 text-xs" title="Appeler">Tél.</a>}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
