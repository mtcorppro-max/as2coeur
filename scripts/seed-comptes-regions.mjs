#!/usr/bin/env node
// =====================================================================
// SEED — 1 manager + 1 coordinatrice + 1 patient PAR RÉGION
//
// Pour chaque région du prestataire, crée (s'ils n'existent pas déjà) :
//   • 1 manager        (niveau 1, rattaché à la région)
//   • 1 coordinatrice  (niveau 2, rattachée à la 1re agence de la région)
//   • 1 patient        (rattaché à la 1re agence de la région)
//
// Idempotent : une région qui a DÉJÀ un manager / une coordinatrice /
// un patient est laissée telle quelle (« à part là où c'est déjà créé »).
//
// Crée les comptes Auth (login/mot de passe) ET les lignes métier, comme
// le ferait l'application. Affiche tous les identifiants à la fin.
//
// Usage : node --env-file=.env.local scripts/seed-comptes-regions.mjs
// =====================================================================

import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error("❌ NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY requis (.env.local).");
  process.exit(1);
}

// 👉 Domaine des emails des comptes pros créés (adapte si tu veux).
const DOMAINE_PRO = "as2coeur.fr";
// = EMAIL_PATIENT_DOMAIN (cf. src/lib/constants.ts) — ne pas changer.
const DOMAINE_PATIENT = "patient.soignantcoco.local";
// 👉 S'il y a plusieurs entreprises, mets le nom ici (sinon = la 1re créée).
const PRESTATAIRE_NOM = null;

const db = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const slug = (s) =>
  s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const motDePasse = () => {
  const c = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  return Array.from(crypto.getRandomValues(new Uint8Array(10))).map((b) => c[b % c.length]).join("");
};
const codePatient = () =>
  Array.from(crypto.getRandomValues(new Uint8Array(4))).map((b) => b.toString(16).padStart(2, "0")).join("").toUpperCase();

// ── 1. Prestataire ────────────────────────────────────────────────────
const { data: prestas, error: errP } = await db.from("prestataire").select("id,nom").order("created_at");
if (errP) { console.error("❌ Lecture prestataire :", errP.message); process.exit(1); }
const presta = PRESTATAIRE_NOM ? prestas.find((p) => p.nom === PRESTATAIRE_NOM) : prestas[0];
if (!presta) { console.error("❌ Aucun prestataire trouvé."); process.exit(1); }
console.log(`▶ Prestataire : ${presta.nom}\n`);

// ── 2. Régions & agences ──────────────────────────────────────────────
const { data: regions } = await db.from("region").select("id,nom").eq("prestataire_id", presta.id).order("nom");
const { data: agences } = await db.from("agence").select("id,nom,region_id");
const agencesParRegion = new Map();
(agences ?? []).forEach((a) => {
  const arr = agencesParRegion.get(a.region_id) ?? [];
  arr.push(a);
  agencesParRegion.set(a.region_id, arr);
});

const cree = [];   // comptes créés (avec identifiants)
const saute = [];  // (région, type) déjà présents

async function creerPro({ prenom, nom, email, role, niveau, region_id, agence_id }) {
  const password = motDePasse();
  const { data: created, error } = await db.auth.admin.createUser({
    email, password, email_confirm: true, user_metadata: { type: "pro" },
  });
  if (error || !created?.user) {
    console.error(`  ⚠️ Auth ${email} : ${error?.message ?? "échec"}`);
    return null;
  }
  const { error: e2 } = await db.from("professionnel").insert({
    user_id: created.user.id, prestataire_id: presta.id,
    nom, prenom, email, role, niveau, region_id, agence_id,
  });
  if (e2) {
    await db.auth.admin.deleteUser(created.user.id);
    console.error(`  ⚠️ Fiche ${email} : ${e2.message}`);
    return null;
  }
  return { email, password };
}

// ── 3. Boucle par région ──────────────────────────────────────────────
for (const region of regions ?? []) {
  const ags = agencesParRegion.get(region.id) ?? [];
  const agIds = ags.map((a) => a.id);
  const premiere = ags[0];

  // — Manager (par région) —
  const { count: nbManager } = await db.from("professionnel")
    .select("id", { count: "exact", head: true })
    .eq("prestataire_id", presta.id).eq("role", "manager").eq("region_id", region.id);
  if (nbManager) {
    saute.push({ region: region.nom, type: "Manager" });
  } else {
    const r = await creerPro({
      prenom: "Manager", nom: region.nom, email: `manager.${slug(region.nom)}@${DOMAINE_PRO}`,
      role: "manager", niveau: 1, region_id: region.id, agence_id: null,
    });
    if (r) cree.push({ region: region.nom, type: "Manager", identifiant: r.email, motDePasse: r.password });
  }

  // — Coordinatrice (1re agence de la région) —
  if (!premiere) {
    saute.push({ region: region.nom, type: "Coordinatrice (aucune agence)" });
  } else {
    const { count: nbCoord } = await db.from("professionnel")
      .select("id", { count: "exact", head: true })
      .eq("role", "coordinatrice").in("agence_id", agIds);
    if (nbCoord) {
      saute.push({ region: region.nom, type: "Coordinatrice" });
    } else {
      const r = await creerPro({
        prenom: "Coordinatrice", nom: region.nom, email: `coordinatrice.${slug(region.nom)}@${DOMAINE_PRO}`,
        role: "coordinatrice", niveau: 2, region_id: null, agence_id: premiere.id,
      });
      if (r) cree.push({ region: region.nom, type: "Coordinatrice", agence: premiere.nom, identifiant: r.email, motDePasse: r.password });
    }
  }

  // — Patient (1re agence de la région) —
  if (premiere) {
    const { count: nbPat } = await db.from("patient")
      .select("id", { count: "exact", head: true }).in("agence_id", agIds);
    if (nbPat) {
      saute.push({ region: region.nom, type: "Patient" });
    } else {
      const code = codePatient();
      const email = `${code.toLowerCase()}@${DOMAINE_PATIENT}`;
      const { data: created, error } = await db.auth.admin.createUser({
        email, password: code, email_confirm: true, user_metadata: { type: "patient" },
      });
      if (error || !created?.user) {
        console.error(`  ⚠️ Auth patient ${region.nom} : ${error?.message ?? "échec"}`);
      } else {
        const { error: e2 } = await db.from("patient").insert({
          user_id: created.user.id, prestataire_id: presta.id, code_unique: code,
          nom: `Patient ${region.nom}`, agence_id: premiere.id,
        });
        if (e2) {
          await db.auth.admin.deleteUser(created.user.id);
          console.error(`  ⚠️ Fiche patient ${region.nom} : ${e2.message}`);
        } else {
          cree.push({ region: region.nom, type: "Patient", agence: premiere.nom, identifiant: `code ${code}`, motDePasse: code });
        }
      }
    }
  }
}

// ── 4. Récapitulatif ──────────────────────────────────────────────────
console.log("\n=== Comptes créés ===");
if (cree.length === 0) console.log("(aucun — tout était déjà créé)");
for (const c of cree) {
  console.log(`• [${c.region}] ${c.type}${c.agence ? ` (${c.agence})` : ""} — ${c.identifiant} / ${c.motDePasse}`);
}
console.log(`\n=== Ignorés (déjà présents) : ${saute.length} ===`);
for (const s of saute) console.log(`• [${s.region}] ${s.type}`);
console.log(`\n✅ Terminé : ${cree.length} compte(s) créé(s).`);
