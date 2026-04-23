#!/usr/bin/env node
/**
 * seed-solvents.js — Importe les solvants de l'API HSP dans Supabase.
 *
 * Usage :
 *   npm run seed-solvents
 *
 * Requiert dans .env.local :
 *   VITE_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY   (Supabase Dashboard → Settings → API → service_role)
 *
 * Utilise le service_role, donc contourne RLS. À n'exécuter que localement,
 * jamais côté client. Le fichier .env.local est déjà dans .gitignore.
 */

import { readFileSync } from "fs"
import { join, dirname } from "path"
import { fileURLToPath } from "url"
import { createClient } from "@supabase/supabase-js"

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, "..")

// ── .env.local loader (même pattern que setup-db.js) ────────────────────────
function loadEnv(filepath) {
  try {
    const lines = readFileSync(filepath, "utf8").split("\n")
    for (const line of lines) {
      const m = line.match(/^\s*([\w]+)\s*=\s*"?([^"\n]*)"?\s*$/)
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2]
    }
  } catch { /* fichier absent — on ignore */ }
}
loadEnv(join(root, ".env.local"))
loadEnv(join(root, ".env"))

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || ""
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY || ""
const API_URL      = process.env.HSP_API_URL || "https://hsp-api.fastapicloud.dev"

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("❌  Variables manquantes dans .env.local :")
  console.error("     VITE_SUPABASE_URL")
  console.error("     SUPABASE_SERVICE_ROLE_KEY  (Dashboard → Settings → API → service_role)")
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

// ── 1. Fetch ────────────────────────────────────────────────────────────────
console.log(`🌐  Fetch ${API_URL}/solvents ...`)
const res = await fetch(`${API_URL}/solvents`)
if (!res.ok) { console.error(`❌  HTTP ${res.status}`); process.exit(1) }
const raw = await res.json()
console.log(`   ${raw.length} entrées brutes reçues`)

// ── 2. Normalize ────────────────────────────────────────────────────────────
const cleanNum = v => (typeof v === "number" && v > -1 ? v : null)
const rows = raw.map(s => ({
  name: s.Solvent,
  d: Number(s.D),
  p: Number(s.P),
  h: Number(s.H),
  cas: s.CAS || null,
  mw: cleanNum(s.mw),
  bp: cleanNum(s.bp),
  viscosity: cleanNum(s.viscosity),
  heat_of_vap: cleanNum(s.heat_of_vap),
  mole_vol: s.Mole_vol ? parseFloat(s.Mole_vol) : null,
  smiles: s.SMILES || null,
  synonyms: s.synonyms ? s.synonyms.split(";").map(t => t.trim()).filter(Boolean) : [],
  source: "api",
})).filter(r => r.name && isFinite(r.d) && isFinite(r.p) && isFinite(r.h))

console.log(`   ${rows.length} entrées valides (après normalisation)`)

// ── 3. Upsert par lots ──────────────────────────────────────────────────────
const BATCH = 100
let done = 0
for (let i = 0; i < rows.length; i += BATCH) {
  const batch = rows.slice(i, i + BATCH)
  process.stdout.write(`  ⏳  upsert ${i + 1}-${i + batch.length} / ${rows.length} ...`)
  const { error } = await supabase
    .from("solvents")
    .upsert(batch, { onConflict: "name" })
  if (error) { console.log(` ❌\n     ${error.message}`); process.exit(1) }
  done += batch.length
  console.log(" ✅")
}

console.log(`\n✅  ${done} solvants importés / mis à jour dans Supabase.`)
