import { useState, useEffect, useRef, useCallback } from "react";
import GouttteMouillage from "./GouttteMouillage";
import ZismanApp from "./ZismanApp";
import {
  LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";

// ─── KaTeX ────────────────────────────────────────────────────────────────────
function useKatex() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (window.katex) { setReady(true); return; }
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://cdn.jsdelivr.net/npm/katex@0.16.10/dist/katex.min.css";
    document.head.appendChild(link);
    const s = document.createElement("script");
    s.src = "https://cdn.jsdelivr.net/npm/katex@0.16.10/dist/katex.min.js";
    s.onload = () => setReady(true);
    document.head.appendChild(s);
  }, []);
  return ready;
}
function Tex({ tex, block = false, style = {} }) {
  const ref = useRef(null);
  const ok = useKatex();
  useEffect(() => {
    if (!ok || !ref.current || !window.katex) return;
    try { window.katex.render(tex, ref.current, { displayMode: block, throwOnError: false }); }
    catch { if (ref.current) ref.current.textContent = tex; }
  }, [tex, block, ok]);
  return <span ref={ref} style={{ display: block ? "block" : "inline", textAlign: block ? "center" : undefined, ...style }} />;
}

// ─── Tokens ───────────────────────────────────────────────────────────────────
const T = {
  bg: "#f8fafc", white: "#ffffff",
  border: "#e2e8f0", borderMd: "#cbd5e1", borderDark: "#94a3b8",
  blue900: "#1e3a5f", blue600: "#2563eb", blue100: "#dbeafe", blue50: "#eff6ff",
  teal600: "#0891b2", teal100: "#cffafe", teal50: "#ecfeff",
  green600: "#16a34a", green100: "#dcfce7", green50: "#f0fdf4",
  orange600: "#ea580c", orange100: "#ffedd5", orange50: "#fff7ed",
  red600: "#dc2626", red50: "#fef2f2", red100: "#fee2e2",
  purple600: "#7c3aed", purple50: "#faf5ff", purple100: "#ede9fe",
  text: "#0f172a", textMid: "#334155", textMuted: "#64748b", textLight: "#94a3b8",
  fontMono: "'JetBrains Mono','Fira Code',monospace",
  fontUi: "'DM Sans',system-ui,sans-serif",
};

const AXIS_INFO = {
  gdot:  { name: "Gradient de vitesse",       unit: "s⁻¹"  },
  sigma: { name: "Contrainte de cisaillement", unit: "Pa"   },
  eta:   { name: "Viscosité dynamique",        unit: "Pa·s" },
};

// ─── Modèles ──────────────────────────────────────────────────────────────────
const MODELS = {
  newton: {
    id: "newton", name: "Newtonien", shortName: "Newton",
    color: T.blue600, colorLight: T.blue50, colorMid: T.blue100,
    formulaSigma: "\\sigma = \\eta \\cdot \\dot{\\gamma}",
    formulaEta: "\\eta = \\text{cste}",
    formulaFull: "\\sigma = \\eta \\cdot \\dot{\\gamma}",
    paramDefs: { eta: { tex: "\\eta", unit: "Pa·s", min: 0.001, max: 5, step: 0.001, default: 0.001, desc: "Viscosité dynamique" } },
    compute: ({ eta }, g) => ({ sigma: eta * g, eta_val: eta }),
    invSigToG: ({ eta }, s) => s / eta,
    dsigma_dgdot: ({ eta }) => eta,
    deta_dgdot: () => 0,
    examples: "Eau (η ≈ 1 mPa·s), solvants, huiles légères",
    note: "Viscosité indépendante du cisaillement.",
  },
  puissance: {
    id: "puissance", name: "Loi puissance", shortName: "Ostwald",
    color: T.teal600, colorLight: T.teal50, colorMid: T.teal100,
    formulaSigma: "\\sigma = k \\cdot \\dot{\\gamma}^{n}",
    formulaEta: "\\eta = k \\cdot \\dot{\\gamma}^{n-1}",
    formulaFull: "\\sigma = k \\cdot \\dot{\\gamma}^{n}",
    paramDefs: {
      k: { tex: "k", unit: "Pa·sⁿ", min: 0.01, max: 30, step: 0.005, default: 0.360, desc: "Indice de consistance" },
      n: { tex: "n", unit: "—",     min: 0.1,  max: 2.5, step: 0.01,  default: 1.18, desc: "Indice d'écoulement" },
    },
    compute: ({ k, n }, g) => ({ sigma: k * Math.pow(g, n), eta_val: k * Math.pow(g, n - 1) }),
    invSigToG: ({ k, n }, s) => Math.pow(s / k, 1 / n),
    dsigma_dgdot: ({ k, n }, g) => k * n * Math.pow(Math.max(g, 1e-9), n - 1),
    deta_dgdot: ({ k, n }, g) => k * (n - 1) * Math.pow(Math.max(g, 1e-9), n - 2),
    examples: "n < 1 : peintures, crèmes — n > 1 : amidon",
    note: "n=1 → newtonien. En log-log : droite de pente n.",
  },
  bingham: {
    id: "bingham", name: "Bingham", shortName: "Bingham",
    color: T.green600, colorLight: T.green50, colorMid: T.green100,
    formulaSigma: "\\sigma = \\sigma_0 + \\eta_{pl}\\,\\dot{\\gamma}",
    formulaEta: "\\eta = \\dfrac{\\sigma_0}{\\dot{\\gamma}} + \\eta_{pl}",
    formulaFull: "\\begin{cases}\\dot{\\gamma}=0 & \\text{si }\\sigma\\leq\\sigma_0\\\\\\sigma=\\sigma_0+\\eta_{pl}\\,\\dot{\\gamma}&\\text{si }\\sigma>\\sigma_0\\end{cases}",
    paramDefs: {
      sigma0: { tex: "\\sigma_0",  unit: "Pa",  min: 0,    max: 200, step: 0.5,  default: 50,  desc: "Seuil d'écoulement" },
      etapl:  { tex: "\\eta_{pl}", unit: "Pa·s", min: 0.01, max: 20,  step: 0.01, default: 1.72, desc: "Viscosité plastique" },
    },
    compute: ({ sigma0, etapl }, g) =>
      g <= 0 ? { sigma: 0, eta_val: Infinity }
             : { sigma: sigma0 + etapl * g, eta_val: sigma0 / g + etapl },
    invSigToG: ({ sigma0, etapl }, s) => s <= sigma0 ? null : (s - sigma0) / etapl,
    dsigma_dgdot: ({ etapl }) => etapl,
    deta_dgdot: ({ sigma0 }, g) => -sigma0 / Math.pow(Math.max(g, 1e-9), 2),
    examples: "Mayonnaise, pâte dentifrice, boues argileuses",
    note: "σ₀ : seuil d'écoulement.",
  },
  hb: {
    id: "hb", name: "Herschel-Bulkley", shortName: "H-B",
    color: T.orange600, colorLight: T.orange50, colorMid: T.orange100,
    formulaSigma: "\\sigma = \\sigma_0 + k\\,\\dot{\\gamma}^{n}",
    formulaEta: "\\eta = \\dfrac{\\sigma_0}{\\dot{\\gamma}} + k\\,\\dot{\\gamma}^{n-1}",
    formulaFull: "\\begin{cases}\\dot{\\gamma}=0&\\text{si }\\sigma\\leq\\sigma_0\\\\\\sigma=\\sigma_0+k\\,\\dot{\\gamma}^n&\\text{si }\\sigma>\\sigma_0\\end{cases}",
    paramDefs: {
      sigma0: { tex: "\\sigma_0", unit: "Pa",   min: 0,    max: 50,  step: 0.5,  default: 0,   desc: "Seuil d'écoulement" },
      k:      { tex: "k",        unit: "Pa·sⁿ", min: 0.01, max: 30,  step: 0.05, default: 8.0, desc: "Indice de consistance" },
      n:      { tex: "n",        unit: "—",     min: 0.1,  max: 2.5,  step: 0.01, default: 0.7, desc: "Indice d'écoulement" },
    },
    compute: ({ sigma0, k, n }, g) => {
      if (g <= 0) return { sigma: 0, eta_val: Infinity };
      const sigma = sigma0 + k * Math.pow(g, n);
      return { sigma, eta_val: sigma / g };
    },
    invSigToG: ({ sigma0, k, n }, s) => s <= sigma0 ? null : Math.pow((s - sigma0) / k, 1 / n),
    dsigma_dgdot: ({ k, n }, g) => k * n * Math.pow(Math.max(g, 1e-9), n - 1),
    deta_dgdot: ({ sigma0, k, n }, g) => {
      const gg = Math.max(g, 1e-9);
      return (-sigma0 / (gg * gg)) + k * (n - 1) * Math.pow(gg, n - 2);
    },
    examples: "Ketchup, boues de forage, béton frais, peintures en pâte",
    note: "Modèle le plus général.",
  },
};

// ─── Génération des points de courbe ─────────────────────────────────────────
function generateSeries(params, xAxis, yAxis, xLog, xMin, xMax, activeIds) {
  const N = 600;
  const series = {};
  activeIds.forEach((id) => {
    const m = MODELS[id]; const p = params[id]; const pts = [];
    const sigma0 = (id === "bingham" || id === "hb") ? p.sigma0 : 0;
    const hasYield = sigma0 > 0;
    const gStart = 1e-6;
    const safeXMin = xLog ? Math.max(xMin, 1e-4) : 0;

    // Point d'ancrage seuil
    if (xAxis === "gdot" && !xLog && xMin <= 0 && hasYield && yAxis === "sigma")
      pts.push({ x: 0, y: +sigma0.toPrecision(6) });

    for (let i = 0; i <= N; i++) {
      const t = i / N;
      const x = xLog
        ? Math.pow(10, Math.log10(safeXMin || 1e-4) + t * (Math.log10(xMax) - Math.log10(safeXMin || 1e-4)))
        : (xMin > 0 ? xMin + t * (xMax - xMin) : gStart + t * (xMax - gStart));

      let g, s, etaV;
      if (xAxis === "gdot") {
        g = x; if (g <= 0) continue;
        const r = m.compute(p, g); s = r.sigma; etaV = r.eta_val;
      } else {
        s = x; g = m.invSigToG(p, s);
        if (g === null || g <= 0 || !isFinite(g)) continue;
        etaV = m.compute(p, g).eta_val;
      }
      const y = yAxis === "sigma" ? s : etaV;
      if (isFinite(y) && y >= 0) pts.push({ x: +x.toPrecision(5), y: +y.toPrecision(6) });
    }
    series[id] = pts;
  });
  return series;
}

function mergeData(series) {
  const all = {};
  Object.entries(series).forEach(([id, pts]) =>
    pts.forEach((p) => { if (!all[p.x]) all[p.x] = { x: p.x }; all[p.x][id] = p.y; })
  );
  return Object.values(all).sort((a, b) => a.x - b.x);
}

function makeTicks(min, max, n) {
  const t = [];
  for (let i = 0; i < n; i++) t.push(min + (i / (n - 1)) * (max - min));
  return t;
}

function fmtTick(v) {
  if (v === 0) return "0";
  const a = Math.abs(v);
  if (a >= 1e4 || a < 0.01) return v.toExponential(1);
  if (a >= 100) return v.toFixed(0);
  if (a >= 10)  return v.toFixed(1);
  return v.toPrecision(2);
}

// ─── Dérivée analytique ───────────────────────────────────────────────────────
function getSlope(modelId, params, xAxis, yAxis, xVal) {
  const m = MODELS[modelId]; const p = params[modelId];
  if (xAxis === "gdot") {
    return yAxis === "sigma" ? m.dsigma_dgdot(p, xVal) : m.deta_dgdot(p, xVal);
  }
  const g = m.invSigToG?.(p, xVal);
  if (!g || g <= 0) return null;
  const dsdg = m.dsigma_dgdot(p, g);
  if (Math.abs(dsdg) < 1e-12) return null;
  return yAxis === "sigma" ? null : m.deta_dgdot(p, g) / dsdg;
}

// ─── Tooltip ─────────────────────────────────────────────────────────────────
function RheoTooltip({ active, payload, label, xAxis, yAxis }) {
  if (!active || !payload?.length) return null;
  const xi = AXIS_INFO[xAxis]; const yi = AXIS_INFO[yAxis];
  return (
    <div style={{ background: T.white, border: `1px solid ${T.borderMd}`, borderRadius: 8,
      padding: "10px 14px", boxShadow: "0 4px 20px rgba(0,0,0,0.1)", fontFamily: T.fontUi, fontSize: 12, minWidth: 200 }}>
      <div style={{ color: T.textMuted, marginBottom: 7, borderBottom: `1px solid ${T.border}`, paddingBottom: 6 }}>
        {xi.name} = <strong style={{ fontFamily: T.fontMono }}>{Number(label).toPrecision(4)}</strong> {xi.unit}
      </div>
      {payload.map((p) => p.value != null && (
        <div key={p.dataKey} style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 4 }}>
          <div style={{ width: 10, height: 10, borderRadius: "50%", background: MODELS[p.dataKey]?.color, flexShrink: 0 }} />
          <span style={{ color: T.textMid }}>{MODELS[p.dataKey]?.shortName}</span>
          <span style={{ marginLeft: "auto", fontFamily: T.fontMono, color: MODELS[p.dataKey]?.color, fontWeight: 600 }}>
            {Number(p.value).toPrecision(4)} {yi.unit}
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── Constantes layout Recharts ───────────────────────────────────────────────
const MARGIN  = { top: 4, right: 20, bottom: 40, left: 20 };
const YAXIS_W = 66;

// ─── Fonctions pixel ↔ données ────────────────────────────────────────────────
function dataToPixel(val, dMin, dMax, pMin, pMax, isLog) {
  if (isLog) {
    const lMin = Math.log10(Math.max(dMin, 1e-12)), lMax = Math.log10(Math.max(dMax, 1e-12));
    return pMin + ((Math.log10(Math.max(val, 1e-12)) - lMin) / (lMax - lMin)) * (pMax - pMin);
  }
  return pMin + ((val - dMin) / (dMax - dMin)) * (pMax - pMin);
}
function pixelToData(px, dMin, dMax, pMin, pMax, isLog) {
  const t = (px - pMin) / (pMax - pMin);
  if (isLog) {
    const lMin = Math.log10(Math.max(dMin, 1e-12)), lMax = Math.log10(Math.max(dMax, 1e-12));
    return Math.pow(10, lMin + t * (lMax - lMin));
  }
  return dMin + t * (dMax - dMin);
}

// ─── SVG overlay : points + tangentes ────────────────────────────────────────
// Approche robuste : on mesure la zone de tracé depuis le DOM (recharts-cartesian-grid)
// puis on positionne un <svg> absolu par-dessus avec nos propres conversions pixel.

function useChartPlot(wrapperRef, chartH) {
  const [plot, setPlot] = useState({ left: 86, right: 780, top: 4, bottom: 480 });

  useEffect(() => {
    const measure = () => {
      const wrapper = wrapperRef.current;
      if (!wrapper) return;
      const grid = wrapper.querySelector(".recharts-cartesian-grid");
      const svg  = wrapper.querySelector("svg");
      if (!grid || !svg) return;
      const gr = grid.getBoundingClientRect();
      const sr = svg.getBoundingClientRect();
      if (gr.width < 10 || gr.height < 10) return;
      setPlot({
        left:   gr.left   - sr.left,
        right:  gr.right  - sr.left,
        top:    gr.top    - sr.top,
        bottom: gr.bottom - sr.top,
      });
    };
    // Mesure initiale après paint
    const t1 = setTimeout(measure, 50);
    const t2 = setTimeout(measure, 300);
    // Mesure sur resize
    const obs = new ResizeObserver(measure);
    if (wrapperRef.current) obs.observe(wrapperRef.current);
    return () => { clearTimeout(t1); clearTimeout(t2); obs.disconnect(); };
  }, [wrapperRef, chartH]);

  return plot;
}

function SvgAnnotLayer({ wrapperRef, chartH, annotPoints, xMin, xMax, yMin, yMax, xLog, yLog, onDragMove }) {
  const plot = useChartPlot(wrapperRef, chartH);
  const dragIdx  = useRef(null);
  const svgRef   = useRef(null);

  const toPxX = (v) => {
    if (xLog) {
      const lMin = Math.log10(Math.max(xMin, 1e-12));
      const lMax = Math.log10(Math.max(xMax, 1e-12));
      const t = (Math.log10(Math.max(v, 1e-12)) - lMin) / (lMax - lMin);
      return plot.left + t * (plot.right - plot.left);
    }
    return plot.left + ((v - xMin) / (xMax - xMin)) * (plot.right - plot.left);
  };
  const toPxY = (v) => {
    if (yLog) {
      const lMin = Math.log10(Math.max(yMin, 1e-12));
      const lMax = Math.log10(Math.max(yMax, 1e-12));
      const t = (Math.log10(Math.max(v, 1e-12)) - lMin) / (lMax - lMin);
      return plot.bottom - t * (plot.bottom - plot.top);
    }
    return plot.bottom - ((v - yMin) / (yMax - yMin)) * (plot.bottom - plot.top);
  };
  const toDataX = (px) => {
    const t = (px - plot.left) / (plot.right - plot.left);
    if (xLog) {
      const lMin = Math.log10(Math.max(xMin, 1e-12));
      const lMax = Math.log10(Math.max(xMax, 1e-12));
      return Math.pow(10, lMin + t * (lMax - lMin));
    }
    return xMin + t * (xMax - xMin);
  };

  const handleMouseDown = (e, idx) => {
    e.stopPropagation(); e.preventDefault();
    dragIdx.current = idx;
  };
  const handleMouseMove = (e) => {
    if (dragIdx.current === null) return;
    const r = svgRef.current.getBoundingClientRect();
    const px = e.clientX - r.left;
    const xd = Math.max(toDataX(px), 1e-6);
    onDragMove(dragIdx.current, xd);
  };
  const handleMouseUp = () => { dragIdx.current = null; };

  if (!annotPoints.length) return null;

  const W = (plot.right - plot.left) || 1;
  const H = (plot.bottom - plot.top)  || 1;
  const pxPerDataX = W / ((xMax - xMin) || 1);
  const pxPerDataY = H / ((yMax - yMin) || 1);

  return (
    <svg ref={svgRef}
      width="100%" height={chartH}
      style={{ position: "absolute", top: 0, left: 0, pointerEvents: "none", overflow: "visible" }}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {annotPoints.map(({ xd, yd, color, showTangent, slope }, i) => {
        const cx = toPxX(xd);
        const cy = toPxY(yd);
        if (!isFinite(cx) || !isFinite(cy)) return null;

        // Tangente
        let tangentEl = null;
        if (showTangent && slope !== null && isFinite(slope)) {
          const slopePx = -(slope * pxPerDataY / pxPerDataX);
          const len  = Math.min(W, H) * 0.35;
          const norm = Math.sqrt(1 + slopePx * slopePx);
          const ux = len / norm;
          const uy = slopePx * ux;
          const ex = uy < 0 ? cx + ux : cx - ux;
          const ey = uy < 0 ? cy + uy : cy - uy;
          tangentEl = (
            <g>
              <line x1={cx - ux} y1={cy - uy} x2={cx + ux} y2={cy + uy}
                stroke={color} strokeWidth={2.5} strokeDasharray="7 4" />
              <text x={ex + 7} y={ey - 7} fill={color} fontSize={12}
                fontWeight="bold" fontFamily="JetBrains Mono, monospace" style={{ userSelect: "none" }}>
                pente = {Number(slope).toPrecision(3)}
              </text>
            </g>
          );
        }

        return (
          <g key={i}>
            {tangentEl}
            {/* Zone de drag invisible (plus grande que le point visible) */}
            <circle cx={cx} cy={cy} r={14} fill="transparent"
              style={{ pointerEvents: "all", cursor: "grab" }}
              onMouseDown={(e) => handleMouseDown(e, i)}
            />
            {/* Point visible */}
            <circle cx={cx} cy={cy} r={7} fill={color} stroke="#fff" strokeWidth={2.5}
              style={{ pointerEvents: "none" }} />
            {/* Label coordonnées */}
            <text x={cx + 11} y={cy - 8} fill={color} fontSize={11}
              fontFamily="JetBrains Mono, monospace" style={{ userSelect: "none", pointerEvents: "none" }}>
              ({Number(xd).toPrecision(3)}, {Number(yd).toPrecision(3)})
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// ─── Canvas overlay : dessin libre + texte ───────────────────────────────────
function CanvasOverlay({ width, height, xMin, xMax, yMin, yMax, xLog, yLog, tool, drawings, texts, onCanvasClick, onMouseDown, onMouseMove, onMouseUp }) {
  const ref = useRef(null);

  useEffect(() => {
    const canvas = ref.current; if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawings.forEach(({ pts, color, stroke }) => {
      if (pts.length < 2) return;
      ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y);
      pts.slice(1).forEach((p) => ctx.lineTo(p.x, p.y));
      ctx.strokeStyle = color; ctx.lineWidth = stroke;
      ctx.lineJoin = "round"; ctx.lineCap = "round"; ctx.stroke();
    });
    texts.forEach(({ x, y, text, color, fontSize }) => {
      ctx.font = `${fontSize || 14}px DM Sans, sans-serif`;
      ctx.fillStyle = color; ctx.textAlign = "left"; ctx.fillText(text, x, y);
    });
  });

  const cursor = tool === "draw" ? "crosshair" : tool === "text" ? "text" : "default";
  const active = tool === "draw" || tool === "text";

  return (
    <canvas ref={ref} width={width} height={height}
      style={{ position: "absolute", top: 0, left: 0, pointerEvents: active ? "auto" : "none", cursor }}
      onClick={(e) => { const r = e.currentTarget.getBoundingClientRect(); onCanvasClick(e.clientX - r.left, e.clientY - r.top); }}
      onMouseDown={(e) => { const r = e.currentTarget.getBoundingClientRect(); onMouseDown(e.clientX - r.left, e.clientY - r.top); }}
      onMouseMove={(e) => { const r = e.currentTarget.getBoundingClientRect(); onMouseMove(e.clientX - r.left, e.clientY - r.top); }}
      onMouseUp={onMouseUp} onMouseLeave={onMouseUp}
    />
  );
}

// ─── ParamSlider ──────────────────────────────────────────────────────────────
function ParamSlider({ modelId, paramKey, pd, value, onChange }) {
  const mod = MODELS[modelId];
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <Tex tex={pd.tex} style={{ fontSize: 14 }} />
          <span style={{ fontSize: 11, color: T.textLight }}>({pd.unit})</span>
          <span style={{ fontSize: 11, color: T.textMuted, marginLeft: 2 }}>— {pd.desc}</span>
        </div>
        <span style={{ fontFamily: T.fontMono, fontSize: 13, fontWeight: 600, color: mod.color }}>{Number(value).toPrecision(3)}</span>
      </div>
      <input type="range" min={pd.min} max={pd.max} step={pd.step} value={value}
        onChange={(e) => onChange(modelId, paramKey, +e.target.value)}
        style={{ width: "100%", accentColor: mod.color, cursor: "pointer" }} />
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 1 }}>
        <span style={{ fontSize: 10, color: T.textLight, fontFamily: T.fontMono }}>{pd.min}</span>
        <span style={{ fontSize: 10, color: T.textLight, fontFamily: T.fontMono }}>{pd.max}</span>
      </div>
    </div>
  );
}

// ─── BoundInput ───────────────────────────────────────────────────────────────
function BoundInput({ label, value, onChange, accentColor }) {
  const [draft, setDraft] = useState(String(value));
  useEffect(() => setDraft(String(value)), [value]);
  const commit = () => { const n = parseFloat(draft); if (!isNaN(n) && isFinite(n)) onChange(n); else setDraft(String(value)); };
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
      <span style={{ fontSize: 10, color: T.textMuted, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.07em" }}>{label}</span>
      <input type="number" value={draft} onChange={(e) => setDraft(e.target.value)}
        onBlur={(e) => { e.target.style.borderColor = `${accentColor}44`; commit(); }}
        onKeyDown={(e) => e.key === "Enter" && commit()}
        style={{ width: 72, padding: "5px 6px", border: `1.5px solid ${accentColor}44`, borderRadius: 6, fontFamily: T.fontMono, fontSize: 12, color: T.text, background: T.white, textAlign: "center", outline: "none" }}
        onFocus={(e) => { e.target.style.borderColor = accentColor; }} />
    </div>
  );
}

function TickInput({ value, onChange, accentColor }) {
  const [draft, setDraft] = useState(String(value));
  useEffect(() => setDraft(String(value)), [value]);
  const commit = () => { const n = parseInt(draft, 10); if (!isNaN(n) && n >= 2 && n <= 25) onChange(n); else setDraft(String(value)); };
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
      <span style={{ fontSize: 10, color: T.textMuted, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.07em" }}>Grads</span>
      <input type="number" value={draft} min={2} max={25} onChange={(e) => setDraft(e.target.value)}
        onBlur={(e) => { e.target.style.borderColor = `${accentColor}44`; commit(); }}
        onKeyDown={(e) => e.key === "Enter" && commit()}
        style={{ width: 52, padding: "5px 4px", border: `1.5px solid ${accentColor}44`, borderRadius: 6, fontFamily: T.fontMono, fontSize: 12, color: T.text, background: T.white, textAlign: "center", outline: "none" }}
        onFocus={(e) => { e.target.style.borderColor = accentColor; }} />
    </div>
  );
}

function SegBtn({ active, children, onClick, accentColor, accentBg }) {
  return (
    <button onClick={onClick} style={{ padding: "5px 12px", border: `1px solid ${active ? accentColor : T.border}`, borderRadius: 6, background: active ? accentBg : T.white, color: active ? accentColor : T.textMuted, fontSize: 12, cursor: "pointer", fontWeight: active ? 600 : 400, fontFamily: T.fontUi, display: "flex", alignItems: "center", gap: 4 }}>
      {children}
    </button>
  );
}

// ─── AxisControls ─────────────────────────────────────────────────────────────
function AxisControls({ xAxis, yAxis, xLog, yLog, xMin, xMax, yMin, yMax, xTicks, yTicks, setXAxis, setYAxis, setXLog, setYLog, setXMin, setXMax, setYMin, setYMax, setXTicks, setYTicks, activeModel }) {
  const m = MODELS[activeModel]; const xi = AXIS_INFO[xAxis]; const yi = AXIS_INFO[yAxis];
  const div = <div style={{ width: 1, alignSelf: "stretch", background: T.border, margin: "0 2px" }} />;
  const tag = (l, c, bg) => (
    <div style={{ width: 26, height: 26, borderRadius: 6, background: bg, border: `1px solid ${c}44`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: c, flexShrink: 0 }}>{l}</div>
  );
  const bornesLbl = (unit) => (
    <div style={{ display: "flex", flexDirection: "column", gap: 1, marginRight: 2 }}>
      <span style={{ fontSize: 11, color: T.textMuted, fontWeight: 600 }}>Bornes</span>
      <span style={{ fontSize: 10, color: T.textLight, fontFamily: T.fontMono }}>{unit}</span>
    </div>
  );
  const row = { display: "flex", alignItems: "center", gap: 7, padding: "10px 14px" };
  return (
    <div style={{ background: T.white, border: `1px solid ${T.border}`, borderRadius: 12, overflow: "hidden" }}>
      <div style={{ ...row, borderBottom: `1px solid ${T.border}` }}>
        {tag("X", T.blue600, T.blue50)}
        <div style={{ minWidth: 80 }}><span style={{ fontSize: 11, fontWeight: 700, color: T.blue600 }}>{xi.name}</span></div>
        <div style={{ display: "flex", gap: 3 }}>
          <SegBtn active={xAxis === "gdot"}  onClick={() => setXAxis("gdot")}  accentColor={T.blue600} accentBg={T.blue50}><Tex tex={"\\dot{\\gamma}"} style={{ fontSize: 13 }} />&thinsp;(s⁻¹)</SegBtn>
          <SegBtn active={xAxis === "sigma"} onClick={() => setXAxis("sigma")} accentColor={T.blue600} accentBg={T.blue50}><Tex tex={"\\sigma"} style={{ fontSize: 13 }} />&thinsp;(Pa)</SegBtn>
        </div>
        {div}
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <span style={{ fontSize: 10, color: T.textMuted, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.07em" }}>Échelle</span>
          <div style={{ display: "flex", gap: 3 }}>
            <SegBtn active={!xLog} onClick={() => setXLog(false)} accentColor={T.blue600} accentBg={T.blue50}>Lin.</SegBtn>
            <SegBtn active={xLog}  onClick={() => setXLog(true)}  accentColor={T.blue600} accentBg={T.blue50}>Log</SegBtn>
          </div>
        </div>
        {div}{bornesLbl(xi.unit)}
        <BoundInput label="min" value={xMin} onChange={setXMin} accentColor={T.blue600} />
        <span style={{ color: T.textLight, fontSize: 16 }}>—</span>
        <BoundInput label="max" value={xMax} onChange={setXMax} accentColor={T.blue600} />
        {div}<TickInput value={xTicks} onChange={setXTicks} accentColor={T.blue600} />
      </div>
      <div style={{ ...row, borderBottom: `1px solid ${T.border}` }}>
        {tag("Y", T.teal600, T.teal50)}
        <div style={{ minWidth: 80 }}><span style={{ fontSize: 11, fontWeight: 700, color: T.teal600 }}>{yi.name}</span></div>
        <div style={{ display: "flex", gap: 3 }}>
          <SegBtn active={yAxis === "sigma"} onClick={() => setYAxis("sigma")} accentColor={T.teal600} accentBg={T.teal50}><Tex tex={"\\sigma"} style={{ fontSize: 13 }} />&thinsp;(Pa)</SegBtn>
          <SegBtn active={yAxis === "eta"}   onClick={() => setYAxis("eta")}   accentColor={T.teal600} accentBg={T.teal50}><Tex tex={"\\eta"} style={{ fontSize: 13 }} />&thinsp;(Pa·s)</SegBtn>
        </div>
        {div}
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <span style={{ fontSize: 10, color: T.textMuted, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.07em" }}>Échelle</span>
          <div style={{ display: "flex", gap: 3 }}>
            <SegBtn active={!yLog} onClick={() => setYLog(false)} accentColor={T.teal600} accentBg={T.teal50}>Lin.</SegBtn>
            <SegBtn active={yLog}  onClick={() => setYLog(true)}  accentColor={T.teal600} accentBg={T.teal50}>Log</SegBtn>
          </div>
        </div>
        {div}{bornesLbl(yi.unit)}
        <BoundInput label="min" value={yMin} onChange={setYMin} accentColor={T.teal600} />
        <span style={{ color: T.textLight, fontSize: 16 }}>—</span>
        <BoundInput label="max" value={yMax} onChange={setYMax} accentColor={T.teal600} />
        {div}<TickInput value={yTicks} onChange={setYTicks} accentColor={T.teal600} />
      </div>
      <div style={{ padding: "9px 14px", background: m.colorLight, display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ width: 7, height: 7, borderRadius: "50%", background: m.color }} />
        <Tex tex={yAxis === "sigma" ? m.formulaSigma : m.formulaEta} style={{ fontSize: 14 }} />
        <div style={{ marginLeft: "auto", background: m.colorMid, borderRadius: 5, padding: "2px 9px", fontSize: 11, fontWeight: 600, color: m.color }}>{m.name}</div>
      </div>
    </div>
  );
}

// ─── TextBoxLayer ─────────────────────────────────────────────────────────────
function TextBoxLayer({ boxes, setBoxes, editingId, setEditingId, chartH }) {
  const svgRef  = useRef(null);
  const editRef = useRef(null);
  const dragRef = useRef(null); // { type:'move'|'rotate', id, startX, startY, origX, origY, cx, cy }
  const HOFF = 26; // pixels above box for rotate handle

  // Focus textarea when editing starts
  useEffect(() => {
    if (editingId && editRef.current) {
      editRef.current.focus();
      editRef.current.select();
    }
  }, [editingId]);

  // Global drag/rotate handlers
  useEffect(() => {
    const onMove = (e) => {
      const d = dragRef.current; if (!d) return;
      if (d.type === "move") {
        const dx = e.clientX - d.startX, dy = e.clientY - d.startY;
        setBoxes((prev) => prev.map((b) => b.id === d.id ? { ...b, x: d.origX + dx, y: d.origY + dy } : b));
      } else if (d.type === "rotate") {
        const angle = Math.atan2(e.clientY - d.cy, e.clientX - d.cx) * 180 / Math.PI + 90;
        setBoxes((prev) => prev.map((b) => b.id === d.id ? { ...b, rotation: angle } : b));
      }
    };
    const onUp = () => { dragRef.current = null; };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
  }, [setBoxes]);

  const startMove = (e, box) => {
    if (editingId === box.id) return;
    e.stopPropagation(); e.preventDefault();
    dragRef.current = { type: "move", id: box.id, startX: e.clientX, startY: e.clientY, origX: box.x, origY: box.y };
  };

  const startRotate = (e, box) => {
    e.stopPropagation(); e.preventDefault();
    const r = svgRef.current.getBoundingClientRect();
    dragRef.current = { type: "rotate", id: box.id, cx: r.left + box.x, cy: r.top + box.y };
  };

  const removeBox = (e, id) => {
    e.stopPropagation();
    setBoxes((prev) => prev.filter((b) => b.id !== id));
    if (editingId === id) setEditingId(null);
  };

  const editingBox = editingId ? boxes.find((b) => b.id === editingId) : null;

  return (
    <>
      <svg ref={svgRef} width="100%" height={chartH}
        style={{ position: "absolute", top: 0, left: 0, pointerEvents: "none", overflow: "visible", zIndex: 6 }}
      >
        {boxes.map((box) => {
          const lines = (box.text || " ").split("\n");
          const lh  = box.fontSize + 5;
          const w   = Math.max(80, Math.max(...lines.map((l) => (l.length || 1))) * box.fontSize * 0.57 + 24);
          const h   = lines.length * lh + 14;
          const isEd = editingId === box.id;
          return (
            <g key={box.id} transform={`translate(${box.x},${box.y}) rotate(${box.rotation})`}>
              {/* Box rect — drag handle */}
              <rect x={-w / 2} y={-h / 2} width={w} height={h} rx={5}
                fill="white" fillOpacity={isEd ? 0 : 0.92}
                stroke={box.color} strokeWidth={1.5}
                strokeDasharray={isEd ? "4 3" : undefined}
                style={{ pointerEvents: isEd ? "none" : "all", cursor: "move" }}
                onMouseDown={(e) => startMove(e, box)}
                onDoubleClick={(e) => { e.stopPropagation(); setEditingId(box.id); }}
              />
              {/* Text lines */}
              {!isEd && lines.map((line, i) => (
                <text key={i} x={0} y={-h / 2 + 9 + (i + 1) * lh - 2}
                  textAnchor="middle" fill={box.color} fontSize={box.fontSize} fontFamily={T.fontUi}
                  style={{ pointerEvents: "none", userSelect: "none" }}
                >{line || " "}</text>
              ))}
              {/* Rotate stem */}
              <line x1={0} y1={-h / 2} x2={0} y2={-h / 2 - HOFF}
                stroke={box.color} strokeWidth={1.5} strokeOpacity={0.55}
                style={{ pointerEvents: "none" }} />
              {/* Rotate handle */}
              <circle cx={0} cy={-h / 2 - HOFF} r={7}
                fill="white" stroke={box.color} strokeWidth={1.5}
                style={{ pointerEvents: "all", cursor: "grab" }}
                onMouseDown={(e) => startRotate(e, box)} />
              <text x={0} y={-h / 2 - HOFF + 4.5} textAnchor="middle"
                fontSize={10} fill={box.color}
                style={{ pointerEvents: "none", userSelect: "none" }}>↻</text>
              {/* Delete button */}
              <g onClick={(e) => removeBox(e, box.id)} style={{ pointerEvents: "all", cursor: "pointer" }}>
                <circle cx={w / 2 - 1} cy={-h / 2 + 1} r={8} fill="white" stroke={box.color} strokeWidth={1.2} />
                <text x={w / 2 - 1} y={-h / 2 + 5.5} textAnchor="middle"
                  fontSize={12} fontWeight="bold" fill={box.color}
                  style={{ userSelect: "none", pointerEvents: "none" }}>×</text>
              </g>
            </g>
          );
        })}
      </svg>

      {/* Inline textarea overlay */}
      {editingBox && (
        <div style={{
          position: "absolute", left: editingBox.x, top: editingBox.y, zIndex: 20,
          pointerEvents: "auto",
          transform: `translate(-50%,-50%) rotate(${editingBox.rotation}deg)`,
        }}>
          <textarea ref={editRef}
            value={editingBox.text}
            onChange={(e) => setBoxes((prev) => prev.map((b) => b.id === editingBox.id ? { ...b, text: e.target.value } : b))}
            onKeyDown={(e) => { if (e.key === "Escape") setEditingId(null); e.stopPropagation(); }}
            onBlur={() => setEditingId(null)}
            rows={Math.max(1, editingBox.text.split("\n").length)}
            style={{
              border: `2px solid ${editingBox.color}`, borderRadius: 5,
              padding: "6px 10px", fontSize: editingBox.fontSize,
              fontFamily: T.fontUi, color: editingBox.color,
              background: "white", resize: "both", minWidth: 80, minHeight: 30,
              outline: "none", boxShadow: `0 0 0 3px ${editingBox.color}33`, display: "block",
            }}
          />
        </div>
      )}
    </>
  );
}

// ─── APP ──────────────────────────────────────────────────────────────────────
const ChevronIcon = ({ dir }) => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path d={dir === "left" ? "M10 3L5 8L10 13" : "M6 3L11 8L6 13"} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export default function RheogrammeSimulateur({ onBack }) {
  useKatex();

  // ── Modèle & axes ──
  const [activeModel, setActiveModel] = useState("hb");
  const [overlays, setOverlays] = useState({ newton: true, puissance: true, bingham: true, hb: true });
  const [xAxis, setXAxis] = useState("gdot");
  const [yAxis, setYAxis] = useState("sigma");
  const [xLog, setXLog] = useState(false);
  const [yLog, setYLog] = useState(false);
  const [xMin, setXMin] = useState(0);
  const [xMax, setXMax] = useState(800);
  const [yMin, setYMin] = useState(0);
  const [yMax, setYMax] = useState(800);
  const [xTicks, setXTicks] = useState(6);
  const [yTicks, setYTicks] = useState(6);
  const [params, setParams] = useState(() => {
    const init = {};
    Object.entries(MODELS).forEach(([id, md]) => {
      init[id] = {};
      Object.entries(md.paramDefs).forEach(([pk, pd]) => { init[id][pk] = pd.default; });
    });
    return init;
  });

  // ── UI ──
  const [chartTall, setChartTall] = useState(false);
  const [panelOpen, setPanelOpen] = useState(true);
  const [tool, setTool] = useState("none"); // "none"|"draw"|"text"

  // ── Annotations ──
  // annotPoints : { xd, yd, slope, color, showTangent }
  // xd/yd = valeurs DONNÉES calculées depuis l'équation du modèle
  const [annotPoints, setAnnotPoints] = useState([]);
  const [drawings, setDrawings] = useState([]);
  const [texts, setTexts] = useState([]);
  const [drawColor, setDrawColor] = useState("#e11d48");
  const [drawStroke, setDrawStroke] = useState(2);
  const [textSize, setTextSize] = useState(14);

  // ── Boîtes de texte ──
  const [textBoxes, setTextBoxes] = useState([]);
  const [editingTextBoxId, setEditingTextBoxId] = useState(null);

  const isDrawing = useRef(false);
  const currentDraw = useRef([]);

  // ── Canvas size ──
  const chartWrapRef = useRef(null);
  const [canvasSize, setCanvasSize] = useState({ w: 800, h: 520 });
  const chartH = chartTall ? 720 : 520;

  useEffect(() => {
    if (!chartWrapRef.current) return;
    const obs = new ResizeObserver((entries) => {
      setCanvasSize({ w: entries[0].contentRect.width, h: chartH });
    });
    obs.observe(chartWrapRef.current);
    return () => obs.disconnect();
  }, [chartH]);
  useEffect(() => {
    if (chartWrapRef.current)
      setCanvasSize({ w: chartWrapRef.current.clientWidth, h: chartH });
  }, [chartH]);

  const m = MODELS[activeModel];
  const p = params[activeModel];
  const activeIds = Object.entries(overlays).filter(([, v]) => v).map(([k]) => k);
  const series = generateSeries(params, xAxis, yAxis, xLog, xMin, xMax, activeIds);
  const chartData = mergeData(series);

  const xDomain = xLog ? [Math.max(xMin, 1e-4), xMax] : [xMin, xMax];
  const yDomain = yLog ? [Math.max(yMin, 1e-4), yMax] : [yMin, yMax];
  const xInfo = AXIS_INFO[xAxis]; const yInfo = AXIS_INFO[yAxis];

  const handleParam = useCallback((id, pk, val) => {
    setParams((prev) => ({ ...prev, [id]: { ...prev[id], [pk]: val } }));
  }, []);
  const handleSelectModel = (id) => {
    setActiveModel(id);
    setOverlays((prev) => ({ ...prev, [id]: true }));
  };

  // ── Clic sur la courbe → dépose un point ──────────────────────────────────
  // Recharts onClick reçoit { activeLabel, activePayload, activeCoordinate, chartX, chartY }
  // On essaie plusieurs sources pour X pour être robuste selon la version de Recharts.
  const handleChartClick = useCallback((data) => {
    if (tool !== "none") return;
    if (!data) return;

    // Source 1 : activePayload (le plus fiable — contient {name, value, payload:{x,...}})
    let xd = null;
    if (data.activePayload?.length) {
      const payload = data.activePayload[0]?.payload;
      if (payload?.x != null) xd = +payload.x;
    }
    // Source 2 : activeLabel
    if (xd === null && data.activeLabel != null) xd = +data.activeLabel;
    // Source 3 : chartX → convertir en valeur données
    if (xd === null && data.chartX != null && chartWrapRef.current) {
      const svg = chartWrapRef.current.querySelector("svg");
      const grid = chartWrapRef.current.querySelector(".recharts-cartesian-grid");
      if (svg && grid) {
        const sr = svg.getBoundingClientRect();
        const gr = grid.getBoundingClientRect();
        const plotL = gr.left - sr.left;
        const plotR = gr.right - sr.left;
        const t = (data.chartX - plotL) / (plotR - plotL);
        xd = xLog
          ? Math.pow(10, Math.log10(Math.max(xMin, 1e-4)) + t * (Math.log10(xMax) - Math.log10(Math.max(xMin, 1e-4))))
          : xMin + t * (xMax - xMin);
      }
    }

    if (xd === null || !isFinite(xd) || xd < 0) return;
    xd = Math.max(xd, 1e-9);

    const r = m.compute(p, xd);
    const yd = yAxis === "sigma" ? r.sigma : r.eta_val;
    if (!isFinite(yd) || yd < 0) return;
    const slope = getSlope(activeModel, params, xAxis, yAxis, xd);
    setAnnotPoints((prev) => [...prev, { xd, yd, slope, color: drawColor, showTangent: false }]);
  }, [tool, activeModel, params, xAxis, yAxis, drawColor, m, p, xMin, xMax, xLog]);

  // ── Drag d'un point (depuis DragOverlay) ──────────────────────────────────
  const handleDragMove = useCallback((idx, newXd) => {
    const xd = Math.max(newXd, 1e-9);
    const r = m.compute(p, xd);
    const yd = yAxis === "sigma" ? r.sigma : r.eta_val;
    if (!isFinite(yd) || yd < 0) return;
    const slope = getSlope(activeModel, params, xAxis, yAxis, xd);
    setAnnotPoints((prev) => prev.map((pt, i) => i === idx ? { ...pt, xd, yd, slope } : pt));
  }, [m, p, yAxis, activeModel, params, xAxis]);

  // ── Canvas dessin libre ────────────────────────────────────────────────────
  const handleCanvasClick = (px, py) => {
    if (tool === "text") {
      const txt = window.prompt("Texte à ajouter :");
      if (txt) setTexts((prev) => [...prev, { x: px, y: py, text: txt, color: drawColor, fontSize: textSize }]);
    }
  };
  const handleCanvasMouseDown = (px, py) => {
    if (tool !== "draw") return;
    isDrawing.current = true;
    currentDraw.current = [{ x: px, y: py }];
  };
  const handleCanvasMouseMove = (px, py) => {
    if (tool !== "draw" || !isDrawing.current) return;
    currentDraw.current.push({ x: px, y: py });
    setDrawings((prev) => {
      const next = [...prev];
      const last = next[next.length - 1];
      if (last?.__live) next[next.length - 1] = { pts: [...currentDraw.current], color: drawColor, stroke: drawStroke, __live: true };
      else next.push({ pts: [...currentDraw.current], color: drawColor, stroke: drawStroke, __live: true });
      return next;
    });
  };
  const handleCanvasMouseUp = () => {
    if (!isDrawing.current) return;
    isDrawing.current = false;
    setDrawings((prev) => prev.map((d) => ({ ...d, __live: false })));
  };

  // ── Ajout d'une boîte de texte au clic ─────────────────────────────────────
  const handleAddTextBox = useCallback((e) => {
    const rect = chartWrapRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const newId = Date.now();
    setTextBoxes((prev) => [...prev, { id: newId, x, y, text: "Texte", rotation: 0, color: drawColor, fontSize: textSize }]);
    setEditingTextBoxId(newId);
    setTool("none");
  }, [drawColor, textSize]);

  // ── Actions points ─────────────────────────────────────────────────────────
  const toggleTangent = (idx) => setAnnotPoints((prev) => prev.map((pt, i) => i === idx ? { ...pt, showTangent: !pt.showTangent } : pt));
  const removePoint   = (idx) => setAnnotPoints((prev) => prev.filter((_, i) => i !== idx));

  // ── Export PNG ────────────────────────────────────────────────────────────
  const handleExport = () => {
    const scale = 3;
    const PAD = 24;
    const W = (canvasSize.w + PAD * 2) * scale; const H = (canvasSize.h + PAD * 2) * scale;
    const off = document.createElement("canvas"); off.width = W; off.height = H;
    const ctx = off.getContext("2d"); ctx.scale(scale, scale);
    ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, canvasSize.w + PAD * 2, canvasSize.h + PAD * 2);
    ctx.translate(PAD, PAD);
    const pL = YAXIS_W + MARGIN.left, pR = canvasSize.w - MARGIN.right;
    const pT = MARGIN.top, pB = canvasSize.h - MARGIN.bottom;
    const tPX = (v) => dataToPixel(v, xMin, xMax, pL, pR, xLog);
    const tPY = (v) => dataToPixel(v, yMin, yMax, pB, pT, yLog);
    const xTV = xLog ? [] : makeTicks(xMin, xMax, xTicks);
    const yTV = yLog ? [] : makeTicks(yMin, yMax, yTicks);
    ctx.strokeStyle = "#94a3b8"; ctx.lineWidth = 0.5; ctx.setLineDash([3, 3]);
    xTV.forEach((v) => { const px = tPX(v); ctx.beginPath(); ctx.moveTo(px, pT); ctx.lineTo(px, pB); ctx.stroke(); });
    yTV.forEach((v) => { const py = tPY(v); ctx.beginPath(); ctx.moveTo(pL, py); ctx.lineTo(pR, py); ctx.stroke(); });
    ctx.setLineDash([]);
    ctx.strokeStyle = "#334155"; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(pL, pT); ctx.lineTo(pL, pB); ctx.lineTo(pR, pB); ctx.stroke();
    ctx.fillStyle = "#334155"; ctx.font = "600 13px JetBrains Mono, monospace"; ctx.textAlign = "center";
    xTV.forEach((v) => { const px = tPX(v); ctx.beginPath(); ctx.moveTo(px, pB); ctx.lineTo(px, pB + 5); ctx.stroke(); ctx.fillText(fmtTick(v), px, pB + 18); });
    ctx.fillText(`${xInfo.name} (${xInfo.unit})`, (pL + pR) / 2, pB + 34);
    ctx.textAlign = "right";
    yTV.forEach((v) => { const py = tPY(v); ctx.beginPath(); ctx.moveTo(pL, py); ctx.lineTo(pL - 5, py); ctx.stroke(); ctx.fillText(fmtTick(v), pL - 8, py + 4); });
    ctx.save(); ctx.translate(14, (pT + pB) / 2); ctx.rotate(-Math.PI / 2); ctx.textAlign = "center"; ctx.font = "600 13px DM Sans, sans-serif"; ctx.fillText(`${yInfo.name} (${yInfo.unit})`, 0, 0); ctx.restore();
    activeIds.forEach((id) => {
      const mod = MODELS[id]; const pts = series[id] || [];
      if (pts.length < 2) return;
      ctx.beginPath(); ctx.strokeStyle = mod.color; ctx.lineWidth = id === activeModel ? 2.5 : 1.5;
      if (id !== activeModel) ctx.setLineDash([5, 3]);
      let first = true;
      pts.forEach(({ x, y }) => { const px = tPX(x); const py = tPY(y); if (px < pL || px > pR || py < pT || py > pB) { first = true; return; } if (first) { ctx.moveTo(px, py); first = false; } else ctx.lineTo(px, py); });
      ctx.stroke(); ctx.setLineDash([]);
    });
    annotPoints.forEach(({ xd, yd, color, showTangent, slope }) => {
      const cx = tPX(xd); const cy = tPY(yd);
      ctx.beginPath(); ctx.arc(cx, cy, 6, 0, Math.PI * 2); ctx.fillStyle = color; ctx.fill(); ctx.strokeStyle = "#fff"; ctx.lineWidth = 2; ctx.stroke();
      if (showTangent && slope !== null && isFinite(slope)) {
        const pxPerDataX = (pR - pL) / ((xMax - xMin) || 1);
        const pxPerDataY = (pB - pT) / ((yMax - yMin) || 1);
        const slopePx = -(slope * pxPerDataY / pxPerDataX);
        const norm = Math.sqrt(1 + slopePx * slopePx); const len = 120;
        const ux = len / norm; const uy = slopePx * ux;
        ctx.beginPath(); ctx.moveTo(cx - ux, cy - uy); ctx.lineTo(cx + ux, cy + uy);
        ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.setLineDash([7, 4]); ctx.stroke(); ctx.setLineDash([]);
        const ex = uy < 0 ? cx + ux : cx - ux; const ey = uy < 0 ? cy + uy : cy - uy;
        ctx.font = "bold 11px JetBrains Mono, monospace"; ctx.fillStyle = color; ctx.textAlign = "left"; ctx.fillText(`pente = ${slope.toPrecision(3)}`, ex + 6, ey - 6);
      }
      ctx.font = "11px JetBrains Mono, monospace"; ctx.fillStyle = color; ctx.textAlign = "left"; ctx.fillText(`(${Number(xd).toPrecision(3)}, ${Number(yd).toPrecision(3)})`, cx + 9, cy - 8);
    });
    drawings.forEach(({ pts, color, stroke }) => { if (pts.length < 2) return; ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y); pts.slice(1).forEach((pt) => ctx.lineTo(pt.x, pt.y)); ctx.strokeStyle = color; ctx.lineWidth = stroke; ctx.lineJoin = "round"; ctx.lineCap = "round"; ctx.stroke(); });
    texts.forEach(({ x, y, text, color, fontSize }) => { ctx.font = `${fontSize || 14}px DM Sans, sans-serif`; ctx.fillStyle = color; ctx.textAlign = "left"; ctx.fillText(text, x, y); });
    const url = off.toDataURL("image/png");
    const a = document.createElement("a"); a.href = url; a.download = "rheogramme.png"; a.click();
  };

  const readPts = [0.1, 1, 10, 50, 100, 200].map((g) => {
    const { sigma, eta_val } = m.compute(p, g);
    return { g, sigma, eta_val };
  });

  return (
    <div style={{ fontFamily: T.fontUi, background: T.bg, minHeight: "100vh" }}>
      {/* Header */}
      <div style={{ background: T.blue900, color: "#fff", padding: "14px 24px", display: "flex", alignItems: "center", gap: 12 }}>

        <div style={{ width: 34, height: 34, borderRadius: 8, background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.22)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17 }}>⚗</div>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700 }}>Simulateur de rhéogrammes</div>
          <div style={{ fontSize: 11, opacity: 0.6, marginTop: 1 }}>BTS Métiers de la Chimie — Module Rhéologie</div>
        </div>
      </div>

      <div style={{ display: "flex", minHeight: "calc(100vh - 62px)" }}>
        {/* Panneau gauche */}
        <div style={{ width: panelOpen ? 340 : 0, minWidth: panelOpen ? 340 : 0, transition: "width 0.22s ease, min-width 0.22s ease", overflow: "hidden", background: T.white, borderRight: `1px solid ${T.border}`, flexShrink: 0, position: "relative" }}>
          <button onClick={() => setPanelOpen(false)} title="Fermer" style={{ position: "absolute", top: 12, right: 8, zIndex: 10, width: 26, height: 26, borderRadius: 6, background: T.bg, border: `1px solid ${T.border}`, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: T.textMuted }}>
            <ChevronIcon dir="left" />
          </button>
          <div style={{ padding: 18, paddingTop: 44, width: 300, overflowY: "auto", height: "100%" }}>

            {/* Points déposés */}
            {annotPoints.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: T.textLight, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>Points déposés</div>
                <div style={{ fontSize: 10, color: T.textMuted, marginBottom: 8 }}>Glissez sur le graphe pour déplacer</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {annotPoints.map((pt, idx) => (
                    <div key={idx} style={{ background: T.bg, border: `1px solid ${pt.color}44`, borderRadius: 8, borderLeft: `3px solid ${pt.color}`, padding: "6px 10px" }}>
                      <div style={{ fontFamily: T.fontMono, fontSize: 11, color: T.textMid, marginBottom: 5 }}>
                        x = {Number(pt.xd).toPrecision(4)}&nbsp;·&nbsp;y = {Number(pt.yd).toPrecision(4)}
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                        <button onClick={() => toggleTangent(idx)} style={{ flex: 1, padding: "3px 0", border: `1px solid ${pt.showTangent ? pt.color : T.border}`, borderRadius: 5, background: pt.showTangent ? `${pt.color}15` : T.white, color: pt.showTangent ? pt.color : T.textMuted, fontSize: 11, fontWeight: pt.showTangent ? 600 : 400, cursor: "pointer" }}>
                          {pt.showTangent ? "✓ Tangente active" : "Afficher tangente"}
                        </button>
                        <button onClick={() => removePoint(idx)} style={{ width: 20, height: 20, borderRadius: "50%", border: `1px solid ${T.border}`, background: T.white, color: T.textLight, fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", padding: 0, flexShrink: 0 }}>×</button>
                      </div>
                      {pt.showTangent && pt.slope !== null && isFinite(pt.slope) && (
                        <div style={{ marginTop: 4, fontFamily: T.fontMono, fontSize: 10, color: pt.color }}>pente = {Number(pt.slope).toPrecision(4)}</div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Modèle actif */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: T.textLight, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>Modèle actif</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                {Object.values(MODELS).map((mod) => (
                  <button key={mod.id} onClick={() => handleSelectModel(mod.id)} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", border: `1px solid ${activeModel === mod.id ? mod.color : T.border}`, borderRadius: 8, background: activeModel === mod.id ? mod.colorLight : T.white, cursor: "pointer", textAlign: "left" }}>
                    <div style={{ width: 9, height: 9, borderRadius: "50%", background: mod.color, flexShrink: 0, outline: activeModel === mod.id ? `3px solid ${mod.colorMid}` : "none" }} />
                    <span style={{ fontSize: 13, fontWeight: activeModel === mod.id ? 600 : 400, color: activeModel === mod.id ? mod.color : T.textMid }}>{mod.name}</span>
                  </button>
                ))}
              </div>
            </div>

            <div style={{ background: m.colorLight, border: `1px solid ${m.colorMid}`, borderRadius: 10, padding: "12px 14px", marginBottom: 16 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: m.color, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>Équation</div>
              <Tex tex={m.formulaFull} block style={{ fontSize: 14 }} />
              <div style={{ borderTop: `1px solid ${m.colorMid}`, marginTop: 10, paddingTop: 8, fontSize: 11, color: T.textMuted, lineHeight: 1.55 }}>{m.note}</div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: T.textLight, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>Paramètres</div>
              {Object.entries(m.paramDefs).map(([pk, pd]) => <ParamSlider key={pk} modelId={activeModel} paramKey={pk} pd={pd} value={p[pk]} onChange={handleParam} />)}
            </div>

            <div style={{ background: T.bg, border: `1px solid ${T.border}`, borderRadius: 8, padding: "9px 12px", marginBottom: 16 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: T.textLight, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 5 }}>Exemples industriels</div>
              <div style={{ fontSize: 12, color: T.textMid, lineHeight: 1.6 }}>{m.examples}</div>
            </div>

            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: T.textLight, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>Superposer</div>
              {Object.values(MODELS).map((mod) => (
                <label key={mod.id} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 7, cursor: "pointer" }}>
                  <input type="checkbox" checked={!!overlays[mod.id]} onChange={(e) => { setOverlays((prev) => ({ ...prev, [mod.id]: e.target.checked })); if (e.target.checked) setActiveModel(mod.id); }} style={{ accentColor: mod.color, width: 14, height: 14 }} />
                  <div style={{ width: 22, height: 3, background: mod.color, borderRadius: 2, flexShrink: 0 }} />
                  <span style={{ fontSize: 12, color: T.textMid }}>{mod.name}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        {!panelOpen && (
          <button onClick={() => setPanelOpen(true)} title="Ouvrir" style={{ alignSelf: "flex-start", marginTop: 12, marginLeft: 8, width: 28, height: 28, borderRadius: 7, flexShrink: 0, background: T.white, border: `1px solid ${T.border}`, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: T.textMuted }}>
            <ChevronIcon dir="right" />
          </button>
        )}

        {/* Zone droite */}
        <div style={{ flex: 1, padding: 20, display: "flex", flexDirection: "column", gap: 14, minWidth: 0 }}>

          {/* Barre annotations */}
          <div style={{ background: T.white, border: `1px solid ${T.border}`, borderRadius: 10, padding: "10px 14px", display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: T.textLight, textTransform: "uppercase", letterSpacing: "0.07em" }}>Annotations</span>

            <SegBtn active={tool === "draw"} onClick={() => setTool(tool === "draw" ? "none" : "draw")} accentColor={T.purple600} accentBg={T.purple50}>✏ Dessin libre</SegBtn>
            <SegBtn active={tool === "textbox"} onClick={() => setTool(tool === "textbox" ? "none" : "textbox")} accentColor={T.orange600} accentBg={T.orange50}>Texte</SegBtn>
            <button onClick={() => { setAnnotPoints([]); setDrawings([]); setTexts([]); setTextBoxes([]); setEditingTextBoxId(null); }} style={{ padding: "5px 12px", border: `1px solid ${T.border}`, borderRadius: 6, background: T.white, color: T.textMuted, fontSize: 12, cursor: "pointer" }}>✕ Tout effacer</button>

            <div style={{ width: 1, height: 24, background: T.border }} />
            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <span style={{ fontSize: 11, color: T.textMuted }}>Couleur</span>
              <input type="color" value={drawColor} onChange={(e) => setDrawColor(e.target.value)} style={{ width: 28, height: 28, border: `1px solid ${T.border}`, borderRadius: 6, cursor: "pointer", padding: 2 }} />
            </div>
            {tool === "draw" && (
              <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <span style={{ fontSize: 11, color: T.textMuted }}>Épaisseur</span>
                <input type="range" min={1} max={8} value={drawStroke} onChange={(e) => setDrawStroke(+e.target.value)} style={{ width: 70, accentColor: drawColor }} />
                <span style={{ fontSize: 11, fontFamily: T.fontMono }}>{drawStroke}px</span>
              </div>
            )}
            {tool === "text" && (
              <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <span style={{ fontSize: 11, color: T.textMuted }}>Taille</span>
                <input type="range" min={10} max={32} value={textSize} onChange={(e) => setTextSize(+e.target.value)} style={{ width: 70, accentColor: drawColor }} />
                <span style={{ fontSize: 11, fontFamily: T.fontMono }}>{textSize}px</span>
              </div>
            )}
            <div style={{ marginLeft: "auto" }}>
              <button onClick={handleExport} style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 16px", border: `1px solid ${T.blue600}`, borderRadius: 7, background: T.blue50, color: T.blue600, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 2v7M4 6l3 3 3-3M2 10v1a1 1 0 001 1h8a1 1 0 001-1v-1" stroke={T.blue600} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                Exporter PNG (×3)
              </button>
            </div>
          </div>

          {/* Graphique */}
          <div style={{ background: T.white, border: `1px solid ${T.border}`, borderRadius: 12, padding: "16px 16px 6px 6px" }}>
            <div style={{ paddingLeft: 72, marginBottom: 3 }}>
              <Tex tex={yAxis === "sigma" ? "\\sigma\\ \\text{— Contrainte de cisaillement (Pa)}" : "\\eta\\ \\text{— Viscosité dynamique (Pa{\\cdot}s)}"} style={{ fontSize: 13, color: T.textMuted }} />
            </div>

            <div ref={chartWrapRef} style={{ position: "relative", width: "100%" }}>
              <ResponsiveContainer width="100%" height={chartH}>
                <LineChart data={chartData} margin={MARGIN}
                  onClick={handleChartClick}
                  style={{ cursor: tool === "none" ? "crosshair" : "default" }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke={T.borderDark} strokeOpacity={0.55} />
                  <XAxis dataKey="x" type="number" scale={xLog ? "log" : "linear"} domain={xDomain} allowDataOverflow
                    ticks={xLog ? undefined : makeTicks(xMin, xMax, xTicks)} tickFormatter={fmtTick}
                    tick={{ fontSize: 13, fontWeight: 600, fill: T.textMid, fontFamily: T.fontMono }}
                    label={{ value: `${xInfo.name} (${xInfo.unit})`, position: "insideBottom", offset: -22, fill: T.textMid, fontSize: 13, fontWeight: 600 }} includeHidden />
                  <YAxis scale={yLog ? "log" : "linear"} domain={yDomain} allowDataOverflow
                    ticks={yLog ? undefined : makeTicks(yMin, yMax, yTicks)} tickFormatter={fmtTick}
                    tick={{ fontSize: 13, fontWeight: 600, fill: T.textMid, fontFamily: T.fontMono }}
                    width={YAXIS_W} includeHidden />
                  <Tooltip content={<RheoTooltip xAxis={xAxis} yAxis={yAxis} />} />
                  {activeIds.map((id) => (
                    <Line key={id} type="monotone" dataKey={id}
                      stroke={MODELS[id].color}
                      strokeWidth={id === activeModel ? 2.5 : 1.5}
                      strokeDasharray={id === activeModel ? undefined : "5 3"}
                      dot={false}
                      activeDot={{ r: 6, strokeWidth: 2, stroke: "#fff" }}
                      connectNulls={false} isAnimationActive={false} />
                  ))}
                </LineChart>
              </ResponsiveContainer>

              {/* Canvas overlay : dessin libre + texte uniquement */}
              <CanvasOverlay
                width={canvasSize.w} height={canvasSize.h}
                xMin={xMin} xMax={xMax} yMin={yMin} yMax={yMax} xLog={xLog} yLog={yLog}
                tool={tool} drawings={drawings} texts={texts}
                onCanvasClick={handleCanvasClick}
                onMouseDown={handleCanvasMouseDown}
                onMouseMove={handleCanvasMouseMove}
                onMouseUp={handleCanvasMouseUp}
              />

              {/* SVG overlay : points annotés + tangentes + drag */}
              <SvgAnnotLayer
                wrapperRef={chartWrapRef}
                chartH={chartH}
                annotPoints={annotPoints}
                xMin={xMin} xMax={xMax} yMin={yMin} yMax={yMax}
                xLog={xLog} yLog={yLog}
                onDragMove={handleDragMove}
              />

              {/* Boîtes de texte : déplaçables, rotatives, éditables */}
              <TextBoxLayer
                boxes={textBoxes} setBoxes={setTextBoxes}
                editingId={editingTextBoxId} setEditingId={setEditingTextBoxId}
                chartH={chartH}
              />

              {/* Overlay de capture de clic pour créer un encadré */}
              {tool === "textbox" && (
                <div onClick={handleAddTextBox}
                  style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", cursor: "crosshair", zIndex: 50 }} />
              )}
            </div>

            {/* Légende */}
            <div style={{ display: "flex", alignItems: "center", gap: 18, paddingLeft: 70, paddingTop: 4, flexWrap: "wrap" }}>
              {activeIds.map((id) => (
                <div key={id} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <div style={{ width: 20, height: 3, borderRadius: 2, background: id === activeModel ? MODELS[id].color : `repeating-linear-gradient(90deg,${MODELS[id].color} 0 5px,transparent 5px 8px)` }} />
                  <span style={{ fontSize: 12, color: T.textMuted }}>{MODELS[id].name}</span>
                </div>
              ))}
              <div style={{ marginLeft: "auto" }}>
                <Tex tex={xAxis === "gdot" ? "\\dot{\\gamma}\\ \\text{— Gradient de vitesse (s}^{-1}\\text{)}" : "\\sigma\\ \\text{— Contrainte de cisaillement (Pa)}"} style={{ fontSize: 12, color: T.textMuted }} />
              </div>
            </div>

            {/* Bouton hauteur */}
            <div style={{ display: "flex", justifyContent: "center", paddingTop: 10, paddingBottom: 4 }}>
              <button onClick={() => setChartTall(!chartTall)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 18px", border: `1px solid ${T.borderMd}`, borderRadius: 7, background: chartTall ? T.blue50 : T.white, color: chartTall ? T.blue600 : T.textMuted, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  {chartTall
                    ? <><path d="M7 9L4 12M7 9L10 12M7 9V11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /><path d="M7 5L4 2M7 5L10 2M7 5V3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></>
                    : <><path d="M7 2L4 5M7 2L10 5M7 2V4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /><path d="M7 12L4 9M7 12L10 9M7 12V10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></>}
                </svg>
                {chartTall ? "Réduire la hauteur" : "Agrandir la hauteur"}
              </button>
            </div>
          </div>

          {/* Contrôles axes */}
          <AxisControls xAxis={xAxis} yAxis={yAxis} xLog={xLog} yLog={yLog} xMin={xMin} xMax={xMax} yMin={yMin} yMax={yMax} xTicks={xTicks} yTicks={yTicks}
            setXAxis={setXAxis} setYAxis={setYAxis} setXLog={setXLog} setYLog={setYLog}
            setXMin={setXMin} setXMax={setXMax} setYMin={setYMin} setYMax={setYMax}
            setXTicks={setXTicks} setYTicks={setYTicks} activeModel={activeModel} />

          {/* Tableau valeurs */}
          <div style={{ background: T.white, border: `1px solid ${T.border}`, borderRadius: 12, overflow: "hidden" }}>
            <div style={{ padding: "9px 16px", borderBottom: `1px solid ${T.border}`, display: "flex", alignItems: "center", gap: 10, background: m.colorLight }}>
              <div style={{ width: 7, height: 7, borderRadius: "50%", background: m.color }} />
              <span style={{ fontSize: 12, fontWeight: 600, color: m.color }}>{m.name} — valeurs calculées</span>
              <span style={{ marginLeft: "auto", fontSize: 11, color: T.textMuted, fontFamily: T.fontMono }}>{Object.entries(p).map(([k, v]) => `${k} = ${Number(v).toPrecision(3)}`).join("  ·  ")}</span>
            </div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                <thead><tr style={{ background: T.bg }}>{[{ tex: "\\dot{\\gamma}", unit: "s⁻¹" }, { tex: "\\sigma", unit: "Pa" }, { tex: "\\eta", unit: "Pa·s" }].map((h, i) => <th key={i} style={{ padding: "8px 18px", textAlign: "right", fontWeight: 600, borderBottom: `1px solid ${T.border}`, color: T.textMid }}><Tex tex={h.tex} /> <span style={{ color: T.textLight, fontWeight: 400 }}>({h.unit})</span></th>)}</tr></thead>
                <tbody>{readPts.map(({ g, sigma, eta_val }, i) => <tr key={i} style={{ borderBottom: `1px solid ${T.border}`, background: i % 2 === 0 ? T.white : T.bg }}><td style={{ padding: "7px 18px", textAlign: "right", fontFamily: T.fontMono, color: T.textMid }}>{g}</td><td style={{ padding: "7px 18px", textAlign: "right", fontFamily: T.fontMono, color: m.color, fontWeight: 500 }}>{isFinite(sigma) ? sigma.toPrecision(4) : "—"}</td><td style={{ padding: "7px 18px", textAlign: "right", fontFamily: T.fontMono, color: T.textMid }}>{isFinite(eta_val) && eta_val < 1e9 ? eta_val.toPrecision(4) : "∞  (σ ≤ σ₀)"}</td></tr>)}</tbody>
              </table>
            </div>
          </div>

          {/* Récap formules */}
          <div style={{ background: T.white, border: `1px solid ${T.border}`, borderRadius: 12, padding: 18 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: T.textLight, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 14 }}>Récapitulatif des modèles</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              {Object.values(MODELS).map((mod) => (
                <div key={mod.id} style={{ border: `1px solid ${mod.colorMid}`, borderRadius: 10, padding: "11px 13px", background: mod.colorLight, borderLeft: `4px solid ${mod.color}` }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: mod.color, marginBottom: 7 }}>{mod.name}</div>
                  <Tex tex={mod.formulaSigma} block style={{ fontSize: 13, marginBottom: 5 }} />
                  <Tex tex={mod.formulaEta} block style={{ fontSize: 11, color: T.textMuted }} />
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

