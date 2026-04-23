import genericCsv from "./hsp_example.csv?raw"
import polystyreneCsv from "./polystyrene.csv?raw"
import pmmaCsv from "./pmma.csv?raw"
import paracetamolCsv from "./paracetamol.csv?raw"

export const EXAMPLES = [
  {
    id: "generic",
    label: "Générique",
    description: "37 solvants — exemple historique HSPiPy",
    csv: genericCsv,
    fileName: "hsp_example.csv",
  },
  {
    id: "polystyrene",
    label: "Polystyrène",
    description: "35 solvants pour la solubilité du polystyrène (polymère apolaire)",
    csv: polystyreneCsv,
    fileName: "polystyrene.csv",
  },
  {
    id: "pmma",
    label: "PMMA (Plexiglas®)",
    description: "34 solvants pour le poly(méthacrylate de méthyle) (polymère polaire)",
    csv: pmmaCsv,
    fileName: "pmma.csv",
  },
  {
    id: "paracetamol",
    label: "Paracétamol",
    description: "35 solvants pour la solubilité du paracétamol (principe actif)",
    csv: paracetamolCsv,
    fileName: "paracetamol.csv",
  },
]
