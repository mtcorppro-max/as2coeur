"use client";

// Avatar-guide fixe du parcours patient : le personnage correspond au profil
// (âge x sexe) et « parle » via une bulle scriptée (non conversationnel).
// Sans sexe renseigné : pastille neutre AS2CŒUR (cœur bordeaux).

/* eslint-disable @next/next/no-img-element */
import { avatarGuide } from "@/lib/avatarGuide";

export function AvatarGuide({
  dateNaissance,
  sexe,
  taille = 64,
  bulle,
  className = "",
}: {
  dateNaissance: string | null | undefined;
  sexe: string | null | undefined;
  taille?: number;
  bulle?: React.ReactNode;
  className?: string;
}) {
  const src = avatarGuide(dateNaissance, sexe);
  const avatar = src ? (
    <img
      src={src}
      alt="Votre guide AS2CŒUR"
      width={taille}
      height={taille}
      className="shrink-0 select-none rounded-full shadow-sm"
      style={{ width: taille, height: taille }}
    />
  ) : (
    // Avatar neutre : pastille bordeaux avec cœur (aucune donnée requise).
    <span
      className="grid shrink-0 select-none place-items-center rounded-full bg-brand shadow-sm"
      style={{ width: taille, height: taille }}
      aria-label="Votre guide AS2CŒUR"
    >
      <svg viewBox="0 0 24 24" fill="white" style={{ width: taille * 0.5, height: taille * 0.5 }}>
        <path d="M12 21c-.4 0-.8-.14-1.1-.42C7.14 17.23 3 13.7 3 9.6 3 6.5 5.42 4 8.4 4c1.4 0 2.73.58 3.6 1.53A4.9 4.9 0 0 1 15.6 4C18.58 4 21 6.5 21 9.6c0 4.1-4.14 7.63-7.9 10.98-.3.28-.7.42-1.1.42Z" />
      </svg>
    </span>
  );

  if (!bulle) return <span className={className}>{avatar}</span>;

  return (
    <div className={`flex items-start gap-3 ${className}`}>
      {avatar}
      <div className="relative min-w-0 flex-1 rounded-2xl rounded-tl-sm border border-rose-100 bg-white p-3.5 shadow-sm">
        {/* Pointe de la bulle vers l'avatar */}
        <span className="absolute -left-[7px] top-4 h-3.5 w-3.5 rotate-45 border-b border-l border-rose-100 bg-white" />
        {bulle}
      </div>
    </div>
  );
}
