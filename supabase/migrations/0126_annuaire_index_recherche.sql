-- =====================================================================
-- 0126 — Annuaire santé : index de recherche réellement utilisés
--
-- La loupe filtre « nom ilike '%…%' OR prenom ilike '%…%' » : l'index
-- trigram posé en 0122 portait sur l'expression (nom || ' ' || prenom)
-- et ne pouvait donc PAS servir ces prédicats → scan complet du million
-- de lignes (> 9 s, timeout). On le remplace par un index trigram par
-- colonne : Postgres combine les deux en BitmapOr (< 100 ms).
--
-- NB : la création prend ~30-60 s sur 1,08 M de lignes — c'est normal.
-- =====================================================================

create extension if not exists pg_trgm;

drop index if exists public.idx_annuaire_sante_nom_trgm;

create index if not exists idx_annuaire_sante_nom_trgm2
  on public.annuaire_sante using gin (nom gin_trgm_ops);
create index if not exists idx_annuaire_sante_prenom_trgm
  on public.annuaire_sante using gin (prenom gin_trgm_ops);
