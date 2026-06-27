-- =====================================================================
-- 0049 — Documents du patient : carte Vitale & mutuelle (chemins Storage)
-- =====================================================================

alter table public.patient
  add column if not exists carte_vitale_chemin text,
  add column if not exists mutuelle_chemin     text;
