import RheogrammeSimulateur from "./apps/rheologie/RheogrammeSimulateur"
import GouttteMouillage from "./apps/rheologie/GouttteMouillage"
import ZismanApp from "./apps/rheologie/ZismanApp"
import AppCouleur from "./apps/couleur/AppCouleur.jsx"
import CIELABExplorer from "./apps/couleur/CIELABExplorer"
import PlanFactoriel from "./apps/doe/PlanFactoriel"   // ← ajouter

export const CATEGORIES = [
  {
    id: "couleur",
    label: "Couleur",
    emoji: "🎨",
    description: "Colorimétrie et espaces colorimétriques",
    color: "#7c3aed",
    apps: [
      {
        id: "cie-xy",
        label: "Diagramme CIE xy",
        description: "Plan chromatique CIE 1931, illuminants, ellipses MacAdam",
        emoji: "🌈",
        component: AppCouleur,
      },
      {
        id: "cielab",
        label: "Explorateur CIELAB",
        description: "Plan a*b*, ΔE*₇₆, coordonnées C*/h°",
        emoji: "🔬",
        component: CIELABExplorer,
      },
    ],
  },
  {
    id: "rheologie",
    label: "Rhéologie & Mouillage",
    emoji: "💧",
    description: "Comportement des fluides et interfaces",
    color: "#0891b2",
    apps: [
      {
        id: "rheogramme",
        label: "Rhéogrammes",
        description: "Newton, Ostwald, Bingham, Herschel-Bulkley",
        emoji: "📈",
        component: RheogrammeSimulateur,
      },
      {
        id: "mouillage",
        label: "Goutte de mouillage",
        description: "Angle de contact, loi de Young",
        emoji: "💧",
        component: GouttteMouillage,
      },
      {
        id: "zisman",
        label: "Droite de Zisman",
        description: "Tension critique, énergie de surface",
        emoji: "📐",
        component: ZismanApp,
      },
    ],
  },
  // ── NOUVELLE CATÉGORIE ────────────────────────────────────────────────────
  {
    id: "doe",
    label: "Plans d'expériences",
    emoji: "🧪",
    description: "Méthodologie des plans factoriels",
    color: "#16a34a",
    apps: [
      {
        id: "plan-factoriel",
        label: "Plan factoriel",
        description: "Plans 2ⁿ, effets principaux et interactions",
        emoji: "📊",
        component: PlanFactoriel,
      },
    ],
  }
]
