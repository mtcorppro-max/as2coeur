import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

export type Pt = { x: number; y: number }; // y depuis le HAUT de la page

// Charge un PDF modèle de façon robuste : un service worker périmé (surtout sur
// Android/Samsung) peut renvoyer du HTML à la place du PDF. On valide l'en-tête
// %PDF- ; si ça échoue, on réessaie en contournant le cache (query + reload).
export async function chargerModelePdf(path: string): Promise<ArrayBuffer> {
  const lire = async (url: string, init: RequestInit): Promise<ArrayBuffer> => {
    const res = await fetch(url, init);
    if (!res.ok) throw new Error(`status ${res.status}`);
    const buf = await res.arrayBuffer();
    const tete = String.fromCharCode(...new Uint8Array(buf.slice(0, 5)));
    if (tete !== "%PDF-") throw new Error("not-pdf");
    return buf;
  };
  try {
    return await lire(path, { cache: "no-store" });
  } catch {
    const bust = path + (path.includes("?") ? "&" : "?") + "swbust=" + Date.now();
    try {
      return await lire(bust, { cache: "reload" });
    } catch {
      throw new Error(`Le modèle « ${decodeURIComponent(path)} » n'a pas pu être chargé. Fermez puis rouvrez l'application (mise à jour du cache).`);
    }
  }
}

// Ouvre un PDF modèle (page 1) et fournit des helpers pour écrire par-dessus.
export async function ouvrirTemplate(path: string) {
  const tplBytes = await chargerModelePdf(path);
  const tpl = await PDFDocument.load(tplBytes);
  const out = await PDFDocument.create();
  const [page] = await out.copyPages(tpl, [0]);
  out.addPage(page);
  const font = await out.embedFont(StandardFonts.Helvetica);
  const fontB = await out.embedFont(StandardFonts.HelveticaBold);
  const H = page.getHeight();

  const txt = (s: unknown, p: Pt, size = 9) => {
    if (s == null || s === "") return;
    page.drawText(String(s), { x: p.x, y: H - p.y, size, font, color: rgb(0.1, 0.1, 0.12) });
  };
  // Texte en gras.
  const txtB = (s: unknown, p: Pt, size = 9) => {
    if (s == null || s === "") return;
    page.drawText(String(s), { x: p.x, y: H - p.y, size, font: fontB, color: rgb(0.1, 0.1, 0.12) });
  };
  // Texte centré horizontalement autour de p.x.
  const txtC = (s: unknown, p: Pt, size = 9) => {
    if (s == null || s === "") return;
    const w = font.widthOfTextAtSize(String(s), size);
    page.drawText(String(s), { x: p.x - w / 2, y: H - p.y, size, font, color: rgb(0.1, 0.1, 0.12) });
  };
  const coche = (p: Pt) => page.drawText("X", { x: p.x, y: H - p.y, size: 10, font, color: rgb(0, 0, 0) });
  // Case à cocher vide (carré) — yTop = bord haut, s = côté.
  const boite = (x: number, yTop: number, s = 9) =>
    page.drawRectangle({ x, y: H - yTop - s, width: s, height: s, borderColor: rgb(0.1, 0.1, 0.12), borderWidth: 1 });
  // Masque une zone (rectangle blanc) — yTop = bord haut de la zone.
  const blanc = (x: number, yTop: number, w: number, h: number) => page.drawRectangle({ x, y: H - yTop - h, width: w, height: h, color: rgb(1, 1, 1) });
  // Déplace un bloc du modèle d'origine (rectangle [x, yTop, largeur, hauteur], repère
  // haut-gauche) de `dy` points vers le bas — préserve le rendu exact (gras, etc.).
  const deplacerBloc = async (r: [number, number, number, number], dy: number) => {
    const [x, yTop, w, h] = r;
    const emb = await out.embedPage(tpl.getPage(0), { left: x, bottom: H - (yTop + h), right: x + w, top: H - yTop });
    page.drawPage(emb, { x, y: H - (yTop + h) - dy });
  };
  const signer = async (dataUrl: string | null | undefined, p: Pt, w = 95, h = 28) => {
    if (!dataUrl) return;
    try { const png = await out.embedPng(dataUrl); page.drawImage(png, { x: p.x, y: H - p.y - h, width: w, height: h }); } catch { /* */ }
  };
  const finaliser = async (mode: "download" | "bloburl", filename: string): Promise<string | void> => {
    const bytes = await out.save();
    const blob = new Blob([bytes as unknown as BlobPart], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    if (mode === "bloburl") return url;
    // Téléchargement robuste mobile : lien ajouté au DOM + révocation différée
    // (sur Android, révoquer aussitôt annule le téléchargement avant son départ).
    const a = document.createElement("a");
    a.href = url; a.download = filename; a.rel = "noopener";
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  };

  return { txt, txtB, txtC, coche, boite, blanc, deplacerBloc, signer, finaliser };
}

export const frDate = (v: unknown) => (v ? new Date(v as string).toLocaleDateString("fr-FR") : "");

// Données communes passées aux ordonnances à modèle.
export type DocOrdoData = {
  patientNom: string;
  prescripteurNom?: string | null;
  prescripteurPrenom?: string | null;
  prescripteurTitre?: string | null;
  prescripteurRpps?: string | null;
  date?: string | null; // JJ/MM/AAAA
  contenu: Record<string, unknown>;
  signature?: string | null;
};

export const nomPrescripteur = (d: DocOrdoData) =>
  [d.prescripteurTitre, d.prescripteurPrenom, d.prescripteurNom].filter(Boolean).join(" ");
