-- =====================================================================
-- 0011 — Fiches de suivi patient
--
-- Document de suivi quotidien rempli par le soignant (état général,
-- constantes, douleur, alimentation, hydratation, transit, cicatrisation,
-- mobilisation, bilan sanguin). Enregistré dans le dossier, exportable en PDF.
--
-- À exécuter dans le SQL Editor de Supabase.
-- =====================================================================

create table if not exists public.suivi (
  id              uuid primary key default gen_random_uuid(),
  patient_id      uuid not null references public.patient(id) on delete cascade,
  auteur_user_id  uuid,
  auteur_nom      text,
  etat_general    text,
  ta              text,
  pouls           text,
  temperature     text,
  spo2            text,
  douleur_en      text,
  alimentation    text,
  hydratation     text,
  transit         text,
  cicatrisation   text,
  mobilisation    text,
  bilan_sanguin   text,
  created_at      timestamptz not null default now()
);

create index if not exists idx_suivi_patient on public.suivi (patient_id, created_at desc);

alter table public.suivi enable row level security;

-- Les soignants du prestataire gèrent les suivis de leurs patients
create policy suivi_select_pro on public.suivi for select
  using (public.patient_dans_mon_prestataire(patient_id));
create policy suivi_insert_pro on public.suivi for insert
  with check (public.patient_dans_mon_prestataire(patient_id));
create policy suivi_delete_pro on public.suivi for delete
  using (public.patient_dans_mon_prestataire(patient_id));
