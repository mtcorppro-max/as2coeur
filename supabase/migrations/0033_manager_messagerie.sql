-- =====================================================================
-- 0033 — Le manager accède au chat patient (comme une coordinatrice)
--
-- À exécuter APRÈS la 0032 (la valeur d'enum 'manager' doit être committée).
-- =====================================================================

drop policy if exists message_select_pro on public.message;
create policy message_select_pro on public.message for select
  using (
    public.peut_voir_patient(patient_id)
    and public.current_role_pro()::text in ('coordinatrice', 'manager', 'chirurgien')
  );

drop policy if exists message_insert_pro on public.message;
create policy message_insert_pro on public.message for insert
  with check (
    public.patient_dans_mon_prestataire(patient_id)
    and public.current_role_pro()::text in ('coordinatrice', 'manager', 'chirurgien')
    and auteur_user_id = auth.uid()
  );
