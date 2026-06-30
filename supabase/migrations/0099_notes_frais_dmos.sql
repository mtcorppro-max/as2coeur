-- =====================================================================
-- 0099 — Notes de frais : conformité DMOS (Lot 2)
--
-- Une ligne de note de frais peut constituer un AVANTAGE à un professionnel de
-- santé externe (médecin, IDEL, pharmacie). Elle est alors qualifiée DMOS :
-- bénéficiaire + régime (déclaration / autorisation) selon un barème global.
-- =====================================================================

alter table public.note_de_frais_ligne
  add column if not exists est_avantage_ps          boolean not null default false,
  add column if not exists beneficiaire_pro_id      uuid references public.professionnel(id) on delete set null,
  add column if not exists beneficiaire_externe_id  uuid references public.soignant_externe(id) on delete set null,
  add column if not exists beneficiaire_nom         text,
  add column if not exists beneficiaire_rpps        text,
  add column if not exists beneficiaire_specialite  text,
  add column if not exists dmos_regime              text check (dmos_regime in ('declaration', 'autorisation'));

-- ── Barème DMOS global (paramétrable) ───────────────────────────────────────
create table if not exists public.dmos_bareme (
  id                 uuid primary key default gen_random_uuid(),
  type_avantage      text not null,
  seuil_declaration  numeric(10,2),
  seuil_autorisation numeric(10,2),
  periode            text not null default 'par_manifestation'
                     check (periode in ('par_manifestation', 'par_an', 'unitaire')),
  date_effet         date not null default current_date,
  actif              boolean not null default true,
  note               text,
  created_at         timestamptz not null default now()
);

-- Seed : une ligne par type (seuils à renseigner par l'admin ; par défaut, tout
-- avantage est en régime « déclaration »).
insert into public.dmos_bareme (type_avantage, periode, note)
  select t, 'par_manifestation', 'Seuils à renseigner (arrêté en vigueur)'
  from unnest(array['repas','transport','hebergement','peage','carburant','inscription','fournitures','autre']) as t
  where not exists (select 1 from public.dmos_bareme);

-- ── Qualification automatique du régime ─────────────────────────────────────
create or replace function public.dmos_qualifier_ligne()
returns trigger language plpgsql security definer set search_path = public as $$
declare sd numeric; sa numeric;
begin
  if NEW.est_avantage_ps then
    select seuil_declaration, seuil_autorisation into sd, sa
      from public.dmos_bareme
      where type_avantage = NEW.type and actif
        and date_effet <= coalesce(NEW.date_depense, current_date)
      order by date_effet desc limit 1;
    if sd is not null and NEW.montant_ttc < sd then
      NEW.dmos_regime := null;                       -- sous le seuil : rien à faire
    elsif sa is not null and NEW.montant_ttc >= sa then
      NEW.dmos_regime := 'autorisation';
    else
      NEW.dmos_regime := 'declaration';
    end if;
  else
    NEW.dmos_regime := null;
    NEW.beneficiaire_pro_id := null;
    NEW.beneficiaire_externe_id := null;
    NEW.beneficiaire_nom := null;
    NEW.beneficiaire_rpps := null;
    NEW.beneficiaire_specialite := null;
  end if;
  return NEW;
end;
$$;
drop trigger if exists trg_dmos_qualifier on public.note_de_frais_ligne;
create trigger trg_dmos_qualifier
  before insert or update on public.note_de_frais_ligne
  for each row execute function public.dmos_qualifier_ligne();

-- ── RLS ─────────────────────────────────────────────────────────────────────
alter table public.dmos_bareme enable row level security;
drop policy if exists dmos_bareme_select on public.dmos_bareme;
create policy dmos_bareme_select on public.dmos_bareme for select
  using (public.current_professionnel_id() is not null);
drop policy if exists dmos_bareme_write on public.dmos_bareme;
create policy dmos_bareme_write on public.dmos_bareme for all
  using (public.current_niveau() = 0 or public.current_role_pro() = 'dirigeant')
  with check (public.current_niveau() = 0 or public.current_role_pro() = 'dirigeant');

-- Suivi DMOS : lecture nationale des lignes-avantages (dirigeant + admin),
-- en plus de la visibilité émetteur/validateur déjà en place.
drop policy if exists ndfl_select_dmos on public.note_de_frais_ligne;
create policy ndfl_select_dmos on public.note_de_frais_ligne for select
  using (
    est_avantage_ps and (
      public.current_niveau() = 0
      or (public.current_role_pro() = 'dirigeant'
          and exists (select 1 from public.note_de_frais n
                       where n.id = note_id and n.prestataire_id = public.current_prestataire_id()))
    )
  );
