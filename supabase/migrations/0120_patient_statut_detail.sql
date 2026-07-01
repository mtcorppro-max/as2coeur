-- 0120 : détail du statut de prise en charge.
-- Renseigné lorsqu'on met un statut partiel (arrêt des perfusions / suspendu /
-- hospitalisé / décédé) : nombre de perfusions effectuées sur le total prévu du
-- protocole + une note libre. jsonb : { effectuees, prevues, note, le }.
alter table patient add column if not exists statut_detail jsonb;
