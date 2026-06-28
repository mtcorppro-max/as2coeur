-- =====================================================================
-- 0052 — Rôle « livreur »
--
-- Compte de niveau 2 (agence). Service logistique : pas de gestion d'équipe
-- ni d'accès élargi aux patients (RLS par niveau : ne voit que les patients
-- auxquels il est rattaché).
-- À exécuter SEUL (ADD VALUE d'enum non utilisable dans la même transaction).
-- =====================================================================

alter type role_professionnel add value if not exists 'livreur';
