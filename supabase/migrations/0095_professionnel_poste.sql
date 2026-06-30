-- =====================================================================
-- 0095 — Dénomination de poste sur le compte professionnel
--
-- Champ texte libre `poste` (ex. « Secrétaire », « Comptable », « Chargé RH »…).
-- Surtout utile pour les comptes « personnel » (dont le rôle générique ne décrit
-- pas la fonction). Modifiable par RH / dirigeant / manager / administration
-- (contrôle d'autorisation côté API service-role : /api/soignants/[id] PATCH).
-- =====================================================================

alter table public.professionnel
  add column if not exists poste text;
