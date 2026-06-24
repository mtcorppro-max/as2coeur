import type { Patient, Suivi } from "@/lib/types";

function fdate(iso: string | null): string {
  if (!iso) return "—";
  const d = iso.length > 10 ? new Date(iso) : null;
  if (d && !isNaN(d.getTime())) {
    return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });
  }
  const [a, m, j] = iso.split("-");
  return j && m && a ? `${j}/${m}/${a}` : iso;
}

// Génère et télécharge le PDF d'une fiche de suivi.
// jsPDF est chargé dynamiquement (uniquement au clic) pour alléger la fiche.
export async function genererPdfSuivi(patient: Patient, s: Suivi) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const marge = 18;
  const largeur = 210 - marge * 2;
  let y = marge;

  const rose: [number, number, number] = [190, 24, 93];
  const gris: [number, number, number] = [90, 90, 90];

  // ── En-tête ──
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(...rose);
  doc.text("Fiche de suivi", marge, y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...gris);
  doc.text("SoignantCoco", 210 - marge, y, { align: "right" });
  y += 7;
  doc.setDrawColor(...rose);
  doc.setLineWidth(0.4);
  doc.line(marge, y, 210 - marge, y);
  y += 8;

  // ── Bloc patient ──
  doc.setTextColor(30, 30, 30);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text(patient.nom, marge, y);
  y += 6;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...gris);
  const adresse = [patient.adresse, [patient.code_postal, patient.ville].filter(Boolean).join(" ")]
    .filter(Boolean)
    .join(", ");
  const infos: string[] = [];
  if (patient.telephone) infos.push(`Tél. : ${patient.telephone}`);
  if (adresse) infos.push(`Adresse : ${adresse}`);
  if (patient.date_naissance) infos.push(`Né(e) le : ${fdate(patient.date_naissance)}`);
  infos.forEach((t) => {
    doc.text(t, marge, y);
    y += 5;
  });

  const op = patient.operation || patient.chirurgien || patient.date_operation;
  if (op) {
    const parts: string[] = [];
    if (patient.operation) parts.push(patient.operation);
    if (patient.date_operation) parts.push(`le ${fdate(patient.date_operation)}`);
    if (patient.chirurgien) parts.push(`par ${patient.chirurgien}`);
    doc.text(`Opération : ${parts.join(" ")}`, marge, y);
    y += 5;
  }

  doc.setTextColor(...rose);
  doc.text(`Suivi du ${fdate(s.created_at)}${s.auteur_nom ? ` — ${s.auteur_nom}` : ""}`, marge, y);
  y += 8;

  // ── Champs du suivi ──
  const lignes: [string, string | null][] = [
    ["État général", s.etat_general],
    ["Constantes", [
      s.ta ? `TA : ${s.ta}` : null,
      s.pouls ? `Pouls : ${s.pouls}` : null,
      s.temperature ? `T° : ${s.temperature}` : null,
      s.spo2 ? `SpO2 : ${s.spo2}` : null,
    ].filter(Boolean).join("    ") || null],
    ["Douleur (EN)", s.douleur_en],
    ["Alimentation", s.alimentation],
    ["Hydratation", s.hydratation],
    ["Transit", s.transit],
    ["Cicatrisation", s.cicatrisation],
    ["Mobilisation", s.mobilisation],
    ["Bilan sanguin", s.bilan_sanguin],
  ];

  lignes.forEach(([label, valeur]) => {
    if (y > 270) {
      doc.addPage();
      y = marge;
    }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(...rose);
    doc.text(label.toUpperCase(), marge, y);
    y += 5;

    doc.setFont("helvetica", "normal");
    doc.setTextColor(30, 30, 30);
    const texte = valeur && valeur.trim() ? valeur : "—";
    const wrapped = doc.splitTextToSize(texte, largeur);
    doc.text(wrapped, marge, y);
    y += wrapped.length * 5 + 4;
  });

  const nomFichier = `suivi-${patient.nom.replace(/\s+/g, "-").toLowerCase()}-${fdate(s.created_at).replace(/\//g, "-")}.pdf`;
  doc.save(nomFichier);
}
