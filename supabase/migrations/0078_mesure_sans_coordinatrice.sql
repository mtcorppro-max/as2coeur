-- =====================================================================
-- 0078 — La coordinatrice ne saisit plus de constantes
--
-- Seuls le patient (mesure_insert_patient) et l'infirmière libérale
-- (mesure_insert_inf) peuvent insérer des constantes. On retire le droit
-- d'insertion de la coordinatrice.
-- =====================================================================

drop policy if exists mesure_insert_coord on public.mesure;
