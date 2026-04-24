import React from "react";
import { useLang } from "../../i18n";

export function ResidualPlot({ yHat, residuals, MSE, globalIndices, allValidRows, onExclude, onReinclude, excludedGlobalIndices, minRequired, color }) {
  const { t } = useLang();
  const [hovered, setHovered] = React.useState(null);
  const [clicked, setClicked] = React.useState(null);

  if (!yHat || yHat.length === 0) return null;

  const W = 560, H = 320;
  const PAD = { l: 52, r: 24, t: 24, b: 44 };
  const PW = W - PAD.l - PAD.r, PH = H - PAD.t - PAD.b;

  const minX = Math.min(...yHat), maxX = Math.max(...yHat);
  const rangeX = maxX - minX || 1;
  const absMaxY = Math.max(...residuals.map(Math.abs), 1e-10) * 1.25;
  const cx = (v) => PAD.l + (v - minX) / rangeX * PW;
  const cy = (v) => PAD.t + PH / 2 - (v / absMaxY) * (PH / 2);
  const dotColor = color === "bg-indigo-500" ? "#6366f1" : color === "bg-emerald-500" ? "#10b981" : "#f59e0b";
  const s = MSE > 0 ? Math.sqrt(MSE) : 1;

  const nTicks = 4;
  const tickStep = absMaxY / nTicks;
  const yTicks = [];
  for (let i = -nTicks; i <= nTicks; i++) yTicks.push(i * tickStep);

  const xTicks = 5;
  const xTickStep = rangeX / (xTicks - 1);
  const xTickVals = Array.from({ length: xTicks }, (_, i) => minX + i * xTickStep);

  return (
    <div style={{ position: "relative" }}>
      {clicked !== null && (() => {
        const i = clicked;
        const x = yHat[i];
        const normed = Math.abs(residuals[i]) / s;
        const gIdx = globalIndices ? globalIndices[i] : i;
        const canExclude = (allValidRows ? allValidRows.length - (excludedGlobalIndices?.size || 0) - 1 : 999) >= (minRequired || 2);
        const pxRatio = (PAD.l + (x - minX) / rangeX * PW) / W;
        const pyRatio = (PAD.t + PH / 2 - (residuals[i] / absMaxY) * (PH / 2)) / H;
        const left = pxRatio > 0.6 ? "auto" : `${(pxRatio * 100 + 3).toFixed(1)}%`;
        const right = pxRatio > 0.6 ? `${((1 - pxRatio) * 100 + 3).toFixed(1)}%` : "auto";
        const top = pyRatio > 0.6 ? "auto" : `${(pyRatio * 100 + 2).toFixed(1)}%`;
        const bottom = pyRatio > 0.6 ? `${((1 - pyRatio) * 100 + 2).toFixed(1)}%` : "auto";
        return (
          <div style={{ position: "absolute", left, right, top, bottom, zIndex: 200, minWidth: 180 }}
            onClick={e => e.stopPropagation()}>
            <div style={{ background: "white", border: "1.5px solid #6366f1", borderRadius: 10, boxShadow: "0 6px 24px rgba(0,0,0,0.22)", padding: "10px 12px", fontSize: 11 }}>
              <div style={{ fontWeight: 700, color: "#1e293b", marginBottom: 5 }}>Point {i + 1}</div>
              <div style={{ fontFamily: "monospace", color: "#475569", marginBottom: 3, fontSize: 10 }}>
                Y = {allValidRows?.[i]?.y?.toFixed(3) ?? "—"}
              </div>
              <div style={{ fontFamily: "monospace", color: "#475569", marginBottom: 3, fontSize: 10 }}>
                Ŷ = {x.toFixed(3)}
              </div>
              <div style={{ fontFamily: "monospace", color: residuals[i] >= 0 ? "#059669" : "#dc2626", marginBottom: 6, fontSize: 10 }}>
                r = {residuals[i] >= 0 ? "+" : ""}{residuals[i].toFixed(3)} (normé : {normed.toFixed(2)})
              </div>
              {canExclude ? (
                <button
                  style={{ width: "100%", fontSize: 10, padding: "3px 8px", background: "#fee2e2", color: "#dc2626", border: "1px solid #fca5a5", borderRadius: 6, cursor: "pointer", fontWeight: 700 }}
                  onClick={(e) => { e.stopPropagation(); onExclude && onExclude(gIdx); setClicked(null); setHovered(null); }}>
                  ✕ {t("doe.residual.exclude")}
                </button>
              ) : (
                <div style={{ fontSize: 9, color: "#f59e0b", textAlign: "center" }}>{t("doe.residual.notEnough")}</div>
              )}
            </div>
          </div>
        );
      })()}
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ overflow: "visible" }}
        onClick={() => { if (clicked !== null) setClicked(null); }}>

        {yTicks.map((v, i) => (
          <line key={i} x1={PAD.l} y1={cy(v)} x2={PAD.l + PW} y2={cy(v)}
            stroke={v === 0 ? "#94a3b8" : "#f1f5f9"} strokeWidth={v === 0 ? 1.5 : 1}
            strokeDasharray={v === 0 ? "none" : "4 3"} />
        ))}

        <line x1={PAD.l} y1={PAD.t} x2={PAD.l} y2={PAD.t + PH} stroke="#e2e8f0" strokeWidth="1" />
        <line x1={PAD.l} y1={PAD.t + PH} x2={PAD.l + PW} y2={PAD.t + PH} stroke="#e2e8f0" strokeWidth="1" />

        {yTicks.filter((_, i) => i % 2 === 0).map((v, i) => (
          <text key={i} x={PAD.l - 6} y={cy(v) + 3.5} textAnchor="end" fontSize="9" fill="#94a3b8" fontFamily="monospace">
            {v.toFixed(v === 0 ? 0 : 2)}
          </text>
        ))}

        {xTickVals.map((v, i) => (
          <text key={i} x={cx(v)} y={PAD.t + PH + 14} textAnchor="middle" fontSize="9" fill="#94a3b8" fontFamily="monospace">
            {v.toFixed(2)}
          </text>
        ))}

        <text x={PAD.l + PW / 2} y={H - 4} textAnchor="middle" fontSize="11" fill="#94a3b8">{t("doe.residual.predicted")}</text>
        <text x={10} y={PAD.t + PH / 2} textAnchor="middle" fontSize="11" fill="#94a3b8" transform={`rotate(-90, 10, ${PAD.t + PH / 2})`}>{t("doe.residual.label")}</text>

        {yHat.map((x, i) => {
          const px = cx(x), py = cy(residuals[i]);
          const isHov = hovered === i;
          const isClick = clicked === i;
          const normed = Math.abs(residuals[i]) / s;
          const isLarge = normed > 2;
          const gIdx = globalIndices ? globalIndices[i] : i;
          const canExclude = (allValidRows ? allValidRows.length - (excludedGlobalIndices?.size || 0) - 1 : 999) >= (minRequired || 2);

          return (
            <g key={i}
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
              onClick={(e) => { e.stopPropagation(); setClicked(clicked === i ? null : i); }}
              style={{ cursor: "pointer" }}>
              <circle cx={px} cy={py} r="14" fill="transparent" />
              <circle cx={px} cy={py}
                r={isClick ? 9 : isHov ? 8 : 6}
                fill={isLarge ? "#ef4444" : dotColor}
                fillOpacity={isClick || isHov ? 1 : 0.85}
                stroke={isClick ? "white" : isHov ? "white" : "none"}
                strokeWidth="2"
                style={{ transition: "r 0.1s" }} />
              <text x={px} y={py - 10} textAnchor="middle" fontSize="9" fill={isLarge ? "#ef4444" : "#64748b"} fontWeight="600">
                {i + 1}
              </text>

              {isHov && !isClick && (() => {
                const tipW = 130, tipH = 52;
                let tx = px + 14; let ty = py - tipH - 8;
                if (tx + tipW > W - 4) tx = px - tipW - 14;
                if (ty < 4) ty = py + 14;
                return (
                  <g style={{ pointerEvents: "none" }}>
                    <rect x={tx} y={ty} width={tipW} height={tipH} rx="5"
                      fill="white" stroke="#e2e8f0" strokeWidth="1"
                      style={{ filter: "drop-shadow(0 2px 6px rgba(0,0,0,0.12))" }} />
                    <text x={tx + 8} y={ty + 15} fontSize="10" fontWeight="700" fill="#1e293b">Point {i + 1}</text>
                    <text x={tx + 8} y={ty + 28} fontSize="9.5" fill="#475569" fontFamily="monospace">Ŷ = {x.toFixed(3)}</text>
                    <text x={tx + 8} y={ty + 41} fontSize="9.5" fill={residuals[i] >= 0 ? "#059669" : "#dc2626"} fontFamily="monospace">
                      r = {residuals[i] >= 0 ? "+" : ""}{residuals[i].toFixed(3)}  (normé: {normed.toFixed(2)})
                    </text>
                  </g>
                );
              })()}
            </g>
          );
        })}
      </svg>

      {(() => {
        const SCE = residuals.reduce((s, r) => s + r * r, 0);
        const maxNormed = MSE > 0 ? Math.max(...residuals.map(r => Math.abs(r / Math.sqrt(MSE)))) : null;
        const hasAberrant = maxNormed !== null && maxNormed > 2;
        return (
          <div className="flex flex-wrap items-center gap-4 mt-2 pt-2 border-t border-gray-100">
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] text-gray-400">{t("doe.residual.sce")} :</span>
              <span className="text-[11px] font-mono font-semibold text-gray-600">{SCE.toFixed(4)}</span>
              <span className="text-[10px] text-gray-400">(somme des carrés des écarts)</span>
            </div>
            {maxNormed !== null && (
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] text-gray-400">{t("doe.residual.maxNorm")} :</span>
                <span className={`text-[11px] font-mono font-semibold ${hasAberrant ? "text-red-500" : "text-emerald-600"}`}>
                  {maxNormed.toFixed(2)}
                </span>
                {hasAberrant
                  ? <span className="text-[10px] text-red-500">⚠ &gt; 2 — point potentiellement aberrant</span>
                  : <span className="text-[10px] text-emerald-500">✓ tous &lt; 2</span>}
              </div>
            )}
          </div>
        );
      })()}
    </div>
  );
}
