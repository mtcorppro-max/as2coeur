-- =====================================================================
-- 0047 — Numéro RPPS (facultatif) des médecins / chirurgiens
-- Comptes professionnels + soignants externes.
-- =====================================================================

alter table public.professionnel    add column if not exists rpps text;
alter table public.soignant_externe add column if not exists rpps text;
