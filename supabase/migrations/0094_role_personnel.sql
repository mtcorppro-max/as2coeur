-- =====================================================================
-- 0094 — Rôle « personnel » (membre du personnel interne, générique)
--
-- Compte « hors niveau d'accès » : AUCUN accès patient (niveau 5, sans agence
-- ni région → peut_voir_patient() = false), comme le RH. Sa dénomination de
-- poste (champ `poste`, cf. 0095) est modifiable par RH / dirigeant / manager.
-- (ADD VALUE : pas d'usage de la nouvelle valeur dans la même migration.)
-- =====================================================================

alter type public.role_professionnel add value if not exists 'personnel';
