import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { estEmailAdmin } from "@/lib/admin";

// Contexte de la page admin : indique si l'utilisateur connecté est admin et,
// le cas échéant, la liste des prestataires (pour rattacher le nouveau compte).
export async function GET() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ isAdmin: false }, { status: 401 });

  if (!estEmailAdmin(user.email)) {
    return NextResponse.json({ isAdmin: false });
  }

  const admin = createAdminClient();
  const { data: prestataires } = await admin
    .from("prestataire")
    .select("id,nom")
    .order("nom");

  return NextResponse.json({ isAdmin: true, email: user.email, prestataires: prestataires ?? [] });
}
