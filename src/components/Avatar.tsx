// Pastille ronde réutilisable : photo si disponible, sinon initiales.
// Utilisée dans l'en-tête, le profil, l'équipe soignante et la PEC.

type Taille = "sm" | "md" | "lg";

const TAILLE: Record<Taille, string> = {
  sm: "h-8 w-8 text-[11px]",
  md: "h-11 w-11 text-sm",
  lg: "h-20 w-20 text-2xl",
};

export function Avatar({
  url,
  prenom,
  nom,
  taille = "md",
  className = "",
}: {
  url?: string | null;
  prenom?: string | null;
  nom?: string | null;
  taille?: Taille;
  className?: string;
}) {
  const initiales =
    `${prenom?.trim()?.[0] ?? ""}${nom?.trim()?.[0] ?? ""}`.toUpperCase() || "?";
  const base = `${TAILLE[taille]} shrink-0 rounded-full ${className}`;
  return url ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={url} alt="" className={`${base} border border-rose-100 object-cover`} />
  ) : (
    <span className={`${base} flex items-center justify-center bg-rose-100 font-bold text-brand`}>
      {initiales}
    </span>
  );
}
