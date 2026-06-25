-- =====================================================================
-- 0024 — Niveau d'accès du compte soignant
--
-- Niveau 1 : accès à TOUS les patients du prestataire.
-- Niveau 2 : accès uniquement aux patients auxquels le soignant est rattaché.
-- (L'application des droits via RLS + table de liaison patient_soignant
--  sera ajoutée dans une migration ultérieure.)
-- =====================================================================

alter table public.professionnel
  add column if not exists niveau int not null default 2;
