-- =====================================================================
-- 0106 — DMOS : plafonds légaux (loi anti-cadeaux) par type d'avantage
--
-- Plafonds PAR OCCURRENCE (« petits avantages » exonérés). Le blocage de
-- validation (0105) s'appuie sur seuil_max → un montant au-dessus est refusé.
--   • Repas/collation improvisé : ≤ 30 € TTC (max 2/an/bénéficiaire)
--   • Fournitures de bureau      : ≤ 20 € TTC (par an/bénéficiaire)
--   • (Livres ≤ 30 € / 150 € an, échantillons ≤ 20 € / 3 an : types non gérés
--      ici ; hospitalité congrès = « raisonnable » via convention, pas de
--      montant fixé par la loi.)
--
-- NB : les LIMITES ANNUELLES (nb/montant par an et par bénéficiaire) ne sont pas
-- encore contrôlées (nécessite un cumul) — voir évolution dédiée.
-- =====================================================================

update public.dmos_bareme
   set seuil_max = 30,
       note = 'Loi anti-cadeaux : repas/collation improvisé ≤ 30 € TTC (max 2/an/bénéficiaire)'
 where type_avantage = 'repas';

update public.dmos_bareme
   set seuil_max = 20,
       note = 'Loi anti-cadeaux : fournitures de bureau ≤ 20 € TTC/an/bénéficiaire'
 where type_avantage = 'fournitures';
