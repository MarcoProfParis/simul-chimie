// ─── HelpDrawer.jsx ──────────────────────────────────────────────────────────
// Panneau d'aide pédagogique coulissant pour PlanFactoriel
// Usage : <HelpButton topic="anova" /> n'importe où dans le JSX
// Le drawer s'ouvre en overlay à droite sans perturber le layout

import React, { useState, createContext, useContext, useEffect } from "react";
import {
  XMarkIcon,
  QuestionMarkCircleIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  BookOpenIcon,
  BeakerIcon,
  CalculatorIcon,
  LightBulbIcon,
} from "@heroicons/react/24/outline";
import { CheckCircleIcon, ExclamationTriangleIcon } from "@heroicons/react/24/solid";

// ─── Contexte global du drawer ────────────────────────────────────────────────
const HelpCtx = createContext(null);

export function HelpProvider({ children }) {
  const [open, setOpen] = useState(false);
  const [topic, setTopic] = useState(null);

  const openHelp = (t) => { setTopic(t); setOpen(true); };
  const closeHelp = () => setOpen(false);

  // Fermer avec Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === "Escape") closeHelp(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return (
    <HelpCtx.Provider value={{ openHelp }}>
      {children}
      <HelpDrawer open={open} topic={topic} onClose={closeHelp} />
    </HelpCtx.Provider>
  );
}

// ─── Bouton déclencheur ───────────────────────────────────────────────────────
export function HelpButton({ topic, label, size = "sm", className = "" }) {
  const ctx = useContext(HelpCtx);
  if (!ctx) return null;
  const sizeCls = size === "xs"
    ? "size-4 text-[10px]"
    : size === "sm"
    ? "size-4 text-xs"
    : "size-5 text-sm";

  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); ctx.openHelp(topic); }}
      title={`Aide : ${HELP_CONTENT[topic]?.title || topic}`}
      className={`inline-flex items-center gap-1 text-indigo-400 hover:text-indigo-600
        dark:text-indigo-400 dark:hover:text-indigo-300 transition-colors ${className}`}
    >
      <QuestionMarkCircleIcon className={sizeCls} />
      {label && <span className={`${sizeCls} font-medium`}>{label}</span>}
    </button>
  );
}

// ─── Composant accordéon pour les sections ────────────────────────────────────
function Section({ icon: Icon, title, color = "indigo", children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  const colors = {
    indigo: "text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20",
    emerald: "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20",
    amber: "text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20",
    rose: "text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-900/20",
    blue: "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20",
  };
  return (
    <div className="border border-gray-100 dark:border-gray-800 rounded-xl overflow-hidden mb-3">
      <button
        onClick={() => setOpen(v => !v)}
        className={`w-full flex items-center gap-2 px-4 py-3 text-left text-sm font-semibold
          ${colors[color]} transition-colors`}
      >
        {Icon && <Icon className="size-4 shrink-0" />}
        <span className="flex-1">{title}</span>
        {open
          ? <ChevronDownIcon className="size-4 shrink-0" />
          : <ChevronRightIcon className="size-4 shrink-0" />}
      </button>
      {open && (
        <div className="px-4 py-3 bg-white dark:bg-gray-900 text-sm text-gray-700 dark:text-gray-300 space-y-2">
          {children}
        </div>
      )}
    </div>
  );
}

// ─── Bloc formule ─────────────────────────────────────────────────────────────
function Formula({ children, label }) {
  return (
    <div className="my-2 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-4 py-2">
      {label && <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-1">{label}</p>}
      <p className="font-mono text-sm text-indigo-700 dark:text-indigo-300 leading-relaxed">{children}</p>
    </div>
  );
}

// ─── Bloc exemple numérique ───────────────────────────────────────────────────
function NumExample({ title, children }) {
  return (
    <div className="rounded-lg border-l-4 border-amber-400 bg-amber-50 dark:bg-amber-900/20 px-3 py-2 text-xs">
      <p className="font-semibold text-amber-700 dark:text-amber-300 mb-1">📊 {title}</p>
      {children}
    </div>
  );
}

// ─── Bloc verdict ─────────────────────────────────────────────────────────────
function Verdict({ ok, children }) {
  return (
    <div className={`flex items-start gap-2 rounded-lg px-3 py-2 text-xs
      ${ok
        ? "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-800 dark:text-emerald-300"
        : "bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-300"}`}>
      {ok
        ? <CheckCircleIcon className="size-4 shrink-0 mt-0.5" />
        : <ExclamationTriangleIcon className="size-4 shrink-0 mt-0.5" />}
      <span>{children}</span>
    </div>
  );
}

// ─── Contenu pédagogique ──────────────────────────────────────────────────────
const HELP_CONTENT = {

  // ── ANOVA tableau principal ────────────────────────────────────────────────
  anova: {
    title: "ANOVA — Analyse de la Variance",
    icon: CalculatorIcon,
    render: () => (
      <div className="space-y-1">

        <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
          L'ANOVA décompose la variabilité totale des mesures en deux parties :
          ce qui est expliqué par le modèle (régression) et ce qui ne l'est pas (résidus).
        </p>

        {/* Tableau annoté */}
        <Section icon={CalculatorIcon} title="Les 3 lignes du tableau" color="indigo" defaultOpen>
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-indigo-50 dark:bg-indigo-900/30">
                  <th className="text-left px-2 py-1.5 font-semibold">Ligne</th>
                  <th className="text-left px-2 py-1.5 font-semibold">Signification</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                <tr>
                  <td className="px-2 py-2 font-semibold text-indigo-600 dark:text-indigo-300 whitespace-nowrap">Régression</td>
                  <td className="px-2 py-2">Variabilité <strong>expliquée</strong> par le modèle — ce que les facteurs parviennent à prédire.</td>
                </tr>
                <tr>
                  <td className="px-2 py-2 font-semibold text-rose-600 dark:text-rose-300 whitespace-nowrap">Résidus</td>
                  <td className="px-2 py-2">Variabilité <strong>inexpliquée</strong> — erreur expérimentale + manque d'ajustement du modèle.</td>
                </tr>
                <tr>
                  <td className="px-2 py-2 font-semibold text-gray-600 dark:text-gray-300 whitespace-nowrap">Total</td>
                  <td className="px-2 py-2">Variabilité totale = Régression + Résidus. Toujours : SC<sub>T</sub> = SC<sub>R</sub> + SC<sub>E</sub>.</td>
                </tr>
              </tbody>
            </table>
          </div>
        </Section>

        {/* Colonnes SC, dl, CM */}
        <Section icon={CalculatorIcon} title="SC — Somme des Carrés" color="blue">
          <p>Mesure la dispersion globale de chaque source de variation.</p>
          <Formula label="SC Régression (SSR)">
            SC_R = Σ (Ŷᵢ − Ȳ)²
          </Formula>
          <Formula label="SC Résidus (SSE)">
            SC_E = Σ (Yᵢ − Ŷᵢ)²  =  Σ résidus²
          </Formula>
          <Formula label="SC Total (SST)">
            SC_T = Σ (Yᵢ − Ȳ)²  =  SC_R + SC_E
          </Formula>
          <p className="text-xs text-gray-500">
            Ŷᵢ = valeur prédite par le modèle · Ȳ = moyenne globale des Y mesurés
          </p>
          <NumExample title="Exemple de votre tableau">
            <p>SC_R = 121.31 · SC_E = 83.79 · SC_T = 205.10</p>
            <p>Vérification : 121.31 + 83.79 = 205.10 ✓</p>
          </NumExample>
        </Section>

        <Section icon={CalculatorIcon} title="dl — Degrés de Liberté" color="blue">
          <p>Nombre de valeurs «libres» pour estimer chaque variance.</p>
          <Formula label="dl Régression">dl_R = p  (= nombre de termes du modèle, hors constante)</Formula>
          <Formula label="dl Résidus">dl_E = n − p − 1  (n = nb d'essais, p = nb de termes)</Formula>
          <Formula label="dl Total">dl_T = n − 1</Formula>
          <NumExample title="Exemple de votre tableau">
            <p>n = 7 essais · p = 5 termes dans le modèle</p>
            <p>dl_R = 5 · dl_E = 7 − 5 − 1 = 1 · dl_T = 6</p>
            <Verdict ok={false}>
              ⚠ dl résidus = 1 : très peu de degrés de liberté ! Il faut au minimum 2–3 pour
              que le test F soit fiable. Réduire le nombre de termes ou ajouter des essais.
            </Verdict>
          </NumExample>
        </Section>

        <Section icon={CalculatorIcon} title="CM — Carré Moyen (variance)" color="blue">
          <p>La variance estimée pour chaque source = SC ÷ dl.</p>
          <Formula label="CM Régression">CM_R = SC_R / dl_R</Formula>
          <Formula label="CM Résidus (= s²)">CM_E = SC_E / dl_E</Formula>
          <NumExample title="Exemple de votre tableau">
            <p>CM_R = 121.31 / 5 = 24.26</p>
            <p>CM_E = 83.79 / 1 = 83.79</p>
          </NumExample>
        </Section>

        <Section icon={CalculatorIcon} title="F — Statistique de Fisher" color="indigo">
          <p>
            Rapport entre la variance expliquée par le modèle et la variance résiduelle.
            Un grand F signifie que le modèle explique bien plus de variabilité que le «bruit».
          </p>
          <Formula label="F de Fisher">F = CM_R / CM_E</Formula>
          <NumExample title="Exemple de votre tableau">
            <p>F = 24.26 / 83.79 = 0.290</p>
            <Verdict ok={false}>
              F = 0.29 &lt; 1 : le modèle explique MOINS que les résidus.
              La régression n'apporte rien ici. Modèle à revoir.
            </Verdict>
          </NumExample>
          <p className="text-xs text-gray-500 mt-1">
            Règle : F doit être &gt;&gt; 1 (idéalement &gt; 4–5) pour qu'un modèle soit jugé utile.
          </p>
        </Section>

        <Section icon={CalculatorIcon} title="Prob &gt; F — p-valeur du modèle" color="emerald">
          <p>
            Probabilité d'observer un F aussi grand <em>par hasard seul</em>,
            si le modèle n'avait aucun effet réel.
          </p>
          <div className="space-y-1 mt-2">
            <Verdict ok>
              Prob &gt; F &lt; 0.05 → modèle significatif ✓ (moins de 5% de chance que ce soit du hasard)
            </Verdict>
            <Verdict ok={false}>
              Prob &gt; F &gt; 0.05 → modèle non significatif ✗ (comme votre 0.878)
            </Verdict>
          </div>
          <NumExample title="Exemple de votre tableau">
            <p>Prob &gt; F = 0.878 → 87.8% de probabilité que ces résultats soient dus au hasard.</p>
            <p className="mt-1 font-semibold text-red-700 dark:text-red-400">
              Conclusion : ce modèle à 5 termes avec seulement 7 essais est sur-paramétré.
              Il n'est pas statistiquement valide.
            </p>
          </NumExample>
        </Section>

        {/* Lien R² */}
        <Section icon={LightBulbIcon} title="Lien avec R² et R² ajusté" color="amber">
          <Formula label="R² (coefficient de détermination)">R² = SC_R / SC_T  =  1 − SC_E / SC_T</Formula>
          <p className="text-xs">
            R² mesure la fraction de variabilité expliquée. Attention : R² augmente toujours
            quand on ajoute des termes, même inutiles.
          </p>
          <Formula label="R² ajusté (pénalise les termes inutiles)">R²_adj = 1 − (SC_E/dl_E) / (SC_T/dl_T)</Formula>
          <div className="space-y-1 mt-2">
            <Verdict ok>R² ajusté ≥ 0.80 → bon ajustement</Verdict>
            <Verdict ok={false}>R² ajusté &lt; 0.80 → ajustement insuffisant</Verdict>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            💡 Toujours préférer R² ajusté à R² brut pour comparer des modèles de complexité différente.
          </p>
        </Section>

        {/* Conseil global */}
        <div className="rounded-xl bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-700 px-4 py-3 text-xs">
          <p className="font-semibold text-indigo-700 dark:text-indigo-300 mb-1">🎯 Règle de décision globale</p>
          <ol className="list-decimal list-inside space-y-1 text-gray-700 dark:text-gray-300">
            <li>Vérifier que <strong>Prob&gt;F &lt; 0.05</strong> (modèle significatif)</li>
            <li>Vérifier que <strong>R² ajusté ≥ 0.80</strong> (bon ajustement)</li>
            <li>Vérifier que les <strong>résidus sont bien répartis</strong> (pas de structure)</li>
            <li>Si dl résidus &lt; 2 : le modèle a trop de termes, le réduire</li>
          </ol>
        </div>
      </div>
    ),
  },

  // ── RÉSIDUS ───────────────────────────────────────────────────────────────
  residus: {
    title: "Résidus — Analyse graphique",
    icon: BeakerIcon,
    render: () => (
      <div className="space-y-1">
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
          Un résidu est l'écart entre la valeur mesurée et la valeur prédite par le modèle.
          Leur analyse permet de valider les hypothèses du modèle.
        </p>

        <Section icon={CalculatorIcon} title="Définition du résidu" color="indigo" defaultOpen>
          <Formula label="Résidu brut">eᵢ = Yᵢ − Ŷᵢ</Formula>
          <p className="text-xs text-gray-500 mt-1">
            Yᵢ = valeur <strong>mesurée</strong> lors de l'expérience i · Ŷᵢ = valeur <strong>calculée</strong> par le modèle
          </p>
          <Formula label="Résidu normé (standardisé)">e*ᵢ = eᵢ / s</Formula>
          <p className="text-xs text-gray-500 mt-1">
            Diviser par s permet de comparer les résidus indépendamment de l'unité de la réponse.
          </p>
        </Section>

        <Section icon={CalculatorIcon} title="Qu'est-ce que s = √CM_E ?" color="indigo" defaultOpen>
          <p className="text-xs mb-2">s est l'<strong>écart-type résiduel</strong> — il mesure la dispersion typique des erreurs du modèle, dans l'unité de la réponse Y.</p>
          <Formula label="Étape 1 — Carré Moyen des résidus (CM_E)">CM_E = SC_E / dl_E = SC_E / (n − p − 1)</Formula>
          <Formula label="Étape 2 — Écart-type résiduel s">s = √CM_E</Formula>
          <NumExample title="Exemple avec votre tableau ANOVA">
            <p>SC_E = 83.79 · dl_E = 1 (n=7, p=5)</p>
            <p>CM_E = 83.79 / 1 = 83.79</p>
            <p>s = √83.79 ≈ 9.15</p>
            <p className="mt-1 text-gray-600 dark:text-gray-400">
              Interprétation : le modèle se trompe en moyenne de ±9.15 unités.
              Un résidu normé |e*| = |e| / 9.15 &gt; 2 signale un point aberrant.
            </p>
          </NumExample>
          <p className="text-xs text-gray-500 mt-2">
            💡 Plus s est petit, plus le modèle est précis. Dans un bon modèle, s doit être
            petit par rapport à la plage de variation de Y (SC_T / (n−1)).
          </p>
        </Section>

        <Section icon={LightBulbIcon} title="Lecture du graphe Résidus vs Ŷ" color="blue" defaultOpen>
          <p className="font-semibold text-emerald-700 dark:text-emerald-400">✓ Bon modèle :</p>
          <ul className="list-disc list-inside text-xs space-y-1 ml-2 mt-1">
            <li>Points dispersés <strong>aléatoirement</strong> autour de zéro</li>
            <li>Aucune tendance (pas de courbe, pas de cône)</li>
            <li>Tous les résidus normés entre −2 et +2</li>
          </ul>
          <p className="font-semibold text-red-700 dark:text-red-400 mt-2">✗ Problèmes :</p>
          <ul className="list-disc list-inside text-xs space-y-1 ml-2 mt-1">
            <li><strong>Tendance courbe</strong> → modèle linéaire insuffisant, ajouter des termes quadratiques</li>
            <li><strong>Cône (variance croissante)</strong> → transformer la réponse (ex: logarithme)</li>
            <li><strong>Point hors ±2</strong> → point aberrant (outlier) à examiner/exclure</li>
          </ul>
        </Section>

        <Section icon={CalculatorIcon} title="Résidu normé et points aberrants" color="rose">
          <p>Un résidu normé &gt; 2 (en valeur absolue) signale un point suspect.</p>
          <div className="space-y-1 mt-2">
            <Verdict ok>|e*| &lt; 2 → point normal</Verdict>
            <Verdict ok={false}>|e*| &gt; 2 → point aberrant à investiguer</Verdict>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            💡 Avant d'exclure un point : vérifier d'abord s'il y a eu une erreur expérimentale
            (renversement, mauvaise pesée...). Ne jamais supprimer un point sans justification.
          </p>
        </Section>

        <Section icon={LightBulbIcon} title="Validation mathématique vs statistique" color="amber">
          <div className="space-y-2 text-xs">
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded p-2">
              <p className="font-semibold">Validation mathématique</p>
              <p>Résidus répartis de manière homogène autour de zéro (graphique).</p>
            </div>
            <div className="bg-purple-50 dark:bg-purple-900/20 rounded p-2">
              <p className="font-semibold">Validation statistique</p>
              <p>R² ajusté élevé + Prob&gt;F faible (tableau ANOVA).</p>
            </div>
            <p className="text-gray-500">Les deux validations sont complémentaires et doivent être satisfaites ensemble.</p>
          </div>
        </Section>
      </div>
    ),
  },

  // ── PARETO ────────────────────────────────────────────────────────────────
  pareto: {
    title: "Diagramme de Pareto des effets",
    icon: BookOpenIcon,
    render: () => (
      <div className="space-y-1">
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
          Le diagramme de Pareto classe les effets par ordre d'importance absolue,
          et distingue les effets significatifs des effets négligeables.
        </p>

        <Section icon={CalculatorIcon} title="Construction du diagramme" color="indigo" defaultOpen>
          <p>Chaque barre correspond à un terme du modèle (facteur ou interaction).</p>
          <Formula label="Longueur de barre">Longueur = |coefficient bᵢ|</Formula>
          <ul className="list-disc list-inside text-xs space-y-1 mt-2">
            <li>Les barres sont triées de la plus longue à la plus courte</li>
            <li>La couleur indique le signe du coefficient (positif / négatif)</li>
            <li>La <strong>ligne verticale rouge</strong> = seuil de significativité (p = 0.05)</li>
          </ul>

          {/* Schéma explicatif de la ligne rouge */}
          <div className="mt-3 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
            <svg viewBox="0 0 280 130" xmlns="http://www.w3.org/2000/svg" className="w-full">
              {/* Fond */}
              <rect width="280" height="130" fill="#f8fafc"/>
              {/* Titre */}
              <text x="140" y="14" textAnchor="middle" fontSize="9" fill="#94a3b8" fontFamily="monospace">Exemple de diagramme de Pareto</text>
              {/* Axes */}
              <line x1="60" y1="20" x2="60" y2="110" stroke="#e2e8f0" strokeWidth="1"/>
              <line x1="60" y1="110" x2="270" y2="110" stroke="#e2e8f0" strokeWidth="1"/>
              {/* Barres — significatives (bleu) */}
              <rect x="62" y="28" width="130" height="14" fill="#6366f1" rx="2"/>
              <text x="195" y="39" fontSize="8" fill="#4338ca" fontFamily="monospace">X₁  b=6.5</text>
              <rect x="62" y="47" width="100" height="14" fill="#6366f1" rx="2"/>
              <text x="165" y="58" fontSize="8" fill="#4338ca" fontFamily="monospace">X₂  b=5.0</text>
              {/* Barres — non significatives (gris) */}
              <rect x="62" y="66" width="55" height="14" fill="#94a3b8" rx="2"/>
              <text x="120" y="77" fontSize="8" fill="#64748b" fontFamily="monospace">X₁X₂  b=2.75</text>
              <rect x="62" y="85" width="30" height="14" fill="#94a3b8" rx="2"/>
              <text x="95" y="96" fontSize="8" fill="#64748b" fontFamily="monospace">X₁²  b=1.5</text>
              {/* Ligne rouge seuil */}
              <line x1="122" y1="20" x2="122" y2="110" stroke="#ef4444" strokeWidth="1.5" strokeDasharray="3,2"/>
              <text x="123" y="18" fontSize="8" fill="#ef4444" fontFamily="monospace">p=0.05</text>
              {/* Légende */}
              <rect x="62" y="118" width="8" height="6" fill="#6366f1" rx="1"/>
              <text x="73" y="124" fontSize="7" fill="#6366f1">Significatif</text>
              <rect x="130" y="118" width="8" height="6" fill="#94a3b8" rx="1"/>
              <text x="141" y="124" fontSize="7" fill="#64748b">Non significatif</text>
              {/* Étiquettes Y */}
              <text x="56" y="35" textAnchor="end" fontSize="7" fill="#94a3b8">X₁</text>
              <text x="56" y="54" textAnchor="end" fontSize="7" fill="#94a3b8">X₂</text>
              <text x="56" y="73" textAnchor="end" fontSize="7" fill="#94a3b8">X₁X₂</text>
              <text x="56" y="92" textAnchor="end" fontSize="7" fill="#94a3b8">X₁²</text>
            </svg>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            La ligne rouge est calculée à partir de la loi de Student : t(dl_E, 0.05).
            Sa position dépend du nombre de degrés de liberté des résidus.
          </p>
        </Section>

        <Section icon={LightBulbIcon} title="Lecture et interprétation" color="blue" defaultOpen>
          <div className="space-y-1">
            <Verdict ok>Barre dépasse la ligne rouge → effet significatif (p &lt; 0.05)</Verdict>
            <Verdict ok={false}>Barre en-deçà de la ligne → effet non significatif (peut être retiré)</Verdict>
          </div>
          <p className="text-xs mt-2">
            La longueur d'une barre représente la variation de la réponse prédite (en valeur absolue)
            quand le facteur passe de −1 à +1 (en variables codées).
          </p>
        </Section>

        <Section icon={CalculatorIcon} title="Signification des termes" color="amber">
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-amber-50 dark:bg-amber-900/30">
                  <th className="text-left px-2 py-1.5">Terme</th>
                  <th className="text-left px-2 py-1.5">Type</th>
                  <th className="text-left px-2 py-1.5">Signification</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                <tr>
                  <td className="px-2 py-1.5 font-mono">b₀</td>
                  <td className="px-2 py-1.5">Constante</td>
                  <td className="px-2 py-1.5">Valeur de la réponse au centre du domaine</td>
                </tr>
                <tr>
                  <td className="px-2 py-1.5 font-mono">bᵢ · Xᵢ</td>
                  <td className="px-2 py-1.5">Effet principal</td>
                  <td className="px-2 py-1.5">Influence directe du facteur i sur la réponse</td>
                </tr>
                <tr>
                  <td className="px-2 py-1.5 font-mono">bᵢⱼ · XᵢXⱼ</td>
                  <td className="px-2 py-1.5">Interaction</td>
                  <td className="px-2 py-1.5">L'effet de Xᵢ dépend du niveau de Xⱼ (synergie ou antagonisme)</td>
                </tr>
                <tr>
                  <td className="px-2 py-1.5 font-mono">bᵢᵢ · Xᵢ²</td>
                  <td className="px-2 py-1.5">Quadratique pur</td>
                  <td className="px-2 py-1.5">Courbure de la réponse (optimum dans le domaine)</td>
                </tr>
              </tbody>
            </table>
          </div>
        </Section>

        <Section icon={LightBulbIcon} title="Stratégie d'optimisation du modèle" color="emerald">
          <ol className="list-decimal list-inside text-xs space-y-1">
            <li>Identifier les effets significatifs (barres dépassant la ligne rouge)</li>
            <li>Supprimer les termes non significatifs du modèle (simplification)</li>
            <li>Recalculer le modèle réduit → les dl résidus augmentent → tests plus fiables</li>
            <li>Vérifier que R² ajusté ne diminue pas trop après simplification</li>
          </ol>
        </Section>
      </div>
    ),
  },

  // ── ISORÉPONSE ────────────────────────────────────────────────────────────
  isoreponse: {
    title: "Courbes isoréponses",
    icon: BookOpenIcon,
    render: () => (
      <div className="space-y-1">
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
          Les courbes isoréponses (ou courbes de niveau) représentent graphiquement
          les valeurs prédites par le modèle en fonction de deux facteurs simultanément.
        </p>

        <Section icon={LightBulbIcon} title="Principe de lecture" color="indigo" defaultOpen>
          <ul className="list-disc list-inside text-xs space-y-1">
            <li>Chaque courbe relie les points où la réponse prédite est <strong>constante</strong></li>
            <li>Les axes X et Y correspondent aux deux facteurs sélectionnés</li>
            <li>Les autres facteurs sont fixés à une valeur (slider «facteurs fixes»)</li>
            <li>Le gradient de couleur indique si la réponse augmente ou diminue</li>
          </ul>
        </Section>

        <Section icon={BookOpenIcon} title="Utilisation pour l'optimisation" color="emerald" defaultOpen>
          <p className="text-xs font-semibold mb-1">Objectif : trouver les conditions qui maximisent (ou minimisent) la réponse.</p>
          <ol className="list-decimal list-inside text-xs space-y-1">
            <li>Repérer la zone de couleur correspondant à la valeur souhaitée</li>
            <li>Lire les coordonnées (valeurs réelles des facteurs) de cette zone</li>
            <li>Si plusieurs réponses, superposer les critères (zone commune)</li>
            <li>Vérifier que la condition optimale est dans le domaine expérimental</li>
          </ol>
          <p className="text-xs text-gray-500 mt-2">
            💡 Les courbes isoréponses ne sont fiables que si le modèle est validé (R² adj ≥ 0.8 et Prob&gt;F &lt; 0.05).
            Ne pas optimiser sur un modèle non valide !
          </p>
        </Section>

        <Section icon={CalculatorIcon} title="Interprétation de la forme des courbes" color="amber">
          <div className="space-y-2 text-xs">
            <div className="bg-gray-50 dark:bg-gray-800 rounded p-2">
              <p className="font-semibold">Courbes parallèles (droites)</p>
              <p>→ Modèle linéaire sans interaction. Les deux facteurs agissent indépendamment.</p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-800 rounded p-2">
              <p className="font-semibold">Courbes inclinées non parallèles</p>
              <p>→ Interaction entre les facteurs. L'effet de l'un dépend du niveau de l'autre.</p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-800 rounded p-2">
              <p className="font-semibold">Courbes concentriques / elliptiques</p>
              <p>→ Effets quadratiques. Il existe un optimum (maximum ou minimum) dans le domaine.</p>
            </div>
          </div>
        </Section>

        <Section icon={LightBulbIcon} title="Rappel BTS Chimie — Référentiel" color="blue">
          <p className="text-xs">
            Selon le référentiel BTS Métiers de la Chimie, la capacité attendue est de :
          </p>
          <ul className="list-disc list-inside text-xs space-y-1 mt-1">
            <li>Mettre en œuvre un plan d'expériences pour optimiser une formule</li>
            <li>Exploiter des courbes isoréponses pour choisir les conditions de formulation</li>
            <li>Évaluer la validité du plan d'expériences</li>
          </ul>
        </Section>
      </div>
    ),
  },

  // ── COEFFICIENTS ─────────────────────────────────────────────────────────
  coefficients: {
    title: "Coefficients du modèle",
    icon: CalculatorIcon,
    render: () => (
      <div className="space-y-1">
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
          Le modèle polynomial relie la réponse Y aux facteurs via des coefficients estimés
          par la méthode des moindres carrés.
        </p>

        <Section icon={CalculatorIcon} title="Équation générale du modèle" color="indigo" defaultOpen>
          <Formula label="Modèle linéaire">Ŷ = b₀ + b₁X₁ + b₂X₂ + ... + bₙXₙ</Formula>
          <Formula label="Avec interactions (synergie)">Ŷ = b₀ + b₁X₁ + b₂X₂ + b₁₂X₁X₂</Formula>
          <Formula label="Avec terme quadratique">Ŷ = b₀ + b₁X₁ + b₁₁X₁²</Formula>
          <p className="text-xs text-gray-500">
            Les variables X sont codées : −1 pour le niveau bas, +1 pour le niveau haut, 0 pour le centre.
          </p>
        </Section>

        <Section icon={LightBulbIcon} title="Signification des coefficients" color="blue" defaultOpen>
          <ul className="list-disc list-inside text-xs space-y-2">
            <li><strong>b₀</strong> : valeur prédite au centre du domaine (tous X = 0)</li>
            <li><strong>bᵢ &gt; 0</strong> : augmenter Xᵢ augmente la réponse</li>
            <li><strong>bᵢ &lt; 0</strong> : augmenter Xᵢ diminue la réponse</li>
            <li><strong>|bᵢ| grand</strong> : facteur très influent sur la réponse</li>
            <li><strong>bᵢⱼ</strong> : interaction — l'effet de Xᵢ change selon le niveau de Xⱼ</li>
          </ul>
        </Section>

        <Section icon={CalculatorIcon} title="Test de Student sur les coefficients" color="rose">
          <p className="text-xs mb-2">Chaque coefficient est testé individuellement :</p>
          <Formula label="t ratio">t = bᵢ / s(bᵢ)   avec s(bᵢ) = écart-type de l'estimateur</Formula>
          <div className="space-y-1 mt-2">
            <Verdict ok>Prob &gt; |t| &lt; 0.05 → coefficient significatif ✓ (à conserver)</Verdict>
            <Verdict ok={false}>Prob &gt; |t| &gt; 0.05 → coefficient non significatif ✗ (peut être retiré)</Verdict>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Étoiles de significativité : *** p&lt;0.001 · ** p&lt;0.01 · * p&lt;0.05 · · p&lt;0.1
          </p>
        </Section>
      </div>
    ),
  },

  // ── FACTEURS (Part 1) ─────────────────────────────────────────────────────
  facteurs: {
    title: "Définition des facteurs",
    icon: BeakerIcon,
    render: () => (
      <div className="space-y-1">
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
          Les facteurs sont les variables que l'on fait varier dans l'expérience.
          Bien les définir est la première étape cruciale d'un plan d'expériences.
        </p>

        <Section icon={CalculatorIcon} title="Variables codées vs réelles" color="indigo" defaultOpen>
          <p>Le codage centre et réduit les variables pour faciliter les calculs.</p>
          <Formula label="Formule de codage">X_codé = (X_réel − X_centre) / (X_pas)</Formula>
          <Formula label="Centre et demi-pas">X_centre = (X_haut + X_bas)/2  ·  X_pas = (X_haut − X_bas)/2</Formula>
          <NumExample title="Exemple : Température 60–80°C">
            <p>Centre = (80+60)/2 = 70°C · Pas = (80−60)/2 = 10°C</p>
            <p>60°C → X = (60−70)/10 = −1 · 80°C → X = (80−70)/10 = +1 ✓</p>
          </NumExample>
        </Section>

        <Section icon={LightBulbIcon} title="Nombre d'essais (plan complet 2ⁿ)" color="blue">
          <Formula label="Nombre d'essais">N = 2ⁿ  (n = nombre de facteurs)</Formula>
          <div className="overflow-x-auto mt-2">
            <table className="text-xs w-full border-collapse">
              <thead><tr className="bg-blue-50 dark:bg-blue-900/30">
                <th className="px-2 py-1">Facteurs (n)</th>
                <th className="px-2 py-1">Essais (2ⁿ)</th>
              </tr></thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {[[2,4],[3,8],[4,16],[5,32]].map(([n,e]) => (
                  <tr key={n}><td className="px-2 py-1 text-center">{n}</td><td className="px-2 py-1 text-center">{e}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
      </div>
    ),
  },

  // ── MODÈLE (Part 3) ───────────────────────────────────────────────────────
  modele: {
    title: "Choix du modèle mathématique",
    icon: CalculatorIcon,
    render: () => (
      <div className="space-y-1">
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
          Le modèle définit la forme de l'équation qui relie les facteurs à la réponse.
          Choisir un modèle trop simple ou trop complexe nuit à la qualité de l'analyse.
        </p>

        <Section icon={CalculatorIcon} title="Les 4 types de modèles" color="indigo" defaultOpen>
          <div className="space-y-2 text-xs">
            {[
              { name: "Linéaire", eq: "Ŷ = b₀ + b₁X₁ + b₂X₂", note: "Uniquement effets principaux. Adapté si peu de courbure." },
              { name: "Synergie (interactions)", eq: "Ŷ = b₀ + b₁X₁ + b₂X₂ + b₁₂X₁X₂", note: "Ajoute les interactions. Utile si les facteurs se combinent." },
              { name: "Quadratique", eq: "Ŷ = b₀ + b₁X₁ + b₂X₂ + b₁₂X₁X₂ + b₁₁X₁²", note: "Ajoute la courbure. Nécessite des points centraux." },
              { name: "Cubique", eq: "+ termes x³", note: "Très complexe. Nécessite beaucoup d'essais." },
            ].map(m => (
              <div key={m.name} className="bg-gray-50 dark:bg-gray-800 rounded p-2">
                <p className="font-semibold text-indigo-700 dark:text-indigo-300">{m.name}</p>
                <p className="font-mono text-indigo-600 dark:text-indigo-400 text-[11px] my-0.5">{m.eq}</p>
                <p className="text-gray-500">{m.note}</p>
              </div>
            ))}
          </div>
        </Section>

        <Section icon={ExclamationTriangleIcon} title="Contrainte : N ≥ termes + 1" color="rose" defaultOpen>
          <p>Le nombre d'essais doit être supérieur au nombre de coefficients du modèle.</p>
          <Formula label="Règle de base">N_essais &gt; N_termes + 1</Formula>
          <p className="text-xs text-gray-500">
            Avec des dl résidus = N − termes − 1. Plus il y a de dl résidus,
            plus le test F est puissant et fiable.
          </p>
          <Verdict ok={false}>
            Si dl résidus = 0 ou 1 : modèle saturé ou quasi-saturé → aucun test fiable possible.
          </Verdict>
        </Section>
      </div>
    ),
  },

  // ── CALCUL DES EFFETS ─────────────────────────────────────────────────────
  effets_calcul: {
    title: "Calcul des effets et des coefficients",
    icon: CalculatorIcon,
    render: () => (
      <div className="space-y-1">
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
          Les coefficients bᵢ du modèle s'obtiennent en calculant l'effet de chaque
          facteur ou interaction sur la réponse.
        </p>

        <Section icon={CalculatorIcon} title="Formule générale" color="indigo" defaultOpen>
          <Formula label="Effet d'un facteur ou interaction">
            {"b = (Moy(+1) − Moy(−1)) / 2"}
          </Formula>
          <p className="text-xs text-gray-500 mt-1">
            Moy(+1) = moyenne des réponses quand le terme vaut +1<br/>
            Moy(−1) = moyenne des réponses quand le terme vaut −1
          </p>
        </Section>

        <Section icon={LightBulbIcon} title="Calcul d'une interaction" color="blue" defaultOpen>
          <p className="text-xs mb-2">
            Pour une interaction X₁·X₂, multiplier d'abord les signes de X₁ et X₂
            pour obtenir le signe de l'interaction, puis appliquer la même formule.
          </p>
          <Formula label="Signe de l'interaction X₁·X₂">
            {"signe(X₁·X₂) = signe(X₁) × signe(X₂)"}
          </Formula>
          <div className="mt-2 text-xs font-mono bg-gray-50 dark:bg-gray-800 rounded p-2 space-y-0.5">
            <p>(+1) × (+1) = +1</p>
            <p>(+1) × (−1) = −1</p>
            <p>(−1) × (+1) = −1</p>
            <p>(−1) × (−1) = +1</p>
          </div>
        </Section>

        <Section icon={LightBulbIcon} title="Lien avec les moindres carrés" color="amber">
          <p className="text-xs">
            Pour un plan factoriel complet 2ⁿ orthogonal (sans point central),
            la méthode des moyennes et les moindres carrés donnent exactement
            le même résultat. La vérification est affichée en bas de chaque calcul.
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Si des points centraux sont présents, les deux méthodes peuvent
            différer légèrement car les points centraux ne contribuent pas
            aux contrastes des facteurs.
          </p>
        </Section>
      </div>
    ),
  },

  // ── Q-Q PLOT ──────────────────────────────────────────────────────────────
  qqplot: {
    title: "Q-Q Plot — Normalité des résidus",
    icon: BeakerIcon,
    render: () => (
      <div className="space-y-1">
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
          Le graphique Q-Q (Quantile-Quantile) permet de vérifier que les résidus
          suivent une loi normale, hypothèse nécessaire pour que les tests
          statistiques (Student, Fisher) soient valides.
        </p>

        <Section icon={CalculatorIcon} title="Principe de construction" color="indigo" defaultOpen>
          <ol className="list-decimal list-inside text-xs space-y-1">
            <li>Trier les résidus normés eᵢ* par ordre croissant</li>
            <li>Calculer les quantiles théoriques d'une N(0,1) correspondants</li>
            <li>Tracer les points (quantile théorique, résidu normé)</li>
            <li>Si les points s'alignent sur la diagonale → normalité ✓</li>
          </ol>
          <Formula label="Quantile théorique (formule de Blom)">
            {"q_i = Φ⁻¹( (i − 3/8) / (n + 1/4) )"}
          </Formula>
          <p className="text-xs text-gray-500 mt-1">
            Φ⁻¹ = inverse de la loi normale standard · i = rang du résidu trié · n = nombre de résidus
          </p>
        </Section>

        <Section icon={LightBulbIcon} title="Lecture du graphique" color="blue" defaultOpen>
          <div className="space-y-2 text-xs">
            <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded p-2">
              <p className="font-semibold text-emerald-700 dark:text-emerald-400">✓ Normalité respectée</p>
              <p>Les points s'alignent sur la droite rouge (y = x). Légères déviations aux extrêmes sont normales.</p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-800 rounded p-2">
              <p className="font-semibold">Forme en S (queues épaisses)</p>
              <p>Distribution leptokurtique — valeurs extrêmes plus fréquentes que prévu. Souvent sans conséquence grave.</p>
            </div>
            <div className="bg-amber-50 dark:bg-amber-900/20 rounded p-2">
              <p className="font-semibold text-amber-700 dark:text-amber-400">△ Courbe asymétrique</p>
              <p>Distribution asymétrique. Peut nécessiter une transformation de la réponse (log, racine carrée...).</p>
            </div>
            <div className="bg-red-50 dark:bg-red-900/20 rounded p-2">
              <p className="font-semibold text-red-700 dark:text-red-400">✗ Points très isolés (en rouge)</p>
              <p>Valeurs aberrantes (outliers). Vérifier l'expérience correspondante pour une erreur de saisie ou de manipulation.</p>
            </div>
          </div>
        </Section>

        <Section icon={LightBulbIcon} title="Importance en plans d'expériences" color="amber">
          <p className="text-xs">
            La normalité est l'une des 4 hypothèses du modèle (LINE) :
          </p>
          <div className="mt-2 space-y-1 text-xs">
            {[
              ["L", "Linéarité", "Résidus vs Ŷ sans tendance courbe"],
              ["I", "Indépendance", "Essais randomisés, pas d'autocorrélation"],
              ["N", "Normalité", "Q-Q plot aligné sur la diagonale ← ici"],
              ["É", "Égalité des variances", "Résidus vs Ŷ sans cône"],
            ].map(([letter, name, desc]) => (
              <div key={letter} className="flex gap-2">
                <span className="font-bold w-4 shrink-0 text-indigo-600 dark:text-indigo-400">{letter}</span>
                <span><strong>{name}</strong> — {desc}</span>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-500 mt-2 italic">
            Avec moins de 15 essais, il est impossible de confirmer statistiquement
            la normalité. Le Q-Q plot reste indicatif et utile pour détecter
            des anomalies grossières.
          </p>
        </Section>
      </div>
    ),
  },
};

// ─── Drawer principal ─────────────────────────────────────────────────────────
function HelpDrawer({ open, topic, onClose }) {
  const content = topic ? HELP_CONTENT[topic] : null;
  const Icon = content?.icon || BookOpenIcon;

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 bg-black/20 dark:bg-black/40 z-40 backdrop-blur-[1px]"
          onClick={onClose}
        />
      )}

      {/* Panneau */}
      <div
        className={`fixed top-0 right-0 h-full w-full sm:w-[420px] max-w-[100vw] z-50
          bg-white dark:bg-gray-950 shadow-2xl border-l border-gray-200 dark:border-gray-800
          flex flex-col transition-transform duration-300 ease-in-out
          ${open ? "translate-x-0" : "translate-x-full"}`}
      >
        {/* Header */}
        <div className="flex items-start gap-3 px-5 py-4 border-b border-gray-100 dark:border-gray-800 bg-indigo-50 dark:bg-indigo-950/40">
          <div className="size-9 rounded-lg bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center shrink-0">
            <Icon className="size-5 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-indigo-400 mb-0.5">Aide pédagogique</p>
            <h2 className="text-sm font-bold text-gray-900 dark:text-white leading-snug">
              {content?.title || "Aide"}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="size-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors shrink-0"
          >
            <XMarkIcon className="size-5" />
          </button>
        </div>

        {/* Corps scrollable */}
        <div className="flex-1 overflow-y-auto px-4 py-4">
          {content?.render ? content.render() : (
            <p className="text-sm text-gray-400">Aucune aide disponible pour ce sujet.</p>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900">
          <p className="text-[10px] text-gray-400 text-center">
            Basé sur le référentiel BTS Métiers de la Chimie · Plans d'expériences
          </p>
        </div>
      </div>
    </>
  );
}

export default HelpDrawer;
