-- =====================================================================
-- 0016 — Ajout du prénom sur le compte soignant
--
-- Permet de saisir séparément prénom et nom pour les coordinatrices
-- et délégués médicaux (le nom complet reste utilisé pour les chirurgiens).
-- =====================================================================

alter table public.professionnel
  add column if not exists prenom text;
