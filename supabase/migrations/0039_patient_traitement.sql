-- =====================================================================
-- 0039 — Traitement à suivre & jour de sortie (création patient)
--
-- traitement  : type de prise en charge (Post op, Antalgie, Antibiothérapie…)
-- date_sortie : jour de sortie (pour les patients chirurgicaux)
-- =====================================================================

alter table public.patient
  add column if not exists traitement  text,
  add column if not exists date_sortie date;
