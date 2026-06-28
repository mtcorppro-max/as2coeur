import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Bucket public des photos de profil (avatars du personnel — non médical).
const BUCKET = "avatars";
const TYPES_OK = ["image/jpeg", "image/png", "image/webp", "image/heic"];
const TAILLE_MAX = 5 * 1024 * 1024; // 5 Mo

type Admin = ReturnType<typeof createAdminClient>;

// Crée le bucket public à la première utilisation (idempotent).
async function assurerBucket(admin: Admin) {
  const { data } = await admin.storage.getBucket(BUCKET);
  if (data) return;
  await admin.storage.createBucket(BUCKET, {
    public: true,
    fileSizeLimit: "5MB",
    allowedMimeTypes: TYPES_OK,
  });
}

// Récupère le professionnel connecté (il ne peut agir que sur son propre profil).
async function monPro() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { user: null, pro: null };
  const { data: pro } = await supabase
    .from("professionnel")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();
  return { user, pro: (pro as { id: string } | null) };
}

export async function POST(request: Request) {
  const { user, pro } = await monPro();
  if (!user) return NextResponse.json({ message: "Non authentifié." }, { status: 401 });
  if (!pro) return NextResponse.json({ message: "Profil introuvable." }, { status: 403 });

  const form = await request.formData().catch(() => null);
  const fichier = form?.get("fichier");
  if (!(fichier instanceof File)) {
    return NextResponse.json({ message: "Fichier manquant." }, { status: 400 });
  }
  if (!TYPES_OK.includes(fichier.type)) {
    return NextResponse.json({ message: "Format non supporté (JPEG, PNG, WebP ou HEIC)." }, { status: 400 });
  }
  if (fichier.size > TAILLE_MAX) {
    return NextResponse.json({ message: "Image trop volumineuse (max 5 Mo)." }, { status: 400 });
  }

  const admin = createAdminClient();
  await assurerBucket(admin);
  // Chemin canonique unique par pro : on écrase l'ancienne photo (upsert).
  const chemin = `${pro.id}/avatar`;
  const { error: errUp } = await admin.storage
    .from(BUCKET)
    .upload(chemin, fichier, { contentType: fichier.type, upsert: true });
  if (errUp) {
    return NextResponse.json({ message: "Échec de l'envoi du fichier." }, { status: 500 });
  }

  const { data: pub } = admin.storage.from(BUCKET).getPublicUrl(chemin);
  // Paramètre de version : casse le cache navigateur après remplacement.
  const photo_url = `${pub.publicUrl}?v=${Date.now()}`;
  const { error: errRow } = await admin.from("professionnel").update({ photo_url }).eq("id", pro.id);
  if (errRow) {
    return NextResponse.json({ message: "Échec de l'enregistrement." }, { status: 500 });
  }
  return NextResponse.json({ photo_url });
}

export async function DELETE() {
  const { user, pro } = await monPro();
  if (!user) return NextResponse.json({ message: "Non authentifié." }, { status: 401 });
  if (!pro) return NextResponse.json({ message: "Profil introuvable." }, { status: 403 });

  const admin = createAdminClient();
  await admin.storage.from(BUCKET).remove([`${pro.id}/avatar`]);
  await admin.from("professionnel").update({ photo_url: null }).eq("id", pro.id);
  return NextResponse.json({ ok: true });
}
