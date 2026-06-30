-- =====================================================================
-- 0111 — Service d'affectation des comptes « Personnel (autre fonction) »
--
-- 5 services : marketing, rh, comptabilité, logistique, informatique.
-- Demandé à la création d'un compte personnel, avant le poste/fonction.
-- =====================================================================

alter table public.professionnel
  add column if not exists service text
    check (service in ('marketing', 'rh', 'comptabilite', 'logistique', 'informatique'));
