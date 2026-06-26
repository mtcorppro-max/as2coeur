-- =====================================================================
-- 0032 — Rôle « manager »
--
-- Un manager est comme une infirmière coordinatrice (mêmes droits) avec des
-- fonctions en plus (onglet PEC…). Il est de niveau 1 (région) et n'est
-- créable que par un niveau 0.
-- =====================================================================

alter type role_professionnel add value if not exists 'manager';
