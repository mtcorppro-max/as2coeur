import { NextResponse } from "next/server";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { BUCKET_CICATRICES } from "@/lib/photos";

const RGPD_VERSION = "v1-2026";

// Texte du consentement (identique à celui affiché au patient).
const TEXTE_CONSENTEMENT = [
  "Vos données de santé sont collectées pour assurer votre suivi de soins à",
  "domicile, conformément au Règlement Général sur la Protection des Données",
  "(RGPD). Elles sont hébergées de façon sécurisée et ne sont accessibles",
  "qu'aux professionnels de votre équipe de soins. Vous pouvez à tout moment",
  "exercer vos droits d'accès, de rectification et de suppression auprès de",
  "votre prestataire.",
];

const BORDEAUX = rgb(0.59, 0.08, 0.27);
const GRIS = rgb(0.3, 0.32, 0.36);

// Le patient connecté termine son onboarding : consentement RGPD signé à la
// main (pavé de signature) → un PDF est généré et rangé dans son dossier
// (visible côté pro).
export async function POST(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ message: "Non authentifié." }, { status: 401 });

  const { data: patient } = await supabase.from("patient").select("id,nom").eq("user_id", user.id).maybeSingle();
  if (!patient) return NextResponse.json({ message: "Profil patient introuvable." }, { status: 403 });

  const body = await request.json().catch(() => ({}));
  const nom = typeof body.nom === "string" ? body.nom.trim() : "";
  const signature = typeof body.signature === "string" && body.signature.startsWith("data:image/png") ? body.signature : "";
  if (!nom || !signature) return NextResponse.json({ message: "Signature manquante." }, { status: 400 });

  const now = new Date();
  const dateFr = now.toLocaleString("fr-FR", { dateStyle: "long", timeStyle: "short", timeZone: "Europe/Paris" });

  // --- PDF de consentement ---
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595.28, 841.89]); // A4
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const fontB = await pdf.embedFont(StandardFonts.HelveticaBold);
  const H = page.getHeight();
  let y = H - 70;

  page.drawText("AS2CŒUR", { x: 50, y, size: 20, font: fontB, color: BORDEAUX });
  y -= 14;
  page.drawText("Télésuivi de soins à domicile", { x: 50, y, size: 10, font, color: GRIS });
  y -= 44;
  page.drawText("Consentement au traitement des données de santé (RGPD)", { x: 50, y, size: 14, font: fontB, color: rgb(0.1, 0.12, 0.16) });
  y -= 30;
  page.drawText(`Patient : ${patient.nom}`, { x: 50, y, size: 11, font: fontB, color: GRIS });
  y -= 16;
  page.drawText(`Version du consentement : ${RGPD_VERSION}`, { x: 50, y, size: 10, font, color: GRIS });
  y -= 28;
  for (const ligne of TEXTE_CONSENTEMENT) {
    page.drawText(ligne, { x: 50, y, size: 11, font, color: GRIS });
    y -= 16;
  }
  y -= 16;
  page.drawText("J'ai lu et j'accepte la politique de confidentialité et le traitement", { x: 50, y, size: 11, font: fontB, color: GRIS });
  y -= 16;
  page.drawText("de mes données de santé.", { x: 50, y, size: 11, font: fontB, color: GRIS });
  y -= 36;
  page.drawText(`Signé électroniquement par : ${nom}`, { x: 50, y, size: 11, font, color: GRIS });
  y -= 16;
  page.drawText(`Le ${dateFr}`, { x: 50, y, size: 11, font, color: GRIS });
  y -= 130;
  // Signature manuscrite dans un cadre.
  page.drawRectangle({ x: 50, y, width: 240, height: 110, borderColor: rgb(0.85, 0.85, 0.88), borderWidth: 0.75 });
  try {
    const img = await pdf.embedPng(signature);
    const r = Math.min(220 / img.width, 90 / img.height);
    page.drawImage(img, { x: 60, y: y + 10, width: img.width * r, height: img.height * r });
  } catch {
    return NextResponse.json({ message: "Signature illisible." }, { status: 400 });
  }
  page.drawText("Signature du patient", { x: 50, y: y - 14, size: 9, font, color: GRIS });
  const bytes = await pdf.save();

  // --- Stockage (bucket privé, dossier documents du patient) ---
  const admin = createAdminClient();
  const chemin = `${patient.id}/documents/rgpd-${crypto.randomUUID()}.pdf`;
  const { error: errUp } = await admin.storage
    .from(BUCKET_CICATRICES)
    .upload(chemin, new Uint8Array(bytes), { contentType: "application/pdf", upsert: false });
  if (errUp) return NextResponse.json({ message: "Échec de l'enregistrement du PDF." }, { status: 500 });

  const { error } = await admin.from("patient").update({
    onboarding_fait_le: now.toISOString(),
    rgpd_signe_le: now.toISOString(),
    rgpd_nom_signature: nom,
    rgpd_version: RGPD_VERSION,
    rgpd_pdf_chemin: chemin,
  }).eq("id", patient.id);
  if (error) {
    await admin.storage.from(BUCKET_CICATRICES).remove([chemin]);
    return NextResponse.json({ message: "Échec de l'enregistrement." }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
