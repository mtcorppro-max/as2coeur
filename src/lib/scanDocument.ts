// Détection des bords d'un document + correction de perspective (façon scanner),
// via OpenCV.js chargé à la demande. Renvoie un canvas redressé/recadré, ou null
// si aucun document net n'est détecté (→ on garde l'image entière).

/* eslint-disable @typescript-eslint/no-explicit-any */
const CV_URL = "https://docs.opencv.org/4.10.0/opencv.js";
let cvPromise: Promise<any> | null = null;

function chargerCv(): Promise<any> {
  if (cvPromise) return cvPromise;
  cvPromise = new Promise((resolve, reject) => {
    const w = window as any;
    const pret = () => {
      const cv = w.cv;
      if (cv && cv.Mat) return resolve(cv);
      if (cv && typeof cv === "object") { cv.onRuntimeInitialized = () => resolve(cv); return; }
      setTimeout(pret, 50);
    };
    if (w.cv && w.cv.Mat) return resolve(w.cv);
    const s = document.createElement("script");
    s.src = CV_URL; s.async = true;
    s.onload = pret;
    s.onerror = () => reject(new Error("opencv"));
    document.body.appendChild(s);
  });
  return cvPromise;
}

type Pt = { x: number; y: number };
const dist = (a: Pt, b: Pt) => Math.hypot(a.x - b.x, a.y - b.y);
function ordonner(pts: Pt[]): [Pt, Pt, Pt, Pt] {
  const s = [...pts].sort((a, b) => a.x + a.y - (b.x + b.y));
  const d = [...pts].sort((a, b) => a.x - a.y - (b.x - b.y));
  return [s[0], d[3], s[3], d[0]]; // TL, TR, BR, BL
}

export async function redresserDocument(srcCanvas: HTMLCanvasElement): Promise<HTMLCanvasElement | null> {
  let cv: any;
  try { cv = await chargerCv(); } catch { return null; }

  const mats: any[] = [];
  const m = (x: any) => { mats.push(x); return x; };
  try {
    const src = m(cv.imread(srcCanvas));
    const gray = m(new cv.Mat());
    cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);
    cv.GaussianBlur(gray, gray, new cv.Size(5, 5), 0);
    const edged = m(new cv.Mat());
    cv.Canny(gray, edged, 75, 200);
    const k = m(cv.Mat.ones(5, 5, cv.CV_8U));
    cv.dilate(edged, edged, k);

    const contours = m(new cv.MatVector());
    const hier = m(new cv.Mat());
    cv.findContours(edged, contours, hier, cv.RETR_LIST, cv.CHAIN_APPROX_SIMPLE);

    const imgArea = src.rows * src.cols;
    let quad: Pt[] | null = null;
    let bestArea = imgArea * 0.2; // au moins 20 % de l'image
    for (let i = 0; i < contours.size(); i++) {
      const c = contours.get(i);
      const peri = cv.arcLength(c, true);
      const approx = new cv.Mat();
      cv.approxPolyDP(c, approx, 0.02 * peri, true);
      if (approx.rows === 4) {
        const area = Math.abs(cv.contourArea(approx));
        if (area > bestArea) {
          bestArea = area;
          quad = [0, 1, 2, 3].map((j) => ({ x: approx.data32S[j * 2], y: approx.data32S[j * 2 + 1] }));
        }
      }
      approx.delete(); c.delete();
    }
    if (!quad) return null;

    const [tl, tr, br, bl] = ordonner(quad);
    const W = Math.round(Math.max(dist(tr, tl), dist(br, bl)));
    const H = Math.round(Math.max(dist(bl, tl), dist(br, tr)));
    if (W < 80 || H < 80) return null;

    const srcTri = m(cv.matFromArray(4, 1, cv.CV_32FC2, [tl.x, tl.y, tr.x, tr.y, br.x, br.y, bl.x, bl.y]));
    const dstTri = m(cv.matFromArray(4, 1, cv.CV_32FC2, [0, 0, W, 0, W, H, 0, H]));
    const M = m(cv.getPerspectiveTransform(srcTri, dstTri));
    const dst = m(new cv.Mat());
    cv.warpPerspective(src, dst, M, new cv.Size(W, H), cv.INTER_LINEAR, cv.BORDER_CONSTANT, new cv.Scalar());

    const out = document.createElement("canvas");
    cv.imshow(out, dst);
    return out;
  } catch {
    return null;
  } finally {
    mats.forEach((x) => { try { x.delete(); } catch { /* */ } });
  }
}
