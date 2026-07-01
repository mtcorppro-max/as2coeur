// Couverture de la prise en charge par les ordonnances.
// La période à couvrir va du 1er jour indiqué sur les ordonnances (ou, à défaut,
// la date de début de PEC) jusqu'à aujourd'hui. Chaque ordonnance couvre une
// (ou plusieurs) fenêtre(s) : dates de cure explicites (PERFADOM : date début /
// date fin de la cure) ou date + durée (forfaits NEAD, QSP, « ordonnance pour X
// jours/mois »…). On en déduit les périodes NON couvertes (→ pastille FAE).

export type OrdoCouv = { type: string; titre: string; contenu: Record<string, unknown>; created_at: string };
export type Fenetre = { debut: Date; fin: Date; source: string };
export type Trou = { debut: Date; fin: Date };

const jour = 86_400_000;
const addDays = (d: Date, n: number) => new Date(d.getTime() + n * jour);
const dateOnly = (d: Date) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
const parseDate = (v: unknown): Date | null => {
  if (!v) return null;
  const d = new Date(String(v));
  return isNaN(d.getTime()) ? null : dateOnly(d);
};

// « 180 jours », « 6 mois », « 3 semaines », ou un nombre (jours) → nombre de jours.
export function parseDuree(v: unknown): number | null {
  if (v == null || v === "") return null;
  const s = String(v).toLowerCase().replace(",", ".");
  const m = s.match(/(\d+(?:\.\d+)?)\s*(mois|semaines?|jours?|j\b)?/);
  if (!m) return null;
  const n = parseFloat(m[1]);
  if (!n) return null;
  const u = m[2] ?? "";
  const fac = u.startsWith("mois") ? 30 : u.startsWith("semaine") ? 7 : 1;
  return Math.round(n * fac);
}

// Fenêtres de couverture d'une ordonnance.
export function fenetresOrdo(o: OrdoCouv): Fenetre[] {
  const c = o.contenu ?? {};
  const out: Fenetre[] = [];
  const paire = (d1: unknown, d2: unknown) => {
    const a = parseDate(d1), b = parseDate(d2);
    if (a && b && b >= a) out.push({ debut: a, fin: b, source: o.titre });
  };
  // PERFADOM : cures avec dates explicites (produit à perfuser n°1 et n°2).
  paire(c.date_debut, c.date_fin);
  paire(c.date_debut2, c.date_fin2);
  // IDEL soins de perfusion : date de début + durée en jours.
  if (c.date_debut_soins && c.duree_jours) {
    const s = parseDate(c.date_debut_soins); const n = parseDuree(c.duree_jours);
    if (s && n) out.push({ debut: s, fin: addDays(s, n - 1), source: o.titre });
  }
  // À défaut : date de l'ordonnance + durée (forfait NEAD, QSP, ordonnance pour X…).
  if (!out.length) {
    const s = parseDate(c.date_debut) ?? parseDate(c.date_debut_soins) ?? parseDate(o.created_at);
    const n = parseDuree(c.ordonnance_jours) ?? parseDuree(c.ordonnance_mois != null ? `${c.ordonnance_mois} mois` : null)
      ?? parseDuree(c.qsp_jours) ?? parseDuree(c.qsp) ?? parseDuree(c.duree_jours);
    if (s && n && n > 0) out.push({ debut: s, fin: addDays(s, n - 1), source: o.titre });
  }
  return out;
}

// Périodes non couvertes entre le début de PEC et aujourd'hui.
export function trousCouverture(ordos: OrdoCouv[], dateOperation?: string | null, aujourdhui = new Date()): { debut: Date; trous: Trou[] } | null {
  const today = dateOnly(aujourdhui);
  const fenetres = ordos.flatMap(fenetresOrdo);
  const debutFallback = parseDate(dateOperation);
  const starts = fenetres.map((f) => f.debut);
  const debut = starts.length ? new Date(Math.min(...starts.map((d) => d.getTime()))) : debutFallback;
  if (!debut || debut > today) return null; // pas de période à évaluer

  // Fusion des fenêtres (bornées à aujourd'hui).
  const segs = fenetres
    .map((f) => ({ a: f.debut, b: f.fin > today ? today : f.fin }))
    .filter((s) => s.b >= debut)
    .sort((x, y) => x.a.getTime() - y.a.getTime());
  const merged: { a: Date; b: Date }[] = [];
  for (const s of segs) {
    const last = merged[merged.length - 1];
    if (last && s.a.getTime() <= addDays(last.b, 1).getTime()) {
      if (s.b > last.b) last.b = s.b;
    } else merged.push({ a: new Date(s.a), b: new Date(s.b) });
  }

  // Trous entre `debut` et `today`.
  const trous: Trou[] = [];
  let curseur = debut;
  for (const m of merged) {
    if (m.a > curseur) trous.push({ debut: curseur, fin: addDays(m.a, -1) });
    if (m.b >= curseur) curseur = addDays(m.b, 1);
  }
  if (curseur <= today) trous.push({ debut: curseur, fin: today });
  return { debut, trous: trous.filter((t) => t.fin >= t.debut) };
}
