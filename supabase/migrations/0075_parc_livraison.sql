-- =====================================================================
-- 0075 — Parc : intégration au flux livraison
--
--   livraison_equipement : matériel de location d'une livraison.
--     - la COORDINATRICE demande un TYPE (equipement_id null)
--     - le MAGASINIER affecte un appareil précis (equipement_id) → 'affecte'
--   À la livraison (statut 'livree') : l'appareil passe 'chez_patient' (trigger).
--   Récupération (livreur, chez le patient) : RPC → 'en_transit'.
--   Retour à l'agence (magasinier) : côté appli → 'disponible'/'en_maintenance'.
-- =====================================================================

create table if not exists public.livraison_equipement (
  id            uuid primary key default gen_random_uuid(),
  livraison_id  uuid not null references public.livraison(id) on delete cascade,
  type_id       uuid not null references public.equipement_type(id) on delete restrict,
  equipement_id uuid references public.equipement(id) on delete set null,
  created_at    timestamptz not null default now()
);
create index if not exists idx_liv_equip_liv on public.livraison_equipement (livraison_id);
alter table public.livraison_equipement enable row level security;

-- Lecture : accès à la livraison parente.
drop policy if exists livraison_equipement_select on public.livraison_equipement;
create policy livraison_equipement_select on public.livraison_equipement for select
  using (
    exists (select 1 from public.livraison l where l.id = livraison_id and (
      public.current_niveau() = 0
      or l.livreur_id = public.current_professionnel_id()
      or (l.prestataire_id = public.current_prestataire_id() and (public.current_role_pro() = 'coordinatrice' or public.current_niveau() <= 1))
      or (public.current_role_pro() = 'livreur' and public.peut_voir_patient(l.patient_id))
      or (public.current_role_pro() = 'infirmiere_liberale' and public.peut_voir_patient(l.patient_id))
      or (public.current_role_pro() = 'magasinier' and exists (select 1 from public.patient pa where pa.id = l.patient_id and pa.agence_id = public.current_agence_id()))
    ))
  );

-- Demande (INSERT/DELETE) : coordinatrice (+ plateforme).
drop policy if exists livraison_equipement_insert on public.livraison_equipement;
create policy livraison_equipement_insert on public.livraison_equipement for insert
  with check (
    public.current_niveau() = 0
    or (public.current_role_pro() = 'coordinatrice'
        and exists (select 1 from public.livraison l where l.id = livraison_id and l.prestataire_id = public.current_prestataire_id()))
  );
drop policy if exists livraison_equipement_delete on public.livraison_equipement;
create policy livraison_equipement_delete on public.livraison_equipement for delete
  using (
    public.current_niveau() = 0
    or (public.current_role_pro() = 'coordinatrice'
        and exists (select 1 from public.livraison l where l.id = livraison_id and l.prestataire_id = public.current_prestataire_id()))
  );

-- Affectation (UPDATE equipement_id) : magasinier de l'agence (+ plateforme).
drop policy if exists livraison_equipement_update on public.livraison_equipement;
create policy livraison_equipement_update on public.livraison_equipement for update
  using (
    public.current_niveau() = 0
    or (public.current_role_pro() = 'magasinier'
        and exists (select 1 from public.livraison l join public.patient pa on pa.id = l.patient_id
                    where l.id = livraison_id and pa.agence_id = public.current_agence_id()))
  )
  with check (
    public.current_niveau() = 0
    or (public.current_role_pro() = 'magasinier'
        and exists (select 1 from public.livraison l join public.patient pa on pa.id = l.patient_id
                    where l.id = livraison_id and pa.agence_id = public.current_agence_id()))
  );

-- ── Trigger livraison : stock consommables + matériel de location ────
create or replace function public.trg_livraison_stock()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_agence uuid;
begin
  if NEW.statut = OLD.statut then return NEW; end if;
  select agence_id into v_agence from public.patient where id = NEW.patient_id;

  -- Consommables : sortie/retour de stock disponible.
  if v_agence is not null then
    if NEW.statut = 'livree' and OLD.statut <> 'livree' then
      insert into public.stock (agence_id, article_code, quantite)
      select v_agence, cl.article_code, -sum(cl.quantite)
      from public.livraison_ligne cl where cl.livraison_id = NEW.id group by cl.article_code
      on conflict (agence_id, article_code) do update set quantite = public.stock.quantite + excluded.quantite, updated_at = now();
    elsif OLD.statut = 'livree' and NEW.statut <> 'livree' then
      insert into public.stock (agence_id, article_code, quantite)
      select v_agence, cl.article_code, sum(cl.quantite)
      from public.livraison_ligne cl where cl.livraison_id = NEW.id group by cl.article_code
      on conflict (agence_id, article_code) do update set quantite = public.stock.quantite + excluded.quantite, updated_at = now();
    end if;
  end if;

  -- Matériel de location : passage chez le patient à la livraison.
  if NEW.statut = 'livree' and OLD.statut <> 'livree' then
    update public.equipement e
      set statut = 'chez_patient', patient_actuel_id = NEW.patient_id, chez_patient_depuis = now(), livraison_id = NEW.id, updated_at = now()
      from public.livraison_equipement le
      where le.livraison_id = NEW.id and le.equipement_id = e.id and e.statut in ('affecte', 'disponible');
    insert into public.equipement_mouvement (equipement_id, type_mouvement, patient_id, livraison_id)
      select le.equipement_id, 'livraison', NEW.patient_id, NEW.id
      from public.livraison_equipement le where le.livraison_id = NEW.id and le.equipement_id is not null;
  elsif OLD.statut = 'livree' and NEW.statut <> 'livree' then
    update public.equipement e
      set statut = 'affecte', patient_actuel_id = null, chez_patient_depuis = null, updated_at = now()
      from public.livraison_equipement le
      where le.livraison_id = NEW.id and le.equipement_id = e.id and e.statut = 'chez_patient';
  end if;

  return NEW;
end $$;

-- ── RPC récupération (livreur, chez le patient) → en_transit ────────
create or replace function public.equipement_recuperer(p_equipement uuid, p_etat text)
returns void language plpgsql security definer set search_path = public as $$
declare v_agence uuid; v_statut text; v_patient uuid;
begin
  select agence_id, statut, patient_actuel_id into v_agence, v_statut, v_patient
  from public.equipement where id = p_equipement;
  if v_statut is null then raise exception 'Équipement introuvable'; end if;
  if not (public.current_niveau() = 0
          or (public.current_role_pro() in ('livreur', 'magasinier') and v_agence = public.current_agence_id())) then
    raise exception 'Non autorisé';
  end if;
  if v_statut <> 'chez_patient' then raise exception 'Équipement non présent chez un patient'; end if;

  update public.equipement
    set statut = 'en_transit', etat = coalesce(p_etat, etat), patient_actuel_id = null, chez_patient_depuis = null, updated_at = now()
    where id = p_equipement;
  insert into public.equipement_mouvement (equipement_id, type_mouvement, patient_id, etat, auteur_id, auteur_nom)
    values (p_equipement, 'recuperation_patient', v_patient, p_etat, public.current_professionnel_id(),
            (select trim(coalesce(prenom,'') || ' ' || nom) from public.professionnel where id = public.current_professionnel_id()));
end $$;
