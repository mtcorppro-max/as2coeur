-- =====================================================================
-- 0129 — RGPD : PDF de consentement signé, rangé dans le dossier patient
--
-- À la première connexion, le patient signe le consentement RGPD à la
-- main (pavé de signature, comme la signature client des livraisons).
-- Un PDF est généré (texte du consentement + identité + date + version
-- + signature manuscrite) et stocké dans le bucket privé ; son chemin
-- est gardé ici pour l'afficher dans le dossier patient côté pro.
-- =====================================================================

alter table public.patient add column if not exists rgpd_pdf_chemin text;
