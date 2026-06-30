-- =====================================================================
-- 0115 — Onboarding patient + consentement RGPD (signature électronique)
--
-- À la première connexion : tutoriel → rappel du protocole → signature RGPD.
-- On enregistre la date d'onboarding et la signature (nom tapé + date + version).
-- Mise à jour faite côté serveur (route /api/patient/onboarding, service role).
-- =====================================================================

alter table public.patient
  add column if not exists onboarding_fait_le  timestamptz,
  add column if not exists rgpd_signe_le        timestamptz,
  add column if not exists rgpd_nom_signature   text,
  add column if not exists rgpd_version         text;
