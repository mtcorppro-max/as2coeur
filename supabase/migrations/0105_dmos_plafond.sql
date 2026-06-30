-- =====================================================================
-- 0105 — DMOS : plafond à ne pas dépasser (par type d'avantage)
--
-- En plus des seuils déclaration / autorisation, un PLAFOND (seuil_max) :
-- au-delà, l'avantage n'est pas admissible → la validation de la note est
-- bloquée (en base + côté UI).
-- =====================================================================

alter table public.dmos_bareme
  add column if not exists seuil_max numeric(10,2);

-- Blocage de validation : (1) avantage en régime « autorisation » non autorisé,
-- (2) montant au-dessus du plafond du type.
create or replace function public.ndf_bloquer_validation_dmos()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if NEW.statut = 'validee' and OLD.statut is distinct from 'validee' then
    if exists (
      select 1 from public.note_de_frais_ligne l
       where l.note_id = NEW.id and l.est_avantage_ps
         and l.dmos_regime = 'autorisation'
         and coalesce(l.decision, '') not in ('autorise', 'tacite')
    ) then
      raise exception 'Validation impossible : un avantage dépasse le seuil DMOS et nécessite une autorisation préalable (voir Suivi DMOS).';
    end if;

    if exists (
      select 1 from public.note_de_frais_ligne l
       where l.note_id = NEW.id and l.est_avantage_ps
         and l.montant_ttc > coalesce((
           select b.seuil_max from public.dmos_bareme b
            where b.type_avantage = l.type and b.actif and b.seuil_max is not null
              and b.date_effet <= coalesce(l.date_depense, current_date)
            order by b.date_effet desc limit 1
         ), 'infinity'::numeric)
    ) then
      raise exception 'Validation impossible : un montant dépasse le plafond autorisé pour ce type de dépense (DMOS).';
    end if;
  end if;
  return NEW;
end;
$$;
