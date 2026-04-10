#!/usr/bin/env node
/**
 * setup-db.js — Exécute les migrations SQL via l'API Supabase Management
 *
 * Usage :
 *   SUPABASE_SERVICE_ROLE_KEY=<clé> node scripts/setup-db.js
 *
 * La clé service_role se trouve dans :
 *   Supabase Dashboard → Project Settings → API → service_role (secret)
 */

import { readFileSync, readdirSync } from "fs"
import { join, dirname } from "path"
import { fileURLToPath } from "url"

const __dirname = dirname(fileURLToPath(import.meta.url))

// ── Config ────────────────────────────────────────────────────────────────────
const SUPABASE_URL        = process.env.VITE_SUPABASE_URL        || ""
const SERVICE_ROLE_KEY    = process.env.SUPABASE_SERVICE_ROLE_KEY || ""

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("❌  Variables manquantes.")
  console.error("   Exporte VITE_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY avant de lancer ce script.")
  process.exit(1)
}

// Extraire le ref du projet depuis l'URL (ex: rzuxykzepgujswfladxw)
const projectRef = new URL(SUPABASE_URL).hostname.split(".")[0]

// ── Lecture des fichiers SQL ───────────────────────────────────────────────────
const sqlDir   = join(__dirname, "../sql")
const sqlFiles = readdirSync(sqlDir)
  .filter(f => f.endsWith(".sql"))
  .sort()

// ── Exécution via Management API ──────────────────────────────────────────────
async function runSQL(filename, sql) {
  const res = await fetch(
    `https://api.supabase.com/v1/projects/${projectRef}/database/query`,
    {
      method : "POST",
      headers: {
        "Content-Type" : "application/json",
        "Authorization": `Bearer ${SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify({ query: sql }),
    }
  )

  const body = await res.json().catch(() => ({}))

  if (!res.ok) {
    throw new Error(`HTTP ${res.status} — ${JSON.stringify(body)}`)
  }
  return body
}

// ── Main ──────────────────────────────────────────────────────────────────────
console.log(`🔧  Projet : ${projectRef}`)
console.log(`📂  ${sqlFiles.length} fichier(s) SQL trouvé(s)\n`)

for (const file of sqlFiles) {
  const sql = readFileSync(join(sqlDir, file), "utf8")
  process.stdout.write(`  ⏳  ${file} ...`)
  try {
    await runSQL(file, sql)
    console.log(" ✅")
  } catch (err) {
    console.log(` ❌\n     ${err.message}`)
    process.exit(1)
  }
}

console.log("\n✅  Toutes les migrations ont été appliquées.")
