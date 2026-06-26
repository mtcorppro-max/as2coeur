-- =====================================================================
-- 0035 — Validation des demandes de planning par le manager
--
-- Les événements créés par une coordinatrice (congés, astreinte, formation,
-- autre) passent « en_attente » jusqu'à validation par un manager (niveau ≤ 1).
-- Ceux créés par un manager/niveau 0 sont directement « valide ».
-- (L'arrêt maladie n'est posable que par un manager — contrôlé applicativement.)
-- =====================================================================

alter table public.evenement_planning
  add column if not exists statut text not null default 'valide'
  check (statut in ('valide', 'en_attente'));
