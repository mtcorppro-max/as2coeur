-- =====================================================================
-- 0060 — Livraisons : pool « à programmer » (plus de rattachement livreur)
--
-- Le livreur n'est plus rattaché à un patient. La coordinatrice déclenche
-- une « livraison à programmer » (statut a_programmer, sans livreur). Les
-- livreurs de l'agence du patient voient le pool et prennent en charge la
-- livraison (ils s'y assignent). Un même patient peut être livré par des
-- livreurs différents au fil du temps → plusieurs livraisons possibles.
-- =====================================================================

-- Livraison non encore prise : pas de livreur.
alter table public.livraison alter column livreur_id drop not null;

-- Nouveau statut "a_programmer" (pool, non pris).
alter table public.livraison drop constraint if exists livraison_statut_check;
alter table public.livraison
  add constraint livraison_statut_check
  check (statut in ('a_programmer', 'a_planifier', 'planifiee', 'livree'));

-- Plusieurs livraisons possibles pour un même patient (au fil du temps).
alter table public.livraison drop constraint if exists livraison_patient_id_livreur_id_key;

-- RLS lecture : livreur -> livraisons des patients qu'il peut voir (son agence,
-- via peut_voir_patient) ; sinon la sienne ou coordinatrice/manager/plateforme.
drop policy if exists livraison_select on public.livraison;
create policy livraison_select on public.livraison for select
  using (
    public.current_niveau() = 0
    or livreur_id = public.current_professionnel_id()
    or (prestataire_id = public.current_prestataire_id()
        and (public.current_role_pro() = 'coordinatrice' or public.current_niveau() <= 1))
    or (public.current_role_pro() = 'livreur' and public.peut_voir_patient(patient_id))
  );

-- RLS écriture : la coordinatrice/manager crée/gère les livraisons du
-- prestataire ; le livreur prend en charge (s'assigne) une livraison d'un
-- patient de son agence.
drop policy if exists livraison_write on public.livraison;
create policy livraison_write on public.livraison for all
  using (
    public.current_niveau() = 0
    or livreur_id = public.current_professionnel_id()
    or (prestataire_id = public.current_prestataire_id()
        and (public.current_role_pro() = 'coordinatrice' or public.current_niveau() <= 1))
    or (public.current_role_pro() = 'livreur' and public.peut_voir_patient(patient_id))
  )
  with check (
    public.current_niveau() = 0
    or (prestataire_id = public.current_prestataire_id()
        and (public.current_role_pro() = 'coordinatrice' or public.current_niveau() <= 1))
    or (public.current_role_pro() = 'livreur'
        and livreur_id = public.current_professionnel_id()
        and public.peut_voir_patient(patient_id))
  );
