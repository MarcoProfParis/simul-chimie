import React from "react";
import { isQuadPure, quadPureTerm } from "./modelUtils.js";

export function IsoResponsePanel({ model, fit, factors, modelColors }) {
  const [f1Idx, setF1Idx] = React.useState(0);
  const [f2Idx, setF2Idx] = React.useState(1);
  const [fixedVals, setFixedVals] = React.useState(() => {
    const fv = {};
    factors.forEach(f => { fv[f.id] = 0; });
    return fv;
  });
  const [cursor, setCursor] = React.useState(null);

  const contFactors = factors.filter(f => f.continuous);
  const f1 = contFactors[f1Idx] || contFactors[0];
  const f2 = contFactors[f2Idx] || contFactors[1];
  if (!f1 || !f2 || f1.id === f2.id) return null;

  const GRID = 60;
  const W = 360, H = 360, PAD_L = 48, PAD_B = 36, PAD_T = 16, PAD_R = 16;
  const PW = W - PAD_L - PAD_R;
  const PH = H - PAD_T - PAD_B;

  const toReal = (f, coded) => {
    const mid = (f.low.real + f.high.real) / 2;
    const half = (f.high.real - f.low.real) / 2;
    return +(mid + coded * half).toFixed(2);
  };

  const predict = (c1, c2) => {
    const coded = { ...fixedVals, [f1.id]: c1, [f2.id]: c2 };
    let y = fit.coeffs[0];
    model.terms.forEach((t, i) => {
      let val;
      if (isQuadPure(t, factors)) {
        const f = factors.find(fac => t === quadPureTerm(fac.id));
        val = (coded[f.id] ?? 0) ** 2;
      } else {
        val = factors.filter(fac => t.includes(fac.id)).reduce((p, fac) => p * (coded[fac.id] ?? 0), 1);
      }
      y += fit.coeffs[i + 1] * val;
    });
    return y;
  };

  const xs = Array.from({ length: GRID }, (_, i) => -1 + i * 2 / (GRID - 1));
  const ys = Array.from({ length: GRID }, (_, i) => -1 + i * 2 / (GRID - 1));
  const grid = ys.map(y2 => xs.map(x1 => predict(x1, y2)));
  const flat = grid.flat();
  const minZ = Math.min(...flat), maxZ = Math.max(...flat);

  const nLevels = 6;
  const levels = Array.from({ length: nLevels }, (_, i) => minZ + (i + 1) * (maxZ - minZ) / (nLevels + 1));

  function marchingSquares(level) {
    const segs = [];
    const lerp = (a, b, va, vb) => a + (b - a) * (level - va) / (vb - va);
    for (let j = 0; j < GRID - 1; j++) {
      for (let i = 0; i < GRID - 1; i++) {
        const v00 = grid[j][i];
        const v10 = grid[j][i + 1];
        const v01 = grid[j + 1][i];
        const v11 = grid[j + 1][i + 1];
        const idx = (v00 >= level ? 8 : 0) | (v10 >= level ? 4 : 0) | (v11 >= level ? 2 : 0) | (v01 >= level ? 1 : 0);
        if (idx === 0 || idx === 15) continue;
        const top    = [lerp(i, i + 1, v00, v10), j];
        const right  = [i + 1, lerp(j, j + 1, v10, v11)];
        const bottom = [lerp(i, i + 1, v01, v11), j + 1];
        const left   = [i, lerp(j, j + 1, v00, v01)];
        const lines = {
          1: [left, bottom], 2: [bottom, right], 3: [left, right],
          4: [right, top], 5: [left, top, right, bottom],
          6: [bottom, top], 7: [left, top],
          8: [top, left], 9: [top, bottom], 10: [right, bottom, left, top],
          11: [top, right], 12: [right, left], 13: [bottom, left], 14: [right, bottom],
        };
        const pts = lines[idx];
        if (!pts) continue;
        if (pts.length === 2) segs.push([pts[0], pts[1]]);
        else segs.push([pts[0], pts[1]], [pts[2], pts[3]]);
      }
    }
    return segs;
  }

  const gx = (gi) => PAD_L + (gi / (GRID - 1)) * PW;
  const gy = (gj) => PAD_T + (1 - gj / (GRID - 1)) * PH;

  function labelPos(segs) {
    if (segs.length === 0) return null;
    const mid = segs[Math.floor(segs.length / 2)];
    return { x: (gx(mid[0][0]) + gx(mid[1][0])) / 2, y: (gy(mid[0][1]) + gy(mid[1][1])) / 2 };
  }

  const lineColors = ["#3b82f6", "#6366f1", "#8b5cf6", "#a855f7", "#ec4899", "#ef4444"];
  const ticks = [-1, -0.5, 0, 0.5, 1];

  return (
    <div className={`bg-white dark:bg-gray-900 border-2 ${modelColors.border} rounded-xl p-5`}>
      <div className="flex items-center gap-2 mb-4">
        <span className={`size-2.5 rounded-full ${modelColors.dot}`} />
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{model.name} — Courbes isoréponses</h3>
      </div>

      <div className="flex flex-wrap gap-4 mb-4">
        <div className="flex items-center gap-2">
          <label className="text-xs text-gray-500">Axe X :</label>
          <select value={f1Idx} onChange={e => setF1Idx(+e.target.value)}
            className="rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-2 py-1 text-xs text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
            {contFactors.map((f, i) => <option key={f.id} value={i} disabled={i === f2Idx}>{f.id} — {f.name}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-gray-500">Axe Y :</label>
          <select value={f2Idx} onChange={e => setF2Idx(+e.target.value)}
            className="rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-2 py-1 text-xs text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
            {contFactors.map((f, i) => <option key={f.id} value={i} disabled={i === f1Idx}>{f.id} — {f.name}</option>)}
          </select>
        </div>
      </div>

      {factors.filter(f => f.continuous && f.id !== f1.id && f.id !== f2.id).length > 0 && (
        <div className="flex flex-wrap gap-3 mb-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <p className="w-full text-[11px] text-gray-400 font-medium mb-1">Autres facteurs (niveau codé fixé) :</p>
          {factors.filter(f => f.continuous && f.id !== f1.id && f.id !== f2.id).map(f => (
            <div key={f.id} className="flex items-center gap-2">
              <label className="text-xs text-gray-500">{f.id} :</label>
              <input type="range" min="-1" max="1" step="0.1" value={fixedVals[f.id] ?? 0}
                onChange={e => setFixedVals(prev => ({ ...prev, [f.id]: +e.target.value }))}
                className="w-20" />
              <span className="text-xs font-mono text-gray-600 dark:text-gray-300 w-8">{(fixedVals[f.id] ?? 0).toFixed(1)}</span>
              <span className="text-[10px] text-gray-400">({toReal(f, fixedVals[f.id] ?? 0)} {f.unit})</span>
            </div>
          ))}
        </div>
      )}

      <div className="overflow-x-auto">
        <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="font-mono" style={{ background: "var(--tw-bg-opacity, white)", overflow: "visible" }}
          onMouseMove={e => {
            const rect = e.currentTarget.getBoundingClientRect();
            const svgX = (e.clientX - rect.left) * (W / rect.width);
            const svgY = (e.clientY - rect.top)  * (H / rect.height);
            if (svgX < PAD_L || svgX > PAD_L + PW || svgY < PAD_T || svgY > PAD_T + PH) {
              setCursor(null); return;
            }
            const c1 = ((svgX - PAD_L) / PW) * 2 - 1;
            const c2 = 1 - ((svgY - PAD_T) / PH) * 2;
            const z  = predict(c1, c2);
            setCursor({ cx: svgX, cy: svgY, c1, c2, z });
          }}
          onMouseLeave={() => setCursor(null)}
        >
          <rect x={PAD_L} y={PAD_T} width={PW} height={PH} fill="#f9fafb" stroke="#e5e7eb" strokeWidth="0.5" />

          {ticks.map(v => {
            const px = PAD_L + (v + 1) / 2 * PW;
            const py = PAD_T + (1 - (v + 1) / 2) * PH;
            return (
              <g key={v}>
                <line x1={px} y1={PAD_T} x2={px} y2={PAD_T + PH} stroke="#e5e7eb" strokeWidth="0.5" strokeDasharray="3,3" />
                <line x1={PAD_L} y1={py} x2={PAD_L + PW} y2={py} stroke="#e5e7eb" strokeWidth="0.5" strokeDasharray="3,3" />
              </g>
            );
          })}

          <clipPath id="plotClip">
            <rect x={PAD_L} y={PAD_T} width={PW} height={PH} />
          </clipPath>
          <g clipPath="url(#plotClip)">
            {levels.map((level, li) => {
              const segs = marchingSquares(level);
              const color = lineColors[li % lineColors.length];
              const lpos = labelPos(segs);
              return (
                <g key={li}>
                  {segs.map(([p0, p1], si) => (
                    <line key={si}
                      x1={gx(p0[0])} y1={gy(p0[1])}
                      x2={gx(p1[0])} y2={gy(p1[1])}
                      stroke={color} strokeWidth="1.5" strokeLinecap="round" />
                  ))}
                  {lpos && (
                    <g>
                      <rect x={lpos.x - 14} y={lpos.y - 7} width={28} height={13} rx="2" fill="white" fillOpacity="0.85" />
                      <text x={lpos.x} y={lpos.y + 4} textAnchor="middle" fontSize="8" fontWeight="600" fill={color}>
                        {level.toFixed(1)}
                      </text>
                    </g>
                  )}
                </g>
              );
            })}
          </g>

          {ticks.map(v => {
            const px = PAD_L + (v + 1) / 2 * PW;
            return (
              <g key={v}>
                <line x1={px} y1={PAD_T + PH} x2={px} y2={PAD_T + PH + 4} stroke="#9ca3af" strokeWidth="0.8" />
                <text x={px} y={PAD_T + PH + 14} textAnchor="middle" fontSize="9" fill="#9ca3af">{toReal(f1, v)}</text>
              </g>
            );
          })}

          {ticks.map(v => {
            const py = PAD_T + (1 - (v + 1) / 2) * PH;
            return (
              <g key={v}>
                <line x1={PAD_L - 4} y1={py} x2={PAD_L} y2={py} stroke="#9ca3af" strokeWidth="0.8" />
                <text x={PAD_L - 8} y={py + 3} textAnchor="end" fontSize="9" fill="#9ca3af">{toReal(f2, v)}</text>
              </g>
            );
          })}

          <text x={PAD_L + PW / 2} y={H - 2} textAnchor="middle" fontSize="10" fill="#6b7280">
            {f1.name}{f1.unit ? ` (${f1.unit})` : ""}
          </text>
          <text x={10} y={PAD_T + PH / 2} textAnchor="middle" fontSize="10" fill="#6b7280"
            transform={`rotate(-90, 10, ${PAD_T + PH / 2})`}>
            {f2.name}{f2.unit ? ` (${f2.unit})` : ""}
          </text>

          {cursor && (() => {
            const { cx, cy, c1, c2, z } = cursor;
            const r1 = toReal(f1, c1);
            const r2 = toReal(f2, c2);

            const tipW = 110, tipH = 52, tipPad = 7;
            let tx = cx + 12;
            let ty = cy - tipH - 8;
            if (tx + tipW > W - 4) tx = cx - tipW - 12;
            if (ty < PAD_T)        ty = cy + 10;

            return (
              <g style={{ pointerEvents: "none" }}>
                <line
                  x1={cx} y1={PAD_T} x2={cx} y2={PAD_T + PH}
                  stroke="#6366f1" strokeWidth="0.8" strokeDasharray="4,3" opacity="0.7"
                />
                <line
                  x1={PAD_L} y1={cy} x2={PAD_L + PW} y2={cy}
                  stroke="#6366f1" strokeWidth="0.8" strokeDasharray="4,3" opacity="0.7"
                />
                <circle cx={cx} cy={cy} r="4" fill="#6366f1" fillOpacity="0.9" stroke="white" strokeWidth="1.5" />

                <line x1={cx} y1={PAD_T + PH} x2={cx} y2={PAD_T + PH + 5} stroke="#6366f1" strokeWidth="1" />
                <text x={cx} y={PAD_T + PH + 14} textAnchor="middle" fontSize="8" fill="#6366f1" fontWeight="600">
                  {r1}{f1.unit ? ` ${f1.unit}` : ""}
                </text>

                <line x1={PAD_L - 5} y1={cy} x2={PAD_L} y2={cy} stroke="#6366f1" strokeWidth="1" />
                <text x={PAD_L - 7} y={cy + 3} textAnchor="end" fontSize="8" fill="#6366f1" fontWeight="600">
                  {r2}{f2.unit ? ` ${f2.unit}` : ""}
                </text>

                <rect x={tx} y={ty} width={tipW} height={tipH} rx="5"
                  fill="white" stroke="#e5e7eb" strokeWidth="0.8"
                  style={{ filter: "drop-shadow(0 2px 6px rgba(0,0,0,0.15))" }}
                />
                <text x={tx + tipPad} y={ty + 14} fontSize="9" fontWeight="700" fill="#111">
                  Ŷ = {z.toFixed(3)}
                </text>
                <text x={tx + tipPad} y={ty + 27} fontSize="8" fill="#6b7280">
                  {f1.name || f1.id} : {r1}{f1.unit ? ` ${f1.unit}` : ""}
                </text>
                <text x={tx + tipPad} y={ty + 40} fontSize="8" fill="#6b7280">
                  {f2.name || f2.id} : {r2}{f2.unit ? ` ${f2.unit}` : ""}
                </text>
              </g>
            );
          })()}
        </svg>
      </div>

      <div className="flex flex-wrap gap-3 mt-3">
        {levels.map((level, li) => (
          <div key={li} className="flex items-center gap-1.5">
            <span className="inline-block w-6 h-0.5 rounded" style={{ background: lineColors[li % lineColors.length] }} />
            <span className="text-[11px] font-mono text-gray-500">{level.toFixed(2)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
