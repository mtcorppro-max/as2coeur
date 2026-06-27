import { ouvrirTemplate, nomPrescripteur, frDate, type DocOrdoData, type Pt } from "@/lib/pdfOverlay";

const TEMPLATE = "/IDEL%20Perf.pdf";

const POS_VOIE: Record<string, Pt> = {
  "Périphérique": { x: 106, y: 460 },
  "PICC-line": { x: 200, y: 460 },
  "Cathéter central": { x: 272, y: 460 },
  "Chambre Implantable": { x: 360, y: 460 },
  "Sous cutanée": { x: 17, y: 484 },
};
const POS_MODE: Record<string, Pt> = {
  "Pompe en continu ou discontinu": { x: 14, y: 532 },
  "Diffuseur": { x: 189, y: 532 },
  "Gravité": { x: 267, y: 532 },
  "Pousse seringue électrique": { x: 368, y: 532 },
};

export async function genererPdfIdelPerf(d: DocOrdoData, mode: "download" | "bloburl" = "download"): Promise<string | void> {
  const { txt, coche, signer, finaliser } = await ouvrirTemplate(TEMPLATE);
  const c = d.contenu;

  txt(nomPrescripteur(d), { x: 65, y: 172 });
  if (d.prescripteurRpps) txt(`RPPS ${d.prescripteurRpps}`, { x: 65, y: 190 }, 8);
  txt(d.patientNom, { x: 215, y: 262 });
  txt(d.date || new Date().toLocaleDateString("fr-FR"), { x: 118, y: 332 });
  txt(frDate(c.date_debut_soins), { x: 135, y: 343 });

  const voie = c.voie as string;
  if (voie && POS_VOIE[voie]) coche(POS_VOIE[voie]);
  const md = c.mode as string;
  if (md && POS_MODE[md]) coche(POS_MODE[md]);

  txt(c.perfusion_1, { x: 100, y: 567 });
  txt(c.perfusion_2, { x: 100, y: 602 });
  txt(c.duree_jours, { x: 94, y: 682 });

  await signer(d.signature, { x: 335, y: 738 });
  return finaliser(mode, "ordonnance-idel.pdf");
}
