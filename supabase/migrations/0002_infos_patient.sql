-- =====================================================================
-- 0002 — Coordonnées et contacts du patient
--
-- Ajoute les informations administratives affichées sur la fiche patient :
-- coordonnées personnelles, chirurgien, pharmacie, infirmière libérale et
-- personne proche à contacter. Toutes facultatives (nullable).
--
-- À exécuter dans le SQL Editor de Supabase.
-- =====================================================================

alter table public.patient
  add column if not exists telephone      text,  -- tél. du patient
  add column if not exists email          text,  -- adresse mail du patient
  add column if not exists adresse        text,  -- adresse postale
  add column if not exists chirurgien     text,  -- chirurgien qui a opéré
  add column if not exists pharmacie      text,  -- pharmacie de retrait des médicaments
  add column if not exists infirmiere_nom text,  -- infirmière libérale
  add column if not exists infirmiere_tel text,  -- tél. de l'infirmière libérale
  add column if not exists proche_nom     text,  -- personne proche à appeler
  add column if not exists proche_tel     text;  -- tél. de la personne proche
