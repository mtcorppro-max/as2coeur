#!/usr/bin/env node
// =====================================================================
// Crée les buckets Storage :
//   - "cicatrices" : privé (photos médicales, accès via URL signée).
//   - "avatars"    : public (photos de profil du personnel, non médical).
// Idempotent : ne touche pas à un bucket déjà présent.
//
// Usage : node --env-file=.env.local scripts/setup-storage.mjs
// =====================================================================

import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error("❌ NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY requis (.env.local).");
  process.exit(1);
}

const MIME = ["image/jpeg", "image/png", "image/webp", "image/heic"];
const BUCKETS = [
  // "cicatrices" héberge aussi les documents du patient ({id}/documents/…),
  // dont le PDF du consentement RGPD signé → application/pdf autorisé.
  { name: "cicatrices", public: false, fileSizeLimit: "10MB", allowedMimeTypes: [...MIME, "application/pdf"] },
  { name: "avatars", public: true, fileSizeLimit: "5MB", allowedMimeTypes: MIME },
];

const db = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const { data: buckets, error: errList } = await db.storage.listBuckets();
if (errList) {
  console.error("❌ Impossible de lister les buckets :", errList.message);
  process.exit(1);
}

for (const { name, ...opts } of BUCKETS) {
  if (buckets.some((b) => b.name === name)) {
    console.log(`✓ Bucket "${name}" déjà présent.`);
    continue;
  }
  const { error } = await db.storage.createBucket(name, opts);
  if (error) {
    console.error(`❌ Création du bucket "${name}" échouée :`, error.message);
    process.exit(1);
  }
  console.log(`✅ Bucket "${name}" (${opts.public ? "public" : "privé"}) créé.`);
}
