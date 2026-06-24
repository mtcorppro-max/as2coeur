-- =====================================================================
-- 0009 — Congés / absences des soignants
--
-- Chaque soignant déclare ses absences (dates + remplaçant choisi parmi les
-- comptes existants). Toute l'équipe du prestataire voit le calendrier.
--
-- NB : le reroutage automatique des alertes vers le remplaçant n'est pas
-- encore en place (dépend du module SMS). Aujourd'hui tous les soignants
-- voient déjà tous les patients, donc le remplaçant a de fait accès aux
-- dossiers ; cette table sert à tracer qui remplace qui et quand.
--
-- À exécuter dans le SQL Editor de Supabase.
-- =====================================================================

create table if not exists public.absence (
  id               uuid primary key default gen_random_uuid(),
  professionnel_id uuid not null references public.professionnel(id) on delete cascade,
  remplacant_id    uuid references public.professionnel(id) on delete set null,
  date_debut       date not null,
  date_fin         date not null,
  motif            text,
  created_at       timestamptz not null default now()
);

create index if not exists idx_absence_dates on public.absence (date_debut, date_fin);

alter table public.absence enable row level security;

-- Voir les absences de son prestataire
create policy absence_select on public.absence for select
  using (
    exists (
      select 1 from public.professionnel p
       where p.id = absence.professionnel_id
         and p.prestataire_id = public.current_prestataire_id()
    )
  );

-- Gérer ses propres absences (créer / modifier / supprimer)
create policy absence_write_self on public.absence for all
  using (
    professionnel_id in (select id from public.professionnel where user_id = auth.uid())
  )
  with check (
    professionnel_id in (select id from public.professionnel where user_id = auth.uid())
  );
