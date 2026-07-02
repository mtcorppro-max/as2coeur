-- =====================================================================
-- 0124 — Patient : sexe (avatar-guide adapté au profil)
--
-- Sert uniquement à afficher l'avatar-guide correspondant au patient
-- (enfant / ado / adulte / senior x féminin / masculin, calculé avec la
-- date de naissance). Facultatif : sans valeur, avatar neutre.
-- =====================================================================

alter table public.patient add column if not exists sexe text
  check (sexe in ('feminin', 'masculin'));
