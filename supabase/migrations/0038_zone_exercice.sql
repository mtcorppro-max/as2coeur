-- =====================================================================
-- 0038 — Zone d'exercice des infirmières libérales
--
-- Une infirmière libérale n'est rattachée ni à une agence ni à une région :
-- elle intervient sur une zone géographique (lieu d'exercice) et accède aux
-- patients auxquels elle est rattachée (niveau 3), où qu'ils soient.
-- =====================================================================

alter table public.professionnel
  add column if not exists zone_exercice text;
