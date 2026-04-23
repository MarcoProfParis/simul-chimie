import { supabase } from "../../../lib/supabaseClient"

// Lit la table `solvents` et normalise vers la forme interne (D/P/H en majuscule).
export async function fetchSolventsFromSupabase() {
  const { data, error } = await supabase
    .from("solvents")
    .select("name, d, p, h, cas, mw, bp, viscosity, heat_of_vap, mole_vol, smiles, synonyms")
    .order("name")
  if (error) throw error
  return (data ?? []).map(r => ({
    name: r.name,
    D: Number(r.d),
    P: Number(r.p),
    H: Number(r.h),
    cas: r.cas,
    mw: r.mw,
    bp: r.bp,
    viscosity: r.viscosity,
    heatOfVap: r.heat_of_vap,
    moleVol: r.mole_vol,
    smiles: r.smiles,
    synonyms: r.synonyms ?? [],
  }))
}
