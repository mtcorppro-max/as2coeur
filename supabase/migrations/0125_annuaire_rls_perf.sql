-- =====================================================================
-- 0125 — Annuaire santé : performance RLS (1,08 M de lignes)
--
-- Les fonctions current_niveau() / current_prestataire_id() étaient
-- évaluées pour CHAQUE ligne scannée → statement timeout sur la
-- recherche (la loupe ne renvoyait rien). En les enveloppant dans un
-- (select …), Postgres les évalue une seule fois par requête (InitPlan).
-- =====================================================================

drop policy if exists annuaire_select on public.annuaire_sante;
create policy annuaire_select on public.annuaire_sante for select
  using ((select public.current_niveau()) = 0 or (select public.current_prestataire_id()) is not null);

drop policy if exists annuaire_update on public.annuaire_sante;
create policy annuaire_update on public.annuaire_sante for update
  using ((select public.current_niveau()) = 0 or (select public.current_prestataire_id()) is not null)
  with check ((select public.current_niveau()) = 0 or (select public.current_prestataire_id()) is not null);
