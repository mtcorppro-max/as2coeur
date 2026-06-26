-- =====================================================================
-- SEED — Patient démo « Jean DÉMO » (Docteur Bypass)
--
-- Opération il y a 9 jours, prise en charge de 7 jours (terminée il y a 2 j).
-- Constantes 2×/jour (matin/soir) sur toute la période + fiches de suivi
-- à J1, J3, J5, J7. À exécuter dans le SQL Editor de Supabase.
--
-- Pour SUPPRIMER ce patient démo ensuite :
--   delete from public.patient where nom = 'Jean DÉMO';
-- (les mesures / suivis sont supprimés en cascade)
-- =====================================================================

do $$
declare
  v_presta  uuid;
  v_patient uuid;
  v_op      date := current_date - 9;  -- opération il y a 9 jours
  v_duree   int  := 7;                 -- prise en charge 7 j -> fin il y a 2 j
  d         int;
  ts_matin  timestamptz;
  ts_soir   timestamptz;
  fievre    numeric;
begin
  -- Prestataire de l'équipe (le 1er trouvé via un professionnel)
  select prestataire_id into v_presta from public.professionnel limit 1;
  if v_presta is null then
    select id into v_presta from public.prestataire limit 1;
  end if;

  -- Patient
  insert into public.patient (
    prestataire_id, nom, statut, telephone, email, adresse, ville, code_postal,
    date_naissance, operation, date_operation, duree_prise_en_charge, jours_suivi,
    chirurgien, pharmacie, pharmacie_tel
  ) values (
    v_presta, 'Jean DÉMO', 'terminee', '0612345678', 'jean.demo@exemple.fr',
    '12 rue des Lilas', 'Montpellier', '34000',
    '1972-04-15', 'Bypass gastrique', v_op, v_duree, array[1,3,5,7],
    'Docteur Bypass', 'Pharmacie du Centre', '0467000000'
  )
  returning id into v_patient;

  -- Mesures 2×/jour, de J0 (opération) au dernier jour (J7)
  for d in 0..v_duree loop
    ts_matin := (v_op + d) + time '08:00';
    ts_soir  := (v_op + d) + time '20:00';
    -- fébricule post-op les 2 premiers jours
    fievre := case when d <= 2 then 0.6 else 0 end;

    insert into public.mesure (patient_id, type, valeur, horodatage) values
      (v_patient, 'temperature',  round((36.6 + random()*0.4 + fievre)::numeric, 1), ts_matin),
      (v_patient, 'temperature',  round((36.9 + random()*0.4 + fievre)::numeric, 1), ts_soir),
      (v_patient, 'ta_systolique',round((128 - d*0.6 + random()*10)::numeric, 0),    ts_matin),
      (v_patient, 'ta_systolique',round((126 - d*0.6 + random()*10)::numeric, 0),    ts_soir),
      (v_patient, 'ta_diastolique',round((82 - d*0.3 + random()*6)::numeric, 0),     ts_matin),
      (v_patient, 'ta_diastolique',round((80 - d*0.3 + random()*6)::numeric, 0),     ts_soir),
      (v_patient, 'spo2',         round((case when d < 2 then 94 else 96 end + random()*3)::numeric, 0), ts_matin),
      (v_patient, 'spo2',         round((case when d < 2 then 95 else 97 end + random()*2)::numeric, 0), ts_soir),
      (v_patient, 'bpm',          round((88 - d*1.6 + random()*8)::numeric, 0),       ts_matin),
      (v_patient, 'bpm',          round((86 - d*1.6 + random()*8)::numeric, 0),       ts_soir),
      (v_patient, 'poids',        round((78 - d*0.1 + random()*0.6)::numeric, 1),     ts_matin);
  end loop;

  -- Fiches de suivi à J1, J3, J5, J7
  insert into public.suivi (patient_id, auteur_nom, etat_general, ta, pouls, temperature, spo2,
    douleur_en, alimentation, hydratation, transit, cicatrisation, mobilisation, bilan_sanguin, created_at)
  values
    (v_patient, 'Suivi AS2CŒUR', 'Réveil correct, patient fatigué',     '132/84', '92', '37,4', '95',
     '5', 'À jeun puis liquide', 'Perfusion en cours', 'Pas de transit', 'Cicatrice propre, pansement sec', 'Lever au fauteuil aidé', 'En attente',
     (v_op + 1) + time '10:30'),
    (v_patient, 'Suivi AS2CŒUR', 'Amélioration nette',                  '128/82', '84', '37,1', '96',
     '3', 'Alimentation liquide bien tolérée', 'Hydratation orale OK', 'Reprise des gaz', 'Cicatrice propre, pas de rougeur', 'Marche dans le couloir', 'Hb stable',
     (v_op + 3) + time '11:00'),
    (v_patient, 'Suivi AS2CŒUR', 'Bon état général',                    '124/78', '76', '36,9', '98',
     '2', 'Alimentation mixée', 'Bonne hydratation', 'Transit repris', 'Cicatrisation en bonne voie', 'Marche autonome', 'Bilan sanguin normal',
     (v_op + 5) + time '10:00'),
    (v_patient, 'Suivi AS2CŒUR', 'Fin de prise en charge — RAS',        '122/76', '72', '36,8', '99',
     '1', 'Alimentation normale fractionnée', 'Hydratation normale', 'Transit normal', 'Cicatrice fermée et saine', 'Mobilisation complète', 'Bilan de sortie normal',
     (v_op + 7) + time '09:30');

  raise notice 'Patient démo créé : %', v_patient;
end $$;
