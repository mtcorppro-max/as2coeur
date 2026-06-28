// Génération du PDF d'une ordonnance (avec signature) — partagé entre la
// fiche patient (OrdonnancesPatient) et le portail pharmacie.

import { genererPdfOrdonnance } from "@/lib/pdfOrdonnance";
import { genererPdfPerfusionDomicile } from "@/lib/pdfPerfusionDomicile";
import { genererPdfIdelPerf } from "@/lib/pdfIdelPerf";
import { genererPdfOrdoBS } from "@/lib/pdfOrdoBS";
import { genererPdfModele, CONFIGS } from "@/lib/ordoTemplates";

export type ProOrdo = { nom: string; prenom: string | null; titre: string | null; rpps: string | null; cabinets: string | null };
export type OrdoPdf = {
  type: string;
  titre: string;
  contenu: Record<string, unknown>;
  destinataire: ProOrdo | ProOrdo[] | null;
  signature: string | null;
  signataire_nom: string | null;
  signee_le: string | null;
  created_at: string;
};

const unPro = (o: OrdoPdf): ProOrdo | null => (Array.isArray(o.destinataire) ? o.destinataire[0] : o.destinataire) ?? null;

export async function genererPdfOrdo(
  o: OrdoPdf,
  patientNom: string,
  patientNaissance: string | null,
  mode: "download" | "bloburl"
) {
  const med = unPro(o);
  const dateFr = new Date(o.created_at).toLocaleDateString("fr-FR");
  if (o.type === "perfusion_domicile") {
    return genererPdfPerfusionDomicile({
      patientNom,
      patientNaissance,
      prescripteurNom: med?.nom ?? null,
      prescripteurPrenom: med?.prenom ?? null,
      prescripteurRpps: med?.rpps ?? null,
      prescripteurStructure: med?.cabinets ?? null,
      date: dateFr,
      contenu: o.contenu,
      signature: o.signature,
    }, mode);
  }
  const data = {
    patientNom,
    prescripteurNom: med?.nom ?? null,
    prescripteurPrenom: med?.prenom ?? null,
    prescripteurTitre: med?.titre ?? null,
    prescripteurRpps: med?.rpps ?? null,
    date: dateFr,
    contenu: o.contenu,
    signature: o.signature,
  };
  const GENS: Record<string, typeof genererPdfIdelPerf> = {
    idel_perf: genererPdfIdelPerf,
    ordo_bs: genererPdfOrdoBS,
  };
  if (GENS[o.type]) return GENS[o.type](data, mode);
  if (CONFIGS[o.type]) return genererPdfModele(o.type, data, mode);
  return genererPdfOrdonnance({
    type: o.type, titre: o.titre, contenu: o.contenu, patientNom,
    prescripteurNom: o.signataire_nom ?? "",
    signature: o.signature, signataireNom: o.signataire_nom, signeeLe: o.signee_le,
    date: dateFr,
  }, mode);
}
