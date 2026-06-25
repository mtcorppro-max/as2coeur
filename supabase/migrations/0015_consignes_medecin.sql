-- =====================================================================
-- 0015 — Consignes médecin / chirurgien sur le compte soignant
--
-- À la création d'un compte chirurgien/médecin, on enregistre ses coordonnées
-- (cabinets, téléphone, secrétariat), son protocole de prise en charge
-- (molécules, débits, pansement, suivi…) ainsi que la durée et le nombre de
-- suivis souhaités. Sert à planifier les suivis à l'avance et à garder les
-- contacts médecin/secrétariat pour optimiser la prise en charge.
--
-- À exécuter dans le SQL Editor de Supabase.
-- =====================================================================

alter table public.professionnel
  add column if not exists specialite            text,
  add column if not exists cabinets              text,
  add column if not exists telephone             text,
  add column if not exists secretariat_nom       text,
  add column if not exists secretariat_email     text,
  add column if not exists secretariat_tel       text,
  add column if not exists protocole             text,
  add column if not exists duree_prise_en_charge int,
  add column if not exists nb_suivis             int;
