-- =====================================================================
-- 0070 — Préparation de commande : états + preuve de livraison
--
-- Cycle : a_programmer → planifiee → preparee → livree
--   planifiee : prévue + panier (bon de commande)
--   preparee  : préparation validée (bon de livraison émis)
--   livree    : livrée + signée
-- =====================================================================

-- Nouvel état « preparee ».
alter table public.livraison drop constraint if exists livraison_statut_check;
alter table public.livraison
  add constraint livraison_statut_check
  check (statut in ('a_programmer', 'a_planifier', 'planifiee', 'preparee', 'livree'));

-- Suivi de préparation (picking) ligne par ligne.
alter table public.livraison_ligne
  add column if not exists prepare boolean not null default false;

-- Preuve de livraison (signature à l'écran).
alter table public.livraison
  add column if not exists signature  text,         -- image (data URL) de la signature
  add column if not exists signataire text,         -- nom du signataire
  add column if not exists livree_le  timestamptz;  -- horodatage de la livraison signée
