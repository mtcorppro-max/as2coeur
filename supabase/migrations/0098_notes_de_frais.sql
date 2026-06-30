-- =====================================================================
-- 0098 — Notes de frais internes (Lot 1)
--
-- note_de_frais (en-tête) + note_de_frais_ligne (lignes) + justificatifs.
-- Workflow : brouillon → soumise → validee/rejetee → remboursee.
-- Routage du validateur (fonction peut_valider_note) :
--   hiérarchie (coordinatrice/délégué/livreur/magasinier) → manager (même région)
--   personnel → RH · manager/dirigeant → RH · RH → dirigeant · admin N0 → tout.
-- (DMOS = Lot 2, exports email = Lot 3.)
-- =====================================================================

create table if not exists public.note_de_frais (
  id             uuid primary key default gen_random_uuid(),
  prestataire_id uuid not null references public.prestataire(id) on delete cascade,
  emetteur_id    uuid not null references public.professionnel(id) on delete cascade,
  titre          text not null,
  periode_debut  date,
  periode_fin    date,
  statut         text not null default 'brouillon'
                 check (statut in ('brouillon', 'soumise', 'validee', 'rejetee', 'remboursee')),
  valide_par     uuid references public.professionnel(id) on delete set null,
  valide_le      timestamptz,
  motif_rejet    text,
  total_ttc      numeric(10,2) not null default 0,
  total_ht       numeric(10,2) not null default 0,
  rembourse_le   timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index if not exists idx_ndf_emetteur on public.note_de_frais (emetteur_id);
create index if not exists idx_ndf_presta_statut on public.note_de_frais (prestataire_id, statut);

create table if not exists public.note_de_frais_ligne (
  id           uuid primary key default gen_random_uuid(),
  note_id      uuid not null references public.note_de_frais(id) on delete cascade,
  type         text not null default 'repas'
               check (type in ('repas','transport','hebergement','peage','carburant','inscription','fournitures','autre')),
  montant_ttc  numeric(10,2) not null default 0,
  montant_ht   numeric(10,2),
  date_depense date,
  description  text,
  evenement_id uuid references public.evenement_marketing(id) on delete set null,
  created_at   timestamptz not null default now()
);
create index if not exists idx_ndf_ligne_note on public.note_de_frais_ligne (note_id);

create table if not exists public.note_de_frais_justificatif (
  id             uuid primary key default gen_random_uuid(),
  note_id        uuid not null references public.note_de_frais(id) on delete cascade,
  ligne_id       uuid references public.note_de_frais_ligne(id) on delete cascade,
  chemin_stockage text not null,
  libelle        text,
  mime           text,
  taille         bigint,
  created_at     timestamptz not null default now()
);
create index if not exists idx_ndf_just_note on public.note_de_frais_justificatif (note_id);

-- ── Totaux maintenus automatiquement depuis les lignes ──────────────────────
create or replace function public.maj_total_note()
returns trigger language plpgsql security definer set search_path = public as $$
declare nid uuid;
begin
  nid := coalesce(NEW.note_id, OLD.note_id);
  update public.note_de_frais n set
    total_ttc = coalesce((select sum(montant_ttc) from public.note_de_frais_ligne where note_id = nid), 0),
    total_ht  = coalesce((select sum(coalesce(montant_ht, montant_ttc)) from public.note_de_frais_ligne where note_id = nid), 0),
    updated_at = now()
  where n.id = nid;
  return null;
end;
$$;
drop trigger if exists trg_maj_total_note on public.note_de_frais_ligne;
create trigger trg_maj_total_note
  after insert or update or delete on public.note_de_frais_ligne
  for each row execute function public.maj_total_note();

-- ── Routage : le pro courant peut-il valider une note de cet émetteur ? ──────
create or replace function public.peut_valider_note(p_emetteur uuid)
returns boolean language plpgsql stable security definer set search_path = public as $$
declare
  e_role text; e_region uuid; e_agence uuid; e_presta uuid;
  m_role text; m_region uuid; m_presta uuid;
begin
  if public.current_niveau() = 0 then return true; end if;
  select role::text, region_id, agence_id, prestataire_id
    into e_role, e_region, e_agence, e_presta
    from public.professionnel where id = p_emetteur;
  m_role   := public.current_role_pro()::text;
  m_region := public.current_region_id();
  m_presta := public.current_prestataire_id();
  if e_presta is null or e_presta is distinct from m_presta then return false; end if;
  if e_region is null and e_agence is not null then
    select region_id into e_region from public.agence where id = e_agence;
  end if;

  if e_role in ('coordinatrice','delegue','livreur','magasinier') then
    return m_role = 'manager' and m_region is not distinct from e_region;
  elsif e_role = 'personnel' then
    return m_role = 'rh';
  elsif e_role in ('manager','dirigeant') then
    return m_role = 'rh';
  elsif e_role = 'rh' then
    return m_role = 'dirigeant';
  end if;
  return false;
end;
$$;

-- ── RLS ─────────────────────────────────────────────────────────────────────
alter table public.note_de_frais enable row level security;
alter table public.note_de_frais_ligne enable row level security;
alter table public.note_de_frais_justificatif enable row level security;

-- Note : visible par l'émetteur ou le validateur (ou admin via la fonction).
drop policy if exists ndf_select on public.note_de_frais;
create policy ndf_select on public.note_de_frais for select
  using (emetteur_id = public.current_professionnel_id() or public.peut_valider_note(emetteur_id));

drop policy if exists ndf_insert on public.note_de_frais;
create policy ndf_insert on public.note_de_frais for insert
  with check (emetteur_id = public.current_professionnel_id()
              and prestataire_id = public.current_prestataire_id());

-- L'émetteur édite/soumet ses brouillons et peut rouvrir une note rejetée
-- (rejetee → brouillon) ; jamais d'auto-validation.
drop policy if exists ndf_update_emetteur on public.note_de_frais;
create policy ndf_update_emetteur on public.note_de_frais for update
  using (emetteur_id = public.current_professionnel_id() and statut in ('brouillon','rejetee'))
  with check (emetteur_id = public.current_professionnel_id() and statut in ('brouillon','soumise'));

-- Le validateur peut traiter (valider/rejeter/rembourser).
drop policy if exists ndf_update_valideur on public.note_de_frais;
create policy ndf_update_valideur on public.note_de_frais for update
  using (public.peut_valider_note(emetteur_id))
  with check (public.peut_valider_note(emetteur_id));

drop policy if exists ndf_delete on public.note_de_frais;
create policy ndf_delete on public.note_de_frais for delete
  using (emetteur_id = public.current_professionnel_id() and statut = 'brouillon');

-- Lignes : visibles avec la note ; éditables par l'émetteur tant que brouillon.
drop policy if exists ndfl_select on public.note_de_frais_ligne;
create policy ndfl_select on public.note_de_frais_ligne for select
  using (exists (select 1 from public.note_de_frais n where n.id = note_id
           and (n.emetteur_id = public.current_professionnel_id() or public.peut_valider_note(n.emetteur_id))));

drop policy if exists ndfl_write on public.note_de_frais_ligne;
create policy ndfl_write on public.note_de_frais_ligne for all
  using (exists (select 1 from public.note_de_frais n where n.id = note_id
           and n.emetteur_id = public.current_professionnel_id() and n.statut = 'brouillon'))
  with check (exists (select 1 from public.note_de_frais n where n.id = note_id
           and n.emetteur_id = public.current_professionnel_id() and n.statut = 'brouillon'));

-- Justificatifs : lecture avec la note ; écriture via service_role (API).
drop policy if exists ndfj_select on public.note_de_frais_justificatif;
create policy ndfj_select on public.note_de_frais_justificatif for select
  using (exists (select 1 from public.note_de_frais n where n.id = note_id
           and (n.emetteur_id = public.current_professionnel_id() or public.peut_valider_note(n.emetteur_id))));
