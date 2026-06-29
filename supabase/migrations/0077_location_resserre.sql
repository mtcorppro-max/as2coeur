-- =====================================================================
-- 0077 — Resserre le marquage « location » aux machines réellement louées
--        et limite la maintenance préventive aux pompes.
--
-- Le pré-marquage par mots-clés de 0076 était trop large (≈197 articles :
-- batteries, câbles, cassettes, tubulures, sacs, housses, filtres… étaient
-- flagués à tort). On repart d'une base propre :
--   • Pompes (perfusion / nutrition) → location + maintenance 365 j
--   • Machines de cryothérapie (CRYONOV, GAMEREADY) → location, pas de maintenance
--   • Attelles cryo (applicateurs loués) → location, pas de maintenance
--   • Tout le reste → pas location, pas de maintenance
-- À exécuter APRÈS 0076. Le magasinier peut ensuite ajuster à la main
-- (Magasin → filtre « Location »).
-- =====================================================================

-- Base propre.
update public.article set est_location = false, maintenance_jours = 0;

-- Pompes — location + maintenance préventive annuelle.
update public.article
set est_location = true, maintenance_jours = 365
where designation ilike 'POMPE %';

-- Machines de cryothérapie — location, sans maintenance.
update public.article
set est_location = true, maintenance_jours = 0
where upper(designation) in ('CRYONOV', 'GAMEREADY', 'GAME READY');

-- Attelles cryo (applicateurs loués) — location, sans maintenance.
update public.article
set est_location = true, maintenance_jours = 0
where designation ilike 'ATTELLE%'
  and ( designation ilike '%CRYO%'
     or designation ilike '%GAMEREADY%'
     or designation ilike '%GAME READY%'
     or designation ilike '%ICE%'
     or designation ilike '%IGLOO%'
     or designation ilike '%FREEZ%'
     or designation ilike '%AZOTE%'
     or designation ilike '%PACK FROID%'
     or designation ilike '%SQUID%' );

-- Cohérence des équipements déjà au parc : pas d'échéance de maintenance hors pompes.
update public.equipement e
set prochaine_maintenance = null, updated_at = now()
from public.article a
where a.code = e.article_code and a.maintenance_jours = 0 and e.prochaine_maintenance is not null;
