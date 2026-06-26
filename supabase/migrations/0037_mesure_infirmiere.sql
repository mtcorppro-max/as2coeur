-- =====================================================================
-- 0037 — L'infirmière libérale peut saisir les constantes de ses patients
--
-- À exécuter APRÈS la 0036 (la valeur d'enum doit être committée).
-- =====================================================================

drop policy if exists mesure_insert_inf on public.mesure;
create policy mesure_insert_inf on public.mesure for insert
  with check (
    public.peut_voir_patient(patient_id)
    and public.current_role_pro()::text = 'infirmiere_liberale'
  );
