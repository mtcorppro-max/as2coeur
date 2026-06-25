-- =====================================================================
-- 0019 — Molécules du protocole prescripteur
--
-- Stocke les molécules prescrites sous forme structurée :
--   [{ "nom": "Acupan", "posologie": "1 cp x3/j" }, …]
-- Le champ `protocole` (texte libre) reste pour le pansement, le suivi
-- et les autres consignes.
-- =====================================================================

alter table public.professionnel
  add column if not exists molecules jsonb;
