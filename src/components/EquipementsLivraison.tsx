"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useProSession } from "@/lib/hooks/useSession";
import { Select } from "@/components/Select";
import { Scanner } from "@/components/Scanner";

type TypeEq = { id: string; nom: string };
type Dispo = { id: string; numero_serie: string; type_id: string };
type LE = {
  id: string; type_id: string; equipement_id: string | null;
  type: { nom: string } | { nom: string }[] | null;
  equipement: { numero_serie: string } | { numero_serie: string }[] | null;
};
const un = <T,>(v: T | T[] | null): T | null => (Array.isArray(v) ? v[0] : v) ?? null;

// Matériel de location d'une livraison.
//  mode "demande"     : la coordinatrice ajoute/retire des TYPES.
//  mode "preparation" : le magasinier affecte un appareil précis (sélection ou scan).
//  mode "lecture"     : affichage seul.
export function EquipementsLivraison({ livraisonId, mode }: { livraisonId: string; mode: "demande" | "preparation" | "lecture" }) {
  const pro = useProSession();
  const [items, setItems] = useState<LE[]>([]);
  const [types, setTypes] = useState<TypeEq[]>([]);
  const [dispos, setDispos] = useState<Dispo[]>([]);
  const [choixType, setChoixType] = useState("");
  const [scan, setScan] = useState(false);

  const charger = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("livraison_equipement")
      .select("id,type_id,equipement_id,type:type_id(nom),equipement:equipement_id(numero_serie)")
      .eq("livraison_id", livraisonId);
    setItems((data ?? []) as unknown as LE[]);
  }, [livraisonId]);
  useEffect(() => { charger(); }, [charger]);

  useEffect(() => {
    if (mode === "demande") {
      createClient().from("equipement_type").select("id,nom").order("nom").then(({ data }) => setTypes((data ?? []) as TypeEq[]));
    }
    if (mode === "preparation") {
      // Appareils disponibles (RLS = agence du magasinier) pour affectation.
      createClient().from("equipement").select("id,numero_serie,type_id").eq("statut", "disponible").then(({ data }) => setDispos((data ?? []) as Dispo[]));
    }
  }, [mode]);

  async function ajouterType() {
    if (!choixType) return;
    const { error } = await createClient().from("livraison_equipement").insert({ livraison_id: livraisonId, type_id: choixType });
    if (error) { alert("Échec : " + error.message); return; }
    setChoixType(""); charger();
  }
  async function retirer(le: LE) {
    if (le.equipement_id) await desaffecter(le);
    await createClient().from("livraison_equipement").delete().eq("id", le.id);
    charger();
  }
  async function affecter(le: LE, equipementId: string) {
    const supabase = createClient();
    const auteur = [pro?.prenom, pro?.nom].filter(Boolean).join(" ") || null;
    const r1 = await supabase.from("livraison_equipement").update({ equipement_id: equipementId }).eq("id", le.id);
    if (r1.error) { alert("Échec : " + r1.error.message); return; }
    await supabase.from("equipement").update({ statut: "affecte", livraison_id: livraisonId, updated_at: new Date().toISOString() }).eq("id", equipementId);
    await supabase.from("equipement_mouvement").insert({ equipement_id: equipementId, type_mouvement: "affectation", livraison_id: livraisonId, auteur_id: pro?.id ?? null, auteur_nom: auteur });
    setDispos((arr) => arr.filter((d) => d.id !== equipementId));
    charger();
  }
  async function desaffecter(le: LE) {
    const supabase = createClient();
    if (le.equipement_id) await supabase.from("equipement").update({ statut: "disponible", livraison_id: null }).eq("id", le.equipement_id);
    await supabase.from("livraison_equipement").update({ equipement_id: null }).eq("id", le.id);
    charger();
    // recharge la liste des dispos
    supabase.from("equipement").select("id,numero_serie,type_id").eq("statut", "disponible").then(({ data }) => setDispos((data ?? []) as Dispo[]));
  }
  // Scan d'un n° de série → affecte à la 1re demande non servie du bon type.
  function scanSerie(texte: string) {
    const serie = texte.trim();
    const eq = dispos.find((d) => d.numero_serie === serie);
    if (!eq) { alert(`N° ${serie} : appareil non disponible dans votre agence.`); return; }
    const cible = items.find((it) => !it.equipement_id && it.type_id === eq.type_id);
    if (!cible) { alert(`N° ${serie} : aucun matériel de ce type demandé sur cette livraison.`); return; }
    affecter(cible, eq.id);
  }

  if (items.length === 0 && mode !== "demande") return null;

  return (
    <div className="rounded-lg bg-sky-50/40 p-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-500">Matériel de location{items.length > 0 ? ` (${items.length})` : ""}</span>
        {mode === "preparation" && items.some((it) => !it.equipement_id) && (
          <button onClick={() => setScan(true)} className="text-xs font-medium text-brand hover:underline">📷 Scanner un n° de série</button>
        )}
      </div>

      {items.length > 0 && (
        <div className="mt-1 grid grid-cols-1 gap-1.5">
          {items.map((it) => (
            <div key={it.id} className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <span className="min-w-0 text-slate-700">
                {un(it.type)?.nom}
                {it.equipement_id ? <span className="ml-1 font-mono text-sky-700">· {un(it.equipement)?.numero_serie}</span> : <span className="ml-1 text-amber-600">· à affecter</span>}
              </span>
              <div className="flex shrink-0 items-center gap-1">
                {mode === "preparation" && !it.equipement_id && (
                  <div className="w-44">
                    <Select
                      value=""
                      onChange={(v) => v && affecter(it, v)}
                      placeholder="Affecter un appareil"
                      options={dispos.filter((d) => d.type_id === it.type_id).map((d) => ({ value: d.id, label: d.numero_serie }))}
                    />
                  </div>
                )}
                {mode === "preparation" && it.equipement_id && (
                  <button onClick={() => desaffecter(it)} className="text-xs text-critique hover:underline">retirer</button>
                )}
                {mode === "demande" && (
                  <button onClick={() => retirer(it)} className="px-1 text-critique" title="Retirer">✕</button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {mode === "demande" && (
        <div className="mt-1.5 flex items-center gap-2">
          <div className="w-48"><Select value={choixType} onChange={setChoixType} placeholder="Ajouter un matériel…" options={types.map((t) => ({ value: t.id, label: t.nom }))} /></div>
          <button onClick={ajouterType} disabled={!choixType} className="rounded-lg border border-rose-200 px-2 py-1 text-xs font-medium text-brand hover:bg-rose-50 disabled:opacity-50">+ Demander</button>
        </div>
      )}

      {scan && <Scanner continu titre="Scanner un n° de série" onScan={scanSerie} onClose={() => setScan(false)} />}
    </div>
  );
}
