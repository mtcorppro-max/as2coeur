-- =====================================================================
-- 0044 — Messagerie interne entre soignants (comptes professionnels)
-- =====================================================================

create table if not exists public.message_pro (
  id              uuid primary key default gen_random_uuid(),
  expediteur_id   uuid not null references public.professionnel(id) on delete cascade,
  destinataire_id uuid not null references public.professionnel(id) on delete cascade,
  contenu         text not null,
  lu              boolean not null default false,
  created_at      timestamptz not null default now()
);
create index if not exists idx_message_pro_dest on public.message_pro (destinataire_id, lu);
create index if not exists idx_message_pro_exp  on public.message_pro (expediteur_id);

alter table public.message_pro enable row level security;

-- On ne voit que ses propres conversations (envoyées ou reçues).
drop policy if exists mp_select on public.message_pro;
create policy mp_select on public.message_pro for select
  using (expediteur_id = public.current_professionnel_id() or destinataire_id = public.current_professionnel_id());

-- On n'envoie qu'en son nom.
drop policy if exists mp_insert on public.message_pro;
create policy mp_insert on public.message_pro for insert
  with check (expediteur_id = public.current_professionnel_id());

-- Le destinataire peut marquer ses messages comme lus.
drop policy if exists mp_update on public.message_pro;
create policy mp_update on public.message_pro for update
  using (destinataire_id = public.current_professionnel_id())
  with check (destinataire_id = public.current_professionnel_id());
