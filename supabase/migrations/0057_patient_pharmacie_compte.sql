-- =====================================================================
-- 0057 — Pharmacie (compte) rattachée au patient
--
-- Nom du compte pharmacie (role = 'pharmacie') ayant accès au dossier du
-- patient via son portail. Le rattachement effectif passe par
-- patient_soignant (comme l'infirmière / le livreur) ; ce champ sert à
-- l'affichage et au pré-remplissage du sélecteur.
-- Distinct du champ texte `pharmacie` (pharmacie de ville du patient).
-- =====================================================================

alter table public.patient
  add column if not exists pharmacie_compte_nom text;
