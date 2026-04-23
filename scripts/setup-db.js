#!/usr/bin/env node
/**
 * setup-db.js — Exécute les migrations SQL via l'API Supabase Management
 *
 * Usage :
 *   node scripts/setup-db.js
 *
 * Lit automatiquement .env.local pour VITE_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY
 */

import { readFileSync, readdirSync } from "fs"
import { join, dirname } from "path"
import { fileURLToPath } from "url"

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, "..")

// ── Lecture de .env.local ─────────────────────────────────────────────────────
function loadEnv(filepath) {
  try {
    const lines = readFileSync(filepath, "utf8").split("\n")
    for (const line of lines) {
      const m = line.match(/^\s*([\w]+)\s*=\s*"?([^"\n]*)"?\s*$/)
      if (m) process.env[m[1]] = m[2]
    }
  } catch { /* fichier absent, on ignore */ }
}
loadEnv(join(root, ".env.local"))
loadEnv(join(root, ".env"))

// ── Config ────────────────────────────────────────────────────────────────────
const SUPABASE_URL   = process.env.VITE_SUPABASE_URL       || ""
const ACCESS_TOKEN   = process.env.SUPABASE_ACCESS_TOKEN   || ""  // PAT du compte

if (!SUPABASE_URL || !ACCESS_TOKEN) {
  console.error("❌  Variables manquantes.")
  console.error("   Assure-toi que .env.local contient :")
  console.error("     VITE_SUPABASE_URL")
  console.error("     SUPABASE_ACCESS_TOKEN  (PAT → supabase.com/dashboard/account/tokens)")
  process.exit(1)
}

const projectRef = new URL(SUPABASE_URL).hostname.split(".")[0]

// ── Lecture des fichiers SQL ───────────────────────────────────────────────────
const sqlDir   = join(root, "sql")
const sqlFiles = readdirSync(sqlDir).filter(f => f.endsWith(".sql")).sort()

// ── Exécution via Management API ──────────────────────────────────────────────
async function runSQL(filename, sql) {
  const res = await fetch(
    `https://api.supabase.com/v1/projects/${projectRef}/database/query`,
    {
      method : "POST",
      headers: {
        "Content-Type" : "application/json",
        "Authorization": `Bearer ${ACCESS_TOKEN}`,
      },
      body: JSON.stringify({ query: sql }),
    }
  )
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(`HTTP ${res.status} — ${JSON.stringify(body)}`)
  return body
}

// ── Main ──────────────────────────────────────────────────────────────────────
console.log(`🔧  Projet : ${projectRef}`)
console.log(`📂  ${sqlFiles.length} fichier(s) SQL trouvé(s)\n`)

// Idempotent : les erreurs "already exists" sont signalées mais n'arrêtent pas.
// Codes Postgres tolérés : 42710 (duplicate policy/trigger), 42P07 (duplicate table/index),
// 42701 (duplicate column), 42723 (duplicate function), 42711 (duplicate index/object).
const IDEMPOTENT_MARKERS = ["already exists"]
function isIdempotent(msg) {
  const lower = (msg || "").toLowerCase()
  return IDEMPOTENT_MARKERS.some(m => lower.includes(m))
}

for (const file of sqlFiles) {
  const sql = readFileSync(join(sqlDir, file), "utf8")
  process.stdout.write(`  ⏳  ${file} ...`)
  try {
    await runSQL(file, sql)
    console.log(" ✅")
  } catch (err) {
    if (isIdempotent(err.message)) {
      console.log(` ⏭  déjà appliqué (${err.message.split("\n")[0].slice(0, 80)}…)`)
      continue
    }
    console.log(` ❌\n     ${err.message}`)
    process.exit(1)
  }
}

console.log("\n✅  Toutes les migrations ont été appliquées.")

