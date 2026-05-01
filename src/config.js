import RheogrammeSimulateur from "./apps/rheologie/RheogrammeSimulateur"
import GouttteMouillage from "./apps/rheologie/GouttteMouillage"
import ZismanApp from "./apps/rheologie/ZismanApp"
import AppCouleur from "./apps/couleur/AppCouleur.jsx"
import CIELABExplorer from "./apps/couleur/CIELABExplorer"
import PlanFactoriel from "./apps/doe/PlanFactoriel"
import HSPApp from "./apps/hsp/HSPApp"
import SolventMixtureApp from "./apps/hsp/SolventMixtureApp"

// Les champs label/description sont des clés i18n (ex. "cat.couleur.label").
// App.jsx les résout via t(key) depuis le contexte de langue.
export const CATEGORIES = [
  {
    id: "couleur",
    labelKey: "cat.couleur.label",
    descriptionKey: "cat.couleur.description",
    emoji: "🎨",
    color: "#7c3aed",
    apps: [
      {
        id: "cie-xy",
        labelKey: "app.cie-xy.label",
        descriptionKey: "app.cie-xy.description",
        emoji: "🌈",
        component: AppCouleur,
      },
      {
        id: "cielab",
        labelKey: "app.cielab.label",
        descriptionKey: "app.cielab.description",
        emoji: "🔬",
        component: CIELABExplorer,
      },
    ],
  },
  {
    id: "rheologie",
    labelKey: "cat.rheologie.label",
    descriptionKey: "cat.rheologie.description",
    emoji: "💧",
    color: "#0891b2",
    apps: [
      {
        id: "rheogramme",
        labelKey: "app.rheogramme.label",
        descriptionKey: "app.rheogramme.description",
        emoji: "📈",
        component: RheogrammeSimulateur,
      },
      {
        id: "mouillage",
        labelKey: "app.mouillage.label",
        descriptionKey: "app.mouillage.description",
        emoji: "💧",
        component: GouttteMouillage,
      },
      {
        id: "zisman",
        labelKey: "app.zisman.label",
        descriptionKey: "app.zisman.description",
        emoji: "📐",
        component: ZismanApp,
      },
    ],
  },
  {
    id: "doe",
    labelKey: "cat.doe.label",
    descriptionKey: "cat.doe.description",
    emoji: "🧪",
    color: "#16a34a",
    apps: [
      {
        id: "plan-factoriel",
        labelKey: "app.plan-factoriel.label",
        descriptionKey: "app.plan-factoriel.description",
        emoji: "📊",
        component: PlanFactoriel,
      },
    ],
  },
  {
    id: "solubilite",
    labelKey: "cat.solubilite.label",
    descriptionKey: "cat.solubilite.description",
    emoji: "🧪",
    color: "#ea580c",
    apps: [
      {
        id: "hsp",
        labelKey: "app.hsp.label",
        descriptionKey: "app.hsp.description",
        emoji: "🔶",
        component: HSPApp,
      },
      {
        id: "solvent-mixture",
        labelKey: "app.solvent-mixture.label",
        descriptionKey: "app.solvent-mixture.description",
        emoji: "🧴",
        component: SolventMixtureApp,
      },
    ],
  },
]
