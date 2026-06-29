"use client";

import { useEffect, useRef, useState } from "react";

// Pavé de signature manuscrite (au doigt / souris). Renvoie l'image (data URL).
export function SignaturePad({
  onValider,
  onAnnuler,
}: {
  onValider: (image: string, nom: string) => void;
  onAnnuler: () => void;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const dessine = useRef(false);
  const [vide, setVide] = useState(true);
  const [nom, setNom] = useState("");

  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    // Résolution interne nette (retina).
    const ratio = window.devicePixelRatio || 1;
    const w = c.clientWidth, h = c.clientHeight;
    c.width = w * ratio; c.height = h * ratio;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    ctx.scale(ratio, ratio);
    ctx.lineWidth = 2.2; ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.strokeStyle = "#1e293b";
  }, []);

  function pos(e: React.PointerEvent) {
    const c = ref.current!;
    const r = c.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }
  function down(e: React.PointerEvent) {
    e.preventDefault();
    const ctx = ref.current?.getContext("2d"); if (!ctx) return;
    dessine.current = true; setVide(false);
    const { x, y } = pos(e); ctx.beginPath(); ctx.moveTo(x, y);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }
  function move(e: React.PointerEvent) {
    if (!dessine.current) return;
    const ctx = ref.current?.getContext("2d"); if (!ctx) return;
    const { x, y } = pos(e); ctx.lineTo(x, y); ctx.stroke();
  }
  function up() { dessine.current = false; }

  function effacer() {
    const c = ref.current; const ctx = c?.getContext("2d");
    if (c && ctx) ctx.clearRect(0, 0, c.width, c.height);
    setVide(true);
  }
  function valider() {
    if (vide || !ref.current) return;
    onValider(ref.current.toDataURL("image/png"), nom.trim());
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onAnnuler}>
      <div className="card grid w-full max-w-md gap-3" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-sm font-semibold text-slate-700">Signature du patient</h2>
        <input className="input" placeholder="Nom du signataire" value={nom} onChange={(e) => setNom(e.target.value)} />
        <canvas
          ref={ref}
          className="h-44 w-full touch-none rounded-xl border border-rose-200 bg-white"
          onPointerDown={down}
          onPointerMove={move}
          onPointerUp={up}
          onPointerLeave={up}
        />
        <div className="flex flex-wrap gap-2">
          <button onClick={effacer} className="btn-secondary px-3 py-2 text-sm">Effacer</button>
          <button onClick={onAnnuler} className="btn-secondary flex-1 py-2 text-sm">Annuler</button>
          <button onClick={valider} disabled={vide} className="btn-primary flex-1 py-2 text-sm disabled:opacity-50">Valider la livraison</button>
        </div>
      </div>
    </div>
  );
}
