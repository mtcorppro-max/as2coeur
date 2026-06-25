const ROSE: [number, number, number] = [190, 24, 93];
const GRIS: [number, number, number] = [90, 90, 90];
const NOIR: [number, number, number] = [40, 40, 40];

export type ConsignesData = {
  titre: string;
  prenom: string;
  nom: string;
  specialite: string;
  telephone: string;
  cabinets: string;
  secretariat_nom: string;
  secretariat_email: string;
  secretariat_tel: string;
  duree_prise_en_charge: string;
  jours_suivi: number[];
  molecules: { nom: string; posologie: string }[];
  pansement: boolean;
  pansement_detail: string;
  cryotherapie: boolean;
  cryotherapie_duree: string;
  cryotherapie_machine: string;
  envoi_ordo: string[];
  pharmacie_per_os: boolean;
  medicaments_per_os: { nom: string; posologie: string }[];
  materiel: boolean;
  materiel_paramedical: string;
  protocole: string;
};

// Charge le logo AS2CŒUR (PNG transparent) en data-URL.
async function chargerLogo(): Promise<string | null> {
  try {
    const res = await fetch("/as2coeur-logo.png");
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise<string>((resolve) => {
      const fr = new FileReader();
      fr.onload = () => resolve(fr.result as string);
      fr.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

// Génère et télécharge le PDF des consignes d'un médecin / chirurgien.
export async function genererPdfConsignes(
  d: ConsignesData,
  mode: "download" | "bloburl" = "download"
): Promise<string | void> {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const M = 15;
  const L = 210 - M * 2;

  // ── En-tête ───────────────────────────────────────────────────────
  const logo = await chargerLogo();
  if (logo) {
    try {
      doc.addImage(logo, "PNG", M, 10, 52, 12);
    } catch {
      /* format non supporté */
    }
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(...NOIR);
  doc.text("Consignes prescripteur", 210 - M, 16, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...GRIS);
  doc.text(
    `Établi le ${new Date().toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" })}`,
    210 - M,
    21,
    { align: "right" }
  );

  let y = 30;
  doc.setDrawColor(...ROSE);
  doc.setLineWidth(0.4);
  doc.line(M, y, 210 - M, y);
  y += 9;

  // Nom du médecin
  const nomComplet = [d.titre, d.prenom, d.nom.toUpperCase()].filter(Boolean).join(" ");
  doc.setFont("times", "bold");
  doc.setFontSize(18);
  doc.setTextColor(...NOIR);
  doc.text(nomComplet || "—", 105, y, { align: "center" });
  y += 6;
  if (d.specialite) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(...GRIS);
    doc.text(d.specialite, 105, y, { align: "center" });
    y += 6;
  }
  y += 3;

  // ── Helpers ───────────────────────────────────────────────────────
  const sautSiBesoin = (besoin: number) => {
    if (y + besoin > 285) {
      doc.addPage();
      y = M;
    }
  };

  const bandeau = (titre: string) => {
    sautSiBesoin(16);
    doc.setFillColor(...ROSE);
    doc.rect(M, y, L, 7, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(255, 255, 255);
    doc.text(titre, 105, y + 4.8, { align: "center" });
    y += 11;
  };

  const ligne = (label: string, valeur: string) => {
    if (!valeur || !valeur.trim()) return;
    sautSiBesoin(6);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(...GRIS);
    doc.text(label, M, y);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...NOIR);
    const wrapped = doc.splitTextToSize(valeur, L - 45);
    doc.text(wrapped, M + 45, y);
    y += Math.max(wrapped.length * 5, 5.5);
  };

  const paragraphe = (texte: string) => {
    if (!texte || !texte.trim()) return;
    sautSiBesoin(8);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(...NOIR);
    const wrapped = doc.splitTextToSize(texte, L);
    doc.text(wrapped, M, y);
    y += wrapped.length * 5 + 2;
  };

  const listeMolecules = (items: { nom: string; posologie: string }[]) => {
    items.forEach((m) => {
      if (!m.nom) return;
      sautSiBesoin(6);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(...ROSE);
      doc.text("•", M, y);
      doc.setTextColor(...NOIR);
      doc.text(m.nom, M + 4, y);
      if (m.posologie) {
        doc.setFont("helvetica", "normal");
        doc.setTextColor(...GRIS);
        const wrapped = doc.splitTextToSize(m.posologie, L - 55);
        doc.text(wrapped, M + 55, y);
        y += Math.max(wrapped.length * 5, 5.5);
      } else {
        y += 5.5;
      }
    });
  };

  // ── Coordonnées ───────────────────────────────────────────────────
  bandeau("COORDONNÉES");
  ligne("Téléphone :", d.telephone);
  ligne("Cabinet(s) :", d.cabinets);
  if (!d.telephone && !d.cabinets) paragraphe("—");

  // ── Secrétariat ───────────────────────────────────────────────────
  if (d.secretariat_nom || d.secretariat_email || d.secretariat_tel) {
    bandeau("SECRÉTARIAT");
    ligne("Nom :", d.secretariat_nom);
    ligne("Email :", d.secretariat_email);
    ligne("Téléphone :", d.secretariat_tel);
  }

  // ── Prise en charge ───────────────────────────────────────────────
  bandeau("PRISE EN CHARGE");
  ligne("Durée :", d.duree_prise_en_charge ? `${d.duree_prise_en_charge} jours` : "");
  ligne("Jours de suivi :", d.jours_suivi.length ? d.jours_suivi.map((j) => `J${j}`).join(", ") : "");
  if (!d.duree_prise_en_charge && !d.jours_suivi.length) paragraphe("—");

  // ── Molécules IV ──────────────────────────────────────────────────
  if (d.molecules.length) {
    bandeau("MOLÉCULES PRESCRITES (IV)");
    listeMolecules(d.molecules);
  }

  // ── Médicaments Per os ────────────────────────────────────────────
  if (d.pharmacie_per_os && d.medicaments_per_os.length) {
    bandeau("MÉDICAMENTS PER OS À COMMANDER EN PHARMACIE");
    listeMolecules(d.medicaments_per_os);
  }

  // ── Pansement / Cryothérapie / Envoi / Matériel ───────────────────
  const aSoins =
    d.pansement || d.cryotherapie || d.envoi_ordo.length || d.materiel;
  if (aSoins) {
    bandeau("SOINS & LOGISTIQUE");
    if (d.pansement) ligne("Pansement :", d.pansement_detail || "Oui");
    if (d.cryotherapie) {
      const cryo = [d.cryotherapie_machine, d.cryotherapie_duree ? `prêt ${d.cryotherapie_duree}` : ""]
        .filter(Boolean)
        .join(" — ");
      ligne("Cryothérapie :", cryo || "Oui");
    }
    if (d.envoi_ordo.length) {
      const cibles = d.envoi_ordo
        .map((c) => (c === "secretariat" ? "Secrétariat" : c === "medecin" ? "Médecin" : c))
        .join(" et ");
      ligne("Envoi Ordo/CR :", cibles);
    }
    if (d.materiel) ligne("Matériel :", d.materiel_paramedical || "Oui");
  }

  // ── Autres consignes ──────────────────────────────────────────────
  if (d.protocole && d.protocole.trim()) {
    bandeau("AUTRES CONSIGNES");
    paragraphe(d.protocole);
  }

  // ── Sortie ────────────────────────────────────────────────────────
  if (mode === "bloburl") {
    return doc.output("bloburl") as unknown as string;
  }
  const nomFichier = `consignes-${(d.nom || "medecin").replace(/\s+/g, "-").toLowerCase()}.pdf`;
  doc.save(nomFichier);
}
