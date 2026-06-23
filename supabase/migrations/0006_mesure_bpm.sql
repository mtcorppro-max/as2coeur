-- =====================================================================
-- 0006 — Fréquence cardiaque (BPM)
--
-- Ajoute la valeur 'bpm' à l'énumération des types de mesure, pour le suivi
-- du pouls / fréquence cardiaque du patient.
--
-- À exécuter dans le SQL Editor de Supabase.
-- =====================================================================

alter type type_mesure add value if not exists 'bpm';
