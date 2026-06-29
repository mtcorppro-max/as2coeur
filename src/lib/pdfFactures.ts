// PDF d'archivage interne de la facturation prévisionnelle (tableau).
import { jsPDF } from "jspdf";

export type FactureExport = {
  date: string; patient: string; medecin: string;
  base: number; secu: number; mutuelle: number; patient_part: number;
  statut: string; ref: string;
};

const fmt = (n: number) => n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const LABEL: Record<string, string> = { a_facturer: "À facturer", envoyee: "Envoyée", payee: "Payée", annulee: "Annulée" };

export function genererPdfFactures(rows: FactureExport[], sousTitre: string) {
  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "landscape" });
  const M = 10;
  doc.setFont("helvetica", "bold"); doc.setFontSize(14); doc.setTextColor(30, 41, 59);
  doc.text("Facturation prévisionnelle Sécu", M, 14);
  doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(120, 120, 130);
  doc.text(`${sousTitre} — édité le ${new Date().toLocaleDateString("fr-FR")} — outil prévisionnel (non officiel)`, M, 20);

  const cols = [
    { t: "Date", x: M, w: 22 },
    { t: "Patient", x: M + 22, w: 50 },
    { t: "Médecin", x: M + 72, w: 50 },
    { t: "Base €", x: M + 122, w: 26, r: true },
    { t: "Sécu €", x: M + 148, w: 26, r: true },
    { t: "Mut. €", x: M + 174, w: 24, r: true },
    { t: "Patient €", x: M + 198, w: 24, r: true },
    { t: "Statut", x: M + 222, w: 24 },
    { t: "N° réf", x: M + 246, w: 30 },
  ];
  let y = 30;
  const tete = () => {
    doc.setFont("helvetica", "bold"); doc.setFontSize(8); doc.setTextColor(30, 41, 59);
    cols.forEach((c) => doc.text(c.t, c.r ? c.x + c.w - 2 : c.x, y, { align: c.r ? "right" : "left" }));
    doc.setDrawColor(220, 220, 225); doc.line(M, y + 1.5, M + 276, y + 1.5);
    y += 5;
  };
  tete();
  doc.setFont("helvetica", "normal"); doc.setTextColor(40, 40, 45);
  let tB = 0, tS = 0, tM = 0, tP = 0;
  for (const r of rows) {
    if (y > 195) { doc.addPage(); y = 16; tete(); doc.setFont("helvetica", "normal"); }
    const cells = [r.date, r.patient.slice(0, 32), r.medecin.slice(0, 32), fmt(r.base), fmt(r.secu), fmt(r.mutuelle), fmt(r.patient_part), LABEL[r.statut] ?? r.statut, (r.ref || "").slice(0, 18)];
    doc.setFontSize(8);
    cells.forEach((v, i) => doc.text(String(v), cols[i].r ? cols[i].x + cols[i].w - 2 : cols[i].x, y, { align: cols[i].r ? "right" : "left" }));
    y += 4.6;
    tB += r.base; tS += r.secu; tM += r.mutuelle; tP += r.patient_part;
  }
  doc.setDrawColor(220, 220, 225); doc.line(M, y, M + 276, y); y += 4.5;
  doc.setFont("helvetica", "bold"); doc.setFontSize(8.5);
  doc.text(`TOTAL (${rows.length})`, M, y);
  doc.text(fmt(tB), cols[3].x + cols[3].w - 2, y, { align: "right" });
  doc.text(fmt(tS), cols[4].x + cols[4].w - 2, y, { align: "right" });
  doc.text(fmt(tM), cols[5].x + cols[5].w - 2, y, { align: "right" });
  doc.text(fmt(tP), cols[6].x + cols[6].w - 2, y, { align: "right" });

  doc.save("factures-previsionnelles.pdf");
}
