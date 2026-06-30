-- =====================================================================
-- 0092 — Statuts de prise en charge du patient
--
-- Étend l'enum statut_surveillance pour couvrir le cycle de vie de la PEC :
--   active (Actif) · terminee (Fin de traitement) · suspendue (Suspendu)
--   + arret_perfusions (arrêt avant fin du protocole) · hospitalise · decede · annule
-- (ADD VALUE : pas d'usage des nouvelles valeurs dans la même migration.)
-- =====================================================================

alter type public.statut_surveillance add value if not exists 'arret_perfusions';
alter type public.statut_surveillance add value if not exists 'hospitalise';
alter type public.statut_surveillance add value if not exists 'decede';
alter type public.statut_surveillance add value if not exists 'annule';
