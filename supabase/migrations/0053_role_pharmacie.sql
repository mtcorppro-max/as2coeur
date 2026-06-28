-- =====================================================================
-- 0053 — Rôle « pharmacie »
--
-- Compte de niveau 3 (rattaché). Pharmacie partenaire : accès aux seuls
-- patients auxquels elle est rattachée (RLS par niveau). Pas de gestion
-- d'équipe.
-- À exécuter SEUL (ADD VALUE d'enum non utilisable dans la même transaction).
-- =====================================================================

alter type role_professionnel add value if not exists 'pharmacie';
