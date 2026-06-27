import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { BUCKET_CICATRICES } from "@/lib/photos";

const TYPES_OK = ["image/jpeg", "image/png", "image/webp", "image/heic"];
const TAILLE_MAX = 10 * 1024 * 1024;
const EXT: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/heic": "heic" };
const COLONNE: Record<string, string> = { carte_vitale: "carte_vitale_chemin", mutuelle: "mutuelle_chemin" };

// Le patient connecté envoie une photo de sa carte Vitale ou de sa mutuelle.
export async function POST(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ message: "Non authentifié." }, { status: 401 });

  const { data: patient } = await supabase.from("patient").select("id, carte_vitale_chemin, mutuelle_chemin").eq("user_id", user.id).maybeSingle();
  if (!patient) return NextResponse.json({ message: "Profil patient introuvable." }, { status: 403 });

  const form = await request.formData().catch(() => null);
  const type = form?.get("type")?.toString() ?? "";
  const fichier = form?.get("fichier");
  const colonne = COLONNE[type];
  if (!colonne) return NextResponse.json({ message: "Type de document invalide." }, { status: 400 });
  if (!(fichier instanceof File)) return NextResponse.json({ message: "Fichier manquant." }, { status: 400 });
  if (!TYPES_OK.includes(fichier.type)) return NextResponse.json({ message: "Format non supporté (JPEG, PNG, WebP, HEIC)." }, { status: 400 });
  if (fichier.size > TAILLE_MAX) return NextResponse.json({ message: "Image trop volumineuse (max 10 Mo)." }, { status: 400 });

  const admin = createAdminClient();
  const ext = EXT[fichier.type] ?? "jpg";
  const chemin = `${patient.id}/documents/${type}-${crypto.randomUUID()}.${ext}`;

  const { error: errUp } = await admin.storage.from(BUCKET_CICATRICES).upload(chemin, fichier, { contentType: fichier.type, upsert: false });
  if (errUp) return NextResponse.json({ message: "Échec de l'envoi du fichier." }, { status: 500 });

  const ancien = (patient as Record<string, string | null>)[colonne];
  const { error: errRow } = await admin.from("patient").update({ [colonne]: chemin }).eq("id", patient.id);
  if (errRow) {
    await admin.storage.from(BUCKET_CICATRICES).remove([chemin]);
    return NextResponse.json({ message: "Échec de l'enregistrement." }, { status: 500 });
  }
  // Nettoyage de l'ancien fichier remplacé
  if (ancien) await admin.storage.from(BUCKET_CICATRICES).remove([ancien]);

  return NextResponse.json({ ok: true, chemin });
}
