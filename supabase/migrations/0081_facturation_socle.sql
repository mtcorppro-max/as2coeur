-- =====================================================================
-- 0081 — Facturation prévisionnelle Sécu : socle données (Lot 0)
--
--   lpp                : référentiel des codes LPP + prix (+ périodicité,
--                        taux de remboursement base). Seedé depuis le fichier
--                        « Liste produits et code lpp tarifs » (cf. seed_lpp.sql).
--   article.lpp_code   : code LPP de l'article (facturation à l'unité).
--   patient (ALD/mut.) : données de remboursement saisies sur la fiche.
--   facturation_param  : paramètres globaux (taux Sécu par défaut).
--
-- Outil PRÉVISIONNEL — ne remplace pas le logiciel CNDA agréé.
-- À exécuter, puis lancer supabase/seed_lpp.sql.
-- =====================================================================

-- 1) Référentiel LPP.
create table if not exists public.lpp (
  code         text primary key,
  libelle      text not null default '',
  prix_ttc     numeric(10, 2),                      -- prix unitaire TTC (null = à compléter)
  periodicite  text not null default 'unitaire'
                 check (periodicite in ('unitaire', 'installation', 'journalier', 'hebdomadaire', 'mensuel')),
  taux_base    numeric(4, 3),                        -- taux remboursement Sécu (null = défaut global)
  a_verifier   boolean not null default false,       -- anomalie repérée à l'import
  updated_at   timestamptz not null default now()
);
alter table public.lpp enable row level security;

drop policy if exists lpp_select on public.lpp;
create policy lpp_select on public.lpp for select
  using (public.current_professionnel_id() is not null);

drop policy if exists lpp_write on public.lpp;
create policy lpp_write on public.lpp for all
  using (public.current_niveau() = 0 or public.current_role_pro() = 'magasinier')
  with check (public.current_niveau() = 0 or public.current_role_pro() = 'magasinier');

-- 2) Code LPP sur l'article (facturation à l'unité).
alter table public.article add column if not exists lpp_code text references public.lpp(code) on delete set null;
create index if not exists idx_article_lpp on public.article (lpp_code);

-- 3) Données de remboursement du patient (saisies par la coordinatrice).
alter table public.patient
  add column if not exists ald           boolean not null default false,   -- ALD 100 %
  add column if not exists a_mutuelle    boolean not null default false,   -- patient couvert par une mutuelle
  add column if not exists taux_mutuelle numeric(4, 3) not null default 1.000; -- part du ticket couverte (1 = 100 %)

-- 4) Paramètres globaux de facturation (singleton).
create table if not exists public.facturation_param (
  id               boolean primary key default true,
  taux_secu_defaut numeric(4, 3) not null default 0.600,   -- taux Sécu par défaut hors ALD
  updated_at       timestamptz not null default now(),
  constraint facturation_param_singleton check (id)
);
insert into public.facturation_param (id) values (true) on conflict (id) do nothing;
alter table public.facturation_param enable row level security;

drop policy if exists facturation_param_select on public.facturation_param;
create policy facturation_param_select on public.facturation_param for select
  using (public.current_professionnel_id() is not null);

drop policy if exists facturation_param_write on public.facturation_param;
create policy facturation_param_write on public.facturation_param for all
  using (public.current_niveau() = 0)
  with check (public.current_niveau() = 0);
