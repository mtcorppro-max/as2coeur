-- =====================================================================
-- 0021 — Pharmacie / Per os & matériel paramédical
--
-- Indique si le prestataire doit commander lui-même les médicaments Per os
-- en pharmacie (oui/non + lesquels) et la liste du matériel paramédical
-- à commander (attelle de genou, bas de contention…).
-- =====================================================================

alter table public.professionnel
  add column if not exists pharmacie_per_os        boolean,
  add column if not exists pharmacie_per_os_detail text,
  add column if not exists materiel_paramedical    text;
