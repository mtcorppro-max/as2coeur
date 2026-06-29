-- =====================================================================
-- 0083 — Facturation prévisionnelle : forfaits récurrents (Lot 5)
--
--   patient_forfait : forfait(s) LPP attaché(s) à la prise en charge d'un
--                     patient (PERFADOM hebdo, NEAD journalier, installation…).
--                     Choisis par la coordinatrice ; projetés sur la PEC.
--   facture_previsionnelle : ajout source 'forfait' + lpp_code + forfait_id.
--   generer_factures_previsionnelles() : génère aussi une facture par période
--                     écoulée (jusqu'à aujourd'hui, borné fin de PEC).
--
-- À exécuter après 0082 (+ seed_forfaits.sql pour les tarifs).
-- =====================================================================

create table if not exists public.patient_forfait (
  id          uuid primary key default gen_random_uuid(),
  patient_id  uuid not null references public.patient(id) on delete cascade,
  lpp_code    text not null references public.lpp(code),
  date_debut  date not null,
  date_fin    date not null,
  actif       boolean not null default true,
  created_at  timestamptz not null default now()
);
create index if not exists idx_patient_forfait_patient on public.patient_forfait (patient_id);
alter table public.patient_forfait enable row level security;

drop policy if exists patient_forfait_select on public.patient_forfait;
create policy patient_forfait_select on public.patient_forfait for select
  using (
    public.current_niveau() = 0
    or public.peut_voir_patient(patient_id)
    or (public.current_niveau() <= 1 or public.current_role_pro() = 'dirigeant')
  );

-- Écriture : coordinatrice du patient, managers/dirigeant, plateforme.
drop policy if exists patient_forfait_write on public.patient_forfait;
create policy patient_forfait_write on public.patient_forfait for all
  using (
    public.current_niveau() = 0
    or (public.current_role_pro() = 'coordinatrice' and public.peut_voir_patient(patient_id))
    or (public.patient_dans_mon_prestataire(patient_id) and (public.current_niveau() <= 1 or public.current_role_pro() = 'dirigeant'))
  )
  with check (
    public.current_niveau() = 0
    or (public.current_role_pro() = 'coordinatrice' and public.peut_voir_patient(patient_id))
    or (public.patient_dans_mon_prestataire(patient_id) and (public.current_niveau() <= 1 or public.current_role_pro() = 'dirigeant'))
  );

-- Extension des factures pour les forfaits.
alter table public.facture_previsionnelle
  add column if not exists source     text not null default 'unite' check (source in ('unite', 'forfait')),
  add column if not exists lpp_code   text,
  add column if not exists forfait_id uuid references public.patient_forfait(id) on delete cascade;
create unique index if not exists idx_facture_forfait_periode on public.facture_previsionnelle (forfait_id, periode_debut) where source = 'forfait';

-- Génération : à l'unité (livraisons) + forfaits récurrents (périodes écoulées).
create or replace function public.generer_factures_previsionnelles()
returns integer language plpgsql security definer set search_path = public as $$
declare
  v_taux_defaut numeric := coalesce((select taux_secu_defaut from public.facturation_param where id), 0.6);
  v_cree int := 0;
  l record; o record; p record; fo record; d date;
  v_base numeric; v_secu numeric; v_mut numeric; v_pat numeric; v_taux numeric;
  v_prix numeric; v_per text; v_step interval; v_fin date; v_id uuid;
begin
  -- 1) Annulations (livraison annulée OU forfait inactif).
  update public.facture_previsionnelle f set statut = 'annulee'
    where f.statut = 'a_facturer' and f.source = 'unite' and f.livraison_id is not null
      and not exists (select 1 from public.livraison l where l.id = f.livraison_id and l.statut = 'livree');
  update public.facture_previsionnelle f set statut = 'annulee'
    where f.statut = 'a_facturer' and f.source = 'forfait'
      and not exists (select 1 from public.patient_forfait pf where pf.id = f.forfait_id and pf.actif);

  -- 2) À l'unité : une facture par livraison livrée éligible.
  for l in
    select liv.id, liv.patient_id, liv.livree_le from public.livraison liv
    where liv.statut = 'livree'
      and not exists (select 1 from public.facture_previsionnelle f where f.livraison_id = liv.id)
  loop
    select pa.id, pa.agence_id, pa.prestataire_id, pa.ald, pa.a_mutuelle, pa.taux_mutuelle into p from public.patient pa where pa.id = l.patient_id;
    if p.id is null then continue; end if;
    select ord.id, ord.destinataire_id, ord.signataire_nom into o from public.ordonnance ord
      where ord.patient_id = l.patient_id and ord.statut = 'signee' order by ord.signee_le desc nulls last, ord.created_at desc limit 1;
    if o.id is null then continue; end if;
    select coalesce(sum(ll.quantite * lp.prix_ttc), 0) into v_base
      from public.livraison_ligne ll join public.article a on a.code = ll.article_code join public.lpp lp on lp.code = a.lpp_code
      where ll.livraison_id = l.id and lp.prix_ttc is not null;
    if v_base is null or v_base = 0 then continue; end if;
    v_taux := case when p.ald then 1.0 else v_taux_defaut end;
    v_secu := round(v_base * v_taux, 2);
    v_mut  := case when p.a_mutuelle then round((v_base - v_secu) * coalesce(p.taux_mutuelle, 1.0), 2) else 0 end;
    v_pat  := round(v_base - v_secu - v_mut, 2);
    insert into public.facture_previsionnelle
      (patient_id, agence_id, prestataire_id, medecin_id, medecin_nom, livraison_id, ordonnance_id, periode_debut, periode_fin, montant_base, part_secu, part_mutuelle, part_patient, statut, source)
    values (p.id, p.agence_id, p.prestataire_id, o.destinataire_id, o.signataire_nom, l.id, o.id, l.livree_le::date, l.livree_le::date, v_base, v_secu, v_mut, v_pat, 'a_facturer', 'unite')
    returning id into v_id;
    insert into public.facture_ligne (facture_id, article_code, lpp_code, designation, quantite, prix_unitaire, montant)
    select v_id, ll.article_code, a.lpp_code, a.designation, ll.quantite, lp.prix_ttc, ll.quantite * lp.prix_ttc
      from public.livraison_ligne ll join public.article a on a.code = ll.article_code join public.lpp lp on lp.code = a.lpp_code
      where ll.livraison_id = l.id and lp.prix_ttc is not null;
    v_cree := v_cree + 1;
  end loop;

  -- 3) Forfaits récurrents : une facture par période écoulée (jusqu'à aujourd'hui, borné fin de PEC).
  for fo in
    select pf.id, pf.patient_id, pf.lpp_code, pf.date_debut, pf.date_fin,
           pa.agence_id, pa.prestataire_id, pa.ald, pa.a_mutuelle, pa.taux_mutuelle
    from public.patient_forfait pf join public.patient pa on pa.id = pf.patient_id
    where pf.actif
  loop
    select lp.prix_ttc, lp.periodicite into v_prix, v_per from public.lpp lp where lp.code = fo.lpp_code;
    if v_prix is null then continue; end if;
    select ord.id, ord.destinataire_id, ord.signataire_nom into o from public.ordonnance ord
      where ord.patient_id = fo.patient_id and ord.statut = 'signee' order by ord.signee_le desc nulls last, ord.created_at desc limit 1;
    if o.id is null then continue; end if; -- forfait établi à la signature de l'ordonnance

    v_taux := case when fo.ald then 1.0 else v_taux_defaut end;
    v_secu := round(v_prix * v_taux, 2);
    v_mut  := case when fo.a_mutuelle then round((v_prix - v_secu) * coalesce(fo.taux_mutuelle, 1.0), 2) else 0 end;
    v_pat  := round(v_prix - v_secu - v_mut, 2);
    v_fin  := least(current_date, fo.date_fin);
    v_step := case v_per when 'journalier' then interval '1 day' when 'hebdomadaire' then interval '7 days' when 'mensuel' then interval '1 month' else interval '0' end;

    for d in
      select g::date from generate_series(
        fo.date_debut,
        case when v_per = 'installation' then fo.date_debut else v_fin end,
        case when v_per = 'installation' then interval '1000 years' else v_step end
      ) g
      where g::date <= v_fin
    loop
      if not exists (select 1 from public.facture_previsionnelle f where f.forfait_id = fo.id and f.periode_debut = d) then
        insert into public.facture_previsionnelle
          (patient_id, agence_id, prestataire_id, medecin_id, medecin_nom, ordonnance_id, periode_debut, periode_fin, montant_base, part_secu, part_mutuelle, part_patient, statut, source, lpp_code, forfait_id)
        values (fo.patient_id, fo.agence_id, fo.prestataire_id, o.destinataire_id, o.signataire_nom, o.id, d,
                case when v_per = 'installation' then d else (d + v_step - interval '1 day')::date end,
                v_prix, v_secu, v_mut, v_pat, 'a_facturer', 'forfait', fo.lpp_code, fo.id);
        v_cree := v_cree + 1;
      end if;
    end loop;
  end loop;

  return v_cree;
end $$;

grant execute on function public.generer_factures_previsionnelles() to authenticated;
