-- =====================================================================
-- 0091 — Temps réel (Supabase Realtime) pour les notifications
--
-- Active la réplication Realtime sur les tables des notifications instantanées :
--   ordonnance   → badge « À signer » du médecin (dès réception)
--   message_pro  → badge « Messages » (dès réception)
-- La RLS existante s'applique : chaque abonné ne reçoit que les changements
-- des lignes qu'il a le droit de voir. Idempotent.
-- =====================================================================

do $$
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    create publication supabase_realtime;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'ordonnance') then
    alter publication supabase_realtime add table public.ordonnance;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'message_pro') then
    alter publication supabase_realtime add table public.message_pro;
  end if;
end $$;
