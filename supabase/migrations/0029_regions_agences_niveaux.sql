-- =====================================================================
-- 0029 — Régions / Agences + hiérarchie d'accès à 4 niveaux
--
-- Hiérarchie : Prestataire ─ Région ─ Agence ─ (Personnel & Patients)
--
-- Niveaux d'accès :
--   0 = super-admin plateforme (hors prestataire) → voit TOUT (tous prestataires)
--   1 = région   → tous les patients de sa région
--   2 = agence   → tous les patients de son agence
--   3 = rattaché → uniquement les patients auxquels il est rattaché
--
-- À exécuter dans le SQL Editor de Supabase.
-- =====================================================================

-- 1. Tables géographiques --------------------------------------------------
create table if not exists public.region (
  id             uuid primary key default gen_random_uuid(),
  prestataire_id uuid not null references public.prestataire(id) on delete cascade,
  nom            text not null,
  created_at     timestamptz not null default now()
);
create index if not exists idx_region_presta on public.region (prestataire_id);

create table if not exists public.agence (
  id         uuid primary key default gen_random_uuid(),
  region_id  uuid not null references public.region(id) on delete cascade,
  nom        text not null,
  created_at timestamptz not null default now()
);
create index if not exists idx_agence_region on public.agence (region_id);

-- 2. Rattachement du personnel & des patients à une agence -----------------
alter table public.professionnel
  add column if not exists agence_id uuid references public.agence(id) on delete set null;
alter table public.patient
  add column if not exists agence_id uuid references public.agence(id) on delete set null;
create index if not exists idx_pro_agence on public.professionnel (agence_id);
create index if not exists idx_patient_agence on public.patient (agence_id);

-- Le niveau 0 est « hors prestataire » → prestataire_id peut être null
alter table public.professionnel alter column prestataire_id drop not null;

-- 3. Renumérotation des niveaux existants ----------------------------------
--   ancien 2 (rattaché) -> nouveau 3 (rattaché)
--   ancien 1 (tout le prestataire) -> reste 1 (à réaffecter à une région)
update public.professionnel set niveau = 3 where niveau = 2;
-- défaut le plus restrictif pour les futurs comptes
alter table public.professionnel alter column niveau set default 3;

-- 4. Fonctions d'aide ------------------------------------------------------
create or replace function public.current_agence_id()
returns uuid language sql stable security definer set search_path = public as $$
  select agence_id from public.professionnel where user_id = auth.uid()
$$;

create or replace function public.current_region_id()
returns uuid language sql stable security definer set search_path = public as $$
  select a.region_id
  from public.professionnel p
  left join public.agence a on a.id = p.agence_id
  where p.user_id = auth.uid()
$$;

-- 5. Visibilité patient à 4 niveaux ----------------------------------------
create or replace function public.peut_voir_patient(p uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select case
    -- Niveau 0 : super-admin plateforme, voit tout (tous prestataires)
    when public.current_niveau() = 0 then true
    else exists (
      select 1
      from public.patient pa
      left join public.agence ag on ag.id = pa.agence_id
      where pa.id = p
        and pa.prestataire_id = public.current_prestataire_id()   -- cloisonné par prestataire
        and (
          (public.current_niveau() = 1 and ag.region_id = public.current_region_id())
          or (public.current_niveau() = 2 and pa.agence_id = public.current_agence_id())
          or (public.current_niveau() = 3 and exists (
                select 1 from public.patient_soignant ps
                 where ps.patient_id = p
                   and ps.professionnel_id = public.current_professionnel_id()
             ))
        )
    )
  end
$$;

-- 6. RLS sur région / agence ----------------------------------------------
alter table public.region enable row level security;
alter table public.agence enable row level security;

drop policy if exists region_select on public.region;
create policy region_select on public.region for select
  using (public.current_niveau() = 0 or prestataire_id = public.current_prestataire_id());

drop policy if exists region_write on public.region;
create policy region_write on public.region for all
  using (public.current_niveau() = 0)
  with check (public.current_niveau() = 0);

drop policy if exists agence_select on public.agence;
create policy agence_select on public.agence for select
  using (
    public.current_niveau() = 0
    or exists (select 1 from public.region r where r.id = agence.region_id and r.prestataire_id = public.current_prestataire_id())
  );

drop policy if exists agence_write on public.agence;
create policy agence_write on public.agence for all
  using (
    public.current_niveau() = 0
    or (public.current_niveau() = 1 and region_id = public.current_region_id())
  )
  with check (
    public.current_niveau() = 0
    or (public.current_niveau() = 1 and region_id = public.current_region_id())
  );

-- 7. Bootstrap super-admin (niveau 0) --------------------------------------
-- ⚠️ ADAPTE la liste d'emails à tes comptes super-admin réels, puis décommente.
-- update public.professionnel set niveau = 0
--   where email in ('bymrts.pro@gmail.com', 'biotcorentin93@gmail.com', 'c.biot@asdia.fr');
