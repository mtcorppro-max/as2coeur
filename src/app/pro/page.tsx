import Link from "next/link";
import { requirePro } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Alerte, Patient } from "@/lib/types";

export default async function Dashboard() {
  await requirePro();
  const supabase = createClient();

  const [{ data: patients }, { data: alertes }] = await Promise.all([
    supabase.from("patient").select("*").order("nom"),
    supabase
      .from("alerte")
      .select("*")
      .in("statut", ["declenchee", "escaladee", "acquittee"]),
  ]);

  const parPatient = new Map<
    string,
    { active: number; acquittees: number; derniere: string | null }
  >();
  (alertes ?? []).forEach((a: Alerte) => {
    const e =
      parPatient.get(a.patient_id) ?? {
        active: 0,
        acquittees: 0,
        derniere: null,
      };
    if (a.statut === "declenchee" || a.statut === "escaladee") e.active += 1;
    if (a.statut === "acquittee") e.acquittees += 1;
    if (!e.derniere || a.declenchee_le > e.derniere) e.derniere = a.declenchee_le;
    parPatient.set(a.patient_id, e);
  });

  const score = (p: Patient) => {
    const e = parPatient.get(p.id);
    return (e?.active ?? 0) * 100 + (e?.acquittees ?? 0);
  };
  const tries = [...(patients ?? [])].sort(
    (a, b) => score(b as Patient) - score(a as Patient)
  );

  const totalActives = [...parPatient.values()].reduce(
    (s, e) => s + e.active,
    0
  );

  return (
    <div className="grid gap-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">Tableau de bord</h1>
        {totalActives > 0 ? (
          <Link
            href="/pro/alertes"
            className="badge bg-critique text-white animate-pulse"
          >
            {totalActives} alerte(s) active(s)
          </Link>
        ) : (
          <span className="badge bg-green-100 text-ok">Aucune alerte active</span>
        )}
      </div>

      {/* ── Cartes mobile ── */}
      <div className="grid gap-3 md:hidden">
        {tries.length === 0 && (
          <p className="rounded-2xl border border-rose-100 bg-white px-4 py-8 text-center text-slate-400">
            Aucun patient. Créez-en un depuis « Nouveau patient ».
          </p>
        )}
        {tries.map((p) => {
          const e = parPatient.get(p.id);
          const critique = (e?.active ?? 0) > 0;
          return (
            <Link
              key={p.id}
              href={`/pro/patients/${p.id}`}
              className={`flex items-center justify-between gap-3 rounded-2xl border bg-white px-4 py-4 transition hover:shadow-md ${
                critique ? "border-red-200 bg-red-50/40" : "border-rose-100"
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-rose-100 text-sm font-bold text-brand">
                  {p.nom.charAt(0)}
                </span>
                <div className="min-w-0">
                  <p className="truncate font-semibold text-slate-700">{p.nom}</p>
                  <StatutSuivi statut={p.statut} />
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {critique ? (
                  <span className="badge bg-critique text-white">{e?.active} alerte(s)</span>
                ) : (e?.acquittees ?? 0) > 0 ? (
                  <span className="badge bg-amber-100 text-attention">{e?.acquittees} acquittée(s)</span>
                ) : (
                  <span className="text-slate-300 text-sm">—</span>
                )}
                <span className="text-brand">→</span>
              </div>
            </Link>
          );
        })}
      </div>

      {/* ── Tableau desktop ── */}
      <div className="hidden overflow-hidden rounded-2xl border border-rose-100 bg-white md:block">
        <table className="w-full text-sm">
          <thead className="bg-rose-50 text-left text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Patient</th>
              <th className="px-4 py-3">Statut suivi</th>
              <th className="px-4 py-3">Alertes</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-rose-50">
            {tries.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-slate-400">
                  Aucun patient. Créez-en un depuis « Nouveau patient ».
                </td>
              </tr>
            )}
            {tries.map((p) => {
              const e = parPatient.get(p.id);
              const critique = (e?.active ?? 0) > 0;
              return (
                <tr key={p.id} className={critique ? "bg-red-50/60" : "hover:bg-rose-50/40"}>
                  <td className="px-4 py-3 font-semibold text-slate-700">{p.nom}</td>
                  <td className="px-4 py-3"><StatutSuivi statut={p.statut} /></td>
                  <td className="px-4 py-3">
                    {critique ? (
                      <span className="badge bg-critique text-white">{e?.active} active(s)</span>
                    ) : (e?.acquittees ?? 0) > 0 ? (
                      <span className="badge bg-amber-100 text-attention">{e?.acquittees} acquittée(s)</span>
                    ) : (
                      <span className="text-slate-300">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link href={`/pro/patients/${p.id}`} className="text-sm font-medium text-brand hover:underline">
                      Ouvrir →
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatutSuivi({ statut }: { statut: Patient["statut"] }) {
  const map = {
    active: { c: "bg-green-100 text-ok", l: "Actif" },
    suspendue: { c: "bg-amber-100 text-attention", l: "Suspendu" },
    terminee: { c: "bg-slate-100 text-slate-500", l: "Terminé" },
  } as const;
  const s = map[statut];
  return <span className={`badge ${s.c}`}>{s.l}</span>;
}
