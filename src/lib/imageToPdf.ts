// Convertit une image (photo) en PDF A4 (1 page), côté navigateur — façon « scan »,
// avec détection des bords + redressement de perspective si un document est repéré.
import { jsPDF } from "jspdf";
import { redresserDocument } from "./scanDocument";

const MAX_DIM = 1800; // borne la taille pour limiter le poids du PDF

// `recadrer` (défaut true) : tente la détection des bords + correction de perspective.
export async function imageEnPdf(file: File, recadrer = true): Promise<File> {
  // 1) charger l'image
  const dataUrl: string = await new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result as string);
    r.onerror = () => rej(new Error("lecture"));
    r.readAsDataURL(file);
  });
  const img: HTMLImageElement = await new Promise((res, rej) => {
    const i = new Image();
    i.onload = () => res(i);
    i.onerror = () => rej(new Error("decode"));
    i.src = dataUrl;
  });

  // 2) redessiner sur un canvas (downscale + fond blanc)
  const scale = Math.min(1, MAX_DIM / Math.max(img.naturalWidth, img.naturalHeight));
  const cw = Math.max(1, Math.round(img.naturalWidth * scale));
  const ch = Math.max(1, Math.round(img.naturalHeight * scale));
  let canvas = document.createElement("canvas");
  canvas.width = cw; canvas.height = ch;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas");
  ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, cw, ch);
  ctx.drawImage(img, 0, 0, cw, ch);

  // 2bis) détection des bords + redressement (si un document est trouvé)
  if (recadrer) {
    try { const redresse = await redresserDocument(canvas); if (redresse) canvas = redresse; } catch { /* repli image entière */ }
  }

  const jpeg = canvas.toDataURL("image/jpeg", 0.85);
  const cw2 = canvas.width, ch2 = canvas.height;

  // 3) placer l'image, cadrée, sur une page A4 (orientation selon le ratio)
  const portrait = ch2 >= cw2;
  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: portrait ? "portrait" : "landscape" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const m = 8;
  const ratio = Math.min((pageW - m * 2) / cw2, (pageH - m * 2) / ch2);
  const dw = cw2 * ratio, dh = ch2 * ratio;
  doc.addImage(jpeg, "JPEG", (pageW - dw) / 2, (pageH - dh) / 2, dw, dh);

  const blob = doc.output("blob");
  const base = file.name.replace(/\.[^.]+$/, "").trim() || "justificatif";
  return new File([blob], `${base}.pdf`, { type: "application/pdf" });
}
