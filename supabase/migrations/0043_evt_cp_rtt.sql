-- =====================================================================
-- 0043 — Remplace le type d'événement « congés » par « CP » et « RTT »
-- =====================================================================

-- On retire d'abord l'ancienne contrainte (elle n'autorise pas 'cp'),
-- puis on migre les congés existants en CP, puis on pose la nouvelle contrainte.
alter table public.evenement_planning drop constraint if exists evenement_planning_type_check;

update public.evenement_planning set type = 'cp' where type = 'conges';

alter table public.evenement_planning add constraint evenement_planning_type_check
  check (type in ('astreinte', 'cp', 'rtt', 'arret_maladie', 'formation', 'autre'));
