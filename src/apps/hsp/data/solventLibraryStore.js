import bundled from "./solventLibrary.json"

const API_URL = "https://hsp-api.fastapicloud.dev"
const STORAGE_KEY = "hsp:solvents:v1"
const TTL_MS = 24 * 60 * 60 * 1000   // 24 h
const FETCH_TIMEOUT = 8000           // 8 s

// Normalize an API solvent (PascalCase `Solvent`, -1 for "no data") to our internal shape.
function normalize(s) {
  const cleanNum = v => (typeof v === "number" && v > -1 ? v : null)
  return {
    name: s.Solvent || s.name || "",
    D: Number(s.D),
    P: Number(s.P),
    H: Number(s.H),
    cas: s.CAS || null,
    mw: cleanNum(s.mw),
    bp: cleanNum(s.bp),
    viscosity: cleanNum(s.viscosity),
    heatOfVap: cleanNum(s.heat_of_vap),
    moleVol: s.Mole_vol ? parseFloat(s.Mole_vol) : null,
    smiles: s.SMILES || null,
    synonyms: s.synonyms
      ? s.synonyms.split(";").map(t => t.trim()).filter(Boolean)
      : [],
  }
}

function isValid(s) {
  return s.name && isFinite(s.D) && isFinite(s.P) && isFinite(s.H)
}

function readCache() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const { ts, data } = JSON.parse(raw)
    if (!Array.isArray(data) || Date.now() - ts > TTL_MS) return null
    return data
  } catch { return null }
}

function writeCache(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ts: Date.now(), data }))
  } catch { /* quota or unavailable — ignore */ }
}

async function fetchRemote() {
  const controller = new AbortController()
  const t = setTimeout(() => controller.abort(), FETCH_TIMEOUT)
  try {
    const res = await fetch(`${API_URL}/solvents`, { signal: controller.signal })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const raw = await res.json()
    const arr = Array.isArray(raw) ? raw : (raw.solvents ?? raw.data ?? [])
    const list = arr.map(normalize).filter(isValid)
    if (list.length === 0) throw new Error("Réponse API vide")
    return list
  } finally {
    clearTimeout(t)
  }
}

async function fetchSupabase() {
  // Import paresseux pour éviter d'initialiser Supabase si on lit déjà le cache.
  const { fetchSolventsFromSupabase } = await import("../lib/solventsRepo.js")
  const rows = await fetchSolventsFromSupabase()
  if (!Array.isArray(rows) || rows.length === 0) throw new Error("Supabase vide")
  return rows
}

// Load order: cache → Supabase → API → bundled.
// Returns { library, source } where source ∈ {"cache", "supabase", "api", "bundled"}.
export async function loadLibrary({ forceRefresh = false } = {}) {
  if (!forceRefresh) {
    const cache = readCache()
    if (cache) return { library: cache, source: "cache" }
  }
  // 1. Supabase (primaire — sous notre contrôle)
  try {
    const sup = await fetchSupabase()
    writeCache(sup)
    return { library: sup, source: "supabase" }
  } catch (e) {
    console.warn("Supabase indisponible, essai API externe :", e.message)
  }
  // 2. API externe (secours si Supabase ne répond pas)
  try {
    const remote = await fetchRemote()
    writeCache(remote)
    return { library: remote, source: "api" }
  } catch (e) {
    console.warn("API HSP indisponible, fallback bundled :", e.message)
    return { library: bundled, source: "bundled" }
  }
}

export function clearCache() {
  try { localStorage.removeItem(STORAGE_KEY) } catch {}
}

export function getBundled() {
  return bundled
}
