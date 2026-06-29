-- =====================================================================
-- 0074 — Parc de matériel médical loué (socle)
--
--   equipement_type      : catalogue (intervalle maintenance + durée max location)
--   equipement           : appareil physique sérialisé (par agence)
--   equipement_mouvement : timeline des mouvements
--
-- Géré par le magasinier de l'agence (lecture aussi coordinatrice/livreur
-- pour le contexte patient/livraison). Pas d'accès patient médical.
-- =====================================================================

-- ── Catalogue de types ──────────────────────────────────────────────
create table if not exists public.equipement_type (
  id                  uuid primary key default gen_random_uuid(),
  nom                 text not null unique,
  maintenance_jours   integer not null default 365,   -- intervalle entre 2 maintenances
  location_max_jours  integer,                          -- durée max chez un patient (null = illimité)
  created_at          timestamptz not null default now()
);
alter table public.equipement_type enable row level security;

drop policy if exists equipement_type_select on public.equipement_type;
create policy equipement_type_select on public.equipement_type for select
  using (public.current_professionnel_id() is not null);

drop policy if exists equipement_type_write on public.equipement_type;
create policy equipement_type_write on public.equipement_type for all
  using (public.current_niveau() = 0 or public.current_role_pro() = 'magasinier')
  with check (public.current_niveau() = 0 or public.current_role_pro() = 'magasinier');

-- Quelques types de départ.
insert into public.equipement_type (nom, maintenance_jours, location_max_jours) values
  ('Concentrateur O₂', 180, 90),
  ('Pompe à nutrition', 365, 60),
  ('Pompe à perfusion', 365, 60),
  ('Lit médicalisé', 365, null),
  ('Fauteuil roulant', 365, null),
  ('Aspirateur de mucosités', 180, 60)
on conflict (nom) do nothing;

-- ── Équipement (appareil physique) ──────────────────────────────────
create table if not exists public.equipement (
  id                   uuid primary key default gen_random_uuid(),
  agence_id            uuid not null references public.agence(id) on delete cascade,
  type_id              uuid not null references public.equipement_type(id) on delete restrict,
  numero_serie         text not null,
  statut               text not null default 'disponible'
                       check (statut in ('disponible', 'affecte', 'chez_patient', 'en_transit', 'en_maintenance', 'hors_service')),
  etat                 text,                              -- dernière condition constatée
  patient_actuel_id    uuid references public.patient(id) on delete set null,
  chez_patient_depuis  timestamptz,
  livraison_id         uuid references public.livraison(id) on delete set null,
  derniere_maintenance date,
  prochaine_maintenance date,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  unique (agence_id, numero_serie)
);
create index if not exists idx_equipement_agence on public.equipement (agence_id);
create index if not exists idx_equipement_patient on public.equipement (patient_actuel_id);
alter table public.equipement enable row level security;

-- Lecture : magasinier / coordinatrice / livreur de l'agence (+ plateforme).
drop policy if exists equipement_select on public.equipement;
create policy equipement_select on public.equipement for select
  using (
    public.current_niveau() = 0
    or (public.current_role_pro() in ('magasinier', 'coordinatrice', 'livreur')
        and agence_id = public.current_agence_id())
  );

-- Écriture : magasinier de l'agence (les transitions terrain du livreur
-- passeront par des RPC dédiées au lot 2).
drop policy if exists equipement_write on public.equipement;
create policy equipement_write on public.equipement for all
  using (public.current_niveau() = 0 or (public.current_role_pro() = 'magasinier' and agence_id = public.current_agence_id()))
  with check (public.current_niveau() = 0 or (public.current_role_pro() = 'magasinier' and agence_id = public.current_agence_id()));

-- ── Mouvements (timeline) ───────────────────────────────────────────
create table if not exists public.equipement_mouvement (
  id            uuid primary key default gen_random_uuid(),
  equipement_id uuid not null references public.equipement(id) on delete cascade,
  type_mouvement text not null,   -- ajout, affectation, livraison, recuperation_patient, retour_agence, mise_maintenance, fin_maintenance, reforme
  date          timestamptz not null default now(),
  patient_id    uuid references public.patient(id) on delete set null,
  livraison_id  uuid references public.livraison(id) on delete set null,
  etat          text,
  note          text,
  auteur_id     uuid references public.professionnel(id) on delete set null,
  auteur_nom    text
);
create index if not exists idx_equip_mvt_equip on public.equipement_mouvement (equipement_id, date);
alter table public.equipement_mouvement enable row level security;

-- Lecture : ceux qui voient l'équipement.
drop policy if exists equipement_mouvement_select on public.equipement_mouvement;
create policy equipement_mouvement_select on public.equipement_mouvement for select
  using (
    exists (select 1 from public.equipement e where e.id = equipement_id and (
      public.current_niveau() = 0
      or (public.current_role_pro() in ('magasinier', 'coordinatrice', 'livreur') and e.agence_id = public.current_agence_id())
    ))
  );

-- Écriture : magasinier de l'agence de l'équipement (+ plateforme).
drop policy if exists equipement_mouvement_write on public.equipement_mouvement;
create policy equipement_mouvement_write on public.equipement_mouvement for all
  using (
    exists (select 1 from public.equipement e where e.id = equipement_id and (
      public.current_niveau() = 0 or (public.current_role_pro() = 'magasinier' and e.agence_id = public.current_agence_id())))
  )
  with check (
    exists (select 1 from public.equipement e where e.id = equipement_id and (
      public.current_niveau() = 0 or (public.current_role_pro() = 'magasinier' and e.agence_id = public.current_agence_id())))
  );
