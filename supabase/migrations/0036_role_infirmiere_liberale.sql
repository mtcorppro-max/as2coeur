-- =====================================================================
-- 0036 — Rôle « infirmière libérale »
--
-- Niveau 3 (accès aux seuls patients rattachés). Elle peut saisir les
-- constantes de ses patients (cf. policy RLS en 0037).
-- À exécuter SEUL (ADD VALUE d'enum non utilisable dans la même transaction).
-- =====================================================================

alter type role_professionnel add value if not exists 'infirmiere_liberale';
