import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const RGPD_VERSION = "v1-2026";

// Le patient connecté termine son onboarding et signe électroniquement le RGPD.
export async function POST(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ message: "Non authentifié." }, { status: 401 });

  const { data: patient } = await supabase.from("patient").select("id").eq("user_id", user.id).maybeSingle();
  if (!patient) return NextResponse.json({ message: "Profil patient introuvable." }, { status: 403 });

  const body = await request.json().catch(() => ({}));
  const nom = typeof body.nom === "string" ? body.nom.trim() : "";
  if (!nom) return NextResponse.json({ message: "Signature manquante." }, { status: 400 });

  const now = new Date().toISOString();
  const admin = createAdminClient();
  const { error } = await admin.from("patient").update({
    onboarding_fait_le: now,
    rgpd_signe_le: now,
    rgpd_nom_signature: nom,
    rgpd_version: RGPD_VERSION,
  }).eq("id", patient.id);
  if (error) return NextResponse.json({ message: "Échec de l'enregistrement." }, { status: 500 });
  return NextResponse.json({ ok: true });
}
