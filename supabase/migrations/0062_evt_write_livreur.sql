-- =====================================================================
-- 0062 — Un livreur peut poser ses propres absences dans le planning
--
-- En plus des règles existantes (niveau 0 ; coordinatrice ou niveau ≤ 1 du
-- prestataire), un livreur peut créer / modifier / supprimer UNIQUEMENT ses
-- propres lignes (professionnel_id = lui-même). Ses demandes passent
-- « en_attente » (contrôlé applicativement) et sont validées par le manager.
-- Les livreurs restent séparés des coordinatrices dans l'affichage.
-- =====================================================================

drop policy if exists evt_write_gestion on public.evenement_planning;
create policy evt_write_gestion on public.evenement_planning for all
  using (
    public.current_niveau() = 0
    or (prestataire_id = public.current_prestataire_id()
        and (public.current_role_pro() = 'coordinatrice' or public.current_niveau() <= 1))
    or (prestataire_id = public.current_prestataire_id()
        and public.current_role_pro() = 'livreur'
        and professionnel_id = public.current_professionnel_id())
  )
  with check (
    public.current_niveau() = 0
    or (prestataire_id = public.current_prestataire_id()
        and (public.current_role_pro() = 'coordinatrice' or public.current_niveau() <= 1))
    or (prestataire_id = public.current_prestataire_id()
        and public.current_role_pro() = 'livreur'
        and professionnel_id = public.current_professionnel_id())
  );
