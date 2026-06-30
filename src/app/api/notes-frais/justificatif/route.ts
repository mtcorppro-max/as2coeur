import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { BUCKET_JUSTIFS } from "@/lib/notesFrais";

type Admin = ReturnType<typeof createAdminClient>;

const TYPES_OK = ["image/jpeg", "image/png", "image/webp", "image/heic", "application/pdf"];
const TAILLE_MAX = 10 * 1024 * 1024; // 10 Mo
const EXT: Record<string, string> = {
  "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/heic": "heic", "application/pdf": "pdf",
};

// Crée le bucket privé à la première utilisation (idempotent).
async function assurerBucket(admin: Admin) {
  const { data } = await admin.storage.getBucket(BUCKET_JUSTIFS);
  if (data) return;
  await admin.storage.createBucket(BUCKET_JUSTIFS, { public: false });
}

// pro courant + note (avec contrôle propriétaire/brouillon) à partir d'une ligne.
async function contexte(admin: Admin, userId: string, ligneId: string) {
  const { data: pro } = await admin.from("professionnel").select("id").eq("user_id", userId).maybeSingle();
  if (!pro) return { erreur: "Compte introuvable.", code: 403 as const };
  const { data: ligne } = await admin.from("note_de_frais_ligne").select("id,note_id").eq("id", ligneId).maybeSingle();
  if (!ligne) return { erreur: "Ligne introuvable.", code: 404 as const };
  const { data: note } = await admin.from("note_de_frais").select("id,emetteur_id,statut").eq("id", ligne.note_id).maybeSingle();
  if (!note) return { erreur: "Note introuvable.", code: 404 as const };
  if (note.emetteur_id !== pro.id || note.statut !== "brouillon") return { erreur: "Modification non autorisée.", code: 403 as const };
  return { pro, note, ligne };
}

export async function POST(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ message: "Non authentifié." }, { status: 401 });

  const form = await request.formData().catch(() => null);
  const fichier = form?.get("fichier");
  const ligneId = form?.get("ligne_id")?.toString() ?? "";
  if (!(fichier instanceof File)) return NextResponse.json({ message: "Fichier manquant." }, { status: 400 });
  if (!ligneId) return NextResponse.json({ message: "Ligne manquante." }, { status: 400 });
  if (!TYPES_OK.includes(fichier.type)) return NextResponse.json({ message: "Format non supporté (image ou PDF)." }, { status: 400 });
  if (fichier.size > TAILLE_MAX) return NextResponse.json({ message: "Fichier trop volumineux (max 10 Mo)." }, { status: 400 });

  const admin = createAdminClient();
  const ctx = await contexte(admin, user.id, ligneId);
  if ("erreur" in ctx) return NextResponse.json({ message: ctx.erreur }, { status: ctx.code });
  await assurerBucket(admin);

  const ext = EXT[fichier.type] ?? "bin";
  const chemin = `${ctx.note.id}/${ctx.ligne.id}/${crypto.randomUUID()}.${ext}`;
  const { error: errUp } = await admin.storage.from(BUCKET_JUSTIFS).upload(chemin, fichier, { contentType: fichier.type, upsert: false });
  if (errUp) return NextResponse.json({ message: "Échec de l'envoi du fichier." }, { status: 500 });

  const { error: errRow } = await admin.from("note_de_frais_justificatif").insert({
    note_id: ctx.note.id, ligne_id: ctx.ligne.id, chemin_stockage: chemin,
    libelle: fichier.name, mime: fichier.type, taille: fichier.size,
  });
  if (errRow) {
    await admin.storage.from(BUCKET_JUSTIFS).remove([chemin]);
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
  const { data: pro } = await admin.from("professionnel").select("id").eq("user_id", user.id).maybeSingle();
  const { data: j } = await admin.from("note_de_frais_justificatif").select("id,chemin_stockage,note_id").eq("id", id).maybeSingle();
  if (!pro || !j) return NextResponse.json({ message: "Introuvable." }, { status: 404 });
  const { data: note } = await admin.from("note_de_frais").select("emetteur_id,statut").eq("id", j.note_id).maybeSingle();
  if (!note || note.emetteur_id !== pro.id || note.statut !== "brouillon") return NextResponse.json({ message: "Suppression non autorisée." }, { status: 403 });

  await admin.storage.from(BUCKET_JUSTIFS).remove([j.chemin_stockage]);
  await admin.from("note_de_frais_justificatif").delete().eq("id", id);
  return NextResponse.json({ ok: true });
}

// URLs signées pour afficher/télécharger les justificatifs (bucket privé).
export async function GET(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ message: "Non authentifié." }, { status: 401 });
  const chemins = (new URL(request.url).searchParams.get("chemins") ?? "").split(",").filter(Boolean);
  if (!chemins.length) return NextResponse.json({ urls: {} });
  const admin = createAdminClient();
  const { data } = await admin.storage.from(BUCKET_JUSTIFS).createSignedUrls(chemins, 3600);
  const urls: Record<string, string> = {};
  (data ?? []).forEach((d) => { if (d.path && d.signedUrl) urls[d.path] = d.signedUrl; });
  return NextResponse.json({ urls });
}
