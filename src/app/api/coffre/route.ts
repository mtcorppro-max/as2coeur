import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { BUCKET_COFFRE } from "@/lib/coffre";

type Admin = ReturnType<typeof createAdminClient>;

const TYPES_OK = ["image/jpeg", "image/png", "image/webp", "image/heic", "application/pdf"];
const TAILLE_MAX = 20 * 1024 * 1024; // 20 Mo
const EXT: Record<string, string> = {
  "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/heic": "heic", "application/pdf": "pdf",
};

async function assurerBucket(admin: Admin) {
  const { data } = await admin.storage.getBucket(BUCKET_COFFRE);
  if (!data) await admin.storage.createBucket(BUCKET_COFFRE, { public: false });
}

async function proCourant(admin: Admin, userId: string) {
  const { data } = await admin.from("professionnel").select("id").eq("user_id", userId).maybeSingle();
  return data?.id as string | undefined;
}

export async function POST(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ message: "Non authentifié." }, { status: 401 });

  const form = await request.formData().catch(() => null);
  const fichier = form?.get("fichier");
  if (!(fichier instanceof File)) return NextResponse.json({ message: "Fichier manquant." }, { status: 400 });
  if (!TYPES_OK.includes(fichier.type)) return NextResponse.json({ message: "Format non supporté (image ou PDF)." }, { status: 400 });
  if (fichier.size > TAILLE_MAX) return NextResponse.json({ message: "Fichier trop volumineux (max 20 Mo)." }, { status: 400 });

  const admin = createAdminClient();
  const proId = await proCourant(admin, user.id);
  if (!proId) return NextResponse.json({ message: "Compte introuvable." }, { status: 403 });
  await assurerBucket(admin);

  const ext = EXT[fichier.type] ?? "bin";
  const chemin = `${proId}/${crypto.randomUUID()}.${ext}`;
  const { error: errUp } = await admin.storage.from(BUCKET_COFFRE).upload(chemin, fichier, { contentType: fichier.type, upsert: false });
  if (errUp) return NextResponse.json({ message: "Échec de l'envoi du fichier." }, { status: 500 });

  const { error: errRow } = await admin.from("coffre_document").insert({
    professionnel_id: proId, chemin_stockage: chemin,
    libelle: fichier.name, mime: fichier.type, taille: fichier.size,
  });
  if (errRow) {
    await admin.storage.from(BUCKET_COFFRE).remove([chemin]);
    return NextResponse.json({ message: "Échec de l'enregistrement." }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ message: "Non authentifié." }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  const id = (body.id ?? "").toString();
  if (!id) return NextResponse.json({ message: "Identifiant manquant." }, { status: 400 });

  const admin = createAdminClient();
  const proId = await proCourant(admin, user.id);
  const { data: doc } = await admin.from("coffre_document").select("id,chemin_stockage,professionnel_id").eq("id", id).maybeSingle();
  if (!proId || !doc || doc.professionnel_id !== proId) return NextResponse.json({ message: "Suppression non autorisée." }, { status: 403 });

  await admin.storage.from(BUCKET_COFFRE).remove([doc.chemin_stockage]);
  await admin.from("coffre_document").delete().eq("id", id);
  return NextResponse.json({ ok: true });
}

// URLs signées (bucket privé) — restreintes aux documents du pro courant.
export async function GET(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ message: "Non authentifié." }, { status: 401 });
  const chemins = (new URL(request.url).searchParams.get("chemins") ?? "").split(",").filter(Boolean);
  if (!chemins.length) return NextResponse.json({ urls: {} });

  const admin = createAdminClient();
  const proId = await proCourant(admin, user.id);
  if (!proId) return NextResponse.json({ urls: {} });
  // On ne signe que les chemins appartenant au pro (préfixe `${proId}/`).
  const aMoi = chemins.filter((c) => c.startsWith(`${proId}/`));
  if (!aMoi.length) return NextResponse.json({ urls: {} });
  const { data } = await admin.storage.from(BUCKET_COFFRE).createSignedUrls(aMoi, 3600);
  const urls: Record<string, string> = {};
  (data ?? []).forEach((d) => { if (d.path && d.signedUrl) urls[d.path] = d.signedUrl; });
  return NextResponse.json({ urls });
}
