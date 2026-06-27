-- =====================================================================
-- 0050 — Ordonnances types des médecins (modèles pré-remplis réutilisables)
-- =====================================================================

alter table public.professionnel    add column if not exists ordonnances_types jsonb not null default '[]'::jsonb;
alter table public.soignant_externe add column if not exists ordonnances_types jsonb not null default '[]'::jsonb;
