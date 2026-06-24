// Utilitaires de gestion des astreintes (semaine / week-end).

// Date locale -> "YYYY-MM-DD"
export function isoDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

// Lundi de la semaine contenant `d` (00:00 local).
export function lundiDe(d: Date): Date {
  const x = new Date(d);
  const jour = (x.getDay() + 6) % 7; // lundi = 0 … dimanche = 6
  x.setDate(x.getDate() - jour);
  x.setHours(0, 0, 0, 0);
  return x;
}

// Les `n` lundis à partir de la semaine courante (incluse).
export function semainesAVenir(n: number, depuis = new Date()): Date[] {
  const base = lundiDe(depuis);
  return Array.from({ length: n }, (_, i) => {
    const m = new Date(base);
    m.setDate(m.getDate() + i * 7);
    return m;
  });
}

// Les astreintes sont-elles incomplètes pour les `jours` prochains jours ?
// `cles` = ensemble de clés "YYYY-MM-DD|semaine" / "YYYY-MM-DD|weekend".
export function astreintesIncompletes(cles: Set<string>, jours = 15): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const limite = new Date(today);
  limite.setDate(limite.getDate() + jours);

  let m = lundiDe(today);
  while (m <= limite) {
    const k = isoDate(m);
    if (!cles.has(`${k}|semaine`) || !cles.has(`${k}|weekend`)) return true;
    m = new Date(m);
    m.setDate(m.getDate() + 7);
  }
  return false;
}
