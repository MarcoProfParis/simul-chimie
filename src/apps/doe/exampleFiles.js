// Les JSON sont importés statiquement depuis src/apps/doe/examples/
// Plus de fetch, plus de BASE_URL, ça marche en dev et en prod sans config.

import exLineaire from "./examples/ex_lineaire.json";
import exSynergie from "./examples/ex_synergie.json";
import exQuadratique from "./examples/ex_quadratique.json";
import exExtraction from "./examples/ex_extraction.json";
import exRevetement from "./examples/ex_revetement.json";
import exOptimisationReaction from "./examples/ex_optimisation_reaction.json";
import exOptimisationAvance from "./examples/ex_optimisation_avance.json";

export const EXAMPLE_FILES = [
  {
    file: "ex_lineaire.json",
    _data: exLineaire,
    title: "Rigidité de pièces plastiques",
    context: "3 facteurs · Modèle linéaire · R² = 0.591",
    difficulty: "débutant",
    real_data: true,
  },
  {
    file: "ex_synergie.json",
    _data: exSynergie,
    title: "Rigidité de pièces plastiques",
    context: "3 facteurs · Modèle synergie · R² = 0.778",
    difficulty: "intermédiaire",
    real_data: true,
  },
  {
    file: "ex_quadratique.json",
    _data: exQuadratique,
    title: "Rigidité de pièces plastiques",
    context: "3 facteurs · Modèle quadratique · R² = 0.998",
    difficulty: "avancé",
    real_data: true,
  },
  {
    file: "ex_extraction.json",
    _data: exExtraction,
    title: "Extraction d'un principe actif",
    context: "3 facteurs · Rendement & Pureté",
    difficulty: "débutant",
    real_data: false,
  },
  {
    file: "ex_revetement.json",
    _data: exRevetement,
    title: "Formulation d'un revêtement",
    context: "4 facteurs · Viscosité",
    difficulty: "intermédiaire",
    real_data: false,
  },
  {
    file: "ex_optimisation_reaction.json",
    _data: exOptimisationReaction,
    title: "Optimisation d'une réaction de synthèse",
    context: "2 facteurs · Plan CCF · Modèle quadratique · 13 essais",
    difficulty: "avancé",
    real_data: false,
  },
  {
    file: "ex_optimisation_avance.json",
    _data: exOptimisationAvance,
    title: "Optimisation d'une réaction enzymatique",
    context: "2 facteurs · CCF 20 essais · Maximum très marqué · Q-Q plot fiable",
    difficulty: "avancé",
    real_data: false,
  },
];
