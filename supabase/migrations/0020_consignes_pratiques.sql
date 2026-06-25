-- =====================================================================
-- 0020 — Consignes pratiques du protocole prescripteur
--
-- Pansement (oui/non + explication), cryothérapie (oui/non + durée de prêt
-- de la machine + quelle machine), et destinataire(s) de l'envoi des
-- ordonnances / comptes rendus (secrétariat et/ou médecin).
-- =====================================================================

alter table public.professionnel
  add column if not exists pansement            boolean,
  add column if not exists pansement_detail     text,
  add column if not exists cryotherapie         boolean,
  add column if not exists cryotherapie_duree   text,
  add column if not exists cryotherapie_machine text,
  add column if not exists envoi_ordo           text[];
