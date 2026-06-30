-- =====================================================================
-- 0093 — Rôle RH (ressources humaines)
--
-- Compte « hors niveau d'accès » : AUCUN accès patient, mais lecture de tout
-- le personnel interne de la société (annuaire des équipes).
--   • Aucun changement RLS nécessaire :
--       - pro_select autorise déjà la lecture de tout le prestataire
--         (le RH voit donc toutes les équipes).
--       - l'accès patient passe par peut_voir_patient(), gated par le niveau ;
--         le RH est créé au niveau 5 (hors hiérarchie) sans agence ni région,
--         donc peut_voir_patient() renvoie toujours false → zéro patient.
-- (ADD VALUE : pas d'usage de la nouvelle valeur dans la même migration.)
-- =====================================================================

alter type public.role_professionnel add value if not exists 'rh';
