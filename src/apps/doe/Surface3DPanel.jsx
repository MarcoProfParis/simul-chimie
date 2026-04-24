import React from "react";
import { useCompact } from "./CompactContext";
import { isQuadPure, quadPureTerm } from "./modelUtils.js";
import { useLang } from "../../i18n";

export function Surface3DPanel({ model, fit, factors, col }) {
  const { t } = useLang();
  const { compact: isCompact } = useCompact();
  const cardCls = isCompact ? "border rounded-lg p-3" : "border-2 rounded-xl p-5";

  const contFactors = factors.filter(f => f.continuous);
  const [f1Idx, setF1Idx] = React.useState(0);
  const [f2Idx, setF2Idx] = React.useState(Math.min(1, contFactors.length - 1));
  const [fixedVals, setFixedVals] = React.useState(() => {
    const fv = {}; factors.forEach(f => { fv[f.id] = 0; }); return fv;
  });
  const [rotX, setRotX] = React.useState(0.5);
  const [rotZ, setRotZ] = React.useState(0.6);
  const dragging = React.useRef(false);
  const lastMouse = React.useRef({ x: 0, y: 0 });

  const f1 = contFactors[f1Idx];
  const f2 = contFactors[f2Idx];
  if (!f1 || !f2) return null;

  const predict = (c1, c2) => {
    const coded = { ...fixedVals, [f1.id]: c1, [f2.id]: c2 };
    let y = fit.coeffs[0];
    model.terms.forEach((t, i) => {
      let val;
      if (isQuadPure(t, factors)) {
        const fac = factors.find(fc => t === quadPureTerm(fc.id));
        val = (coded[fac.id] ?? 0) ** 2;
      } else {
        val = factors.filter(fac => t.includes(fac.id)).reduce((p, fac) => p * (coded[fac.id] ?? 0), 1);
      }
      y += fit.coeffs[i + 1] * val;
    });
    return y;
  };

  const toReal = (f, coded) => {
    const mid = (f.low.real + f.high.real) / 2;
    const half = (f.high.real - f.low.real) / 2;
    return +(mid + coded * half).toFixed(2);
  };

  const GRID = 20;
  const xs = Array.from({ length: GRID }, (_, i) => -1 + i * 2 / (GRID - 1));
  const grid = xs.map(y2 => xs.map(x1 => predict(x1, y2)));
  const flat = grid.flat();
  const minZ = Math.min(...flat), maxZ = Math.max(...flat), rangeZ = maxZ - minZ || 1;

  const zColor = (z) => {
    const norm = (z - minZ) / rangeZ;
    const [from, to] = col.colorRamp || [[224,231,255],[55,48,163]];
    const r = Math.round(from[0] + norm * (to[0] - from[0]));
    const g = Math.round(from[1] + norm * (to[1] - from[1]));
    const b = Math.round(from[2] + norm * (to[2] - from[2]));
    return `rgb(${r},${g},${b})`;
  };

  const W = 480, H = 380, CX = W / 2, CY = H / 2 - 20, SCALE = 120;
  const project = (x, y, z) => {
    const cosZ = Math.cos(rotZ), sinZ = Math.sin(rotZ);
    const cosX = Math.cos(rotX), sinX = Math.sin(rotX);
    const rx = x * cosZ - y * sinZ;
    const ry = x * sinZ + y * cosZ;
    const px = rx;
    const py = ry * cosX - z * sinX;
    const pz = ry * sinX + z * cosX;
    return { sx: CX + px * SCALE, sy: CY - py * SCALE, depth: pz };
  };

  const quads = [];
  for (let j = 0; j < GRID - 1; j++) {
    for (let i = 0; i < GRID - 1; i++) {
      const x0 = xs[i], x1 = xs[i + 1], y0 = xs[j], y1 = xs[j + 1];
      const z00 = grid[j][i], z10 = grid[j][i + 1], z01 = grid[j + 1][i], z11 = grid[j + 1][i + 1];
      const avgZ = (z00 + z10 + z01 + z11) / 4;
      const normZ = (avgZ - minZ) / rangeZ;
      const p00 = project(x0, y0, normZ * 0.8 - 0.4);
      const p10 = project(x1, y0, ((z10 - minZ) / rangeZ) * 0.8 - 0.4);
      const p11 = project(x1, y1, ((z11 - minZ) / rangeZ) * 0.8 - 0.4);
      const p01 = project(x0, y1, ((z01 - minZ) / rangeZ) * 0.8 - 0.4);
      const depth = (p00.depth + p10.depth + p11.depth + p01.depth) / 4;
      quads.push({ p00, p10, p11, p01, depth, avgZ, color: zColor(avgZ) });
    }
  }
  quads.sort((a, b) => a.depth - b.depth);

  const axisLen = 0.5;
  const axX = project(axisLen, -1, -0.4);
  const axY = project(-1, axisLen, -0.4);
  const axZ = project(-1, -1, 0.4);
  const origin = project(-1, -1, -0.4);

  const onMouseDown = (e) => { dragging.current = true; lastMouse.current = { x: e.clientX, y: e.clientY }; };
  const onMouseMove = (e) => {
    if (!dragging.current) return;
    const dx = e.clientX - lastMouse.current.x;
    const dy = e.clientY - lastMouse.current.y;
    setRotZ(r => r + dx * 0.01);
    setRotX(r => Math.max(0.05, Math.min(Math.PI / 2 - 0.05, r + dy * 0.01)));
    lastMouse.current = { x: e.clientX, y: e.clientY };
  };
  const onMouseUp = () => { dragging.current = false; };

  return (
    <div className={`bg-white ${cardCls} ${col.border}`}>
      <div className="flex items-center gap-2 mb-4">
        <span className={`size-2.5 rounded-full ${col.dot}`} />
        <h3 className="text-sm font-semibold text-gray-900">{model.name} — {t("doe.surface.title")}</h3>
      </div>

      <div className="flex flex-wrap gap-4 mb-4">
        <div className="flex items-center gap-2">
          <label className="text-xs text-gray-500">{t("doe.surface.xAxis")} :</label>
          <select value={f1Idx} onChange={e => setF1Idx(+e.target.value)}
            className="rounded-md border border-gray-200 bg-white px-2 py-1 text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500">
            {contFactors.map((f, i) => <option key={f.id} value={i} disabled={i === f2Idx}>{f.id} — {f.name}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-gray-500">{t("doe.surface.yAxis")} :</label>
          <select value={f2Idx} onChange={e => setF2Idx(+e.target.value)}
            className="rounded-md border border-gray-200 bg-white px-2 py-1 text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500">
            {contFactors.map((f, i) => <option key={f.id} value={i} disabled={i === f1Idx}>{f.id} — {f.name}</option>)}
          </select>
        </div>
      </div>

      {factors.filter(f => f.continuous && f.id !== f1?.id && f.id !== f2?.id).length > 0 && (
        <div className="flex flex-wrap gap-3 mb-4 p-3 bg-gray-50 rounded-lg">
          <p className="w-full text-[11px] text-gray-400 font-medium">{t("doe.surface.fixed")} :</p>
          {factors.filter(f => f.continuous && f.id !== f1?.id && f.id !== f2?.id).map(f => (
            <div key={f.id} className="flex items-center gap-2">
              <label className="text-xs text-gray-500">{f.id} :</label>
              <input type="range" min="-1" max="1" step="0.1" value={fixedVals[f.id] ?? 0}
                onChange={e => setFixedVals(prev => ({ ...prev, [f.id]: +e.target.value }))}
                className="w-20" />
              <span className="text-xs font-mono text-gray-600 w-8">{(fixedVals[f.id] ?? 0).toFixed(1)}</span>
              <span className="text-[10px] text-gray-400">({toReal(f, fixedVals[f.id] ?? 0)} {f.unit})</span>
            </div>
          ))}
        </div>
      )}

      <svg
        width={W} height={H} viewBox={`0 0 ${W} ${H}`}
        className="w-full rounded-lg bg-gray-50 cursor-grab active:cursor-grabbing select-none"
        onMouseDown={onMouseDown} onMouseMove={onMouseMove} onMouseUp={onMouseUp} onMouseLeave={onMouseUp}
      >
        {quads.map((q, i) => (
          <polygon key={i}
            points={`${q.p00.sx},${q.p00.sy} ${q.p10.sx},${q.p10.sy} ${q.p11.sx},${q.p11.sy} ${q.p01.sx},${q.p01.sy}`}
            fill={q.color} stroke="rgba(255,255,255,0.3)" strokeWidth="0.3"
          />
        ))}
        <line x1={origin.sx} y1={origin.sy} x2={axX.sx} y2={axX.sy} stroke="#6b7280" strokeWidth="1.5" markerEnd="url(#arrowX)" />
        <line x1={origin.sx} y1={origin.sy} x2={axY.sx} y2={axY.sy} stroke="#6b7280" strokeWidth="1.5" markerEnd="url(#arrowY)" />
        <line x1={origin.sx} y1={origin.sy} x2={axZ.sx} y2={axZ.sy} stroke="#6b7280" strokeWidth="1.5" markerEnd="url(#arrowZ)" />
        <defs>
          <marker id="arrowX" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto"><path d="M0,0 L0,6 L6,3 z" fill="#6b7280"/></marker>
          <marker id="arrowY" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto"><path d="M0,0 L0,6 L6,3 z" fill="#6b7280"/></marker>
          <marker id="arrowZ" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto"><path d="M0,0 L0,6 L6,3 z" fill="#6b7280"/></marker>
        </defs>
        <text x={axX.sx + 6} y={axX.sy + 4} fontSize="10" fill="#4b5563">{f1.name}{f1.unit ? ` (${f1.unit})` : ""}</text>
        <text x={axY.sx + 6} y={axY.sy + 4} fontSize="10" fill="#4b5563">{f2.name}{f2.unit ? ` (${f2.unit})` : ""}</text>
        <text x={axZ.sx + 4} y={axZ.sy - 4} fontSize="10" fill="#4b5563">Ŷ</text>
        <text x={W - 100} y={22} fontSize="9" fill="#9ca3af">max Ŷ = {maxZ.toFixed(3)}</text>
        <text x={W - 100} y={34} fontSize="9" fill="#9ca3af">min Ŷ = {minZ.toFixed(3)}</text>
      </svg>

      <div className="mt-3">
        <div className="flex justify-between text-[10px] font-mono text-gray-400 mb-1">
          <span>{minZ.toFixed(2)}</span>
          <span>{((minZ + maxZ) / 2).toFixed(2)}</span>
          <span>{maxZ.toFixed(2)}</span>
        </div>
        <div className="h-3 rounded-full" style={{ background: col.gradient || "linear-gradient(to right, #e0e7ff, #6366f1, #3730a3)" }} />
      </div>
      <p className="text-[10px] text-gray-400 mt-2">{t("doe.surface.rotate")}</p>
    </div>
  );
}
