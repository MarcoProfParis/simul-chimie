// ─── InteractionPlotsPanel.jsx ────────────────────────────────────────────────
// Effets principaux + graphes d'interactions 2-way calculés depuis les données
// brutes de la matrice (avant tout ajustement de modèle).
// Chaque graphe peut être masqué individuellement.

import React, { useState } from "react";
import { EyeSlashIcon, EyeIcon } from "@heroicons/react/24/outline";
import { useLang } from "../../i18n";
import { useCompact } from "./CompactContext";

// ─── helpers ──────────────────────────────────────────────────────────────────

function cellVals(matrix, factorId, codedVal, responseId) {
  // Note: no !r.center filter — center points (coded=0) are naturally excluded
  // for codedVal=−1/+1 queries and naturally included for codedVal=0 queries.
  return (matrix || [])
    .filter(r => +r.coded[factorId] === codedVal)
    .map(r => r.responses?.[responseId])
    .filter(v => v !== "" && v !== null && v !== undefined && !isNaN(+v))
    .map(Number);
}

function avg(arr) {
  return arr.length ? arr.reduce((s, v) => s + v, 0) / arr.length : null;
}

function realLabel(val, decimals = 1) {
  if (val === null || val === undefined) return "?";
  return typeof val === "number" ? val.toFixed(decimals) : String(val);
}

// ─── Main Effect Plot (SVG) ───────────────────────────────────────────────────

function MainEffectPlot({ factor, responseId, matrix }) {
  const mLow    = avg(cellVals(matrix, factor.id, -1, responseId));
  const mCenter = avg(cellVals(matrix, factor.id,  0, responseId)); // null if no center points
  const mHigh   = avg(cellVals(matrix, factor.id, +1, responseId));

  const W = 200, H = 128, ML = 44, MR = 8, MT = 18, MB = 28;
  const pw = W - ML - MR, ph = H - MT - MB;

  const vals = [mLow, mCenter, mHigh].filter(v => v !== null);
  if (!vals.length) return (
    <div className="flex items-center justify-center h-16 text-[10px] text-gray-300">—</div>
  );

  const yMin = Math.min(...vals), yMax = Math.max(...vals);
  const pad  = (yMax - yMin || Math.abs(yMin) * 0.1 || 1) * 0.22;
  const yLo  = yMin - pad, yHi = yMax + pad, yr = yHi - yLo;

  const sx = (coded) => ML + ((coded + 1) / 2) * pw;
  const sy = (v)     => v !== null ? MT + ph - ((v - yLo) / yr) * ph : null;

  const x1 = sx(-1), x0 = sx(0), x2 = sx(+1);
  const y1 = sy(mLow), y0 = sy(mCenter), y2 = sy(mHigh);
  const COL = "#6366f1";
  const COL_CTR = "#f59e0b"; // amber for center point

  // Build path through available points: low → center → high
  // When all 3 points exist, use a quadratic Bézier that passes exactly through
  // the center point. Control point formula: cx=x0, cy=2·y0 − 0.5·y1 − 0.5·y2
  let linePath = null;
  if (y1 !== null && y0 !== null && y2 !== null) {
    const bcy = 2 * y0 - 0.5 * y1 - 0.5 * y2; // bezier control-point Y
    linePath = `M ${x1} ${y1} Q ${x0} ${bcy} ${x2} ${y2}`;
  } else {
    const pts = [
      y1 !== null ? [x1, y1] : null,
      y0 !== null ? [x0, y0] : null,
      y2 !== null ? [x2, y2] : null,
    ].filter(Boolean);
    if (pts.length >= 2)
      linePath = `M ${pts[0][0]} ${pts[0][1]} ` + pts.slice(1).map(p => `L ${p[0]} ${p[1]}`).join(" ");
  }

  // Middle real value (center point label on X axis)
  const midReal = (factor.low?.real != null && factor.high?.real != null)
    ? ((+factor.low.real + +factor.high.real) / 2)
    : null;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: "block" }}>
      {/* horizontal grid lines */}
      {[0, 0.5, 1].map(t => {
        const yv = yLo + t * yr;
        const yp = sy(yv);
        return (
          <g key={t}>
            <line x1={ML} y1={yp} x2={ML + pw} y2={yp} stroke="#f3f4f6" strokeWidth="1" />
            <line x1={ML - 3} y1={yp} x2={ML} y2={yp} stroke="#e5e7eb" strokeWidth="0.8" />
            <text x={ML - 5} y={yp + 3} fontSize="7" fill="#9ca3af" textAnchor="end">{yv.toFixed(1)}</text>
          </g>
        );
      })}
      {/* axes */}
      <line x1={ML} y1={MT} x2={ML} y2={MT + ph} stroke="#e5e7eb" strokeWidth="1" />
      <line x1={ML} y1={MT + ph} x2={ML + pw} y2={MT + ph} stroke="#e5e7eb" strokeWidth="1" />
      {/* connecting path */}
      {linePath && <path d={linePath} stroke={COL} strokeWidth="2.2" fill="none" />}
      {/* ±1 dots + value labels */}
      {y1 !== null && (
        <>
          <circle cx={x1} cy={y1} r="4" fill={COL} />
          <text x={x1} y={y1 - 7} fontSize="7.5" fill={COL} textAnchor="middle" fontWeight="600">
            {mLow.toFixed(2)}
          </text>
        </>
      )}
      {y2 !== null && (
        <>
          <circle cx={x2} cy={y2} r="4" fill={COL} />
          <text x={x2} y={y2 - 7} fontSize="7.5" fill={COL} textAnchor="middle" fontWeight="600">
            {mHigh.toFixed(2)}
          </text>
        </>
      )}
      {/* center point dot (amber) + value label */}
      {y0 !== null && (
        <>
          <circle cx={x0} cy={y0} r="4" fill={COL_CTR} />
          <text x={x0} y={y0 - 7} fontSize="7.5" fill={COL_CTR} textAnchor="middle" fontWeight="600">
            {mCenter.toFixed(2)}
          </text>
        </>
      )}
      {/* X axis labels */}
      <text x={x1} y={H - 14} fontSize="7.5" fill="#6b7280" textAnchor="middle">
        {realLabel(factor.low?.real, 2)}
      </text>
      <text x={x2} y={H - 14} fontSize="7.5" fill="#6b7280" textAnchor="middle">
        {realLabel(factor.high?.real, 2)}
      </text>
      {y0 !== null && midReal !== null && (
        <text x={x0} y={H - 14} fontSize="7.5" fill={COL_CTR} textAnchor="middle">
          {midReal.toFixed(2)}
        </text>
      )}
      {factor.unit && (
        <text x={ML + pw / 2} y={H - 4} fontSize="6" fill="#d1d5db" textAnchor="middle">
          {factor.unit}
        </text>
      )}
    </svg>
  );
}

// ─── Interaction Plot (SVG) ───────────────────────────────────────────────────

function InteractionPlot({ fa, fb, responseId, matrix }) {
  const rows = matrix || [];
  const cellMean = (va, vb) => {
    const vals = rows
      .filter(r => +r.coded[fa.id] === va && +r.coded[fb.id] === vb)
      .map(r => r.responses?.[responseId])
      .filter(v => v !== "" && v !== null && v !== undefined && !isNaN(+v))
      .map(Number);
    return vals.length ? vals.reduce((s, v) => s + v, 0) / vals.length : null;
  };

  // Corner cells (±1 levels)
  const ll = cellMean(-1, -1), hl = cellMean(+1, -1); // fb = −1 (low)
  const lh = cellMean(-1, +1), hh = cellMean(+1, +1); // fb = +1 (high)
  // Center point — both factors at 0 (null if no center points in matrix)
  const cc = cellMean(0, 0);

  const allVals = [ll, hl, lh, hh, cc].filter(v => v !== null);
  if (!allVals.length) return (
    <div className="flex items-center justify-center h-16 text-[10px] text-gray-300">—</div>
  );

  const W = 220, H = 150, ML = 44, MR = 8, MT = 18, MB = 34;
  const pw = W - ML - MR, ph = H - MT - MB;

  const yMin = Math.min(...allVals), yMax = Math.max(...allVals);
  const pad  = (yMax - yMin || Math.abs(yMin) * 0.1 || 1) * 0.22;
  const yLo  = yMin - pad, yHi = yMax + pad, yr = yHi - yLo;

  const sx = (coded) => ML + ((coded + 1) / 2) * pw;
  const sy = (v)     => v !== null ? MT + ph - ((v - yLo) / yr) * ph : null;

  const x1 = sx(-1), x2 = sx(+1);
  const COL_LOW  = "#6366f1";
  const COL_HIGH = "#10b981";

  const renderLine = (v1, v2, color, dash = "") => {
    const sy1 = sy(v1), sy2 = sy(v2);
    if (sy1 === null && sy2 === null) return null;
    return (
      <g>
        {sy1 !== null && sy2 !== null && (
          <line x1={x1} y1={sy1} x2={x2} y2={sy2} stroke={color} strokeWidth="2" strokeDasharray={dash} />
        )}
        {sy1 !== null && <circle cx={x1} cy={sy1} r="3.5" fill={color} />}
        {sy2 !== null && <circle cx={x2} cy={sy2} r="3.5" fill={color} />}
      </g>
    );
  };

  const COL_CTR = "#f59e0b"; // amber for center point
  const legY = H - 10;
  const midX = ML + pw / 2 + 4;
  const xCenter = sx(0); // X screen position for coded=0
  const yCenter = cc !== null ? sy(cc) : null;

  // Middle real value of fa for the center X label
  const faMidReal = (fa.low?.real != null && fa.high?.real != null)
    ? ((+fa.low.real + +fa.high.real) / 2)
    : null;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: "block" }}>
      {/* grid lines */}
      {[0, 0.5, 1].map(t => {
        const yv = yLo + t * yr;
        const yp = sy(yv);
        return (
          <g key={t}>
            <line x1={ML} y1={yp} x2={ML + pw} y2={yp} stroke="#f3f4f6" strokeWidth="1" />
            <line x1={ML - 3} y1={yp} x2={ML} y2={yp} stroke="#e5e7eb" strokeWidth="0.8" />
            <text x={ML - 5} y={yp + 3} fontSize="7" fill="#9ca3af" textAnchor="end">{yv.toFixed(1)}</text>
          </g>
        );
      })}
      {/* axes */}
      <line x1={ML} y1={MT} x2={ML} y2={MT + ph} stroke="#e5e7eb" strokeWidth="1" />
      <line x1={ML} y1={MT + ph} x2={ML + pw} y2={MT + ph} stroke="#e5e7eb" strokeWidth="1" />
      {/* center X tick */}
      {yCenter !== null && (
        <line x1={xCenter} y1={MT + ph} x2={xCenter} y2={MT + ph + 4} stroke="#e5e7eb" strokeWidth="1" />
      )}
      {/* corner lines (±1 levels only) */}
      {renderLine(ll, hl, COL_LOW)}
      {renderLine(lh, hh, COL_HIGH, "5 3")}
      {/* center point (0,0) — amber diamond */}
      {yCenter !== null && (
        <>
          <polygon
            points={`${xCenter},${yCenter - 5} ${xCenter + 4},${yCenter} ${xCenter},${yCenter + 5} ${xCenter - 4},${yCenter}`}
            fill={COL_CTR} />
          <text x={xCenter} y={yCenter - 9} fontSize="7" fill={COL_CTR} textAnchor="middle" fontWeight="600">
            {cc.toFixed(2)}
          </text>
        </>
      )}
      {/* X labels (fa real values) */}
      <text x={x1} y={MT + ph + 12} fontSize="7.5" fill="#6b7280" textAnchor="middle">
        {realLabel(fa.low?.real, 1)}
      </text>
      <text x={x2} y={MT + ph + 12} fontSize="7.5" fill="#6b7280" textAnchor="middle">
        {realLabel(fa.high?.real, 1)}
      </text>
      {yCenter !== null && faMidReal !== null && (
        <text x={xCenter} y={MT + ph + 12} fontSize="7" fill={COL_CTR} textAnchor="middle">
          {faMidReal.toFixed(1)}
        </text>
      )}
      {fa.unit && (
        <text x={ML + pw / 2} y={MT + ph + 21} fontSize="6" fill="#d1d5db" textAnchor="middle">
          {fa.unit}
        </text>
      )}
      {/* Legend — fb low | fb high */}
      <line x1={ML}      y1={legY} x2={ML + 14}      y2={legY} stroke={COL_LOW}  strokeWidth="2" />
      <circle cx={ML + 7}     cy={legY} r="2.5" fill={COL_LOW} />
      <text x={ML + 17}  y={legY + 3} fontSize="7" fill="#6b7280">
        {fb.name || fb.id}={realLabel(fb.low?.real, 1)}
      </text>
      <line x1={midX}    y1={legY} x2={midX + 14}    y2={legY} stroke={COL_HIGH} strokeWidth="2" strokeDasharray="5 3" />
      <circle cx={midX + 7}   cy={legY} r="2.5" fill={COL_HIGH} />
      <text x={midX + 17} y={legY + 3} fontSize="7" fill="#6b7280">
        {fb.name || fb.id}={realLabel(fb.high?.real, 1)}
      </text>
    </svg>
  );
}

// ─── PlotCard ─────────────────────────────────────────────────────────────────

function PlotCard({ title, plotKey, onToggle, isCompact, children }) {
  const cardCls = isCompact ? "border rounded-lg p-2.5" : "border rounded-xl p-3";
  return (
    <div className={`bg-white ${cardCls} border-gray-200 flex flex-col`}>
      <div className="flex items-center justify-between mb-1.5 gap-1">
        <span className="text-[11px] font-semibold text-gray-700 truncate">{title}</span>
        <button
          onClick={() => onToggle(plotKey)}
          title="Masquer"
          className="shrink-0 p-0.5 rounded text-gray-300 hover:text-gray-500 hover:bg-gray-100 transition-colors"
        >
          <EyeSlashIcon className="size-3.5" />
        </button>
      </div>
      {children}
    </div>
  );
}

// ─── InteractionPlotsPanel (exported) ─────────────────────────────────────────

export function InteractionPlotsPanel({ factors, matrix, responses, onBack, onNext }) {
  const { t } = useLang();
  const { compact: isCompact } = useCompact();

  const [hidden, setHidden] = useState(new Set());

  const toggle = (key) =>
    setHidden(prev => {
      const s = new Set(prev);
      if (s.has(key)) s.delete(key); else s.add(key);
      return s;
    });

  const showAll = () => setHidden(new Set());

  // All 2-way factor pairs
  const pairs = [];
  for (let i = 0; i < factors.length; i++)
    for (let j = i + 1; j < factors.length; j++)
      pairs.push([factors[i], factors[j]]);

  const hasData = (matrix || []).some(row =>
    !row.center &&
    responses.some(r => {
      const v = row.responses?.[r.id];
      return v !== "" && v !== null && v !== undefined && !isNaN(+v);
    })
  );

  // Human-readable label for a hidden key (for the chip)
  const keyLabel = (key) => {
    const parts = key.split("_");
    // key: "main_{respId}_{facId}" or "int_{respId}_{faId}_{fbId}"
    if (parts[0] === "main") {
      const f = factors.find(fc => fc.id === parts.slice(2).join("_"));
      return f ? (f.name || f.id) : key;
    }
    // interaction key: "int_{respId}_{faId}_{fbId}" — but factor IDs may contain "_"
    // We stored them as int_{respId}_{faId}_{fbId} so we search pairs
    const match = pairs.find(([fa, fb]) => key === `int_${parts[1]}_${fa.id}_${fb.id}`);
    if (match) return `${match[0].name || match[0].id} × ${match[1].name || match[1].id}`;
    return key;
  };

  return (
    <div className="flex flex-col gap-6">

      {/* ── Graphes masqués ── */}
      {hidden.size > 0 && (
        <div className="flex flex-wrap items-center gap-2 px-3 py-2.5 bg-gray-50 rounded-xl border border-gray-200">
          <span className="text-[11px] font-medium text-gray-400 shrink-0">
            {t("doe.interactions.hiddenPlots")} :
          </span>
          {[...hidden].map(key => (
            <button
              key={key}
              onClick={() => toggle(key)}
              className="flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-full bg-white border border-gray-200 text-gray-500 hover:border-indigo-300 hover:text-indigo-600 transition-colors"
            >
              <EyeIcon className="size-3 shrink-0" />
              {keyLabel(key)}
            </button>
          ))}
          <button
            onClick={showAll}
            className="ml-auto text-[11px] px-2.5 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-600 hover:bg-indigo-100 transition-colors"
          >
            {t("doe.interactions.showAll")}
          </button>
        </div>
      )}

      {/* ── Pas de données ── */}
      {!hasData ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4 text-gray-300">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
               stroke="currentColor" strokeWidth="1.5" className="size-14">
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5
                 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75
                 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0
                 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5
                 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0
                 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
          </svg>
          <p className="text-sm text-gray-400 text-center max-w-xs">
            {t("doe.interactions.noData")}
          </p>
        </div>
      ) : (
        responses.map(resp => (
          <div key={resp.id} className="flex flex-col gap-5">

            {/* Response header (multi-response only) */}
            {responses.length > 1 && (
              <div className="flex items-center gap-2 pb-2 border-b border-gray-200">
                <span className="size-2 rounded-full bg-indigo-500 shrink-0" />
                <h3 className="text-sm font-semibold text-gray-800">
                  {resp.name || resp.id}
                  {resp.unit && (
                    <span className="text-gray-400 font-normal ml-1">({resp.unit})</span>
                  )}
                </h3>
              </div>
            )}

            {/* ── Effets principaux ── */}
            <section>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-3">
                {t("doe.interactions.mainEffects")}
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-3">
                {factors.map(f => {
                  const key = `main_${resp.id}_${f.id}`;
                  if (hidden.has(key)) return null;
                  return (
                    <PlotCard
                      key={key}
                      title={f.name || f.id}
                      plotKey={key}
                      onToggle={toggle}
                      isCompact={isCompact}
                    >
                      <MainEffectPlot factor={f} responseId={resp.id} matrix={matrix} />
                    </PlotCard>
                  );
                })}
              </div>
            </section>

            {/* ── Interactions 2-way ── */}
            {pairs.length > 0 && (
              <section>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-3">
                  {t("doe.interactions.interactions")}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
                  {pairs.map(([fa, fb]) => {
                    const key = `int_${resp.id}_${fa.id}_${fb.id}`;
                    if (hidden.has(key)) return null;
                    const title = `${fa.name || fa.id} × ${fb.name || fb.id}`;
                    return (
                      <PlotCard
                        key={key}
                        title={title}
                        plotKey={key}
                        onToggle={toggle}
                        isCompact={isCompact}
                      >
                        <InteractionPlot fa={fa} fb={fb} responseId={resp.id} matrix={matrix} />
                      </PlotCard>
                    );
                  })}
                </div>
              </section>
            )}
          </div>
        ))
      )}

      {/* ── Navigation ── */}
      <div className="flex items-center justify-between mt-2">
        <button
          onClick={onBack}
          className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
        >
          ← {t("common.back")}
        </button>
        <button
          onClick={onNext}
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 transition-colors"
        >
          {t("doe.model")} →
        </button>
      </div>
    </div>
  );
}
