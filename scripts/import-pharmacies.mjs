#!/usr/bin/env node
// =====================================================================
// Import de TOUTES les pharmacies d'officine de France (FINESS,
// catégorie 620) dans la table annuaire_pharmacie.
//
// Source officielle : « FINESS Extraction du Fichier des établissements »
// sur data.gouv.fr (Licence Ouverte). Sans --fichier, le script résout et
// télécharge automatiquement la dernière extraction.
//
// - Upsert par lots de 500 (clé finess : relançable sans doublon).
// - Pour mettre à jour la base : relancer simplement le script.
//
// Usage :
//   node --env-file=.env.local scripts/import-pharmacies.mjs
//   node --env-file=.env.local scripts/import-pharmacies.mjs --fichier finess.csv
//   node --env-file=.env.local scripts/import-pharmacies.mjs --dry
// =====================================================================

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error("❌ NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY requis (.env.local).");
  process.exit(1);
}

const arg = (nom) => {
  const i = process.argv.indexOf(`--${nom}`);
  return i > -1 && process.argv[i + 1] ? process.argv[i + 1] : null;
};
const TAILLE_LOT = 500;
const PAUSE_MS = 300;
const pause = (ms) => new Promise((r) => setTimeout(r, ms));

// Types de voie FINESS (abrégés) → libellés lisibles.
const TYPVOIE = {
  R: "Rue", AV: "Avenue", BD: "Boulevard", PL: "Place", RTE: "Route", CHE: "Chemin",
  IMP: "Impasse", ALL: "Allée", CRS: "Cours", QU: "Quai", SQ: "Square", PROM: "Promenade",
  CTRE: "Centre", RPT: "Rond-point", LD: "Lieu-dit", ZAC: "ZAC", ZA: "ZA", ZI: "ZI",
  CCAL: "Centre commercial", GR: "Grande rue", ESP: "Esplanade", PAS: "Passage",
};

// --- 1) Source : fichier local ou téléchargement de la dernière extraction ---
let csv;
const fichier = arg("fichier");
if (fichier) {
  console.log(`Lecture de ${fichier}…`);
  csv = readFileSync(fichier, "utf8");
} else {
  console.log("Résolution de la dernière extraction FINESS sur data.gouv…");
  const api = await fetch("https://www.data.gouv.fr/api/1/datasets/finess-extraction-du-fichier-des-etablissements/");
  const meta = await api.json();
  const res = (meta.resources ?? []).find((r) => r.format === "csv" && !/géolocalis/i.test(r.title ?? ""));
  if (!res) { console.error("❌ Ressource CSV FINESS introuvable."); process.exit(1); }
  console.log(`Téléchargement : ${res.title}`);
  csv = await (await fetch(res.url)).text();
}

// --- 2) Parsing : catégorie 620 = pharmacie d'officine ---
const pharmacies = [];
for (const ligne of csv.split("\n")) {
  const c = ligne.split(";");
  if (c[0] !== "structureet" || c[18] !== "620") continue;
  const finess = (c[1] ?? "").trim();
  const nom = ((c[3] || c[4]) ?? "").trim();
  if (!finess || !nom) continue;
  // Adresse : numéro + type de voie (développé) + voie + complément/lieu-dit.
  const adresse = [c[7], TYPVOIE[c[8]] ?? c[8], c[9], c[10], c[11]]
    .map((x) => (x ?? "").trim()).filter(Boolean).join(" ");
  // Ligne d'acheminement = « 01500 AMBERIEU EN BUGEY ».
  const achemin = (c[15] ?? "").trim();
  const cp = achemin.slice(0, 5);
  const commune = achemin.slice(5).trim();
  pharmacies.push({
    finess,
    nom,
    adresse: adresse || null,
    cp: /^\d{5}$/.test(cp) ? cp : null,
    commune: commune || null,
    telephone: (c[16] ?? "").trim() || null,
  });
}
console.log(`${pharmacies.length.toLocaleString("fr-FR")} pharmacies d'officine trouvées.`);

if (process.argv.includes("--dry")) {
  for (const p of pharmacies.slice(0, 3)) console.log(JSON.stringify(p, null, 1));
  console.log("(--dry : aucun envoi vers Supabase.)");
  process.exit(0);
}

// --- 3) Upsert par lots de 500 ---
const db = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });
const nbLots = Math.ceil(pharmacies.length / TAILLE_LOT);
const echecs = [];
for (let i = 0; i < nbLots; i++) {
  const lot = pharmacies.slice(i * TAILLE_LOT, (i + 1) * TAILLE_LOT);
  const { error } = await db.from("annuaire_pharmacie").upsert(lot, { onConflict: "finess" });
  if (error) { echecs.push(i + 1); console.error(`  ✗ lot ${i + 1}/${nbLots} : ${error.message}`); }
  else console.log(`  ✓ lot ${i + 1}/${nbLots} importé (${lot.length})`);
  if (i < nbLots - 1) await pause(PAUSE_MS);
}

if (echecs.length) {
  console.error(`\n⚠️ ${echecs.length} lot(s) en échec : ${echecs.join(", ")}. Relancez le script.`);
  process.exit(1);
}
console.log(`\n✅ ${pharmacies.length.toLocaleString("fr-FR")} pharmacies importées.`);
