-- =====================================================================
-- 0117 — Coffre-fort personnel du soignant (documents privés)
--
-- Chaque soignant interne y dépose ses documents (fiche de paie, contrat,
-- attestations…). Visibles UNIQUEMENT par le propriétaire. Fichiers dans le
-- bucket privé « coffre-fort » (créé à la 1re utilisation côté API).
-- =====================================================================

create table if not exists public.coffre_document (
  id               uuid primary key default gen_random_uuid(),
  professionnel_id uuid not null references public.professionnel(id) on delete cascade,
  libelle          text not null,
  chemin_stockage  text not null,
  mime             text,
  taille           bigint,
  created_at       timestamptz not null default now()
);
create index if not exists idx_coffre_pro on public.coffre_document (professionnel_id, created_at desc);

alter table public.coffre_document enable row level security;

-- Le soignant ne voit / gère que SES propres documents.
drop policy if exists coffre_select_self on public.coffre_document;
create policy coffre_select_self on public.coffre_document for select
  using (professionnel_id = public.current_professionnel_id());

drop policy if exists coffre_write_self on public.coffre_document;
create policy coffre_write_self on public.coffre_document for all
  using (professionnel_id = public.current_professionnel_id())
  with check (professionnel_id = public.current_professionnel_id());
