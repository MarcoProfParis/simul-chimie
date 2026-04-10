import React from "react";
import { normalQuantile } from "./mathUtils.js";

export function QQPlotSVG({ residuals, MSE, col }) {
  if (!residuals || residuals.length < 3) return null;

  const W = 280, H = 220;
  const PAD = { l: 44, r: 16, t: 16, b: 36 };
  const PW = W - PAD.l - PAD.r;
  const PH = H - PAD.t - PAD.b;

  const s = MSE > 0 ? Math.sqrt(MSE) : 1;
  const normed = residuals.map(r => r / s);
  const sorted = [...normed].sort((a, b) => a - b);
  const n = sorted.length;

  const theoretical = sorted.map((_, i) => normalQuantile((i + 1 - 0.375) / (n + 0.25)));

  const allX = theoretical, allY = sorted;
  const xMin = Math.min(...allX) - 0.2;
  const xMax = Math.max(...allX) + 0.2;
  const yMin = Math.min(...allY, xMin) - 0.2;
  const yMax = Math.max(...allY, xMax) + 0.2;
  const sx = v => PAD.l + (v - xMin) / (xMax - xMin) * PW;
  const sy = v => PAD.t + (1 - (v - yMin) / (yMax - yMin)) * PH;

  const dotColor = col?.dot === "bg-indigo-500" ? "#6366f1"
    : col?.dot === "bg-emerald-500" ? "#10b981" : "#f59e0b";

  const x1ref = xMin, y1ref = xMin, x2ref = xMax, y2ref = xMax;
  const anomalies = sorted.map((yv, i) => Math.abs(yv - theoretical[i])).map(d => d > 0.65);
  const ticks = [-2, -1, 0, 1, 2].filter(t => t >= xMin && t <= xMax);

  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}
         style={{ fontFamily: "monospace", overflow: "visible" }}>

      <rect x={PAD.l} y={PAD.t} width={PW} height={PH}
            fill="#f9fafb" stroke="#e5e7eb" strokeWidth="0.5" className="dark:fill-gray-800/50 dark:stroke-gray-700"/>

      {ticks.map(t => (
        <g key={t}>
          <line x1={sx(t)} y1={PAD.t} x2={sx(t)} y2={PAD.t + PH}
                stroke="#e5e7eb" strokeWidth="0.5" strokeDasharray="3,3"/>
          <line x1={PAD.l} y1={sy(t)} x2={PAD.l + PW} y2={sy(t)}
                stroke="#e5e7eb" strokeWidth="0.5" strokeDasharray="3,3"/>
        </g>
      ))}

      <line
        x1={sx(x1ref)} y1={sy(y1ref)} x2={sx(x2ref)} y2={sy(y2ref)}
        stroke="#ef4444" strokeWidth="1.2" strokeDasharray="5,3" opacity="0.7"
      />

      <polygon
        points={[
          `${sx(xMin)},${sy(xMin + 0.8)}`,
          `${sx(xMax)},${sy(xMax + 0.8)}`,
          `${sx(xMax)},${sy(xMax - 0.8)}`,
          `${sx(xMin)},${sy(xMin - 0.8)}`,
        ].join(" ")}
        fill="#ef444415"
        stroke="none"
      />

      {sorted.map((yv, i) => {
        const px = sx(theoretical[i]);
        const py = sy(yv);
        const isAnom = anomalies[i];
        return (
          <g key={i}>
            <circle
              cx={px} cy={py} r={isAnom ? 5 : 4}
              fill={isAnom ? "#ef4444" : dotColor}
              fillOpacity={isAnom ? 0.9 : 0.75}
              stroke={isAnom ? "#dc2626" : "white"}
              strokeWidth="1"
            />
            {isAnom && (
              <text x={px + 6} y={py - 5} fontSize="8" fill="#dc2626" fontWeight="600">
                {i + 1}
              </text>
            )}
          </g>
        );
      })}

      {ticks.map(t => (
        <g key={t}>
          <text x={sx(t)} y={PAD.t + PH + 12} textAnchor="middle" fontSize="8" fill="#9ca3af">{t}</text>
          <text x={PAD.l - 4} y={sy(t) + 3} textAnchor="end" fontSize="8" fill="#9ca3af">{t}</text>
        </g>
      ))}

      <text x={W / 2} y={H - 2} textAnchor="middle" fontSize="9" fill="#9ca3af">
        Quantiles théoriques N(0,1)
      </text>
      <text
        x={10} y={PAD.t + PH / 2}
        textAnchor="middle" fontSize="9" fill="#9ca3af"
        transform={`rotate(-90, 10, ${PAD.t + PH / 2})`}
      >
        Résidus normés
      </text>

      <line x1={PAD.l + 4} y1={PAD.t + 8} x2={PAD.l + 18} y2={PAD.t + 8}
            stroke="#ef4444" strokeWidth="1.2" strokeDasharray="5,3" opacity="0.7"/>
      <text x={PAD.l + 21} y={PAD.t + 11} fontSize="8" fill="#6b7280">Droite de normalité</text>
    </svg>
  );
}
