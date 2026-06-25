-- =====================================================================
-- 0018 — Jours de suivi sélectionnés par le prescripteur
--
-- Stocke les jours choisis sous forme de tableau d'entiers
-- ex. {1,3,5} = J1, J3, J5.
-- =====================================================================

alter table public.professionnel
  add column if not exists jours_suivi int[];
