"use client";

// Tutoriel immersif de première connexion : l'avatar-guide (adapté au
// profil) accompagne le patient sur les VRAIES pages de l'application —
// il apparaît tantôt en haut à droite, tantôt en bas à gauche, avec sa
// bulle, au fil d'une visite guidée. Se termine par le rappel du
// protocole puis la signature manuscrite du consentement RGPD (pavé de
// signature, comme la signature client des livraisons) : un PDF signé
// est généré et rangé dans le dossier patient.

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { usePatientSession } from "@/lib/hooks/useSession";
import { AvatarGuide } from "@/components/AvatarGuide";

type Row = {
  nom: string;
  operation: string | null;
  date_operation: string | null;
  duree_prise_en_charge: number | null;
  jours_suivi: number[] | null;
  traitement: string | null;
  rgpd_signe_le: string | null;
  date_naissance: string | null;
  sexe: string | null;
};

type Pos = "centre" | "haut-droite" | "haut-gauche" | "bas-droite" | "bas-gauche";

// `cible` : lien de la barre de navigation pointé par une flèche animée
// (le patient voit OÙ se trouve l'onglet pendant que la page s'affiche).
const VISITE: { route: string; pos: Pos; titre: string; texte: string; cible?: string }[] = [
  {
    route: "/patient", pos: "centre", titre: "Bienvenue sur AS2CŒUR",
    texte: "Je suis votre guide ! Votre application de suivi de soins à domicile — suivez-moi, je vous fais visiter en quelques écrans.",
  },
  {
    route: "/patient/mesure", pos: "bas-droite", titre: "Vos mesures",
    texte: "C'est ici que vous saisissez vos constantes (tension, température, saturation…) à l'aide de votre infirmière libérale. Tout est transmis à votre équipe.",
  },
  {
    route: "/patient/bilan", pos: "haut-droite", titre: "Votre bilan du jour",
    texte: "Les jours de suivi, ce court questionnaire « état général » vous est proposé automatiquement. Quelques clics suffisent.",
  },
  // Étapes avec flèche vers la navbar : bulle placée en HAUT pour laisser
  // la flèche et l'onglet ciblé bien visibles en bas (mobile).
  {
    route: "/patient/chat", pos: "haut-gauche", titre: "Votre infirmière", cible: "/patient/chat",
    texte: "Une question, un doute ? Écrivez à votre infirmière coordinatrice ici. La flèche vous montre l'onglet « Infirmière ».",
  },
  {
    route: "/patient/conseils", pos: "haut-droite", titre: "Conseils", cible: "/patient/conseils",
    texte: "Retrouvez à tout moment vos conseils de soins. La flèche vous montre l'onglet « Conseils ».",
  },
  {
    route: "/patient/profil", pos: "haut-gauche", titre: "Votre profil", cible: "/patient/profil",
    texte: "Ajoutez ici votre carte Vitale et votre mutuelle, et complétez vos coordonnées. La flèche vous montre l'onglet « Profil ».",
  },
];

const POS_CLS: Record<Pos, string> = {
  centre: "left-1/2 top-1/2 w-[calc(100vw-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2",
  "haut-droite": "right-3 top-16 w-[calc(100vw-2rem)] max-w-sm",
  "haut-gauche": "left-3 top-16 w-[calc(100vw-2rem)] max-w-sm",
  "bas-droite": "bottom-28 right-3 w-[calc(100vw-2rem)] max-w-sm md:bottom-8",
  "bas-gauche": "bottom-28 left-3 w-[calc(100vw-2rem)] max-w-sm md:bottom-8",
};

const fmtDate = (d: string | null) => (d ? new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" }) : "—");

export function TutoImmersif() {
  const patient = usePatientSession();
  const router = useRouter();
  const [row, setRow] = useState<Row | null>(null);
  const [show, setShow] = useState(false);
  const [step, setStep] = useState(0);
  const [nom, setNom] = useState("");
  const [accepte, setAccepte] = useState(false);
  const [busy, setBusy] = useState(false);

  // Pavé de signature (RGPD).
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dessine = useRef(false);
  const [vide, setVide] = useState(true);

  const stepProtocole = VISITE.length;      // avant-dernière étape
  const stepRgpd = VISITE.length + 1;       // dernière étape
  const total = VISITE.length + 2;

  useEffect(() => {
    if (!patient?.id) return;
    createClient().from("patient")
      .select("nom,operation,date_operation,duree_prise_en_charge,jours_suivi,traitement,rgpd_signe_le,date_naissance,sexe")
      .eq("id", patient.id).maybeSingle()
      .then(({ data }) => {
        const r = data as Row | null;
        setRow(r);
        setShow(!!r && !r.rgpd_signe_le);
        setNom(r?.nom ?? "");
      });
  }, [patient?.id]);

  // La visite navigue sur les vraies pages : on suit la route de l'étape.
  const routeRef = useRef<string | null>(null);
  useEffect(() => {
    if (!show) return;
    const route = step < VISITE.length ? VISITE[step].route : "/patient";
    if (routeRef.current !== route) {
      routeRef.current = route;
      router.push(route);
    }
  }, [show, step, router]);

  // Flèche vers l'onglet de la barre de navigation (mobile : nav du bas,
  // ordinateur : nav du haut). On mesure le lien VISIBLE correspondant.
  const [fleche, setFleche] = useState<{ x: number; y: number; bas: boolean } | null>(null);
  useEffect(() => {
    const cible = show && step < VISITE.length ? VISITE[step].cible : null;
    if (!cible) { setFleche(null); return; }
    let essais = 0;
    let stop = false;
    const mesurer = () => {
      if (stop) return;
      let el: Element | null = null;
      document.querySelectorAll(`nav a[href="${cible}"]`).forEach((l) => {
        const r = l.getBoundingClientRect();
        if (r.width > 0 && r.height > 0) el = l;
      });
      if (!el) { if (++essais < 10) setTimeout(mesurer, 150); return; }
      // L'onglet ciblé est « allumé ». La nav (position fixed) crée son
      // propre contexte d'empilement : il faut l'élever AU-DESSUS du voile,
      // sinon l'onglet reste assombri malgré son z-index.
      if (marque !== el) {
        marque?.classList.remove("tuto-cible");
        marqueNav?.classList.remove("tuto-cible-nav");
        (el as Element).classList.add("tuto-cible");
        marqueNav = (el as Element).closest("nav");
        marqueNav?.classList.add("tuto-cible-nav");
        marque = el;
      }
      const r = (el as Element).getBoundingClientRect();
      const bas = r.top > window.innerHeight / 2;
      setFleche({ x: r.left + r.width / 2, y: bas ? r.top : r.bottom, bas });
    };
    let marque: Element | null = null;
    let marqueNav: Element | null = null;
    mesurer();
    window.addEventListener("resize", mesurer);
    return () => {
      stop = true;
      marque?.classList.remove("tuto-cible");
      marqueNav?.classList.remove("tuto-cible-nav");
      window.removeEventListener("resize", mesurer);
    };
  }, [show, step]);

  // Initialisation du canvas de signature à l'étape RGPD.
  useEffect(() => {
    if (step !== stepRgpd) return;
    const c = canvasRef.current;
    if (!c) return;
    const ratio = window.devicePixelRatio || 1;
    const w = c.clientWidth, h = c.clientHeight;
    c.width = w * ratio; c.height = h * ratio;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    ctx.scale(ratio, ratio);
    ctx.lineWidth = 2.2; ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.strokeStyle = "#1e293b";
  }, [step, stepRgpd]);

  const pos = useCallback((e: React.PointerEvent) => {
    const r = canvasRef.current!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }, []);
  function down(e: React.PointerEvent) {
    e.preventDefault();
    const ctx = canvasRef.current?.getContext("2d"); if (!ctx) return;
    dessine.current = true; setVide(false);
    const { x, y } = pos(e); ctx.beginPath(); ctx.moveTo(x, y);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }
  function move(e: React.PointerEvent) {
    if (!dessine.current) return;
    const ctx = canvasRef.current?.getContext("2d"); if (!ctx) return;
    const { x, y } = pos(e); ctx.lineTo(x, y); ctx.stroke();
  }
  const up = () => { dessine.current = false; };
  function effacer() {
    const c = canvasRef.current; const ctx = c?.getContext("2d");
    if (c && ctx) ctx.clearRect(0, 0, c.width, c.height);
    setVide(true);
  }

  async function signer() {
    if (!accepte || !nom.trim() || vide || !canvasRef.current) return;
    setBusy(true);
    const res = await fetch("/api/patient/onboarding", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nom: nom.trim(), signature: canvasRef.current.toDataURL("image/png") }),
    });
    setBusy(false);
    if (res.ok) { setShow(false); router.push("/patient"); }
    else {
      const { message } = await res.json().catch(() => ({ message: "" }));
      alert(message || "Échec de l'enregistrement. Réessayez.");
    }
  }

  if (!show || !row) return null;

  const jours = (row.jours_suivi ?? []).slice().sort((a, b) => a - b);
  const enVisite = step < VISITE.length;
  const etape = enVisite ? VISITE[step] : null;

  const Progression = (
    <div className="flex justify-center gap-1.5">
      {Array.from({ length: total }).map((_, i) => (
        <span key={i} className={`h-1.5 rounded-full transition-all ${i === step ? "w-6 bg-brand" : i < step ? "w-3 bg-rose-300" : "w-3 bg-rose-100"}`} />
      ))}
    </div>
  );

  const Nav = (
    <div className="flex items-center justify-between gap-3">
      {step > 0 ? (
        <button onClick={() => setStep((s) => s - 1)} className="btn-secondary px-4 py-2 text-sm">Précédent</button>
      ) : <span />}
      {step < stepRgpd && (
        <button onClick={() => setStep((s) => s + 1)} className="btn-primary px-5 py-2 text-sm">
          {step === stepProtocole ? "J'ai compris" : "Suivant"}
        </button>
      )}
    </div>
  );

  return (
    <>
      {/* Animations du guide (apparition + flottement doux) */}
      <style>{`
        @keyframes tuto-pop { 0% { opacity: 0; transform: scale(.85) translateY(14px); } 100% { opacity: 1; transform: scale(1) translateY(0); } }
        @keyframes tuto-flotte { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-6px); } }
        @keyframes tuto-fleche { 0%, 100% { transform: translateX(-50%) translateY(0); } 50% { transform: translateX(-50%) translateY(var(--dy, 7px)); } }
        @keyframes tuto-lueur {
          0%, 100% { filter: drop-shadow(0 0 3px rgba(150, 20, 70, .9)) drop-shadow(0 0 10px rgba(150, 20, 70, .45)); }
          50% { filter: drop-shadow(0 0 7px rgba(150, 20, 70, 1)) drop-shadow(0 0 20px rgba(150, 20, 70, .75)); }
        }
        @keyframes tuto-pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(150, 20, 70, .5), 0 0 12px 2px rgba(150, 20, 70, .35); }
          50% { box-shadow: 0 0 0 8px rgba(150, 20, 70, 0), 0 0 22px 6px rgba(150, 20, 70, .55); }
        }
        .tuto-pop { animation: tuto-pop .45s cubic-bezier(.2,.9,.3,1.2) both; }
        .tuto-flotte { animation: tuto-flotte 3s ease-in-out infinite; }
        .tuto-fleche { animation: tuto-fleche 1s ease-in-out infinite; }
        .tuto-fleche svg { animation: tuto-lueur 1s ease-in-out infinite; }
        /* La nav qui contient l'onglet ciblé passe au-dessus du voile.
           SURTOUT pas de position:relative ici : la nav mobile est en
           position:fixed, la re-positionner la décroche du bas de l'écran. */
        .tuto-cible-nav {
          z-index: 56;
        }
        /* Onglet de navbar ciblé : icône + libellé en bordeaux, halo pulsant */
        .tuto-cible {
          position: relative;
          z-index: 56;
          color: #961446 !important;
          background: #fdf2f8;
          border-radius: .75rem;
          animation: tuto-pulse 1.2s ease-in-out infinite;
        }
      `}</style>

      {/* Voile léger : la vraie page reste visible, les clics sont captés par le tuto */}
      <div className="fixed inset-0 z-[55] bg-slate-900/25" />

      {/* Flèche animée vers l'onglet de la navbar (« c'est là que ça se trouve ») */}
      {fleche && (
        <div
          className="tuto-fleche pointer-events-none fixed z-[60]"
          style={
            fleche.bas
              ? ({ left: fleche.x, top: fleche.y - 48, "--dy": "7px" } as React.CSSProperties)
              : ({ left: fleche.x, top: fleche.y + 10, "--dy": "-7px" } as React.CSSProperties)
          }
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2.6}
            className={`h-9 w-9 text-brand drop-shadow-lg ${fleche.bas ? "" : "rotate-180"}`}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v14M6 12l6 6 6-6" />
          </svg>
        </div>
      )}

      {enVisite && etape ? (
        /* Positionnement sur le parent, animation sur l'enfant (key={step}) :
           l'animation redéfinit transform et écraserait le -translate-x-1/2
           du centrage si les deux étaient sur le même élément. */
        <div className={`fixed z-[60] ${POS_CLS[etape.pos]}`}>
          <div key={step} className="tuto-pop flex items-start gap-3">
            <span className="tuto-flotte shrink-0">
              <AvatarGuide dateNaissance={row.date_naissance} sexe={row.sexe} taille={64} />
            </span>
            <div className="relative min-w-0 flex-1 rounded-2xl rounded-tl-sm border border-rose-100 bg-white p-4 shadow-xl">
              <span className="absolute -left-[7px] top-4 h-3.5 w-3.5 rotate-45 border-b border-l border-rose-100 bg-white" />
              <div className="grid gap-2.5">
                <h2 className="text-base font-bold text-slate-800">{etape.titre}</h2>
                <p className="text-sm leading-relaxed text-slate-600">{etape.texte}</p>
                {Progression}
                {Nav}
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Étapes finales (protocole + RGPD) : panneau centré */
        <div className="fixed inset-0 z-[60] grid place-items-center p-4">
          <div key={step} className="tuto-pop flex max-h-[90vh] w-full max-w-md flex-col overflow-hidden rounded-3xl bg-white shadow-xl">
            <div className="grid justify-items-center gap-2 px-6 pt-5">
              <span className="tuto-flotte">
                <AvatarGuide dateNaissance={row.date_naissance} sexe={row.sexe} taille={64} />
              </span>
              {Progression}
            </div>

            <div className="grid flex-1 content-start gap-3 overflow-y-auto px-6 py-5">
              {step === stepProtocole && (
                <div className="text-left">
                  <h2 className="text-center text-xl font-bold text-slate-800">Votre protocole de suivi</h2>
                  <p className="mb-3 text-center text-sm text-slate-500">Voici ce qui est prévu pour vous.</p>
                  <dl className="grid gap-2 rounded-2xl border border-rose-100 bg-rose-50/40 p-4 text-sm">
                    {row.operation && <Ligne label="Intervention" value={row.operation} />}
                    <Ligne label={row.operation ? "Date d'opération" : "Début de prise en charge"} value={fmtDate(row.date_operation)} />
                    {row.duree_prise_en_charge != null && <Ligne label="Durée du suivi" value={`${row.duree_prise_en_charge} jour${row.duree_prise_en_charge > 1 ? "s" : ""}`} />}
                    {jours.length > 0 && <Ligne label="Jours de suivi" value={jours.map((j) => `J${j}`).join(" · ")} />}
                    {row.traitement && <Ligne label="Traitement" value={row.traitement} />}
                  </dl>
                  <p className="mt-3 text-center text-xs text-slate-400">Les jours de suivi, un bilan vous sera proposé automatiquement. En cas d&apos;anomalie, votre infirmière vous contactera.</p>
                </div>
              )}

              {step === stepRgpd && (
                <div className="text-left">
                  <h2 className="text-center text-xl font-bold text-slate-800">Protection de vos données</h2>
                  <div className="my-3 rounded-2xl border border-green-200 bg-green-50 p-3 text-center text-sm font-medium text-slate-700">
                    Vos données sont protégées et vues uniquement par votre équipe de soins.
                  </div>
                  <p className="text-sm leading-relaxed text-slate-500">
                    Vos données de santé sont collectées pour assurer votre suivi de soins à domicile, conformément au RGPD. Elles sont hébergées de façon sécurisée et ne sont accessibles qu&apos;aux professionnels de votre équipe de soins. Vous pouvez à tout moment exercer vos droits d&apos;accès, de rectification et de suppression auprès de votre prestataire.
                  </p>
                  <label className="mt-3 flex cursor-pointer items-start gap-2.5 text-sm text-slate-700">
                    <input type="checkbox" checked={accepte} onChange={(e) => setAccepte(e.target.checked)} className="mt-0.5 h-4 w-4 accent-brand" />
                    <span>J&apos;ai lu et j&apos;accepte la politique de confidentialité et le traitement de mes données de santé.</span>
                  </label>
                  <div className="mt-3">
                    <label className="label">Nom du signataire</label>
                    <input className="input" value={nom} onChange={(e) => setNom(e.target.value)} placeholder="Votre nom et prénom" />
                  </div>
                  <div className="mt-3">
                    <label className="label">Signez dans le cadre (au doigt ou à la souris)</label>
                    <canvas
                      ref={canvasRef}
                      className="h-36 w-full touch-none rounded-xl border border-rose-200 bg-white"
                      onPointerDown={down}
                      onPointerMove={move}
                      onPointerUp={up}
                      onPointerLeave={up}
                    />
                    <button type="button" onClick={effacer} className="mt-2 text-sm font-medium text-slate-500 hover:text-brand">
                      Effacer la signature
                    </button>
                  </div>
                  <p className="mt-2 text-xs text-slate-400">
                    Un PDF du consentement signé sera conservé dans votre dossier.
                  </p>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between gap-3 border-t border-rose-100 px-6 py-4">
              <button onClick={() => setStep((s) => s - 1)} className="btn-secondary px-4 py-2 text-sm">Précédent</button>
              {step === stepProtocole ? (
                <button onClick={() => setStep((s) => s + 1)} className="btn-primary px-5 py-2 text-sm">J&apos;ai compris</button>
              ) : (
                <button
                  onClick={signer}
                  disabled={!accepte || !nom.trim() || vide || busy}
                  className="btn-primary px-5 py-2 text-sm disabled:opacity-50"
                >
                  {busy ? "Validation…" : "Je signe et j'accède"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function Ligne({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-slate-400">{label}</dt>
      <dd className="text-right font-semibold text-slate-700">{value}</dd>
    </div>
  );
}
