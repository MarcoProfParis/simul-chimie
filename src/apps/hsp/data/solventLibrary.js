import data from "./solventLibrary.json"

// Données statiques bundlées. Sera remplacé/complété à terme par l'API /solvents.
export const SOLVENT_LIBRARY = data

const byLowerName = new Map(data.map(s => [s.name.toLowerCase(), s]))

export function findSolvent(name) {
  if (!name) return null
  return byLowerName.get(name.trim().toLowerCase()) ?? null
}
