// ─── ParetoPanel.jsx ─────────────────────────────────────────────────────────
// Diagramme de Pareto : tous les effets principaux et toutes les interactions
// possibles, calculés directement depuis les données (avant tout modèle).
// |Effet| = |Moy(+) − Moy(−)|, trié par ordre décroissant.

import React, { useState } from "react";
import { useLang } from "../../i18n";
import {
  getAllPossibleTerms,
  formatTermDisplay,
  isQuadPure,
} from "./modelUtils";

function getSign(row, termFactorIds) {
  return termFactorIds.reduce((prod, fid) => prod * (row.coded[fid] ?? 0), 1);
}

export default function ParetoPanel({ factors, matrix, responses, onBack, onNext, hideNav = false }) {
  useLang();
  const [activeRespIdx, setActiveRespIdx] = useState(0);
  const activeResp = responses[activeRespIdx];

  const validRows = (matrix || []).filter(r => {
    const v = r.responses?.[activeResp?.id];
    return v !== "" && v !== null && v !== undefined && !isNaN(+v);
  });

  const allTerms = getAllPossibleTerms(factors).filter(term => !isQuadPure(term, factors));

  // Coefficient b = (Moy(+) − Moy(−)) / 2 — cohérent avec EffetsPanel et le Pareto de la partie 05
  const effects = allTerms.map(term => {
    const tFactorIds = factors.filter(f => term.includes(f.id)).map(f => f.id);
    const plus  = validRows.filter(r => getSign(r, tFactorIds) > 0);
    const minus = validRows.filter(r => getSign(r, tFactorIds) < 0);
    if (!plus.length || !minus.length) return { term, effect: null };
    const mp = plus.reduce((s, r) => s + (+r.responses[activeResp.id]), 0) / plus.length;
    const mm = minus.reduce((s, r) => s + (+r.responses[activeResp.id]), 0) / minus.length;
    return { term, effect: (mp - mm) / 2 };
  }).filter(e => e.effect !== null);

  const sorted = [...effects].sort((a, b) => Math.abs(b.effect) - Math.abs(a.effect));
  const maxAbs = sorted.length ? Math.max(...sorted.map(e => Math.abs(e.effect)), 1e-9) : 1;

  const cardCls = "bg-white border border-gray-200 rounded-xl p-5";

  if (!validRows.length || !sorted.length) {
    return (
      <div className="space-y-4">
        <div className={cardCls}>
          <h2 className="text-lg font-semibold text-gray-800 mb-3">Diagramme de Pareto</h2>
          <p className="text-sm text-gray-500">
            Saisir les valeurs de réponse dans la matrice pour voir le diagramme.
          </p>
        </div>
        {!hideNav && (
          <div className="flex justify-between">
            <button onClick={onBack}
              className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
              ← Retour
            </button>
            <button onClick={onNext}
              className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 transition-colors">
              Suivant →
            </button>
          </div>
        )}
      </div>
    );
  }

  // ── Layout SVG ──
  const longestLabel = sorted.reduce((m, e) => Math.max(m, e.term.length), 2);
  const labelW = Math.max(28, longestLabel * 8);
  const valueW = 60;
  const W = 480;
  const rowH = 26;
  const padTop = 12, padBottom = 28;
  const barX = labelW + 8;
  const barW = W - barX - valueW;
  const H = padTop + sorted.length * rowH + padBottom;

  return (
    <div className="space-y-4">
      <div className={cardCls}>
        <div className="flex items-center justify-between gap-4 mb-2 flex-wrap">
          <h2 className="text-lg font-semibold text-gray-800">Diagramme de Pareto des effets</h2>
          {responses.length > 1 && (
            <div className="flex gap-1 flex-wrap">
              {responses.map((r, i) => (
                <button key={r.id} onClick={() => setActiveRespIdx(i)}
                  className={`rounded-md px-3 py-1 text-xs font-semibold transition-colors ${
                    activeRespIdx === i
                      ? "bg-indigo-600 text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}>
                  {r.id}{r.name ? ` — ${r.name}` : ""}
                </button>
              ))}
            </div>
          )}
        </div>

        <p className="text-xs text-gray-500 mb-4">
          |b| = |Moy(+) − Moy(−)| / 2 pour chaque effet principal et interaction possible du plan, trié par ordre décroissant.
        </p>

        <div className="overflow-x-auto">
          <svg viewBox={`0 0 ${W} ${H}`} className="w-full" preserveAspectRatio="xMidYMid meet">
            {/* Bars */}
            {sorted.map((e, i) => {
              const y = padTop + i * rowH + 4;
              const bh = rowH - 8;
              const w = (Math.abs(e.effect) / maxAbs) * barW;
              const isPositive = e.effect > 0;
              const color = isPositive ? "#10b981" : "#ef4444";
              const label = formatTermDisplay(e.term, factors);
              return (
                <g key={e.term}>
                  <text x={labelW} y={y + bh / 2 + 4} textAnchor="end"
                    className="text-xs font-mono fill-gray-700">
                    {label}
                  </text>
                  <rect x={barX + 1} y={y} width={w} height={bh} fill={color} opacity="0.85" rx="3" />
                  <text x={barX + w + 6} y={y + bh / 2 + 4}
                    className="text-xs fill-gray-700">
                    {isPositive ? "+" : "−"}{Math.abs(e.effect).toFixed(3)}
                  </text>
                </g>
              );
            })}

            {/* Axe vertical */}
            <line x1={barX} y1={padTop} x2={barX} y2={H - padBottom} stroke="#9ca3af" strokeWidth="1" />
            {/* Axe X */}
            <line x1={barX} y1={H - padBottom} x2={barX + barW} y2={H - padBottom} stroke="#9ca3af" strokeWidth="1" />
            <text x={barX} y={H - padBottom + 14} textAnchor="start" className="text-[10px] fill-gray-500">0</text>
            <text x={barX + barW} y={H - padBottom + 14} textAnchor="end" className="text-[10px] fill-gray-500">{maxAbs.toFixed(3)}</text>
            <text x={barX + barW / 2} y={H - 8} textAnchor="middle" className="text-xs fill-gray-500">|b|</text>
          </svg>
        </div>

        <p className="text-[11px] text-gray-400 mt-3">
          Vert = effet positif · Rouge = effet négatif.
        </p>
      </div>

      {!hideNav && (
        <div className="flex justify-between">
          <button onClick={onBack}
            className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
            ← Retour
          </button>
          <button onClick={onNext}
            className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 transition-colors">
            Suivant →
          </button>
        </div>
      )}
    </div>
  );
}
