-- =====================================================================
-- 0025 — Rattachement patient ↔ soignant & RLS par niveau d'accès
--
-- Table de liaison patient_soignant + visibilité :
--   un pro voit un patient s'il est dans son prestataire ET
--     (niveau 1  OU  rôle coordinatrice  OU  rattaché au patient).
-- Les comptes niveau 1 et la coordinatrice voient donc tout ;
-- les niveau 2 (chirurgien/délégué/infirmière) ne voient que leurs patients.
-- =====================================================================

-- 1. Table de liaison
create table if not exists public.patient_soignant (
  patient_id       uuid not null references public.patient(id) on delete cascade,
  professionnel_id uuid not null references public.professionnel(id) on delete cascade,
  created_at       timestamptz not null default now(),
  primary key (patient_id, professionnel_id)
);
create index if not exists idx_patient_soignant_pro on public.patient_soignant (professionnel_id);

-- 2. Fonctions d'aide
create or replace function public.current_professionnel_id()
returns uuid language sql stable security definer set search_path = public as $$
  select id from public.professionnel where user_id = auth.uid()
$$;

create or replace function public.current_niveau()
returns int language sql stable security definer set search_path = public as $$
  select niveau from public.professionnel where user_id = auth.uid()
$$;

-- Le pro courant peut-il voir ce patient ?
create or replace function public.peut_voir_patient(p uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.patient pa
     where pa.id = p
       and pa.prestataire_id = public.current_prestataire_id()
       and (
         public.current_niveau() = 1
         or public.current_role_pro() = 'coordinatrice'
         or exists (
           select 1 from public.patient_soignant ps
            where ps.patient_id = p
              and ps.professionnel_id = public.current_professionnel_id()
         )
       )
  )
$$;

-- 3. RLS sur la table de liaison
alter table public.patient_soignant enable row level security;

drop policy if exists ps_select_pro on public.patient_soignant;
create policy ps_select_pro on public.patient_soignant for select
  using (public.patient_dans_mon_prestataire(patient_id));

drop policy if exists ps_write_gestion on public.patient_soignant;
create policy ps_write_gestion on public.patient_soignant for all
  using (
    public.patient_dans_mon_prestataire(patient_id)
    and (public.current_role_pro() = 'coordinatrice' or public.current_niveau() = 1)
  )
  with check (
    public.patient_dans_mon_prestataire(patient_id)
    and (public.current_role_pro() = 'coordinatrice' or public.current_niveau() = 1)
  );

-- 4. Bascule des policies de LECTURE pro vers peut_voir_patient
drop policy if exists patient_select_pro on public.patient;
create policy patient_select_pro on public.patient for select
  using (public.peut_voir_patient(id));

drop policy if exists seuil_select_pro on public.seuil;
create policy seuil_select_pro on public.seuil for select
  using (public.peut_voir_patient(patient_id));

drop policy if exists mesure_select_pro on public.mesure;
create policy mesure_select_pro on public.mesure for select
  using (public.peut_voir_patient(patient_id));

drop policy if exists alerte_select_pro on public.alerte;
create policy alerte_select_pro on public.alerte for select
  using (public.peut_voir_patient(patient_id));

drop policy if exists message_select_pro on public.message;
create policy message_select_pro on public.message for select
  using (public.peut_voir_patient(patient_id) and public.current_role_pro() in ('coordinatrice','chirurgien'));

drop policy if exists photo_select_pro on public.photo;
create policy photo_select_pro on public.photo for select
  using (public.peut_voir_patient(patient_id));

drop policy if exists cat_select_pro on public.conduite_a_tenir;
create policy cat_select_pro on public.conduite_a_tenir for select
  using (public.peut_voir_patient(patient_id));

-- Fiches de suivi (table créée en 0011)
drop policy if exists suivi_select_pro on public.suivi;
create policy suivi_select_pro on public.suivi for select
  using (public.peut_voir_patient(patient_id));
drop policy if exists suivi_insert_pro on public.suivi;
create policy suivi_insert_pro on public.suivi for insert
  with check (public.peut_voir_patient(patient_id));
drop policy if exists suivi_delete_pro on public.suivi;
create policy suivi_delete_pro on public.suivi for delete
  using (public.peut_voir_patient(patient_id));
