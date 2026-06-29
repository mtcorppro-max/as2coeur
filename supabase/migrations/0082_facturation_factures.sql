-- =====================================================================
-- 0082 — Facturation prévisionnelle Sécu : factures + génération (Lot 1)
--
--   facture_previsionnelle : une facture (prévisionnelle) par livraison livrée
--                            d'un patient ayant une ordonnance signée.
--   facture_ligne          : détail (article -> code LPP -> prix).
--   generer_factures_previsionnelles() : crée les factures manquantes et
--                            annule celles dont la livraison a été annulée.
--
-- Outil PRÉVISIONNEL — n'envoie rien à la Sécu. À exécuter après 0081 + seed_lpp.
-- =====================================================================

create table if not exists public.facture_previsionnelle (
  id             uuid primary key default gen_random_uuid(),
  patient_id     uuid not null references public.patient(id) on delete cascade,
  agence_id      uuid references public.agence(id) on delete set null,
  prestataire_id uuid references public.prestataire(id) on delete set null,
  medecin_id     uuid references public.professionnel(id) on delete set null,
  medecin_nom    text,
  livraison_id   uuid references public.livraison(id) on delete cascade,
  ordonnance_id  uuid references public.ordonnance(id) on delete set null,
  periode_debut  date,
  periode_fin    date,
  montant_base   numeric(10, 2) not null default 0,
  part_secu      numeric(10, 2) not null default 0,
  part_mutuelle  numeric(10, 2) not null default 0,
  part_patient   numeric(10, 2) not null default 0,
  statut         text not null default 'a_facturer'
                   check (statut in ('a_facturer', 'envoyee', 'payee', 'annulee')),
  ref_externe    text,                               -- n° de référence Sécu (saisi à l'envoi)
  envoyee_le     timestamptz,
  payee_le       timestamptz,
  created_at     timestamptz not null default now(),
  unique (livraison_id)
);
create index if not exists idx_facture_agence on public.facture_previsionnelle (agence_id);
create index if not exists idx_facture_statut on public.facture_previsionnelle (statut);
create index if not exists idx_facture_patient on public.facture_previsionnelle (patient_id);
create index if not exists idx_facture_periode on public.facture_previsionnelle (periode_debut);

create table if not exists public.facture_ligne (
  id             uuid primary key default gen_random_uuid(),
  facture_id     uuid not null references public.facture_previsionnelle(id) on delete cascade,
  article_code   text,
  lpp_code       text,
  designation    text,
  quantite       integer not null default 1,
  prix_unitaire  numeric(10, 2) not null default 0,
  montant        numeric(10, 2) not null default 0
);
create index if not exists idx_facture_ligne_facture on public.facture_ligne (facture_id);

alter table public.facture_previsionnelle enable row level security;
alter table public.facture_ligne enable row level security;

-- Lecture : plateforme ; managers/dirigeant du prestataire ; toute personne
-- autorisée à voir le patient (fiche patient, cloisonnée par agence).
drop policy if exists facture_select on public.facture_previsionnelle;
create policy facture_select on public.facture_previsionnelle for select
  using (
    public.current_niveau() = 0
    or public.peut_voir_patient(patient_id)
    or (prestataire_id = public.current_prestataire_id()
        and (public.current_niveau() <= 1 or public.current_role_pro() = 'dirigeant'))
  );

-- Écriture (marquer envoyée/payée, n° réf) : plateforme + managers/dirigeant du prestataire.
drop policy if exists facture_write on public.facture_previsionnelle;
create policy facture_write on public.facture_previsionnelle for all
  using (
    public.current_niveau() = 0
    or (prestataire_id = public.current_prestataire_id()
        and (public.current_niveau() <= 1 or public.current_role_pro() = 'dirigeant'))
  )
  with check (
    public.current_niveau() = 0
    or (prestataire_id = public.current_prestataire_id()
        and (public.current_niveau() <= 1 or public.current_role_pro() = 'dirigeant'))
  );

drop policy if exists facture_ligne_select on public.facture_ligne;
create policy facture_ligne_select on public.facture_ligne for select
  using (exists (select 1 from public.facture_previsionnelle f where f.id = facture_id));

drop policy if exists facture_ligne_write on public.facture_ligne;
create policy facture_ligne_write on public.facture_ligne for all
  using (public.current_niveau() = 0)
  with check (public.current_niveau() = 0);

-- Génération des factures prévisionnelles (à l'unité).
create or replace function public.generer_factures_previsionnelles()
returns integer language plpgsql security definer set search_path = public as $$
declare
  v_taux_defaut numeric := coalesce((select taux_secu_defaut from public.facturation_param where id), 0.6);
  v_cree int := 0;
  l record;
  o record;
  v_base numeric;
  v_secu numeric; v_mut numeric; v_pat numeric; v_taux numeric;
  p record;
  v_fid uuid;
begin
  -- 1) Annule les factures « à facturer » dont la livraison n'est plus livrée.
  update public.facture_previsionnelle f
    set statut = 'annulee'
    where f.statut = 'a_facturer'
      and f.livraison_id is not null
      and not exists (select 1 from public.livraison l where l.id = f.livraison_id and l.statut = 'livree');

  -- 2) Crée une facture pour chaque livraison livrée éligible sans facture.
  for l in
    select liv.id, liv.patient_id, liv.livree_le
    from public.livraison liv
    where liv.statut = 'livree'
      and not exists (select 1 from public.facture_previsionnelle f where f.livraison_id = liv.id)
  loop
    -- patient + droits
    select pa.id, pa.agence_id, pa.prestataire_id, pa.ald, pa.a_mutuelle, pa.taux_mutuelle
      into p from public.patient pa where pa.id = l.patient_id;
    if p.id is null then continue; end if;

    -- ordonnance signée du patient (la plus récente) — gate + médecin
    select ord.id, ord.destinataire_id, ord.signataire_nom
      into o from public.ordonnance ord
      where ord.patient_id = l.patient_id and ord.statut = 'signee'
      order by ord.signee_le desc nulls last, ord.created_at desc limit 1;
    if o.id is null then continue; end if; -- pas d'ordonnance signée -> pas de facture

    -- montant facturable = somme des lignes dont l'article a un code LPP tarifé
    select coalesce(sum(ll.quantite * lp.prix_ttc), 0)
      into v_base
      from public.livraison_ligne ll
      join public.article a on a.code = ll.article_code
      join public.lpp lp on lp.code = a.lpp_code
      where ll.livraison_id = l.id and lp.prix_ttc is not null;
    if v_base is null or v_base = 0 then continue; end if; -- rien de facturable

    v_taux := case when p.ald then 1.0 else v_taux_defaut end;
    v_secu := round(v_base * v_taux, 2);
    v_mut  := case when p.a_mutuelle then round((v_base - v_secu) * coalesce(p.taux_mutuelle, 1.0), 2) else 0 end;
    v_pat  := round(v_base - v_secu - v_mut, 2);

    insert into public.facture_previsionnelle
      (patient_id, agence_id, prestataire_id, medecin_id, medecin_nom, livraison_id, ordonnance_id,
       periode_debut, periode_fin, montant_base, part_secu, part_mutuelle, part_patient, statut)
    values
      (p.id, p.agence_id, p.prestataire_id, o.destinataire_id, o.signataire_nom, l.id, o.id,
       l.livree_le::date, l.livree_le::date, v_base, v_secu, v_mut, v_pat, 'a_facturer')
    returning id into v_fid;

    insert into public.facture_ligne (facture_id, article_code, lpp_code, designation, quantite, prix_unitaire, montant)
    select v_fid, ll.article_code, a.lpp_code, a.designation, ll.quantite, lp.prix_ttc, ll.quantite * lp.prix_ttc
      from public.livraison_ligne ll
      join public.article a on a.code = ll.article_code
      join public.lpp lp on lp.code = a.lpp_code
      where ll.livraison_id = l.id and lp.prix_ttc is not null;

    v_cree := v_cree + 1;
  end loop;

  return v_cree;
end $$;

grant execute on function public.generer_factures_previsionnelles() to authenticated;
