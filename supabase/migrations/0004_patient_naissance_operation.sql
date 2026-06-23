-- =====================================================================
-- 0004 — Ville, naissance et opération du patient
--
-- Complète la fiche patient avec la ville, la date de naissance, la nature
-- de l'opération subie et sa date. Tout est facultatif (nullable).
--
-- À exécuter dans le SQL Editor de Supabase.
-- =====================================================================

alter table public.patient
  add column if not exists ville           text,  -- ville de résidence
  add column if not exists date_naissance  date,  -- date de naissance
  add column if not exists operation       text,  -- nature de l'opération subie
  add column if not exists date_operation  date;  -- date de l'opération
