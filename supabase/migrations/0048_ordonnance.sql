-- =====================================================================
-- 0048 — Ordonnances à signer par le médecin (signature in-app)
--
-- Le soignant prestataire génère une ordonnance pré-remplie pour un patient
-- et l'adresse à un médecin (compte) qui la signe électroniquement dans l'app.
-- =====================================================================

create table if not exists public.ordonnance (
  id              uuid primary key default gen_random_uuid(),
  patient_id      uuid not null references public.patient(id) on delete cascade,
  prestataire_id  uuid not null references public.prestataire(id) on delete cascade,
  type            text not null,                        -- id du modèle
  titre           text not null,                        -- libellé du modèle (snapshot)
  contenu         jsonb not null default '{}'::jsonb,   -- champs remplis
  destinataire_id uuid references public.professionnel(id) on delete set null, -- médecin signataire
  cree_par        uuid references public.professionnel(id) on delete set null,
  statut          text not null default 'a_signer' check (statut in ('a_signer', 'signee', 'refusee')),
  signature       text,            -- data-URL de la signature dessinée
  signataire_nom  text,
  signee_le       timestamptz,
  created_at      timestamptz not null default now()
);
create index if not exists idx_ordonnance_patient on public.ordonnance (patient_id);
create index if not exists idx_ordonnance_dest on public.ordonnance (destinataire_id, statut);

alter table public.ordonnance enable row level security;

-- Lecture : l'équipe du prestataire + le médecin destinataire (+ plateforme).
drop policy if exists ord_select on public.ordonnance;
create policy ord_select on public.ordonnance for select
  using (
    public.current_niveau() = 0
    or prestataire_id = public.current_prestataire_id()
    or destinataire_id = public.current_professionnel_id()
  );

-- Création : par l'équipe du prestataire.
drop policy if exists ord_insert on public.ordonnance;
create policy ord_insert on public.ordonnance for insert
  with check (prestataire_id = public.current_prestataire_id());

-- Mise à jour : le médecin destinataire (pour signer) OU l'équipe du prestataire.
drop policy if exists ord_update on public.ordonnance;
create policy ord_update on public.ordonnance for update
  using (destinataire_id = public.current_professionnel_id() or prestataire_id = public.current_prestataire_id())
  with check (destinataire_id = public.current_professionnel_id() or prestataire_id = public.current_prestataire_id());

-- Suppression : l'équipe du prestataire.
drop policy if exists ord_delete on public.ordonnance;
create policy ord_delete on public.ordonnance for delete
  using (prestataire_id = public.current_prestataire_id());
