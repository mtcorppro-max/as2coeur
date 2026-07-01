import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { STATUT_PATIENT } from "@/lib/statutPatient";

// Notifie le service comptabilité à chaque changement de statut de prise en
// charge (destiné à la facturation). Le message contient le motif et le nombre
// de perfusions effectuées / prévues → la compta y a accès sans ouvrir le dossier.
export async function POST(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ message: "Non authentifié." }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const patientId = (body.patient_id ?? "").toString();
  const ancien = (body.ancien ?? "").toString();
  const nouveau = (body.nouveau ?? "").toString();
  const detail = (body.detail ?? null) as { effectuees?: number | null; prevues?: number | null; note?: string | null } | null;
  if (!patientId || !nouveau) return NextResponse.json({ message: "Paramètres manquants." }, { status: 400 });

  // Accès au patient contrôlé par la RLS (client normal).
  const { data: pat } = await supabase.from("patient").select("nom,prestataire_id").eq("id", patientId).maybeSingle();
  if (!pat) return NextResponse.json({ message: "Patient hors de votre périmètre." }, { status: 403 });
  const { data: pro } = await supabase.from("professionnel").select("id").eq("user_id", user.id).maybeSingle();
  if (!pro?.id) return NextResponse.json({ message: "Compte introuvable." }, { status: 403 });

  const admin = createAdminClient();
  // Personnel du service comptabilité du même prestataire.
  const { data: comptas } = await admin.from("professionnel")
    .select("id").eq("prestataire_id", pat.prestataire_id).eq("service", "comptabilite");
  const cibles = (comptas ?? []).map((c) => c.id as string).filter((id) => id !== pro.id);
  if (!cibles.length) return NextResponse.json({ ok: true, notifies: 0 });

  const lbl = (s: string) => STATUT_PATIENT[s]?.label ?? s;
  const lignes = [`[Facturation] ${pat.nom} — statut « ${ancien ? lbl(ancien) : "—"} » → « ${lbl(nouveau)} ».`];
  if (detail && (detail.effectuees != null || detail.prevues != null)) {
    lignes.push(`Perfusions effectuées : ${detail.effectuees ?? "?"} / ${detail.prevues ?? "?"}.`);
  }
  if (detail?.note) lignes.push(`Motif : ${detail.note}`);
  const contenu = lignes.join("\n");

  const rows = cibles.map((id) => ({ expediteur_id: pro.id, destinataire_id: id, contenu }));
  await admin.from("message_pro").insert(rows);
  return NextResponse.json({ ok: true, notifies: cibles.length });
}
