-- =====================================================================
-- 0014 — Validation des rappels de suivi (colonne « Action »)
--
-- Mémorise qu'un rappel de suivi (J1 ou dernier jour) a été validé par un
-- soignant, pour le faire disparaître de la colonne « Action » du tableau
-- de bord. Une échéance est aussi considérée traitée si un suivi existe le
-- jour même (logique côté application).
--
-- À exécuter dans le SQL Editor de Supabase.
-- =====================================================================

create table if not exists public.rappel_suivi_valide (
  id          uuid primary key default gen_random_uuid(),
  patient_id  uuid not null references public.patient(id) on delete cascade,
  type        text not null check (type in ('J1', 'dernier')),
  echeance    date not null,
  validee_par text,
  validee_le  timestamptz not null default now(),
  unique (patient_id, type, echeance)
);

alter table public.rappel_suivi_valide enable row level security;

create policy rappel_select_pro on public.rappel_suivi_valide for select
  using (public.patient_dans_mon_prestataire(patient_id));
create policy rappel_insert_pro on public.rappel_suivi_valide for insert
  with check (public.patient_dans_mon_prestataire(patient_id));
create policy rappel_delete_pro on public.rappel_suivi_valide for delete
  using (public.patient_dans_mon_prestataire(patient_id));
