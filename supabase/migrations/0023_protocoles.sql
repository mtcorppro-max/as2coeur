-- =====================================================================
-- 0023 — Protocoles par intervention
--
-- Un chirurgien peut avoir plusieurs protocoles, un par type d'intervention.
-- Chaque protocole est un objet JSON :
--   { intervention, duree, jours[], molecules[], pansement, cryotherapie,
--     envoi_ordo[], pharmacie_per_os, medicaments_per_os[], materiel, autres }
-- Remplace les colonnes de consigne unique (conservées mais plus alimentées).
-- =====================================================================

alter table public.professionnel
  add column if not exists protocoles jsonb;
