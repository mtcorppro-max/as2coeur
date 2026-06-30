-- =====================================================================
-- 0100 — Notes de frais : suivi des déclarations DMOS + paramètre comptabilité
-- (Lot 3 : exports)
-- =====================================================================

-- Suivi de la déclaration/autorisation EPS + publication Transparence Santé,
-- par ligne-avantage.
alter table public.note_de_frais_ligne
  add column if not exists reference_eps        text,
  add column if not exists date_depot           date,
  add column if not exists decision             text check (decision in ('declare', 'autorise', 'refuse', 'tacite')),
  add column if not exists publie_transparence  boolean not null default false;

-- Adresse e-mail de la comptabilité (paramétrable, par prestataire).
create table if not exists public.parametre_notes_frais (
  prestataire_id     uuid primary key references public.prestataire(id) on delete cascade,
  email_comptabilite text,
  updated_at         timestamptz not null default now()
);

alter table public.parametre_notes_frais enable row level security;
drop policy if exists pnf_select on public.parametre_notes_frais;
create policy pnf_select on public.parametre_notes_frais for select
  using (prestataire_id = public.current_prestataire_id() or public.current_niveau() = 0);
drop policy if exists pnf_write on public.parametre_notes_frais;
create policy pnf_write on public.parametre_notes_frais for all
  using (public.current_niveau() = 0 or (prestataire_id = public.current_prestataire_id() and public.current_role_pro() = 'dirigeant'))
  with check (public.current_niveau() = 0 or (prestataire_id = public.current_prestataire_id() and public.current_role_pro() = 'dirigeant'));

-- Le dirigeant (national) / admin peut mettre à jour le suivi DMOS des lignes-avantages.
drop policy if exists ndfl_update_dmos on public.note_de_frais_ligne;
create policy ndfl_update_dmos on public.note_de_frais_ligne for update
  using (est_avantage_ps and (
    public.current_niveau() = 0
    or (public.current_role_pro() = 'dirigeant'
        and exists (select 1 from public.note_de_frais n where n.id = note_id and n.prestataire_id = public.current_prestataire_id()))
  ))
  with check (est_avantage_ps and (
    public.current_niveau() = 0
    or (public.current_role_pro() = 'dirigeant'
        and exists (select 1 from public.note_de_frais n where n.id = note_id and n.prestataire_id = public.current_prestataire_id()))
  ));
