import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

const TEMPLATE = "/formulaire-prescription_perfusions_urps-ph-paca-2016.pdf";

export type PerfDomicileData = {
  patientNom: string;
  prescripteurNom: string;
  prescripteurRpps?: string | null;
  date?: string | null; // date de prescription (JJ/MM/AAAA)
  contenu: Record<string, unknown>;
  signature?: string | null;
};

// Coordonnées (points, repère depuis le HAUT de la page A4 595x842),
// calées sur la position réelle des libellés du formulaire.
const POS = {
  initiation: { x: 25, y: 73 },          // case « Initiation d'une perfusion à domicile »
  patient_nom: { x: 300, y: 60 },
  prescripteur_nom: { x: 55, y: 122 },
  prescripteur_rpps: { x: 92, y: 159 },
  produit: { x: 52, y: 335 },            // dénomination du produit n°1
  duree: { x: 305, y: 383 },             // après « … minutes » sur la ligne Durée
  nb_perfusions: { x: 140, y: 407 },
  frequence: { x: 232, y: 410 },
  signature: { x: 405, y: 805 },         // cadre SIGNATURE (bas droite)
};

// Dates écrites dans les cases JJ / MM / AAAA (x de chaque groupe, baseline y).
const POS_DATE = {
  prescription: { xs: [112, 131, 150] as [number, number, number], y: 61 },
  debut: { xs: [51, 70, 91] as [number, number, number], y: 436 },
  fin: { xs: [168, 187, 208] as [number, number, number], y: 436 },
};

// Cases « Voie d'abord » (produit n°1).
const POS_VOIE: Record<string, { x: number; y: number }> = {
  "Veineuse centrale (VC)": { x: 359, y: 301 },
  "Chambre implantable": { x: 375, y: 312 },
  "Cathéter central": { x: 375, y: 324 },
  "PICC-line": { x: 375, y: 335 },
  "Péri-nerveuse": { x: 359, y: 355 },
  "Veineuse périphérique": { x: 359, y: 367 },
  "Sous-cutanée": { x: 359, y: 380 },
};

// Cases « Mode d'administration » (produit n°1).
const POS_MODE: Record<string, { x: number; y: number }> = {
  "Gravité": { x: 461, y: 301 },
  "Diffuseur": { x: 461, y: 313 },
  "Système actif électrique": { x: 461, y: 326 },
  "Transfuseur": { x: 461, y: 396 },
};

export async function genererPdfPerfusionDomicile(d: PerfDomicileData, mode: "download" | "bloburl" = "download"): Promise<string | void> {
  const tplBytes = await fetch(TEMPLATE).then((r) => r.arrayBuffer());
  const tpl = await PDFDocument.load(tplBytes);
  const out = await PDFDocument.create();
  const [page] = await out.copyPages(tpl, [0]); // page 1 uniquement
  out.addPage(page);
  const font = await out.embedFont(StandardFonts.Helvetica);
  const H = page.getHeight();

  const txt = (s: string | null | undefined, p: { x: number; y: number }, size = 9) => {
    if (!s) return;
    page.drawText(String(s), { x: p.x, y: H - p.y, size, font, color: rgb(0.1, 0.1, 0.12) });
  };
  const coche = (p: { x: number; y: number }) => {
    page.drawText("X", { x: p.x, y: H - p.y, size: 10, font, color: rgb(0.75, 0.1, 0.36) });
  };
  // Écrit une date JJ/MM/AAAA dans ses 3 groupes de cases.
  const dateCases = (val: string | null | undefined, p: { xs: [number, number, number]; y: number }) => {
    if (!val) return;
    const [dd, mm, yyyy] = val.split("/");
    if (!yyyy) { txt(val, { x: p.xs[0], y: p.y }, 8); return; }
    txt(dd, { x: p.xs[0], y: p.y }, 8);
    txt(mm, { x: p.xs[1], y: p.y }, 8);
    txt(yyyy, { x: p.xs[2], y: p.y }, 8);
  };
  const isoToFr = (s: unknown) => (s ? new Date(s as string).toLocaleDateString("fr-FR") : "");

  const c = d.contenu;
  dateCases(d.date || new Date().toLocaleDateString("fr-FR"), POS_DATE.prescription);
  coche(POS.initiation);
  txt(d.patientNom, POS.patient_nom);
  txt(d.prescripteurNom, POS.prescripteur_nom);
  txt(d.prescripteurRpps ?? "", POS.prescripteur_rpps);
  txt(c.produit as string, POS.produit, 9);
  txt(c.duree_perfusion as string, POS.duree);
  txt(c.nb_perfusions as string, POS.nb_perfusions);
  txt(c.frequence as string, POS.frequence);
  dateCases(isoToFr(c.date_debut), POS_DATE.debut);
  dateCases(isoToFr(c.date_fin), POS_DATE.fin);

  const voie = c.voie as string;
  if (voie && POS_VOIE[voie]) coche(POS_VOIE[voie]);
  const md = c.mode as string;
  if (md && POS_MODE[md]) coche(POS_MODE[md]);

  if (d.signature) {
    try {
      const png = await out.embedPng(d.signature);
      page.drawImage(png, { x: POS.signature.x, y: H - POS.signature.y, width: 95, height: 28 });
    } catch { /* */ }
  }

  const bytes = await out.save();
  const blob = new Blob([bytes as unknown as BlobPart], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  if (mode === "bloburl") return url;
  const a = document.createElement("a");
  a.href = url;
  a.download = "prescription-perfusion-domicile.pdf";
  a.click();
  URL.revokeObjectURL(url);
}
