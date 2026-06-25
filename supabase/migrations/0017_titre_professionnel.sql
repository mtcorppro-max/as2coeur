-- =====================================================================
-- 0017 — Titre et prénom sur le compte soignant médecin
--
-- Permet de stocker le titre (Interne / Docteur / Professeur) et le prénom
-- séparément du nom de famille pour les chirurgiens/médecins.
-- =====================================================================

alter table public.professionnel
  add column if not exists titre text;
