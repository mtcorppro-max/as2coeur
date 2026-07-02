-- =====================================================================
-- 0128 — Annuaire des pharmacies de France (FINESS, Open Data)
--
-- Toutes les officines de France (catégorie FINESS 620, ≈ 20 000) avec
-- adresse et téléphone, importées depuis l'extraction officielle FINESS
-- (data.gouv, Licence Ouverte) par scripts/import-pharmacies.mjs.
-- Recherche dans la loupe par nom OU commune (colonnes normalisées,
-- mêmes règles que l'annuaire santé : minuscules, sans accents…).
--
-- Dépend de 0127 (fonction f_unaccent).
-- =====================================================================

create table if not exists public.annuaire_pharmacie (
  finess       text primary key,          -- n° FINESS de l'établissement
  nom          text not null,             -- raison sociale (enseigne)
  adresse      text,
  cp           text,
  commune      text,
  telephone    text,
  dept         text generated always as (left(cp, 2)) stored,
  nom_norm     text generated always as
    (regexp_replace(lower(public.f_unaccent(nom)), '[''\s-]+', '', 'g')) stored,
  commune_norm text generated always as
    (regexp_replace(lower(public.f_unaccent(coalesce(commune, ''))), '[''\s-]+', '', 'g')) stored,
  importe_le   timestamptz not null default now()
);

create index if not exists idx_annuaire_pharmacie_nom_trgm
  on public.annuaire_pharmacie using gin (nom_norm gin_trgm_ops);
create index if not exists idx_annuaire_pharmacie_commune_trgm
  on public.annuaire_pharmacie using gin (commune_norm gin_trgm_ops);
create index if not exists idx_annuaire_pharmacie_dept
  on public.annuaire_pharmacie (dept);

alter table public.annuaire_pharmacie enable row level security;

-- Lecture : tout professionnel connecté. Fonctions en (select …) : évaluées
-- une fois par requête, pas par ligne (leçon de la 0125).
drop policy if exists annuaire_pharmacie_select on public.annuaire_pharmacie;
create policy annuaire_pharmacie_select on public.annuaire_pharmacie for select
  using ((select public.current_niveau()) = 0 or (select public.current_prestataire_id()) is not null);

-- Insert/update/delete : réservés au service_role (script d'import).
