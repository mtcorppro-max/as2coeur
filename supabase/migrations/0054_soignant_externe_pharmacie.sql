-- =====================================================================
-- 0054 — Soignant externe : type « pharmacie »
--
-- Permet d'enregistrer une pharmacie comme soignant externe (sans compte),
-- au même titre que les médecins/chirurgiens et infirmières libérales.
--   type = 'pharmacie' -> pharmacie partenaire (nom, adresse, contact)
-- =====================================================================

alter table public.soignant_externe drop constraint if exists soignant_externe_type_check;
alter table public.soignant_externe
  add constraint soignant_externe_type_check
  check (type in ('medecin', 'infirmiere', 'pharmacie'));
