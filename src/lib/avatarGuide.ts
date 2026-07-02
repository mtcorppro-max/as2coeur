// Avatar-guide du parcours patient : personnage illustré correspondant au
// profil (âge x sexe), fixe et non conversationnel. Les illustrations sont
// dans public/avatars-guide/ (pastilles rondes, palette AS2CŒUR).

export type SexePatient = "feminin" | "masculin";

export const ageDe = (dateNaissance: string | null | undefined): number | null => {
  if (!dateNaissance) return null;
  const d = new Date(dateNaissance);
  if (isNaN(d.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  if (now.getMonth() < d.getMonth() || (now.getMonth() === d.getMonth() && now.getDate() < d.getDate())) age--;
  return age;
};

// Tranches : enfant 0-11 · ado 12-17 · adulte 18-64 · senior 65+.
// Sans sexe renseigné → null (l'avatar neutre AS2CŒUR est affiché).
// Sans date de naissance mais avec sexe → adulte.
export function avatarGuide(dateNaissance: string | null | undefined, sexe: string | null | undefined): string | null {
  if (sexe !== "feminin" && sexe !== "masculin") return null;
  const age = ageDe(dateNaissance) ?? 30;
  const f = sexe === "feminin";
  const nom =
    age < 12 ? (f ? "fille" : "garcon")
    : age < 18 ? (f ? "ado-fille" : "ado-garcon")
    : age < 65 ? (f ? "femme" : "homme")
    : f ? "senior-femme" : "senior-homme";
  return `/avatars-guide/${nom}.png`;
}

// Messages d'encouragement scriptés (affichés à la complétion d'une action).
const ENCOURAGEMENTS = [
  "Bravo, c'est bien enregistré ! Votre équipe garde un œil sur vous.",
  "C'est noté ! Chaque information aide votre équipe à mieux vous suivre.",
  "Très bien ! Continuez comme ça, vous êtes entre de bonnes mains.",
  "Parfait, c'est transmis à votre équipe de soins.",
  "Bien joué ! Votre suivi est à jour.",
];
export const encouragement = () => ENCOURAGEMENTS[Math.floor(Math.random() * ENCOURAGEMENTS.length)];

// Rappel des documents manquants (carte Vitale, mutuelle…), formulé par
// l'avatar avec un ton adapté à l'âge du patient : tutoiement complice
// pour les jeunes, vouvoiement pour les adultes et les seniors.
export function rappelDocuments(dateNaissance: string | null | undefined, manquants: string[]): string {
  const age = ageDe(dateNaissance);
  if (age != null && age < 18) {
    const liste = manquants.map((m) => `ta ${m}`).join(" et ");
    return `Eh ! N'oublie pas d'ajouter ${liste} dans ton profil — promis, c'est rapide.`;
  }
  const liste = manquants.map((m) => `votre ${m}`).join(" et ");
  if (age != null && age >= 65) {
    return `N'oubliez pas d'ajouter ${liste} — appuyez ici, je vous emmène au bon endroit.`;
  }
  return `Pensez à ajouter ${liste} dans votre profil pour faciliter votre prise en charge.`;
}
