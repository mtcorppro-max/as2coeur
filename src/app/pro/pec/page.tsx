"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useProSession } from "@/lib/hooks/useSession";

type Patient = {
  id: string;
  nom: string;
  date_operation: string | null;
  duree_prise_en_charge: number | null;
  chirurgien: string | null;
  delegue_nom: string | null;
  agence_id: string | null;
  statut: string;
};
type Coord = { id: string; nom: string; prenom: string | null; titre: string | null; agence_id: string | null };
type Liaison = { patient_id: string; professionnel_id: string };

const nomComplet = (p: { titre?: string | null; prenom?: string | null; nom: string }) =>
  [p.titre, p.prenom, p.nom].filter(Boolean).join(" ");

function jour(d: Date) { return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }
function addJours(d: Date, n: number) { const x = new Date(d); x.setDate(x.getDate() + n); return x; }
function fmtDate(s: string | null) {
  if (!s) return "—";
  return new Date(s).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });
}

type Periode = "semaine" | "mois" | "annee";

// Construit le rapport d'une période (clôtures : vendredi 17h / dernier jour du mois 17h / 31 déc. 17h).
function construireRapport(type: Periode, patients: Patient[], agenceNom: Map<string, string>) {
  // Fin de la période contenant d.
  const finP = (d: Date): Date => {
    let r: Date;
    if (type === "semaine") {
      r = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 17, 0, 0, 0);
      r.setDate(r.getDate() + ((5 - r.getDay() + 7) % 7));
    } else if (type === "mois") {
      r = new Date(d.getFullYear(), d.getMonth() + 1, 0, 17, 0, 0, 0);
    } else {
      r = new Date(d.getFullYear(), 11, 31, 17, 0, 0, 0);
    }
    if (r.getTime() < d.getTime()) {
      if (type === "semaine") r.setDate(r.getDate() + 7);
      else if (type === "mois") r = new Date(r.getFullYear(), r.getMonth() + 2, 0, 17, 0, 0, 0);
      else r = new Date(r.getFullYear() + 1, 11, 31, 17, 0, 0, 0);
    }
    return r;
  };
  const prec = (end: Date): Date =>
    type === "semaine" ? new Date(end.getFullYear(), end.getMonth(), end.getDate() - 7, 17, 0, 0, 0)
      : type === "mois" ? new Date(end.getFullYear(), end.getMonth(), 0, 17, 0, 0, 0)
        : new Date(end.getFullYear() - 1, 11, 31, 17, 0, 0, 0);

  const nbStats = type === "semaine" ? 52 : type === "mois" ? 12 : 5;
  const nbChart = type === "semaine" ? 12 : type === "mois" ? 12 : 5;

  const now = new Date();
  let courant = finP(now);
  if (courant.getTime() > now.getTime()) courant = prec(courant);

  const ends: number[] = [];
  let w = new Date(courant);
  for (let i = 0; i < nbStats; i++) { ends.unshift(w.getTime()); w = prec(w); }

  const avecDate = patients.filter((p) => p.date_operation);
  const finOf = (p: Patient) => finP(new Date(p.date_operation!)).getTime();
  const counts = ends.map((e) => avecDate.filter((p) => finOf(p) === e).length);
  const courantCount = counts[counts.length - 1] ?? 0;
  const best = counts.length ? Math.max(...counts) : 0;
  const worst = counts.length ? Math.min(...counts) : 0;
  const moyenne = counts.length ? counts.reduce((a, b) => a + b, 0) / counts.length : 0;

  const sem = avecDate.filter((p) => finOf(p) === courant.getTime());
  const grp = (cle: (p: Patient) => string) => {
    const m = new Map<string, number>();
    sem.forEach((p) => { const k = cle(p); m.set(k, (m.get(k) ?? 0) + 1); });
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  };

  const labelBar = (e: number) => {
    const d = new Date(e);
    if (type === "semaine") return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" });
    if (type === "mois") return d.toLocaleDateString("fr-FR", { month: "short" });
    return String(d.getFullYear());
  };
  const labelCourant =
    type === "semaine"
      ? `Semaine du ${new Date(courant.getFullYear(), courant.getMonth(), courant.getDate() - 7).toLocaleDateString("fr-FR")} au ${courant.toLocaleDateString("fr-FR")} (vendredi 17h)`
      : type === "mois"
        ? `Mois de ${courant.toLocaleDateString("fr-FR", { month: "long", year: "numeric" })} (clôture le ${courant.toLocaleDateString("fr-FR")} 17h)`
        : `Année ${courant.getFullYear()} (clôture le 31/12 17h)`;

  const mot = type === "semaine" ? "semaine" : type === "mois" ? "mois" : "année";
  const motMaj = type === "semaine" ? "Semaine" : type === "mois" ? "Mois" : "Année";
  const fenetre = type === "annee" ? "5 ans" : "12 mois";

  return {
    courant, courantCount, best, worst, moyenne, sem, labelCourant,
    kpi: {
      cette: type === "annee" ? "Cette année" : type === "mois" ? "Ce mois" : "Cette semaine",
      meilleur: type === "annee" ? "Meilleure année" : `Meilleur${type === "semaine" ? "e" : ""} ${mot}`,
      pire: `Pire ${mot}`,
      moyenne: `Moyenne / ${type === "annee" ? "an" : mot} (${fenetre})`,
    },
    titreBar: `PEC démarrées par ${mot} (${nbChart} ${type === "annee" ? "dernières" : "derni" + (type === "mois" ? "ers" : "ères")})`,
    motMaj,
    semaines: ends.slice(-nbChart).map((e, i) => ({ fin: e, count: counts.slice(-nbChart)[i], label: labelBar(e) })),
    parAgence: grp((p) => (p.agence_id ? (agenceNom.get(p.agence_id) ?? "Agence ?") : "Non rattaché")),
    parMedecin: grp((p) => p.chirurgien?.trim() || "Non renseigné"),
    parDelegue: grp((p) => p.delegue_nom?.trim() || "Non renseigné"),
  };
}

export default function PecPage() {
  const pro = useProSession();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [coords, setCoords] = useState<Coord[]>([]);
  const [liaisons, setLiaisons] = useState<Liaison[]>([]);
  const [agenceNom, setAgenceNom] = useState<Map<string, string>>(new Map());
  const [pret, setPret] = useState(false);
  const [detail, setDetail] = useState<{ titre: string; patients: Patient[] } | null>(null);
  const [periode, setPeriode] = useState<Periode>("semaine");

  useEffect(() => {
    const supabase = createClient();
    Promise.all([
      supabase.from("patient").select("id,nom,date_operation,duree_prise_en_charge,chirurgien,delegue_nom,agence_id,statut"),
      supabase.from("professionnel").select("id,nom,prenom,titre,agence_id").eq("role", "coordinatrice"),
      supabase.from("patient_soignant").select("patient_id,professionnel_id"),
      supabase.from("agence").select("id,nom"),
    ]).then(([{ data: pts }, { data: cs }, { data: ls }, { data: ags }]) => {
      setPatients((pts ?? []) as Patient[]);
      setCoords((cs ?? []) as Coord[]);
      setLiaisons((ls ?? []) as Liaison[]);
      setAgenceNom(new Map((ags ?? []).map((a) => [a.id as string, a.nom as string])));
      setPret(true);
    });
  }, []);

  const stats = useMemo(() => {
    const today = jour(new Date());
    const lundi = addJours(today, -((today.getDay() + 6) % 7));
    const moisDebut = new Date(today.getFullYear(), today.getMonth(), 1);
    const anneeDebut = new Date(today.getFullYear(), 0, 1);

    const avecDate = patients.filter((p) => p.date_operation);
    const dOp = (p: Patient) => jour(new Date(p.date_operation!));
    const finPec = (p: Patient) => addJours(dOp(p), p.duree_prise_en_charge ?? 0);
    const periode = (debut: Date) => avecDate.filter((p) => dOp(p) >= debut && dOp(p) <= today);

    const enCours = avecDate.filter((p) => p.statut !== "terminee" && dOp(p) <= today && finPec(p) >= today);
    const aVenir = avecDate.filter((p) => dOp(p) > today).sort((a, b) => dOp(a).getTime() - dOp(b).getTime());

    const grouper = (cle: (p: Patient) => string) => {
      const m = new Map<string, Patient[]>();
      patients.forEach((p) => { const k = cle(p); (m.get(k) ?? m.set(k, []).get(k)!).push(p); });
      return [...m.entries()].sort((a, b) => b[1].length - a[1].length);
    };

    const parMedecin = grouper((p) => p.chirurgien?.trim() || "Non renseigné");
    const parDelegue = grouper((p) => p.delegue_nom?.trim() || "Non renseigné");
    const parAgence = grouper((p) => (p.agence_id ? (agenceNom.get(p.agence_id) ?? "Agence ?") : "Non rattaché"));

    const patientsParId = new Map(patients.map((p) => [p.id, p]));
    const parCoord = coords.map((c) => {
      const ids = liaisons.filter((l) => l.professionnel_id === c.id).map((l) => l.patient_id);
      const pts = ids.map((id) => patientsParId.get(id)).filter((p): p is Patient => !!p);
      return { c, pts };
    }).sort((a, b) => b.pts.length - a.pts.length);

    return {
      total: patients,
      enCours,
      aVenir,
      semaine: periode(lundi),
      mois: periode(moisDebut),
      annee: periode(anneeDebut),
      parMedecin,
      parDelegue,
      parAgence,
      parCoord,
    };
  }, [patients, coords, liaisons, agenceNom]);

  // ── Rapport périodique (semaine vendredi 17h / mois / année) ──
  const rapport = useMemo(() => construireRapport(periode, patients, agenceNom), [periode, patients, agenceNom]);

  if (pro && pro.niveau > 1) {
    return <div className="card text-sm text-slate-500">La page PEC est réservée aux managers (niveau 1) et à l&apos;administration (niveau 0).</div>;
  }
  if (!pret) return <p className="text-sm text-slate-400">Chargement…</p>;

  const ouvrir = (titre: string, pts: Patient[]) => setDetail({ titre, patients: pts });

  async function exporterRapport() {
    const { jsPDF } = await import("jspdf");
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const ROSE: [number, number, number] = [190, 24, 93], NOIR: [number, number, number] = [40, 40, 40], GRIS: [number, number, number] = [90, 90, 90];
    const M = 15; let y = 18;
    doc.setFont("helvetica", "bold"); doc.setFontSize(15); doc.setTextColor(...NOIR);
    doc.text(`Rapport ${rapport.motMaj.toLowerCase()} — Prises en charge`, M, y); y += 6;
    doc.setFont("helvetica", "normal"); doc.setFontSize(10); doc.setTextColor(...GRIS);
    doc.text(rapport.labelCourant, M, y); y += 9;

    const kpis: [string, string | number][] = [[rapport.kpi.cette, rapport.courantCount], [rapport.kpi.meilleur, rapport.best], [rapport.kpi.pire, rapport.worst], [rapport.kpi.moyenne, rapport.moyenne.toFixed(1)]];
    kpis.forEach(([l, v], i) => {
      const x = M + i * 45;
      doc.setDrawColor(244, 200, 220); doc.roundedRect(x, y, 43, 17, 2, 2);
      doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setTextColor(...GRIS); doc.text(String(l), x + 2.5, y + 5, { maxWidth: 39 });
      doc.setFont("helvetica", "bold"); doc.setFontSize(15); doc.setTextColor(...ROSE); doc.text(String(v), x + 2.5, y + 14);
    });
    y += 26;

    doc.setFont("helvetica", "bold"); doc.setFontSize(11); doc.setTextColor(...NOIR);
    doc.text(rapport.titreBar, M, y); y += 6;
    const n = rapport.semaines.length, cw = Math.min(20, (180 - (n - 1) * 3.5) / n), gap = 3.5, base = y + 38, max = Math.max(1, ...rapport.semaines.map((s) => s.count));
    rapport.semaines.forEach((s, i) => {
      const x = M + i * (cw + gap), h = (s.count / max) * 34;
      doc.setFillColor(...ROSE); doc.rect(x, base - h, cw, h, "F");
      doc.setFontSize(7); doc.setTextColor(...GRIS);
      doc.text(String(s.count), x + cw / 2, base - h - 1.5, { align: "center" });
      doc.text(s.label, x + cw / 2, base + 4, { align: "center" });
    });
    y = base + 12;

    const table = (titre: string, rows: [string, number][]) => {
      if (y > 250) { doc.addPage(); y = M; }
      doc.setFont("helvetica", "bold"); doc.setFontSize(10); doc.setTextColor(...ROSE); doc.text(titre, M, y); y += 5;
      doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(...NOIR);
      if (!rows.length) { doc.setTextColor(...GRIS); doc.text("Aucune PEC cette semaine", M + 2, y); y += 5; }
      rows.forEach(([n, c]) => { if (y > 285) { doc.addPage(); y = M; } doc.text(String(n), M + 2, y); doc.text(String(c), 210 - M, y, { align: "right" }); y += 5; });
      y += 3;
    };
    table("PEC — par agence", rapport.parAgence);
    table("PEC — par médecin", rapport.parMedecin);
    table("PEC — par délégué", rapport.parDelegue);

    doc.save(`rapport-pec-${periode}-${rapport.courant.toLocaleDateString("fr-FR").replace(/\//g, "-")}.pdf`);
  }

  return (
    <div className="grid gap-6">
      <h1 className="text-2xl font-bold text-slate-800">Prises en charge</h1>

      {/* Rapport périodique (semaine vendredi 17h / mois / année) */}
      <section className="card grid gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-slate-700">Rapport {rapport.motMaj.toLowerCase()}</h2>
            <p className="text-xs text-slate-400">{rapport.labelCourant}</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="inline-flex rounded-xl border border-rose-200 bg-white p-0.5">
              {([["semaine", "Semaine"], ["mois", "Mois"], ["annee", "Année"]] as const).map(([v, l]) => (
                <button key={v} onClick={() => setPeriode(v)} className={`rounded-lg px-3 py-1 text-sm font-medium transition ${periode === v ? "bg-brand text-white" : "text-slate-600 hover:text-brand"}`}>{l}</button>
              ))}
            </div>
            <button onClick={exporterRapport} className="btn-secondary inline-flex items-center gap-2 text-sm">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-4 w-4"><path strokeLinecap="round" strokeLinejoin="round" d="M12 3v12m0 0 4-4m-4 4-4-4M5 21h14" /></svg>
              Extraire (PDF)
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Kpi label={rapport.kpi.cette} value={rapport.courantCount} accent />
          <Kpi label={rapport.kpi.meilleur} value={rapport.best} />
          <Kpi label={rapport.kpi.pire} value={rapport.worst} />
          <Kpi label={rapport.kpi.moyenne} value={rapport.moyenne.toFixed(1)} />
        </div>

        <BarChart titre={rapport.titreBar} semaines={rapport.semaines} />

        <div className="grid gap-4 lg:grid-cols-3">
          <MiniTable titre="Par agence" rows={rapport.parAgence} />
          <MiniTable titre="Par médecin" rows={rapport.parMedecin} />
          <MiniTable titre="Par délégué" rows={rapport.parDelegue} />
        </div>
      </section>

      {/* Chiffres clés — cliquables */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Stat label="Total" value={stats.total.length} onClick={() => ouvrir("Toutes les PEC", stats.total)} />
        <Stat label="En cours" value={stats.enCours.length} accent onClick={() => ouvrir("PEC en cours", stats.enCours)} />
        <Stat label="À venir" value={stats.aVenir.length} onClick={() => ouvrir("PEC à venir", stats.aVenir)} />
        <Stat label="Cette semaine" value={stats.semaine.length} onClick={() => ouvrir("PEC cette semaine", stats.semaine)} />
        <Stat label="Ce mois" value={stats.mois.length} onClick={() => ouvrir("PEC ce mois", stats.mois)} />
        <Stat label="Cette année" value={stats.annee.length} onClick={() => ouvrir("PEC cette année", stats.annee)} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Bloc titre="PEC par agence" lignes={stats.parAgence} onLigne={(nom, pts) => ouvrir(`PEC — ${nom}`, pts)} />
        <Bloc titre="PEC par médecin" lignes={stats.parMedecin} onLigne={(nom, pts) => ouvrir(`PEC — ${nom}`, pts)} />
        <Bloc titre="PEC par délégué" lignes={stats.parDelegue} onLigne={(nom, pts) => ouvrir(`PEC — ${nom}`, pts)} />
      </div>

      <section className="card grid gap-3">
        <h2 className="text-sm font-semibold text-slate-700">Patients gérés par coordinatrice</h2>
        {stats.parCoord.length === 0 ? (
          <p className="text-sm text-slate-400">Aucune coordinatrice.</p>
        ) : (
          <div className="grid gap-1.5">
            {stats.parCoord.map(({ c, pts }) => (
              <button
                key={c.id}
                onClick={() => ouvrir(`Patients de ${nomComplet(c)}`, pts)}
                className="flex items-center justify-between rounded-lg px-2 py-1.5 text-sm transition hover:bg-rose-50"
              >
                <span className="text-slate-700">
                  {nomComplet(c)}
                  {c.agence_id && <span className="text-slate-400"> · {agenceNom.get(c.agence_id)}</span>}
                </span>
                <span className="badge bg-rose-100 text-brand">{pts.length} patient(s)</span>
              </button>
            ))}
          </div>
        )}
      </section>

      {detail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4" onClick={() => setDetail(null)}>
          <div className="card grid max-h-[80vh] w-full max-w-lg gap-3 overflow-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-700">{detail.titre} · {detail.patients.length}</h2>
              <button onClick={() => setDetail(null)} className="text-slate-400 hover:text-critique">✕</button>
            </div>
            {detail.patients.length === 0 ? (
              <p className="text-sm text-slate-400">Aucun patient.</p>
            ) : (
              <div className="grid gap-1.5">
                {[...detail.patients].sort((a, b) => a.nom.localeCompare(b.nom)).map((p) => (
                  <Link
                    key={p.id}
                    href={`/pro/patients/${p.id}`}
                    className="flex items-center justify-between gap-3 rounded-lg border border-rose-100 px-3 py-2 text-sm transition hover:border-rose-200 hover:bg-rose-50"
                  >
                    <span className="font-medium text-slate-700">{p.nom}</span>
                    <span className="text-right text-xs text-slate-500">
                      {p.chirurgien ? `${p.chirurgien} · ` : ""}{fmtDate(p.date_operation)}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Kpi({ label, value, accent }: { label: string; value: number | string; accent?: boolean }) {
  return (
    <div className="rounded-xl border border-rose-100 p-3">
      <p className="text-xs text-slate-400">{label}</p>
      <p className={`mt-1 text-xl font-bold ${accent ? "text-brand" : "text-slate-800"}`}>{value}</p>
    </div>
  );
}

function BarChart({ titre, semaines }: { titre: string; semaines: { fin: number; count: number; label: string }[] }) {
  const max = Math.max(1, ...semaines.map((s) => s.count));
  return (
    <div>
      <p className="mb-2 text-xs font-medium text-slate-500">{titre}</p>
      <div className="flex items-end gap-1.5" style={{ height: 120 }}>
        {semaines.map((s, i) => (
          <div key={i} className="flex flex-1 flex-col items-center justify-end gap-1">
            <span className="text-[10px] text-slate-500">{s.count}</span>
            <div className="w-full rounded-t bg-brand" style={{ height: `${(s.count / max) * 90}px`, minHeight: s.count ? 2 : 0 }} />
            <span className="text-[9px] capitalize text-slate-400">{s.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function MiniTable({ titre, rows }: { titre: string; rows: [string, number][] }) {
  return (
    <div className="rounded-xl border border-rose-100 p-3">
      <p className="mb-2 text-xs font-bold uppercase tracking-widest text-rose-400">{titre}</p>
      {rows.length === 0 ? (
        <p className="text-sm text-slate-400">Aucune PEC cette semaine.</p>
      ) : (
        <div className="grid gap-1">
          {rows.map(([n, c]) => (
            <div key={n} className="flex items-center justify-between text-sm">
              <span className="truncate text-slate-700">{n}</span>
              <span className="badge bg-rose-100 text-brand">{c}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, accent, onClick }: { label: string; value: number; accent?: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} className="card p-4 text-left transition hover:border-rose-200 hover:shadow-md">
      <p className="text-xs text-slate-400">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${accent ? "text-brand" : "text-slate-800"}`}>{value}</p>
    </button>
  );
}

function Bloc({ titre, lignes, onLigne }: { titre: string; lignes: [string, Patient[]][]; onLigne: (nom: string, pts: Patient[]) => void }) {
  return (
    <section className="card grid gap-3">
      <h2 className="text-sm font-semibold text-slate-700">{titre}</h2>
      {lignes.length === 0 ? (
        <p className="text-sm text-slate-400">Aucune donnée.</p>
      ) : (
        <div className="grid gap-1.5">
          {lignes.map(([nom, pts]) => (
            <button
              key={nom}
              onClick={() => onLigne(nom, pts)}
              className="flex items-center justify-between rounded-lg px-2 py-1.5 text-sm transition hover:bg-rose-50"
            >
              <span className="text-slate-700">{nom}</span>
              <span className="badge bg-rose-100 text-brand">{pts.length}</span>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
