-- =====================================================================
-- 0113 — Le patient peut lire ses propres alertes
--
-- Utile pour le rappel de bilan : s'il y a une alerte active (seuil dépassé),
-- on NE présente PAS le questionnaire (l'infirmière coordinatrice appelle pour
-- un suivi en direct).
-- =====================================================================

drop policy if exists alerte_select_self on public.alerte;
create policy alerte_select_self on public.alerte for select
  using (exists (select 1 from public.patient p where p.id = patient_id and p.user_id = auth.uid()));
