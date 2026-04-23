import { supabase } from "../../../lib/supabaseClient"

const TABLE = "hsp_fits"

export async function listFits() {
  const { data, error } = await supabase
    .from(TABLE)
    .select("id, name, created_at, data")
    .order("created_at", { ascending: false })
  if (error) throw error
  return data
}

export async function saveFit({ name, solvents, insideLimit, result }) {
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) throw new Error("Vous devez être connecté.")
  const payload = {
    user_id: auth.user.id,
    name: name?.trim() || "Ajustement sans titre",
    data: { solvents, insideLimit, result },
  }
  const { data, error } = await supabase.from(TABLE).insert(payload).select("id, name, created_at").single()
  if (error) throw error
  return data
}

export async function deleteFit(id) {
  const { error } = await supabase.from(TABLE).delete().eq("id", id)
  if (error) throw error
}
