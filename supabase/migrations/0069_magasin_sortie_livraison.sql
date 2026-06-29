-- =====================================================================
-- 0069 — Magasin (sortie) : articles des livraisons patients → stock
--
--   livraison_ligne : articles + quantités attachés à une livraison patient.
--   « réservé »      : somme des articles des livraisons NON livrées de
--                      l'agence → calculé en direct (fonction stock_reserve).
--   « disponible »   : décrémenté automatiquement quand la livraison passe
--                      à « livree » (trigger), re-crédité si on l'annule.
-- =====================================================================

-- Le « réservé » est désormais dérivé (calculé), plus stocké.
alter table public.stock drop column if exists reserve;

-- ── Articles d'une livraison patient ────────────────────────────────
create table if not exists public.livraison_ligne (
  id           uuid primary key default gen_random_uuid(),
  livraison_id uuid not null references public.livraison(id) on delete cascade,
  article_code text not null references public.article(code) on delete cascade,
  quantite     integer not null check (quantite > 0)
);
create index if not exists idx_livraison_ligne_liv on public.livraison_ligne (livraison_id);
alter table public.livraison_ligne enable row level security;

-- Accès aux lignes = accès à la livraison parente (mêmes droits que livraison).
drop policy if exists livraison_ligne_all on public.livraison_ligne;
create policy livraison_ligne_all on public.livraison_ligne for all
  using (
    exists (
      select 1 from public.livraison l
      where l.id = livraison_id and (
        public.current_niveau() = 0
        or l.livreur_id = public.current_professionnel_id()
        or (l.prestataire_id = public.current_prestataire_id()
            and (public.current_role_pro() = 'coordinatrice' or public.current_niveau() <= 1))
        or (public.current_role_pro() = 'livreur' and public.peut_voir_patient(l.patient_id))
        or (public.current_role_pro() = 'infirmiere_liberale' and public.peut_voir_patient(l.patient_id))
      )
    )
  )
  with check (
    exists (
      select 1 from public.livraison l
      where l.id = livraison_id and (
        public.current_niveau() = 0
        or l.livreur_id = public.current_professionnel_id()
        or (l.prestataire_id = public.current_prestataire_id()
            and (public.current_role_pro() = 'coordinatrice' or public.current_niveau() <= 1))
        or (public.current_role_pro() = 'livreur' and public.peut_voir_patient(l.patient_id))
        or (public.current_role_pro() = 'infirmiere_liberale' and public.peut_voir_patient(l.patient_id))
      )
    )
  );

-- ── « Réservé » par article pour l'agence du compte connecté ────────
create or replace function public.stock_reserve()
returns table(article_code text, qte bigint)
language sql stable security definer set search_path = public as $$
  select cl.article_code, sum(cl.quantite)::bigint
  from public.livraison_ligne cl
  join public.livraison l on l.id = cl.livraison_id
  join public.patient pa on pa.id = l.patient_id
  where pa.agence_id = public.current_agence_id()
    and l.statut in ('a_programmer', 'a_planifier', 'planifiee')
  group by cl.article_code;
$$;

-- ── Décrément/recrédit du stock au changement de statut de livraison ─
create or replace function public.trg_livraison_stock()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_agence uuid;
begin
  if NEW.statut = OLD.statut then return NEW; end if;
  select agence_id into v_agence from public.patient where id = NEW.patient_id;
  if v_agence is null then return NEW; end if;

  -- Passage à « livrée » : sortie de stock (disponible -=).
  if NEW.statut = 'livree' and OLD.statut <> 'livree' then
    insert into public.stock (agence_id, article_code, quantite)
    select v_agence, cl.article_code, -sum(cl.quantite)
    from public.livraison_ligne cl where cl.livraison_id = NEW.id
    group by cl.article_code
    on conflict (agence_id, article_code)
    do update set quantite = public.stock.quantite + excluded.quantite, updated_at = now();

  -- Annulation d'une livraison livrée : retour en stock (disponible +=).
  elsif OLD.statut = 'livree' and NEW.statut <> 'livree' then
    insert into public.stock (agence_id, article_code, quantite)
    select v_agence, cl.article_code, sum(cl.quantite)
    from public.livraison_ligne cl where cl.livraison_id = NEW.id
    group by cl.article_code
    on conflict (agence_id, article_code)
    do update set quantite = public.stock.quantite + excluded.quantite, updated_at = now();
  end if;

  return NEW;
end $$;

drop trigger if exists livraison_stock on public.livraison;
create trigger livraison_stock
  after update on public.livraison
  for each row execute function public.trg_livraison_stock();
