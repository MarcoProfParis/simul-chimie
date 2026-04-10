import { useState, useRef } from "react";

const SURFACES = [
  { name: "PTFE (Téflon)",    gc: 19,  gSV: 19,  gD: 18.5, gP: 0.5,  gSL: 5,  color: "#0891b2", surfBg: "#e0f2fe", surfStroke: "#38bdf8", pattern: "lines",
    desc: "Surface ultra-hydrophobe à très faible énergie — γSV = 19 mN·m⁻¹. Entièrement dispersive, utilisée pour les revêtements anti-adhésifs (poêles, câbles)." },
  { name: "Polypropylène",    gc: 30,  gSV: 30,  gD: 28.5, gP: 1.5,  gSL: 8,  color: "#2563eb", surfBg: "#dbeafe", surfStroke: "#93c5fd", pattern: "dots",
    desc: "Polymère semi-cristallin à faible énergie — γSV = 30 mN·m⁻¹. Traitement corona indispensable avant impression d'encres aqueuses." },
  { name: "Polyéthylène",     gc: 32,  gSV: 32,  gD: 31.5, gP: 0.5,  gSL: 9,  color: "#7c3aed", surfBg: "#ede9fe", surfStroke: "#a78bfa", pattern: "dots",
    desc: "Matériau entièrement apolaire — γSV = 32 mN·m⁻¹, γᴾ ≈ 0. Tout collage ou impression nécessite un traitement préalable." },
  { name: "Polystyrène",      gc: 33,  gSV: 33,  gD: 31.0, gP: 2.0,  gSL: 8,  color: "#0f766e", surfBg: "#ccfbf1", surfStroke: "#5eead4", pattern: "dots",
    desc: "Polymère aromatique — γSV = 33 mN·m⁻¹. Les cycles phényle apportent une légère polarité. Utilisé pour les boîtiers, emballages et mousses isolantes." },
  { name: "PVC",              gc: 39,  gSV: 39,  gD: 34.0, gP: 5.0,  gSL: 4,  color: "#d97706", surfBg: "#fef3c7", surfStroke: "#fcd34d", pattern: "hatch",
    desc: "Polymère polaire modéré — γSV = 39 mN·m⁻¹. Énergie de surface proche des encres aqueuses : mouillage souvent à la limite sans traitement." },
  { name: "PET",              gc: 43,  gSV: 43,  gD: 37.0, gP: 6.0,  gSL: 2,  color: "#dc2626", surfBg: "#fee2e2", surfStroke: "#fca5a5", pattern: "grid",
    desc: "Polyester à bonne énergie — γSV = 43 mN·m⁻¹. Les groupements ester apportent une composante polaire favorisant l'adhésion des peintures." },
  { name: "Nylon 6,6",        gc: 46,  gSV: 46,  gD: 36.0, gP: 10.0, gSL: 1,  color: "#be185d", surfBg: "#fce7f3", surfStroke: "#f9a8d4", pattern: "grid",
    desc: "Polyamide à haute énergie — γSV = 46 mN·m⁻¹. Les liaisons amide créent une forte composante polaire ; bonne adhérence naturelle des encres." },
  { name: "PMMA",             gc: 41,  gSV: 41,  gD: 35.0, gP: 6.0,  gSL: 3,  color: "#7e22ce", surfBg: "#f3e8ff", surfStroke: "#c084fc", pattern: "lines",
    desc: "Verre organique — γSV = 41 mN·m⁻¹. Les groupements ester méthacrylate apportent une polarité modérée. Utilisé pour les vitres, présentoirs et lentilles." },
  { name: "Époxy (durci)",    gc: 47,  gSV: 47,  gD: 38.0, gP: 9.0,  gSL: 2,  color: "#b45309", surfBg: "#fef3c7", surfStroke: "#f59e0b", pattern: "grid",
    desc: "Résine thermodurcissable — γSV ≈ 47 mN·m⁻¹. Haute énergie de surface ; excellente adhérence des peintures et des primaires sans traitement particulier." },
  { name: "Verre / métal",    gc: 72,  gSV: 72,  gD: 40.0, gP: 32.0, gSL: 0,  color: "#15803d", surfBg: "#d1fae5", surfStroke: "#34d399", pattern: "solid",
    desc: "Très haute énergie — γSV ≥ 70 mN·m⁻¹. Liaisons ioniques et covalentes ; mouillage total ou quasi-total par presque tous les liquides." },
  { name: "Acier inox",       gc: 70,  gSV: 70,  gD: 38.0, gP: 32.0, gSL: 0,  color: "#475569", surfBg: "#f1f5f9", surfStroke: "#94a3b8", pattern: "solid",
    desc: "Métal oxydé en surface — γSV ≈ 70 mN·m⁻¹. La couche d'oxyde (Cr₂O₃) est très énergétique. Bonne mouillabilité après dégraissage soigné." },
  { name: "Lotus (super-H)",  gc: 6,   gSV: 6,   gD: 5.5,  gP: 0.5,  gSL: 12, color: "#92400e", surfBg: "#fef9c3", surfStroke: "#fde68a", pattern: "bumps",
    desc: "Superhydrophobe micro-nano-texturé (Cassie-Baxter) — θ > 150°. Les micro-reliefs piègent l'air, minimisant le contact réel solide/liquide." },
];

// ── Molécule SVG minimaliste ──────────────────────────────────────────────────
// Chaque molécule est un SVG 120x80 en coordonnées locales
const MOLECULES = {
  "Eau": (c) => (
    <svg viewBox="0 0 120 80" width="120" height="80">
      {/* O central */}
      <circle cx="60" cy="40" r="14" fill={c} opacity=".85"/>
      <text x="60" y="44" textAnchor="middle" fontSize="12" fontWeight="700" fill="white" fontFamily="Georgia,serif">O</text>
      {/* H gauche */}
      <circle cx="24" cy="58" r="10" fill={c} opacity=".55"/>
      <text x="24" y="62" textAnchor="middle" fontSize="11" fill="white" fontFamily="Georgia,serif">H</text>
      <line x1="34" y1="52" x2="47" y2="47" stroke={c} strokeWidth="2.5"/>
      {/* H droit */}
      <circle cx="96" cy="58" r="10" fill={c} opacity=".55"/>
      <text x="96" y="62" textAnchor="middle" fontSize="11" fill="white" fontFamily="Georgia,serif">H</text>
      <line x1="86" y1="52" x2="73" y2="47" stroke={c} strokeWidth="2.5"/>
      {/* Doublets libres */}
      <line x1="50" y1="26" x2="44" y2="18" stroke={c} strokeWidth="1.5" strokeDasharray="3 2" opacity=".6"/>
      <line x1="70" y1="26" x2="76" y2="18" stroke={c} strokeWidth="1.5" strokeDasharray="3 2" opacity=".6"/>
      <text x="60" y="12" textAnchor="middle" fontSize="9" fill={c} opacity=".6" fontFamily="Georgia,serif">∶</text>
      {/* Angle */}
      <text x="60" y="74" textAnchor="middle" fontSize="9" fill={c} opacity=".55" fontFamily="Georgia,serif">104,5°</text>
    </svg>
  ),
  "Glycérol": (c) => (
    <svg viewBox="0 0 140 80" width="140" height="80">
      {/* Chaîne C-C-C */}
      {[20,60,100].map((x,i) => (
        <g key={i}>
          <circle cx={x} cy="40" r="10" fill={c} opacity=".7"/>
          <text x={x} y="44" textAnchor="middle" fontSize="10" fill="white" fontFamily="Georgia,serif">C</text>
          {i < 2 && <line x1={x+10} y1="40" x2={x+40} y2="40" stroke={c} strokeWidth="2"/>}
        </g>
      ))}
      {/* OH groupes */}
      {[20,60,100].map((x,i) => (
        <g key={`oh${i}`}>
          <line x1={x} y1="30" x2={x} y2="16" stroke={c} strokeWidth="1.8"/>
          <circle cx={x} cy="10" r="8" fill={c} opacity=".55"/>
          <text x={x} y="14" textAnchor="middle" fontSize="9" fill="white" fontFamily="Georgia,serif">OH</text>
        </g>
      ))}
      {/* H bas */}
      {[20,100].map((x,i) => (
        <g key={`h${i}`}>
          <line x1={x} y1="50" x2={x} y2="62" stroke={c} strokeWidth="1.5" opacity=".5"/>
          <text x={x} y="72" textAnchor="middle" fontSize="9" fill={c} opacity=".5" fontFamily="Georgia,serif">H₂</text>
        </g>
      ))}
    </svg>
  ),
  "Formamide": (c) => (
    <svg viewBox="0 0 130 80" width="130" height="80">
      {/* H-C=O */}
      <circle cx="30" cy="40" r="10" fill={c} opacity=".6"/>
      <text x="30" y="44" textAnchor="middle" fontSize="10" fill="white" fontFamily="Georgia,serif">H</text>
      <line x1="40" y1="40" x2="55" y2="40" stroke={c} strokeWidth="2"/>
      <circle cx="65" cy="40" r="12" fill={c} opacity=".8"/>
      <text x="65" y="44" textAnchor="middle" fontSize="11" fill="white" fontFamily="Georgia,serif">C</text>
      <line x1="77" y1="36" x2="92" y2="28" stroke={c} strokeWidth="2"/>
      <line x1="77" y1="42" x2="92" y2="50" stroke={c} strokeWidth="1.2"/>
      <circle cx="100" cy="24" r="10" fill={c} opacity=".7"/>
      <text x="100" y="28" textAnchor="middle" fontSize="10" fill="white" fontFamily="Georgia,serif">O</text>
      {/* NH₂ */}
      <line x1="65" y1="52" x2="65" y2="66" stroke={c} strokeWidth="2"/>
      <circle cx="65" cy="72" r="10" fill={c} opacity=".55"/>
      <text x="65" y="76" textAnchor="middle" fontSize="9" fill="white" fontFamily="Georgia,serif">NH₂</text>
    </svg>
  ),
  "Éthylène glycol": (c) => (
    <svg viewBox="0 0 120 80" width="120" height="80">
      <circle cx="35" cy="44" r="11" fill={c} opacity=".75"/>
      <text x="35" y="48" textAnchor="middle" fontSize="10" fill="white" fontFamily="Georgia,serif">C</text>
      <line x1="46" y1="44" x2="74" y2="44" stroke={c} strokeWidth="2"/>
      <circle cx="85" cy="44" r="11" fill={c} opacity=".75"/>
      <text x="85" y="48" textAnchor="middle" fontSize="10" fill="white" fontFamily="Georgia,serif">C</text>
      {[35,85].map((x,i) => (
        <g key={i}>
          <line x1={x} y1="33" x2={x} y2="20" stroke={c} strokeWidth="2"/>
          <circle cx={x} cy="13" r="9" fill={c} opacity=".6"/>
          <text x={x} y="17" textAnchor="middle" fontSize="9" fill="white" fontFamily="Georgia,serif">OH</text>
          <line x1={x+(i?8:-8)} y1="50" x2={x+(i?16:-16)} y2="64" stroke={c} strokeWidth="1.5" opacity=".4"/>
          <text x={x+(i?20:-20)} y="72" textAnchor="middle" fontSize="9" fill={c} opacity=".4" fontFamily="Georgia,serif">H₂</text>
        </g>
      ))}
    </svg>
  ),
  "Diiodométhane": (c) => (
    <svg viewBox="0 0 130 80" width="130" height="80">
      <circle cx="65" cy="40" r="12" fill={c} opacity=".8"/>
      <text x="65" y="44" textAnchor="middle" fontSize="11" fill="white" fontFamily="Georgia,serif">C</text>
      {/* 2 I */}
      <line x1="53" y1="40" x2="28" y2="40" stroke={c} strokeWidth="2.5"/>
      <circle cx="18" cy="40" r="14" fill={c} opacity=".65"/>
      <text x="18" y="44" textAnchor="middle" fontSize="11" fill="white" fontFamily="Georgia,serif">I</text>
      <line x1="77" y1="40" x2="102" y2="40" stroke={c} strokeWidth="2.5"/>
      <circle cx="112" cy="40" r="14" fill={c} opacity=".65"/>
      <text x="112" y="44" textAnchor="middle" fontSize="11" fill="white" fontFamily="Georgia,serif">I</text>
      {/* 2 H */}
      <line x1="65" y1="28" x2="65" y2="16" stroke={c} strokeWidth="1.5" opacity=".5"/>
      <text x="65" y="12" textAnchor="middle" fontSize="9" fill={c} opacity=".5" fontFamily="Georgia,serif">H</text>
      <line x1="65" y1="52" x2="65" y2="66" stroke={c} strokeWidth="1.5" opacity=".5"/>
      <text x="65" y="74" textAnchor="middle" fontSize="9" fill={c} opacity=".5" fontFamily="Georgia,serif">H</text>
    </svg>
  ),
  "Éthanol": (c) => (
    <svg viewBox="0 0 130 80" width="130" height="80">
      <circle cx="30" cy="44" r="10" fill={c} opacity=".7"/>
      <text x="30" y="48" textAnchor="middle" fontSize="10" fill="white" fontFamily="Georgia,serif">C</text>
      <line x1="40" y1="44" x2="68" y2="44" stroke={c} strokeWidth="2"/>
      <circle cx="78" cy="44" r="10" fill={c} opacity=".7"/>
      <text x="78" y="48" textAnchor="middle" fontSize="10" fill="white" fontFamily="Georgia,serif">C</text>
      <line x1="88" y1="44" x2="108" y2="44" stroke={c} strokeWidth="2"/>
      <circle cx="116" cy="44" r="10" fill={c} opacity=".7"/>
      <text x="116" y="48" textAnchor="middle" fontSize="9" fill="white" fontFamily="Georgia,serif">OH</text>
      {/* H₃ sur C gauche */}
      <line x1="30" y1="34" x2="30" y2="20" stroke={c} strokeWidth="1.5" opacity=".5"/>
      <text x="30" y="14" textAnchor="middle" fontSize="9" fill={c} opacity=".5" fontFamily="Georgia,serif">H₃</text>
      {/* H₂ sur C milieu */}
      <line x1="78" y1="34" x2="78" y2="20" stroke={c} strokeWidth="1.5" opacity=".5"/>
      <text x="78" y="14" textAnchor="middle" fontSize="9" fill={c} opacity=".5" fontFamily="Georgia,serif">H₂</text>
    </svg>
  ),
  "Acétone": (c) => (
    <svg viewBox="0 0 140 80" width="140" height="80">
      <circle cx="20" cy="44" r="10" fill={c} opacity=".65"/>
      <text x="20" y="48" textAnchor="middle" fontSize="9" fill="white" fontFamily="Georgia,serif">CH₃</text>
      <line x1="30" y1="44" x2="55" y2="44" stroke={c} strokeWidth="2"/>
      <circle cx="65" cy="44" r="11" fill={c} opacity=".8"/>
      <text x="65" y="48" textAnchor="middle" fontSize="11" fill="white" fontFamily="Georgia,serif">C</text>
      {/* C=O double liaison */}
      <line x1="65" y1="33" x2="65" y2="18" stroke={c} strokeWidth="2.5"/>
      <line x1="69" y1="33" x2="69" y2="18" stroke={c} strokeWidth="1.2"/>
      <circle cx="65" cy="10" r="10" fill={c} opacity=".7"/>
      <text x="65" y="14" textAnchor="middle" fontSize="10" fill="white" fontFamily="Georgia,serif">O</text>
      <line x1="75" y1="44" x2="100" y2="44" stroke={c} strokeWidth="2"/>
      <circle cx="112" cy="44" r="10" fill={c} opacity=".65"/>
      <text x="112" y="48" textAnchor="middle" fontSize="9" fill="white" fontFamily="Georgia,serif">CH₃</text>
    </svg>
  ),
  "n-hexadécane": (c) => (
    <svg viewBox="0 0 140 80" width="140" height="80">
      {/* Chaîne zigzag C16 simplifiée */}
      {[0,1,2,3,4,5,6,7].map(i => {
        const x1 = 10 + i*16, y1 = i%2===0 ? 38 : 48;
        const x2 = 10 + (i+1)*16, y2 = i%2===0 ? 48 : 38;
        return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={c} strokeWidth="2.2" strokeLinecap="round"/>;
      })}
      <text x="70" y="72" textAnchor="middle" fontSize="9" fill={c} opacity=".7" fontFamily="Georgia,serif">C₁₆H₃₄ — purement dispersif</text>
      <text x="70" y="16" textAnchor="middle" fontSize="9" fill={c} opacity=".5" fontFamily="Georgia,serif">γᴾ = 0</text>
    </svg>
  ),
};

const LIQUIDS = [
  { name: "Eau",             gamma: 72.8, gD: 21.8, gP: 51.0, color: "#2563eb", light: "#bfdbfe",
    desc: "Liquide polaire par excellence — γ = 72,8 mN·m⁻¹.",
    dispComment: "γᴰ = 21,8 mN·m⁻¹ — interactions de London universelles, présentes malgré la forte polarité.",
    polComment:  "γᴾ = 51,0 mN·m⁻¹ — réseau tridimensionnel de 4 liaisons H par molécule (2 donneuses O–H, 2 accepteuses). Représente 70 % de γ total." },
  { name: "Glycérol",        gamma: 63.4, gD: 37.0, gP: 26.4, color: "#7c3aed", light: "#ddd6fe",
    desc: "Trialcool visqueux — γ = 63,4 mN·m⁻¹.",
    dispComment: "γᴰ = 37,0 mN·m⁻¹ — la chaîne propyle à 3 carbones contribue significativement aux forces dispersives.",
    polComment:  "γᴾ = 26,4 mN·m⁻¹ — trois groupes –OH forment un réseau dense de liaisons H, mais moins étendu que l'eau." },
  { name: "Formamide",       gamma: 58.2, gD: 32.3, gP: 26.2, color: "#0ea5e9", light: "#bae6fd",
    desc: "Solvant polaire aprotique — γ = 58,2 mN·m⁻¹.",
    dispComment: "γᴰ = 32,3 mN·m⁻¹ — contribution dispersive notable liée au groupement C–H et à la densité électronique.",
    polComment:  "γᴾ = 26,2 mN·m⁻¹ — groupement amide (–CO–NH₂) : fort moment dipolaire et liaisons H. Liquide test de référence Owens-Wendt." },
  { name: "Éthylène glycol", gamma: 47.7, gD: 29.3, gP: 18.4, color: "#06b6d4", light: "#a5f3fc",
    desc: "Diol à deux fonctions –OH — γ = 47,7 mN·m⁻¹.",
    dispComment: "γᴰ = 29,3 mN·m⁻¹ — chaîne –CH₂–CH₂– courte, contribution dispersive modérée.",
    polComment:  "γᴾ = 18,4 mN·m⁻¹ — deux groupes –OH en position terminale, liaisons H mais moins de sites que le glycérol." },
  { name: "Diiodométhane",   gamma: 50.8, gD: 50.8, gP: 0.0,  color: "#6366f1", light: "#c7d2fe",
    desc: "Liquide purement dispersif — γ = 50,8 mN·m⁻¹.",
    dispComment: "γᴰ = 50,8 mN·m⁻¹ — deux atomes d'iode très polarisables (Z=53) génèrent des dipôles instantanés intenses. γ = γᴰ en totalité.",
    polComment:  "γᴾ = 0 mN·m⁻¹ — molécule symétrique (CH₂I₂), moment dipolaire μ ≈ 0. Liquide test dispersif de référence pour la méthode d'Owens-Wendt." },
  { name: "Éthanol",         gamma: 22.3, gD: 18.5, gP:  3.8,  color: "#d97706", light: "#fde68a",
    desc: "Monoalcool à courte chaîne — γ = 22,3 mN·m⁻¹.",
    dispComment: "γᴰ = 18,5 mN·m⁻¹ — chaîne éthyle (C₂H₅) peu polarisable ; forces de London faibles.",
    polComment:  "γᴾ = 3,8 mN·m⁻¹ — un seul groupe –OH dilué par la chaîne alkyle. γᴾ diminue quand la chaîne s'allonge : méthanol (4,8) > éthanol (3,8) > propanol (3,3)." },
  { name: "Acétone",         gamma: 23.7, gD: 16.0, gP:  7.7,  color: "#ea580c", light: "#fed7aa",
    desc: "Cétone aprotique — γ = 23,7 mN·m⁻¹.",
    dispComment: "γᴰ = 16,0 mN·m⁻¹ — deux groupes méthyle et un carbone carbonyle ; polarisabilité modeste.",
    polComment:  "γᴾ = 7,7 mN·m⁻¹ — groupement C=O fort accepteur de liaison H (μ ≈ 2,7 D), mais pas de H acide → réseau H incomplet." },
  { name: "Acide acétique",   gamma: 27.1, gD: 10.2, gP: 16.9, color: "#dc2626", light: "#fee2e2",
    desc: "Acide carboxylique — γ = 27,1 mN·m⁻¹.",
    dispComment: "γᴰ = 10,2 mN·m⁻¹ — chaîne méthyle courte et faible polarisabilité électronique.",
    polComment:  "γᴾ = 16,9 mN·m⁻¹ — formation de dimères stables en phase liquide via liaisons H O–H···O=C, ce qui sature partiellement les interactions disponibles." },
  { name: "Toluène",          gamma: 28.4, gD: 25.0, gP:  3.4, color: "#0f766e", light: "#ccfbf1",
    desc: "Hydrocarbure aromatique — γ = 28,4 mN·m⁻¹.",
    dispComment: "γᴰ = 25,0 mN·m⁻¹ — cycle benzénique hautement polarisable, nuage π délocalisé sur 6 carbones.",
    polComment:  "γᴾ = 3,4 mN·m⁻¹ — légère asymétrie due au groupe méthyle, mais polarité très faible. Bon solvant des polymères apolaires." },
  { name: "Eau + glycérol",   gamma: 58.0, gD: 26.0, gP: 32.0, color: "#8b5cf6", light: "#ede9fe",
    desc: "Mélange binaire calibré — γ ≈ 58 mN·m⁻¹.",
    dispComment: "γᴰ = 26,0 mN·m⁻¹ — contribution dispersive intermédiaire entre l'eau et le glycérol pur.",
    polComment:  "γᴾ = 32,0 mN·m⁻¹ — réseaux H de l'eau et des groupes –OH du glycérol coexistent. Utilisé pour ajuster γLV dans les tests de Zisman." },
  { name: "Mercure",          gamma: 485,  gD: 200,  gP: 285,  color: "#374151", light: "#f3f4f6",
    desc: "Métal liquide — γ = 485 mN·m⁻¹.",
    dispComment: "γᴰ = 200 mN·m⁻¹ — interactions métalliques par liaisons de bandes d'énergie, bien supérieures aux van der Waals.",
    polComment:  "γᴾ = 285 mN·m⁻¹ — forte composante polaire liée aux interactions électroniques des atomes Hg et à la cohésion métallique. Non mouillant sur la plupart des polymères." },
];

// ── Molécules supplémentaires ─────────────────────────────────────────────────
Object.assign(MOLECULES, {
  "Acide acétique": (c) => (
    <svg viewBox="0 0 130 80" width="130" height="80">
      <circle cx="20" cy="44" r="10" fill={c} opacity=".65"/>
      <text x="20" y="48" textAnchor="middle" fontSize="9" fill="white" fontFamily="Georgia,serif">CH₃</text>
      <line x1="30" y1="44" x2="52" y2="44" stroke={c} strokeWidth="2"/>
      <circle cx="62" cy="44" r="11" fill={c} opacity=".8"/>
      <text x="62" y="48" textAnchor="middle" fontSize="11" fill="white" fontFamily="Georgia,serif">C</text>
      <line x1="62" y1="33" x2="62" y2="18" stroke={c} strokeWidth="2.5"/>
      <line x1="66" y1="33" x2="66" y2="18" stroke={c} strokeWidth="1.2"/>
      <circle cx="64" cy="10" r="9" fill={c} opacity=".7"/>
      <text x="64" y="14" textAnchor="middle" fontSize="10" fill="white" fontFamily="Georgia,serif">O</text>
      <line x1="73" y1="44" x2="95" y2="44" stroke={c} strokeWidth="2"/>
      <circle cx="105" cy="44" r="10" fill={c} opacity=".7"/>
      <text x="105" y="48" textAnchor="middle" fontSize="9" fill="white" fontFamily="Georgia,serif">OH</text>
      <text x="65" y="74" textAnchor="middle" fontSize="9" fill={c} opacity=".5" fontFamily="Georgia,serif">dimères ⇌</text>
    </svg>
  ),
  "Toluène": (c) => (
    <svg viewBox="0 0 130 80" width="130" height="80">
      {/* Hexagone benzène */}
      {[0,1,2,3,4,5].map(i => {
        const a1 = (i*60-90)*Math.PI/180, a2 = ((i+1)*60-90)*Math.PI/180;
        return <line key={i} x1={55+22*Math.cos(a1)} y1={44+22*Math.sin(a1)} x2={55+22*Math.cos(a2)} y2={44+22*Math.sin(a2)} stroke={c} strokeWidth="2.2"/>;
      })}
      {/* Cercle interne pour aromatic */}
      <circle cx="55" cy="44" r="12" fill="none" stroke={c} strokeWidth="1" opacity=".4" strokeDasharray="3 2"/>
      {/* CH₃ */}
      <line x1="55" y1="22" x2="55" y2="10" stroke={c} strokeWidth="2"/>
      <circle cx="55" cy="6" r="9" fill={c} opacity=".65"/>
      <text x="55" y="10" textAnchor="middle" fontSize="9" fill="white" fontFamily="Georgia,serif">CH₃</text>
      <text x="100" y="48" textAnchor="middle" fontSize="9" fill={c} opacity=".5" fontFamily="Georgia,serif">π délocalisé</text>
    </svg>
  ),
  "Eau + glycérol": (c) => (
    <svg viewBox="0 0 130 80" width="130" height="80">
      <circle cx="30" cy="36" r="11" fill={c} opacity=".7"/>
      <text x="30" y="40" textAnchor="middle" fontSize="9" fill="white" fontFamily="Georgia,serif">H₂O</text>
      <line x1="41" y1="38" x2="55" y2="44" stroke={c} strokeWidth="1.5" strokeDasharray="3 2" opacity=".6"/>
      <circle cx="65" cy="48" r="11" fill={c} opacity=".55"/>
      <text x="65" y="52" textAnchor="middle" fontSize="9" fill="white" fontFamily="Georgia,serif">Gly</text>
      <line x1="76" y1="44" x2="90" y2="38" stroke={c} strokeWidth="1.5" strokeDasharray="3 2" opacity=".6"/>
      <circle cx="100" cy="34" r="11" fill={c} opacity=".7"/>
      <text x="100" y="38" textAnchor="middle" fontSize="9" fill="white" fontFamily="Georgia,serif">H₂O</text>
      <text x="65" y="72" textAnchor="middle" fontSize="9" fill={c} opacity=".55" fontFamily="Georgia,serif">réseau H mixte</text>
    </svg>
  ),
  "Mercure": (c) => (
    <svg viewBox="0 0 130 80" width="130" height="80">
      {[0,1,2,3,4].map(i => (
        <circle key={i} cx={20+i*22} cy={44} r="12" fill={c} opacity={0.5+i*0.08}/>
      ))}
      {[0,1,2,3].map(i => (
        <line key={i} x1={32+i*22} y1="44" x2={42+i*22} y2="44" stroke={c} strokeWidth="1.5" opacity=".4"/>
      ))}
      <text x="65" y="20" textAnchor="middle" fontSize="9" fill={c} opacity=".6" fontFamily="Georgia,serif">Hg — liaisons métalliques</text>
      <text x="65" y="72" textAnchor="middle" fontSize="9" fill={c} opacity=".5" fontFamily="Georgia,serif">γ = 485 mN·m⁻¹</text>
    </svg>
  ),
});

function cosY(s, g) { return Math.max(-1, Math.min(1, (s.gSV - s.gSL) / g)); }
function toDeg(c)   { return Math.round(Math.acos(c) * 180 / Math.PI); }
function regime(t) {
  if (t <= 0)  return { label: "Mouillage total",                bg: "#dcfce7", fg: "#15803d", dot: "#22c55e" };
  if (t < 90)  return { label: "Mouillage partiel",              bg: "#eff6ff", fg: "#1d4ed8", dot: "#3b82f6" };
  if (t < 150) return { label: "Mauvais mouillage (hydrophobe)", bg: "#fef9c3", fg: "#92400e", dot: "#f59e0b" };
  return         { label: "Non-mouillage (superhydrophobe)",     bg: "#fee2e2", fg: "#991b1b", dot: "#ef4444" };
}

function Pattern({ id, type, bg, stroke }) {
  const s = stroke + "bb";
  if (type === "solid")  return <pattern id={id} width="8"  height="8"  patternUnits="userSpaceOnUse"><rect width="8"  height="8"  fill={bg}/></pattern>;
  if (type === "dots")   return <pattern id={id} width="9"  height="9"  patternUnits="userSpaceOnUse"><rect width="9"  height="9"  fill={bg}/><circle cx="4.5" cy="4.5" r="1.3" fill={s}/></pattern>;
  if (type === "lines")  return <pattern id={id} width="10" height="10" patternUnits="userSpaceOnUse"><rect width="10" height="10" fill={bg}/><line x1="0" y1="10" x2="10" y2="0" stroke={s} strokeWidth="0.9"/></pattern>;
  if (type === "hatch")  return <pattern id={id} width="10" height="10" patternUnits="userSpaceOnUse"><rect width="10" height="10" fill={bg}/><line x1="0" y1="10" x2="10" y2="0" stroke={s} strokeWidth="0.7"/><line x1="0" y1="0" x2="10" y2="10" stroke={s} strokeWidth="0.7"/></pattern>;
  if (type === "grid")   return <pattern id={id} width="10" height="10" patternUnits="userSpaceOnUse"><rect width="10" height="10" fill={bg}/><path d="M10 0L0 0 0 10" fill="none" stroke={s} strokeWidth="0.6"/></pattern>;
  if (type === "bumps")  return <pattern id={id} width="16" height="10" patternUnits="userSpaceOnUse"><rect width="16" height="10" fill={bg}/><ellipse cx="8" cy="5" rx="5" ry="2.8" fill={s}/><ellipse cx="0" cy="5" rx="5" ry="2.8" fill={s}/><ellipse cx="16" cy="5" rx="5" ry="2.8" fill={s}/></pattern>;
  return null;
}

function Canvas({ theta, surf, liquid, showV, svgRef }) {
  const W = 700, H = 370;
  const cx = W / 2, baseY = 228;
  const R = 172;

  const rad  = theta * Math.PI / 180;
  const cosT = Math.cos(rad);
  const sinT = Math.sin(rad);
  const circleCy = baseY - R * cosT;
  const halfW    = R * sinT;
  const lx = cx - halfW;
  const rx = cx + halfW;

  // ── Drop path ──────────────────────────────────────────────────────────────
  let dp;
  if (theta <= 1) {
    const w = R * 2.0, h = 11;
    dp = `M${cx-w} ${baseY} Q${cx-w*.5} ${baseY-h} ${cx} ${baseY-h*1.4} Q${cx+w*.5} ${baseY-h} ${cx+w} ${baseY}Z`;
  } else if (theta >= 179) {
    const r = R * .73;
    dp = `M${cx} ${baseY-r*.04} m-${r} 0 a${r} ${r} 0 1 0 ${r*2} 0 a${r} ${r} 0 1 0-${r*2} 0`;
  } else {
    dp = `M${lx} ${baseY} A${R} ${R} 0 ${theta>90?1:0} 1 ${rx} ${baseY}`;
  }

  // ── Géométrie côté GAUCHE (point de contact lx) ───────────────────────────
  // Au point de contact gauche (lx, baseY), la tangente sortante a pour
  // direction (-cosT, -sinT) en SVG.
  //   θ < 90 : cosT > 0 → -cosT < 0 → va vers la gauche-haut ✓
  //   θ > 90 : cosT < 0 → -cosT > 0 → va vers la droite-haut ✓ (tangente obtuse)
  //
  // L'arc est mesuré entre :
  //   - le point sur la surface à DROITE du contact : (lx + arcR, baseY)
  //   - le point sur la tangente : lx + arcR*(-cosT, -sinT)
  // L'arc tourne dans le sens anti-horaire (sweep=0) depuis la surface vers la tangente

  const arcR = 50;
  const arcStartX = lx + arcR;
  const arcStartY = baseY;
  // Direction tangente : angle = −theta_rad → dx = cosT, dy = −sinT
  const aex = lx + arcR * cosT;
  const aey = baseY + arcR * (-sinT);

  // Midpoint de l'arc : entre 0° (droite) et -theta (tangente montante)
  const thetaMid = -rad / 2;
  const tmx = lx + (arcR + 26) * Math.cos(thetaMid);
  const tmy = baseY + (arcR + 26) * Math.sin(thetaMid);

  // ── Tangente pointillée ────────────────────────────────────────────────────
  // Part du point triple (lx, baseY), direction (cosT, −sinT)
  const tDash = 140;
  const tx2 = lx + tDash * cosT;
  const ty2 = baseY + tDash * (-sinT);

  // ── Vecteurs ───────────────────────────────────────────────────────────────
  const aLen = 64;

  return (
    <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: "block" }}
      xmlns="http://www.w3.org/2000/svg">
      <defs>
        <Pattern id="sp" type={surf.pattern} bg={surf.surfBg} stroke={surf.surfStroke}/>
        {showV && <>
          <marker id="asv" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
            <path d="M2 2L8 5L2 8" fill="none" stroke="#15803d" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </marker>
          <marker id="asl" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
            <path d="M2 2L8 5L2 8" fill="none" stroke="#dc2626" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </marker>
          <marker id="alv" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
            <path d="M2 2L8 5L2 8" fill="none" stroke="#2563eb" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </marker>
        </>}
        <linearGradient id="dg" x1=".28" y1="0" x2=".72" y2="1">
          <stop offset="0%" stopColor={liquid.light} stopOpacity=".97"/>
          <stop offset="100%" stopColor={liquid.color} stopOpacity=".86"/>
        </linearGradient>
        <clipPath id="dc"><path d={dp}/></clipPath>
      </defs>

      {/* ── Surface ── */}
      <rect x="24" y={baseY} width={W-48} height={78} rx="5" fill="url(#sp)"/>
      <rect x="24" y={baseY} width={W-48} height="4" rx="1.5" fill={surf.color} opacity=".65"/>
      {/* Label substrat sur fond blanc */}
      <rect x={W/2 - 160} y={baseY + 26} width={320} height={26} rx="5" fill="white" opacity=".88"/>
      <text x={W/2} y={baseY + 44} textAnchor="middle" fontFamily="Georgia,serif" fontSize="13"
        fill={surf.color} fontStyle="italic" fontWeight="600">
        {surf.name} — γSV = {surf.gSV} mN·m⁻¹
      </text>

      {/* ── Goutte ── */}
      <path d={dp} fill="url(#dg)" stroke={liquid.color} strokeWidth="2.2"/>
      {theta > 5 && (
        <ellipse cx={cx - R*.18} cy={circleCy - R*.14} rx={R*.11} ry={R*.07}
          fill="white" opacity=".42" clipPath="url(#dc)"/>
      )}

      {/* ── Tangente pointillée — part du point triple (lx, baseY) ── */}
      {theta > 3 && theta < 177 && (
        <line
          x1={lx} y1={baseY}
          x2={tx2} y2={ty2}
          stroke="#334155" strokeWidth="2.2" strokeDasharray="8 5" opacity=".82"
        />
      )}

      {/* ── Arc θ — de (lx+arcR, baseY) vers (aex, aey), sens horaire ── */}
      {theta > 3 && theta < 177 && (
        <path
          d={`M${arcStartX} ${arcStartY} A${arcR} ${arcR} 0 0 0 ${aex} ${aey}`}
          fill="none" stroke="#f59e0b" strokeWidth="2.4" opacity=".95"
        />
      )}

      {/* ── Label θ ── */}
      {theta > 5 && theta < 175 && (
        <text x={tmx} y={tmy} textAnchor="middle" dominantBaseline="central"
          fontFamily="Georgia,serif" fontSize="17" fontStyle="italic"
          fill="#b45309" fontWeight="bold">
          θ = {theta}°
        </text>
      )}
      {theta <= 1 && (
        <text x={cx} y={baseY-28} textAnchor="middle"
          fontFamily="Georgia,serif" fontSize="14" fill="#15803d" fontStyle="italic">
          θ = 0° — étalement total
        </text>
      )}
      {theta >= 178 && (
        <text x={cx} y={baseY-R*1.5} textAnchor="middle"
          fontFamily="Georgia,serif" fontSize="14" fill="#991b1b" fontStyle="italic">
          θ ≈ 180° — non-mouillage
        </text>
      )}

      {/* ── Point de contact triple — côté gauche ── */}
      {theta > 2 && theta < 178 && (
        <circle cx={lx} cy={baseY} r="5" fill="#f59e0b" stroke="white" strokeWidth="1.8"/>
      )}

      {/* ── Vecteurs (optionnels) — côté gauche ── */}
      {showV && theta > 5 && theta < 175 && <>
        {/* γSV → vers la droite sur la surface */}
        <line x1={lx} y1={baseY-1} x2={lx+aLen} y2={baseY-1}
          stroke="#15803d" strokeWidth="2.4" markerEnd="url(#asv)"/>
        <text x={lx+aLen/2} y={baseY-14} textAnchor="middle"
          fontFamily="Georgia,serif" fontSize="13" fill="#15803d" fontStyle="italic">
          γ<tspan fontSize="11" dy="2">SV</tspan>
        </text>

        {/* γSL → vers la gauche sur la surface */}
        <line x1={lx} y1={baseY-1} x2={lx-aLen} y2={baseY-1}
          stroke="#dc2626" strokeWidth="2.4" markerEnd="url(#asl)"/>
        <text x={lx-aLen/2} y={baseY-14} textAnchor="middle"
          fontFamily="Georgia,serif" fontSize="13" fill="#dc2626" fontStyle="italic">
          γ<tspan fontSize="11" dy="2">SL</tspan>
        </text>

        {/* γLV → tangent à la goutte, direction (cosT, −sinT) */}
        <line
          x1={lx} y1={baseY}
          x2={lx + aLen * cosT} y2={baseY + aLen * (-sinT)}
          stroke="#2563eb" strokeWidth="2.4" markerEnd="url(#alv)"/>
        <text
          x={lx + (aLen + 17) * cosT}
          y={baseY + (aLen + 17) * (-sinT)}
          textAnchor="middle" fontFamily="Georgia,serif" fontSize="13" fill="#2563eb" fontStyle="italic">
          γ<tspan fontSize="11" dy="2">LV</tspan>
        </text>
      </>}

      <text x={W-14} y={16} textAnchor="end"
        fontFamily="Georgia,serif" fontSize="10" fill="#cbd5e1" fontStyle="italic">
        θ mesuré dans le liquide, depuis la surface
      </text>

    </svg>
  );
}


export default function GouttteMouillage({ onBack }) {
  const [surf,       setSurf]      = useState(SURFACES[3]);
  const [liquid,     setLiquid]    = useState(LIQUIDS[0]);
  const [gammaLV,    setGamma]     = useState(LIQUIDS[0].gamma);
  const [showV,      setShowV]     = useState(false);
  const svgRef     = useRef(null);
  const rightColRef = useRef(null);

  const cosT  = cosY(surf, gammaLV);
  const theta = toDeg(cosT);
  const Wa    = (gammaLV * (1 + cosT)).toFixed(1);
  const S     = (surf.gSV - surf.gSL - gammaLV).toFixed(1);
  const reg   = regime(theta);

  const handleExport = async () => {
    const el = rightColRef.current;
    if (!el) return;
    // Charger html2canvas dynamiquement
    const script = document.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js";
    document.head.appendChild(script);
    await new Promise(r => { script.onload = r; });
    const canvas = await window.html2canvas(el, {
      backgroundColor: "#f8fafc",
      scale: 2,
      useCORS: true,
      logging: false,
    });
    const a = document.createElement("a");
    a.download = `mouillage_${liquid.name}_${surf.name}_${theta}deg.png`;
    a.href = canvas.toDataURL("image/png");
    a.click();
  };

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc", fontFamily: "'Helvetica Neue',Arial,sans-serif", color: "#1e293b" }}>

      <div style={{ background: "white", borderBottom: "1px solid #e2e8f0", padding: "14px 24px", display: "flex", alignItems: "center", gap: 12 }}>
        
        <span style={{ fontFamily: "Georgia,serif", fontSize: 22, fontWeight: 700, letterSpacing: -.5 }}>Mouillage</span>
        <span style={{ fontSize: 13, color: "#94a3b8", fontStyle: "italic" }}>Simulation de l'angle de mouillage · BTS Métiers de la Chimie</span>
      </div>

      <div style={{ maxWidth: 1110, margin: "0 auto", padding: "18px 14px 48px",
        display: "grid", gridTemplateColumns: "262px 1fr", gap: 14, alignItems: "start" }}>

        {/* ── LEFT ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

          <div style={{ background: "white", border: "1px solid #e2e8f0", borderRadius: 12, padding: 14 }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", color: "#94a3b8", marginBottom: 8 }}>Substrat solide</div>
            <div style={{ maxHeight: 260, overflowY: "auto", marginRight: -4, paddingRight: 4 }}>
              {SURFACES.map(s => (
                <button key={s.name} onClick={() => setSurf(s)} style={{
                  display: "flex", alignItems: "center", gap: 8, width: "100%",
                  padding: "6px 10px", marginBottom: 2, borderRadius: 8,
                  border: `1.5px solid ${surf === s ? s.color : "transparent"}`,
                  background: surf === s ? s.color + "14" : "transparent",
                  cursor: "pointer", textAlign: "left",
                }}>
                  <span style={{ width: 11, height: 11, borderRadius: 3, background: s.surfBg, border: `1.5px solid ${s.surfStroke}`, flexShrink: 0 }}/>
                  <span style={{ fontSize: 13, fontWeight: surf === s ? 600 : 400, color: surf === s ? s.color : "#475569", flex: 1 }}>{s.name}</span>
                  <span style={{ fontSize: 10, color: "#94a3b8" }}>γSV={s.gSV}</span>
                </button>
              ))}
            </div>
          </div>

          <div style={{ background: "white", border: "1px solid #e2e8f0", borderRadius: 12, padding: 14 }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", color: "#94a3b8", marginBottom: 8 }}>Liquide</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 12 }}>
              {LIQUIDS.map(l => (
                <button key={l.name} onClick={() => { setLiquid(l); setGamma(l.gamma); }} style={{
                  padding: "4px 10px", borderRadius: 99, fontSize: 11,
                  border: `1.5px solid ${liquid === l ? l.color : "#e2e8f0"}`,
                  background: liquid === l ? l.light : "transparent",
                  color: liquid === l ? l.color : "#64748b",
                  cursor: "pointer", fontWeight: liquid === l ? 600 : 400,
                }}>
                  {l.name}
                </button>
              ))}
            </div>
            <div style={{ fontSize: 11, color: "#64748b", marginBottom: 4 }}>γ<sub>LV</sub> personnalisé</div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <input type="range" min={15} max={75} step={0.5} value={gammaLV}
                onChange={e => setGamma(parseFloat(e.target.value))}
                style={{ flex: 1, accentColor: liquid.color }}/>
              <span style={{ minWidth: 52, textAlign: "right", fontSize: 13, fontWeight: 600 }}>
                {gammaLV.toFixed(1)} <span style={{ fontSize: 10, color: "#94a3b8" }}>mN·m⁻¹</span>
              </span>
            </div>
          </div>

          <div style={{ background: "white", border: "1px solid #e2e8f0", borderRadius: 12, padding: 14 }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", color: "#94a3b8", marginBottom: 10 }}>Résultats</div>
            {[
              { label: "Angle de contact θ",  value: `${theta}°`,                                   note: "mesuré dans le liquide" },
              { label: "cos θ",               value: cosT.toFixed(3),                                note: "loi de Young" },
              { label: "Énergie d'adhésion",  value: `${Wa} mJ·m⁻²`,                               note: "Wa = γLV(1 + cos θ)" },
              { label: "Coeff. d'étalement",  value: `${parseFloat(S)>=0?"+":""}${S}`,              note: "S = γSV − γSL − γLV" },
            ].map(m => (
              <div key={m.label} style={{ marginBottom: 8, paddingBottom: 8, borderBottom: "0.5px solid #f1f5f9" }}>
                <div style={{ fontSize: 10, color: "#94a3b8" }}>{m.label}</div>
                <span style={{ fontSize: 20, fontWeight: 600, fontFamily: "Georgia,serif" }}>{m.value}</span>
                <div style={{ fontSize: 10, color: "#cbd5e1", fontStyle: "italic", fontFamily: "Georgia,serif" }}>{m.note}</div>
              </div>
            ))}
            <div style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "5px 11px",
              borderRadius: 99, background: reg.bg, color: reg.fg, fontSize: 11, fontWeight: 600, marginTop: 2 }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: reg.dot }}/>
              {reg.label}
            </div>
          </div>
        </div>

        {/* ── RIGHT ── */}
        <div ref={rightColRef} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ background: "white", border: "1px solid #e2e8f0", borderRadius: 12, overflow: "hidden" }}>

            <div style={{ padding: "10px 14px", borderBottom: "0.5px solid #f1f5f9",
              display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ width: 12, height: 12, borderRadius: 3, background: liquid.light,
                  border: `2px solid ${liquid.color}`, display: "inline-block" }}/>
                <span style={{ fontSize: 12, color: "#64748b" }}>
                  <span style={{ color: liquid.color, fontWeight: 600 }}>{liquid.name}</span>
                  <span style={{ color: "#94a3b8" }}> sur </span>
                  <span style={{ color: surf.color, fontWeight: 600 }}>{surf.name}</span>
                </span>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => setShowV(v => !v)} style={{
                  padding: "5px 14px", borderRadius: 8, fontSize: 12, fontWeight: 600,
                  border: `1.5px solid ${showV ? "#2563eb" : "#e2e8f0"}`,
                  background: showV ? "#eff6ff" : "transparent",
                  color: showV ? "#1d4ed8" : "#64748b", cursor: "pointer",
                }}>
                  {showV ? "Masquer les vecteurs γ" : "Afficher les vecteurs γ"}
                </button>
                <button onClick={handleExport} style={{
                  padding: "5px 14px", borderRadius: 8, fontSize: 12, fontWeight: 600,
                  border: "1.5px solid #e2e8f0", background: "transparent",
                  color: "#475569", cursor: "pointer", display: "flex", alignItems: "center", gap: 6,
                }}>
                  <svg width="13" height="13" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
                    <path d="M8 2v8m0 0l-3-3m3 3l3-3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M2 11v1a2 2 0 002 2h8a2 2 0 002-2v-1" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
                  </svg>
                  Exporter PNG
                </button>
              </div>
            </div>

            <div style={{ padding: "10px 8px 2px" }}>
              <Canvas theta={theta} surf={surf} liquid={liquid} showV={showV} svgRef={svgRef}/>
            </div>

            {showV && theta > 5 && theta < 175 && (
              <div style={{ display: "flex", gap: 18, justifyContent: "center",
                padding: "6px 0 10px", borderTop: "0.5px solid #f1f5f9", flexWrap: "wrap" }}>
                {[
                  { c: "#15803d", l: "γSV — solide/vapeur" },
                  { c: "#dc2626", l: "γSL — solide/liquide" },
                  { c: "#2563eb", l: "γLV — liquide/vapeur (tangente)" },
                  { c: "#f59e0b", l: "θ — angle de raccordement" },
                ].map(v => (
                  <div key={v.l} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "#64748b" }}>
                    <span style={{ width: 16, height: 2, background: v.c, display: "inline-block", borderRadius: 1 }}/>
                    <span style={{ fontFamily: "Georgia,serif", fontStyle: "italic" }}>{v.l}</span>
                  </div>
                ))}
              </div>
            )}

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10,
              padding: "12px 14px 14px", borderTop: "0.5px solid #f1f5f9" }}>
              <div style={{ background: surf.surfBg, borderRadius: 8, padding: "10px 13px", border: `1px solid ${surf.surfStroke}` }}>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", color: surf.color, marginBottom: 5 }}>Substrat · {surf.name}</div>
                <div style={{ fontSize: 12, color: "#475569", lineHeight: 1.7, fontStyle: "italic", fontFamily: "Georgia,serif" }}>{surf.desc}</div>
              </div>

              {/* ── Carte liquide enrichie ── */}
              <div style={{ background: liquid.light, borderRadius: 8, padding: "10px 13px", border: `1px solid ${liquid.color}55` }}>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", color: liquid.color, marginBottom: 6 }}>
                  Liquide · {liquid.name}
                </div>

                {/* Molécule + barre γᴰ/γᴾ côte à côte */}
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
                  {/* Molécule SVG */}
                  <div style={{ flexShrink: 0, opacity: 0.9 }}>
                    {MOLECULES[liquid.name]?.(liquid.color) ?? null}
                  </div>

                  {/* Barres γᴰ / γᴾ */}
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: liquid.color, marginBottom: 6, fontFamily: "Georgia,serif" }}>
                      γ = {liquid.gamma} mN·m⁻¹
                    </div>
                    {[
                      { label: "γᴰ", value: liquid.gD, max: 75, col: "#64748b" },
                      { label: "γᴾ", value: liquid.gP, max: 75, col: liquid.color },
                    ].map(b => (
                      <div key={b.label} style={{ marginBottom: 5 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#475569", marginBottom: 2, fontFamily: "Georgia,serif" }}>
                          <span style={{ fontStyle: "italic" }}>{b.label}</span>
                          <span style={{ fontWeight: 600 }}>{b.value} mN·m⁻¹</span>
                        </div>
                        <div style={{ height: 6, borderRadius: 3, background: "#e2e8f0", overflow: "hidden" }}>
                          <div style={{ height: "100%", width: `${(b.value / b.max) * 100}%`, background: b.col, borderRadius: 3, transition: "width 0.4s" }}/>
                        </div>
                      </div>
                    ))}
                    <div style={{ fontSize: 10, color: "#94a3b8", marginTop: 4, fontFamily: "Georgia,serif", fontStyle: "italic" }}>
                      γᴾ/γ = {Math.round(liquid.gP / liquid.gamma * 100)} %
                    </div>
                  </div>
                </div>

                {/* Commentaires dispersif / polaire */}
                <div style={{ borderTop: `0.5px solid ${liquid.color}33`, paddingTop: 8, display: "flex", flexDirection: "column", gap: 5 }}>
                  <div style={{ fontSize: 11, color: "#475569", lineHeight: 1.6, fontFamily: "Georgia,serif", fontStyle: "italic" }}>
                    <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: "#64748b", marginRight: 5, verticalAlign: "middle" }}/>
                    {liquid.dispComment}
                  </div>
                  <div style={{ fontSize: 11, color: "#475569", lineHeight: 1.6, fontFamily: "Georgia,serif", fontStyle: "italic" }}>
                    <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: liquid.color, marginRight: 5, verticalAlign: "middle" }}/>
                    {liquid.polComment}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div style={{ background: "white", border: "1px solid #e2e8f0", borderRadius: 12, padding: 16 }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", color: "#94a3b8", marginBottom: 10 }}>Convention de mesure</div>
            <p style={{ margin: "0 0 10px", fontSize: 13, color: "#475569", lineHeight: 1.75 }}>
              L'angle θ est mesuré <strong style={{ color: "#1e293b" }}>depuis la surface solide</strong>, au point de contact triple,
              jusqu'à la <strong style={{ color: "#1e293b" }}>tangente immédiate à l'interface liquide/vapeur</strong>.
              Il est toujours pris <strong style={{ color: "#1e293b" }}>à travers la phase liquide</strong> — la tangente est tracée côté vapeur, l'angle se lit de l'autre côté.
            </p>
            <div style={{ background: "#f8fafc", borderRadius: 8, padding: "9px 14px",
              border: "0.5px solid #e2e8f0", fontFamily: "Georgia,serif", fontSize: 13, color: "#334155", fontStyle: "italic" }}>
              Loi de Young : cos θ = (γ<sub>SV</sub> − γ<sub>SL</sub>) / γ<sub>LV</sub>
            </div>
          </div>
        </div>
      </div>

      {/* ── TABLEAUX DE DONNÉES ── */}
      <div style={{ maxWidth: 1110, margin: "0 auto", padding: "0 14px 56px" }}>

        {/* Titre section */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "8px 0 18px" }}>
          <div style={{ flex: 1, height: 1, background: "#e2e8f0" }}/>
          <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", color: "#94a3b8" }}>
            Données de référence
          </span>
          <div style={{ flex: 1, height: 1, background: "#e2e8f0" }}/>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>

          {/* ── Tableau substrats ── */}
          <div style={{ background: "white", border: "1px solid #e2e8f0", borderRadius: 12, overflow: "hidden" }}>
            <div style={{ padding: "12px 16px", borderBottom: "1px solid #f1f5f9" }}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", color: "#64748b" }}>Substrats solides</div>
              <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2, fontFamily: "Georgia,serif", fontStyle: "italic" }}>γSV = γᴰ + γᴾ — énergie de surface totale</div>
            </div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                <thead>
                  <tr style={{ background: "#f8fafc" }}>
                    {["Substrat", "γSV", "γᴰ", "γᴾ", "γc", "γᴾ/γSV"].map(h => (
                      <th key={h} style={{ padding: "8px 10px", textAlign: h === "Substrat" ? "left" : "center", fontWeight: 700, color: "#475569", fontSize: 11, borderBottom: "1px solid #e2e8f0", whiteSpace: "nowrap" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {SURFACES.map((s, i) => {
                    const pct = Math.round(s.gP / s.gSV * 100);
                    return (
                      <tr key={s.name} style={{ background: i % 2 === 0 ? "white" : "#f8fafc", borderBottom: "0.5px solid #f1f5f9" }}>
                        <td style={{ padding: "7px 10px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <span style={{ width: 8, height: 8, borderRadius: 2, background: s.color, flexShrink: 0 }}/>
                            <span style={{ fontWeight: 600, color: "#1e293b", fontSize: 12 }}>{s.name}</span>
                          </div>
                        </td>
                        <td style={{ padding: "7px 10px", textAlign: "center", fontFamily: "Georgia,serif", color: "#334155" }}>{s.gSV}</td>
                        <td style={{ padding: "7px 10px", textAlign: "center", fontFamily: "Georgia,serif", color: "#64748b" }}>{s.gD}</td>
                        <td style={{ padding: "7px 10px", textAlign: "center", fontFamily: "Georgia,serif", color: s.color, fontWeight: 600 }}>{s.gP}</td>
                        <td style={{ padding: "7px 10px", textAlign: "center", fontFamily: "Georgia,serif", color: "#94a3b8" }}>{s.gc}</td>
                        <td style={{ padding: "7px 10px", textAlign: "center" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                            <div style={{ flex: 1, height: 5, borderRadius: 3, background: "#f1f5f9", overflow: "hidden" }}>
                              <div style={{ height: "100%", width: `${pct}%`, background: s.color, borderRadius: 3 }}/>
                            </div>
                            <span style={{ fontSize: 10, color: s.color, fontWeight: 600, minWidth: 28 }}>{pct}%</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div style={{ padding: "8px 14px", borderTop: "0.5px solid #f1f5f9", fontSize: 10, color: "#94a3b8", fontFamily: "Georgia,serif", fontStyle: "italic" }}>
              Valeurs en mN·m⁻¹ à 20°C — γc = tension critique de Zisman
            </div>
          </div>

          {/* ── Tableau liquides ── */}
          <div style={{ background: "white", border: "1px solid #e2e8f0", borderRadius: 12, overflow: "hidden" }}>
            <div style={{ padding: "12px 16px", borderBottom: "1px solid #f1f5f9" }}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", color: "#64748b" }}>Liquides — composantes Owens-Wendt</div>
              <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2, fontFamily: "Georgia,serif", fontStyle: "italic" }}>γLV = γᴰ + γᴾ — tension de surface totale</div>
            </div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                <thead>
                  <tr style={{ background: "#f8fafc" }}>
                    {["Liquide", "γLV", "γᴰ", "γᴾ", "γᴾ/γ"].map(h => (
                      <th key={h} style={{ padding: "8px 10px", textAlign: h === "Liquide" ? "left" : "center", fontWeight: 700, color: "#475569", fontSize: 11, borderBottom: "1px solid #e2e8f0", whiteSpace: "nowrap" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {LIQUIDS.map((l, i) => {
                    const pct = Math.round(l.gP / l.gamma * 100);
                    return (
                      <tr key={l.name} style={{ background: i % 2 === 0 ? "white" : "#f8fafc", borderBottom: "0.5px solid #f1f5f9" }}>
                        <td style={{ padding: "7px 10px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <span style={{ width: 8, height: 8, borderRadius: "50%", background: l.color, flexShrink: 0 }}/>
                            <span style={{ fontWeight: 600, color: "#1e293b", fontSize: 12 }}>{l.name}</span>
                          </div>
                        </td>
                        <td style={{ padding: "7px 10px", textAlign: "center", fontFamily: "Georgia,serif", color: "#334155", fontWeight: 600 }}>{l.gamma}</td>
                        <td style={{ padding: "7px 10px", textAlign: "center", fontFamily: "Georgia,serif", color: "#64748b" }}>{l.gD}</td>
                        <td style={{ padding: "7px 10px", textAlign: "center", fontFamily: "Georgia,serif", color: l.color, fontWeight: 600 }}>{l.gP}</td>
                        <td style={{ padding: "7px 10px", textAlign: "center" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                            <div style={{ flex: 1, height: 5, borderRadius: 3, background: "#f1f5f9", overflow: "hidden" }}>
                              <div style={{ height: "100%", width: `${Math.min(pct,100)}%`, background: l.color, borderRadius: 3 }}/>
                            </div>
                            <span style={{ fontSize: 10, color: l.color, fontWeight: 600, minWidth: 28 }}>{pct}%</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div style={{ padding: "8px 14px", borderTop: "0.5px solid #f1f5f9", fontSize: 10, color: "#94a3b8", fontFamily: "Georgia,serif", fontStyle: "italic" }}>
              Valeurs en mN·m⁻¹ à 20°C — méthode Owens-Wendt (1969)
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
