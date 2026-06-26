-- =====================================================================
-- SEED (backfill) — Historique démo sur un patient DÉJÀ créé via l'app
--
-- 1) Crée le patient dans l'app (Nouveau patient : prénom « Jean », nom « DÉMO »)
--    → note le CODE affiché (c'est le login ET le mot de passe patient).
-- 2) Colle ce code ci-dessous dans v_code, puis exécute ce script.
--
-- Il règle les dates (opération il y a 9 j, prise en charge 7 j terminée il y a 2 j),
-- les jours de suivi J1/J3/J5/J7, puis insère les constantes 2×/jour + les suivis.
-- =====================================================================

do $$
declare
  v_code    text := 'COLLER_LE_CODE_ICI';   -- <<< code du patient créé via l'app
  v_patient uuid;
  v_op      date := current_date - 9;
  v_duree   int  := 7;
  d         int;
  ts_matin  timestamptz;
  ts_soir   timestamptz;
  fievre    numeric;
begin
  select id into v_patient from public.patient where upper(code_unique) = upper(trim(v_code));
  if v_patient is null then
    raise exception 'Aucun patient trouvé pour le code %', v_code;
  end if;

  -- Réglage de la prise en charge
  update public.patient set
    operation = 'Bypass gastrique',
    date_operation = v_op,
    duree_prise_en_charge = v_duree,
    jours_suivi = array[1,3,5,7],
    chirurgien = 'Docteur Bypass',
    statut = 'terminee'
  where id = v_patient;

  -- Repart d'un historique propre
  delete from public.mesure where patient_id = v_patient;
  delete from public.suivi  where patient_id = v_patient;

  -- Constantes 2×/jour, de J0 au dernier jour (J7)
  for d in 0..v_duree loop
    ts_matin := (v_op + d) + time '08:00';
    ts_soir  := (v_op + d) + time '20:00';
    fievre := case when d <= 2 then 0.6 else 0 end;

    insert into public.mesure (patient_id, type, valeur, horodatage) values
      (v_patient, 'temperature',   round((36.6 + random()*0.4 + fievre)::numeric, 1), ts_matin),
      (v_patient, 'temperature',   round((36.9 + random()*0.4 + fievre)::numeric, 1), ts_soir),
      (v_patient, 'ta_systolique', round((128 - d*0.6 + random()*10)::numeric, 0),    ts_matin),
      (v_patient, 'ta_systolique', round((126 - d*0.6 + random()*10)::numeric, 0),    ts_soir),
      (v_patient, 'ta_diastolique',round((82 - d*0.3 + random()*6)::numeric, 0),      ts_matin),
      (v_patient, 'ta_diastolique',round((80 - d*0.3 + random()*6)::numeric, 0),      ts_soir),
      (v_patient, 'spo2',          round((case when d < 2 then 94 else 96 end + random()*3)::numeric, 0), ts_matin),
      (v_patient, 'spo2',          round((case when d < 2 then 95 else 97 end + random()*2)::numeric, 0), ts_soir),
      (v_patient, 'bpm',           round((88 - d*1.6 + random()*8)::numeric, 0),       ts_matin),
      (v_patient, 'bpm',           round((86 - d*1.6 + random()*8)::numeric, 0),       ts_soir),
      (v_patient, 'poids',         round((78 - d*0.1 + random()*0.6)::numeric, 1),     ts_matin);
  end loop;

  -- Fiches de suivi J1, J3, J5, J7
  insert into public.suivi (patient_id, auteur_nom, etat_general, ta, pouls, temperature, spo2,
    douleur_en, alimentation, hydratation, transit, cicatrisation, mobilisation, bilan_sanguin, created_at)
  values
    (v_patient, 'Suivi AS2CŒUR', 'Réveil correct, patient fatigué', '132/84', '92', '37,4', '95',
     '5', 'À jeun puis liquide', 'Perfusion en cours', 'Pas de transit', 'Cicatrice propre, pansement sec', 'Lever au fauteuil aidé', 'En attente',
     (v_op + 1) + time '10:30'),
    (v_patient, 'Suivi AS2CŒUR', 'Amélioration nette', '128/82', '84', '37,1', '96',
     '3', 'Alimentation liquide bien tolérée', 'Hydratation orale OK', 'Reprise des gaz', 'Cicatrice propre, pas de rougeur', 'Marche dans le couloir', 'Hb stable',
     (v_op + 3) + time '11:00'),
    (v_patient, 'Suivi AS2CŒUR', 'Bon état général', '124/78', '76', '36,9', '98',
     '2', 'Alimentation mixée', 'Bonne hydratation', 'Transit repris', 'Cicatrisation en bonne voie', 'Marche autonome', 'Bilan sanguin normal',
     (v_op + 5) + time '10:00'),
    (v_patient, 'Suivi AS2CŒUR', 'Fin de prise en charge — RAS', '122/76', '72', '36,8', '99',
     '1', 'Alimentation normale fractionnée', 'Hydratation normale', 'Transit normal', 'Cicatrice fermée et saine', 'Mobilisation complète', 'Bilan de sortie normal',
     (v_op + 7) + time '09:30');

  raise notice 'Historique démo ajouté au patient % (code %)', v_patient, v_code;
end $$;
