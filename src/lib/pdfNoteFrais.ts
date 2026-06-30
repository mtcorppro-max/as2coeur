// PDF récapitulatif d'une note de frais (pour la comptabilité).
import { jsPDF } from "jspdf";
import { libDepense } from "./notesFrais";

export type LignePdf = { type: string; description: string | null; date_depense: string | null; montant_ttc: number; montant_ht: number | null; est_avantage_ps?: boolean; beneficiaire_nom?: string | null };
export type NotePdf = {
  titre: string; emetteur: string; statut: string; periode_debut: string | null; periode_fin: string | null;
  total_ttc: number; total_ht: number; lignes: LignePdf[];
};

const fmt = (n: number) => Number(n || 0).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const d = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("fr-FR") : "");

export function genererPdfNoteFrais(n: NotePdf) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const M = 14;
  let y = 16;
  doc.setFont("helvetica", "bold"); doc.setFontSize(15); doc.setTextColor(30, 41, 59);
  doc.text("Note de frais", M, y);
  doc.setFontSize(12); doc.setTextColor(150, 20, 70);
  doc.text(n.titre, M, (y += 7));
  doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(110, 110, 120);
  const periode = [d(n.periode_debut), n.periode_fin ? d(n.periode_fin) : ""].filter(Boolean).join(" → ");
  doc.text(`${n.emetteur}${periode ? ` — ${periode}` : ""} — statut : ${n.statut} — édité le ${new Date().toLocaleDateString("fr-FR")}`, M, (y += 6));

  // En-têtes de colonnes
  y += 8;
  doc.setFont("helvetica", "bold"); doc.setFontSize(9); doc.setTextColor(120, 120, 130);
  doc.text("Date", M, y);
  doc.text("Type", M + 24, y);
  doc.text("Description", M + 56, y);
  doc.text("HT", 168, y, { align: "right" });
  doc.text("TTC", 196, y, { align: "right" });
  doc.setDrawColor(230, 210, 220); doc.line(M, y + 1.5, 196, y + 1.5);

  doc.setFont("helvetica", "normal"); doc.setTextColor(40, 40, 50); doc.setFontSize(9);
  y += 6;
  for (const l of n.lignes) {
    if (y > 275) { doc.addPage(); y = 18; }
    doc.text(d(l.date_depense), M, y);
    doc.text(libDepense(l.type), M + 24, y);
    const desc = (l.description ?? "") + (l.est_avantage_ps ? ` [avantage PS${l.beneficiaire_nom ? ` : ${l.beneficiaire_nom}` : ""}]` : "");
    doc.text(doc.splitTextToSize(desc, 105)[0] ?? "", M + 56, y);
    doc.text(l.montant_ht != null ? fmt(l.montant_ht) : "—", 168, y, { align: "right" });
    doc.text(fmt(l.montant_ttc), 196, y, { align: "right" });
    y += 5.5;
  }

  doc.setDrawColor(230, 210, 220); doc.line(M, y, 196, y);
  y += 6;
  doc.setFont("helvetica", "bold"); doc.setFontSize(10); doc.setTextColor(30, 41, 59);
  doc.text(`Total HT : ${fmt(n.total_ht)} €`, 196, y, { align: "right" });
  doc.text(`Total TTC : ${fmt(n.total_ttc)} €`, 196, (y += 6), { align: "right" });

  doc.save(`note-de-frais-${n.titre.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.pdf`);
}
