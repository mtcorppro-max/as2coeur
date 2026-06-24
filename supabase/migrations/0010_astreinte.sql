-- =====================================================================
-- 0010 — Astreintes (semaine / week-end)
--
-- Désigne, par semaine, le soignant d'astreinte en semaine (lun–ven) et
-- celui du week-end (sam–dim). Une alerte in-app prévient si les astreintes
-- ne sont pas renseignées au moins 15 jours à l'avance.
--
-- À exécuter dans le SQL Editor de Supabase.
-- =====================================================================

create table if not exists public.astreinte (
  id               uuid primary key default gen_random_uuid(),
  prestataire_id   uuid not null references public.prestataire(id) on delete cascade,
  semaine_debut    date not null,  -- lundi de la semaine concernée
  type             text not null check (type in ('semaine', 'weekend')),
  professionnel_id uuid not null references public.professionnel(id) on delete cascade,
  created_at       timestamptz not null default now(),
  unique (prestataire_id, semaine_debut, type)
);

create index if not exists idx_astreinte_semaine on public.astreinte (prestataire_id, semaine_debut);

alter table public.astreinte enable row level security;

-- Lecture : toute l'équipe du prestataire
create policy astreinte_select on public.astreinte for select
  using (prestataire_id = public.current_prestataire_id());

-- Écriture : tout soignant du prestataire peut renseigner les astreintes
create policy astreinte_write_pro on public.astreinte for all
  using (prestataire_id = public.current_prestataire_id())
  with check (prestataire_id = public.current_prestataire_id());
