-- =====================================================================
-- 0119 — Realtime sur bilan_etat et alerte
--
-- Permet aux clients de recevoir les changements en direct (sans recharger) :
--   • patient : passage de son bilan en « reçu et lu » + alertes ;
--   • coordinatrice : nouveau bilan déposé par un de ses patients.
-- (La RLS reste appliquée : chacun ne reçoit que ce qu'il a le droit de voir.)
-- =====================================================================

do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'bilan_etat') then
    alter publication supabase_realtime add table public.bilan_etat;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'alerte') then
    alter publication supabase_realtime add table public.alerte;
  end if;
end $$;
