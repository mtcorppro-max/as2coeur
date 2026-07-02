-- =====================================================================
-- 0127 — Annuaire santé : recherche insensible aux accents
--
-- « frederic » doit trouver « Frédéric », « marlène » doit trouver
-- « MARLENE », « dangelo » doit trouver « D'ANGELO ». On matérialise des
-- colonnes normalisées (minuscules, sans accents, sans apostrophes /
-- tirets / espaces) et on indexe celles-ci ; la loupe normalise de la
-- même façon les mots tapés.
--
-- NB : l'ajout des colonnes réécrit la table (1,08 M lignes) puis crée
-- 2 index — comptez 1 à 3 minutes, c'est normal.
-- =====================================================================

create extension if not exists unaccent with schema public;

-- unaccent() n'est pas déclarée immutable : wrapper immutable requis pour
-- les colonnes générées et les index.
create or replace function public.f_unaccent(text)
returns text language sql immutable parallel safe strict as
$$ select public.unaccent('public.unaccent'::regdictionary, $1) $$;

alter table public.annuaire_sante
  add column if not exists nom_norm text generated always as
    (regexp_replace(lower(public.f_unaccent(nom)), '[''\s-]+', '', 'g')) stored,
  add column if not exists prenom_norm text generated always as
    (regexp_replace(lower(public.f_unaccent(coalesce(prenom, ''))), '[''\s-]+', '', 'g')) stored;

create index if not exists idx_annuaire_sante_nom_norm_trgm
  on public.annuaire_sante using gin (nom_norm gin_trgm_ops);
create index if not exists idx_annuaire_sante_prenom_norm_trgm
  on public.annuaire_sante using gin (prenom_norm gin_trgm_ops);

-- Les index sur les colonnes accentuées ne servent plus à la loupe.
drop index if exists public.idx_annuaire_sante_nom_trgm2;
drop index if exists public.idx_annuaire_sante_prenom_trgm;
