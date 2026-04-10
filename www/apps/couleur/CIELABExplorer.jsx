// CIELABExplorer v5 -- cleaned
import React, { useState, useRef, useCallback, useEffect } from "react";
import { ZoomIn, ZoomOut, Download, Eye, EyeOff, Grid3x3, RotateCcw, ChevronDown } from "lucide-react";

// --- Custom Tabs (shadcn-style) -----------------------------------------------
function Tabs({ value, onValueChange, children, className, style }) {
  return <div className={className} style={style}>{children}</div>;
}
function TabsList({ children, className, style }) {
  return (
    <div style={{ display: "flex", alignItems: "center", background: "#f4f4f5", borderRadius: 8, padding: "3px", gap: 2, ...style }} className={className}>
      {children}
    </div>
  );
}
function TabsTrigger({ value, children, className, activeValue, onValueChange }) {
  const active = value === activeValue;
  return (
    <button onClick={() => onValueChange(value)} style={{
      padding: "5px 14px", fontSize: 11, fontWeight: 700, border: "none", borderRadius: 6,
      cursor: "pointer", letterSpacing: ".05em", textTransform: "uppercase", whiteSpace: "nowrap",
      background: active ? "#ffffff" : "transparent",
      color: active ? "#18181b" : "#737373",
      boxShadow: active ? "0 1px 3px rgba(0,0,0,0.10)" : "none",
      transition: "all .15s",
    }} className={className}>{children}</button>
  );
}

const SelectCtx = React.createContext(null);

function Select({ value, onValueChange, children }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);
  return (
    <SelectCtx.Provider value={{ value, onValueChange, open, setOpen }}>
      <div ref={ref} style={{ position: "relative", flex: 1, minWidth: 0 }}>
        {children}
      </div>
    </SelectCtx.Provider>
  );
}
function SelectTrigger({ children, style }) {
  const { open, setOpen } = React.useContext(SelectCtx);
  return (
    <button onClick={() => setOpen(o => !o)} style={{
      width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "4px 8px", fontSize: 11, fontWeight: 600, cursor: "pointer",
      border: "1px solid #e4e4e7", borderRadius: 6, background: "#fff", color: "#18181b",
      boxShadow: "0 1px 2px rgba(0,0,0,0.06)", transition: "border-color .15s", ...style,
    }}>
      {children}
      <ChevronDown size={12} style={{ opacity: 0.5, flexShrink: 0, transform: open ? "rotate(180deg)" : "none", transition: "transform .15s" }} />
    </button>
  );
}
function SelectValue({ label }) {
  return <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{label}</span>;
}
function SelectContent({ children }) {
  const { open } = React.useContext(SelectCtx);
  if (!open) return null;
  return (
    <div style={{
      position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, zIndex: 9999,
      background: "#fff", border: "1px solid #e4e4e7", borderRadius: 8,
      boxShadow: "0 4px 12px rgba(0,0,0,0.12)", overflow: "hidden",
    }}>
      {children}
    </div>
  );
}
function SelectItem({ value, children }) {
  const { value: current, onValueChange, setOpen } = React.useContext(SelectCtx);
  const selected = value === current;
  return (
    <div
      onClick={() => { onValueChange(value); setOpen(false); }}
      style={{
        padding: "7px 10px", fontSize: 11, fontWeight: selected ? 600 : 400, cursor: "pointer",
        background: selected ? "#f4f4f5" : "transparent", color: "#18181b",
      }}
      onMouseEnter={e => { if (!selected) e.currentTarget.style.background = "#fafafa"; }}
      onMouseLeave={e => { e.currentTarget.style.background = selected ? "#f4f4f5" : "transparent"; }}
    >{children}</div>
  );
}

// --- CSS variables ------------------------------------------------------------
const CSS_VARS = `
  :root {
    --color-background-primary:   #ffffff;
    --color-background-secondary: #f4f4f5;
    --color-text-primary:         #18181b;
    --color-text-secondary:       #525252;
    --color-border-secondary:     #e4e4e7;
    --color-border-tertiary:      #f5f5f5;
    --font-sans: -apple-system, BlinkMacSystemFont, "Inter", "Segoe UI", sans-serif;
    --shadow-sm: 0 1px 3px 0 rgba(0,0,0,0.10), 0 1px 2px -1px rgba(0,0,0,0.10);
  }
  .cielab-tb-btn {
    width: 26px; height: 26px; border-radius: 6px;
    border: 1px solid #e4e4e7; background: #fff; color: #525252;
    cursor: pointer; display: flex; align-items: center; justify-content: center;
    padding: 0; transition: background 0.15s, color 0.15s, border-color 0.15s;
    box-shadow: 0 1px 3px 0 rgba(0,0,0,0.08);
  }
  .cielab-tb-btn:hover:not(:disabled) { background: #f4f4f5; border-color: #d4d4d8; }
  .cielab-tb-btn:disabled { opacity: 0.3; cursor: default; box-shadow: none; }
  .cielab-tb-btn.active-clr   { background: #b03020; color: #fff; border-color: #b03020; }
  .cielab-tb-btn.active-grid  { background: #185FA5; color: #fff; border-color: #185FA5; }
  .cielab-tb-btn.active-panel { background: #534AB7; color: #fff; border-color: #534AB7; }
  .cielab-card {
    background: #fff; border: 1px solid #e4e4e7; border-radius: 10px;
    box-shadow: 0 1px 3px 0 rgba(0,0,0,0.08);
  }
  .cielab-export-btn {
    display: flex; align-items: center; gap: 5px;
    font-size: 10px; font-weight: 700; padding: 5px 11px; cursor: pointer;
    border: 1px solid #e4e4e7; background: #fff; color: #18181b;
    border-radius: 6px; letter-spacing: .05em;
    box-shadow: 0 1px 3px 0 rgba(0,0,0,0.08); transition: background 0.15s;
  }
  .cielab-export-btn:hover { background: #f4f4f5; }
  @keyframes fadein { from { opacity: 0; transform: translateX(-50%) translateY(4px); } to { opacity: 1; transform: translateX(-50%) translateY(0); } }
`;

function CSSInjector() {
  useEffect(() => {
    const el = document.createElement("style");
    el.id = "cielab-vars";
    el.textContent = CSS_VARS;
    if (!document.getElementById("cielab-vars")) document.head.appendChild(el);
    return () => { const e = document.getElementById("cielab-vars"); if (e) e.remove(); };
  }, []);
  return null;
}


function labToXYZ(L, a, b) {
  const fy = (L + 16) / 116, fx = a / 500 + fy, fz = fy - b / 200;
  const Xn = 95.047, Yn = 100, Zn = 108.883, kap = 903.3;
  const X = fx ** 3 > 0.008856 ? fx ** 3 : (116 * fx - 16) / kap;
  const Y = L > kap * 0.008856 ? ((L + 16) / 116) ** 3 : L / kap;
  const Z = fz ** 3 > 0.008856 ? fz ** 3 : (116 * fz - 16) / kap;
  return [X * Xn, Y * Yn, Z * Zn];
}
function xyzToRgb(X, Y, Z) {
  X /= 100; Y /= 100; Z /= 100;
  let r = X * 3.2406 + Y * -1.5372 + Z * -0.4986;
  let g = X * -0.9689 + Y * 1.8758 + Z * 0.0415;
  let bv = X * 0.0557 + Y * -0.2040 + Z * 1.057;
  const gc = v => v > 0.0031308 ? 1.055 * v ** (1 / 2.4) - 0.055 : 12.92 * v;
  return [Math.round(Math.min(255, Math.max(0, gc(r) * 255))),
          Math.round(Math.min(255, Math.max(0, gc(g) * 255))),
          Math.round(Math.min(255, Math.max(0, gc(bv) * 255)))];
}
function labToHex(L, a, b) {
  const [r, g, bv] = xyzToRgb(...labToXYZ(L, a, b));
  return "#" + [r, g, bv].map(v => v.toString(16).padStart(2, "0")).join("");
}
function dE(L1, a1, b1, L2, a2, b2) {
  return Math.sqrt((L2 - L1) ** 2 + (a2 - a1) ** 2 + (b2 - b1) ** 2);
}
function interpDE(de) {
  if (de < 1)   return { label: "Imperceptible",           color: "#1D9E75" };
  if (de < 2)   return { label: "Perceptible par expert",  color: "#639922" };
  if (de < 3.5) return { label: "Perceptible à l'œil nu", color: "#EF9F27" };
  if (de < 5)   return { label: "Différence nette",        color: "#D85A30" };
  return         { label: "Très importante",                color: "#E24B4A" };
}
function hueName(h, C) {
  if (C < 8) return "Neutre";
  h = ((h % 360) + 360) % 360;
  if (h < 30) return "Rouge"; if (h < 60) return "Orange";
  if (h < 80) return "Jaune-orange"; if (h < 105) return "Jaune";
  if (h < 135) return "Jaune-vert"; if (h < 165) return "Vert";
  if (h < 195) return "Cyan-vert"; if (h < 225) return "Cyan";
  if (h < 255) return "Bleu"; if (h < 285) return "Bleu-violet";
  if (h < 315) return "Violet"; return "Rouge-violet";
}

const PCOLS  = ["#e74c3c","#3498db","#2ecc71","#f39c12","#9b59b6","#1abc9c","#e67e22","#e91e63"];
const PLBLS  = ["1","2","3","4","5","6","7","8"];
const SIZE   = 520;
const CX     = SIZE / 2, CY = SIZE / 2;
const ARANGE = 100; // axis always ±100

// --- Stepper button with hover tooltip ---------------------------------------
function HintBtn({ children, onClick, style, hint, hintColor }) {
  const [show, setShow] = useState(false);
  return (
    <div style={{ position: "relative", display: "inline-flex" }}>
      {show && (
        <div style={{
          position: "absolute", bottom: "calc(100% + 4px)", left: "50%",
          transform: "translateX(-50%)",
          background: hintColor, color: "#fff",
          fontSize: 8, fontWeight: 700, padding: "2px 5px",
          borderRadius: 4, whiteSpace: "nowrap", pointerEvents: "none", zIndex: 200,
        }}>{hint}</div>
      )}
      <button style={style} onClick={onClick}
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}>
        {children}
      </button>
    </div>
  );
}

// --- Point popup -------------------------------------------------------------
function PointPopup({ point, idx, allPoints, pairA, pairB, showDelta, onClose, onDelete, onChange, initialX, initialY }) {
  const C = Math.sqrt(point.a ** 2 + point.b ** 2);
  const h = (((Math.atan2(point.b, point.a) * 180 / Math.PI) + 360) % 360);

  const isStandard    = point.id === pairA;
  const isEchantillon = point.id === pairB;
  const otherPoint    = isStandard    ? allPoints?.find(p => p.id === pairB)
                      : isEchantillon ? allPoints?.find(p => p.id === pairA)
                      : null;
  const de     = otherPoint ? dE(point.L, point.a, point.b, otherPoint.L, otherPoint.a, otherPoint.b) : null;
  const deInfo = de !== null ? interpDE(de) : null;

  const popupRef = useRef(null);

  // Fixed position on screen -- starts at initialX/Y, user can drag
  const [pos, setPos] = useState({ x: initialX ?? window.innerWidth / 2 - 140, y: initialY ?? window.innerHeight - 200 });
  const dragState = useRef(null);

  useEffect(() => {
    // Update position if initialX/Y change (new popup opened)
    if (initialX != null && initialY != null) {
      setPos({ x: initialX, y: initialY });
    }
  }, [initialX, initialY]);

  const onDragStart = (e) => {
    if (e.target.tagName === "BUTTON" || e.target.tagName === "INPUT") return;
    dragState.current = { startMouseX: e.clientX, startMouseY: e.clientY, startPosX: pos.x, startPosY: pos.y };
    e.preventDefault();
    e.stopPropagation();
  };

  useEffect(() => {
    const onMove = (e) => {
      if (!dragState.current) return;
      setPos({
        x: dragState.current.startPosX + e.clientX - dragState.current.startMouseX,
        y: dragState.current.startPosY + e.clientY - dragState.current.startMouseY,
      });
    };
    const onUp = () => { dragState.current = null; };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
  }, []);

  const [confirmDelete, setConfirmDelete] = useState(false);
  const hex = labToHex(point.L, point.a, point.b);
  const PW = 280;

  const content = (
    <div ref={popupRef} data-popup={`pt-${idx}`} style={{
      position: "fixed",
      left: pos.x,
      top: pos.y,
      width: PW,
      background: "rgba(255,255,255,0.97)",
      border: "1px solid rgba(0,0,0,0.12)",
      borderRadius: 12,
      boxShadow: "0 8px 28px rgba(0,0,0,0.22)",
      padding: "8px 10px 9px",
      zIndex: 9999,
      backdropFilter: "blur(8px)",
      fontSize: 11,
    }}>

      {/* Header row: swatch + name + badge + drag zone + close */}
      <div onMouseDown={onDragStart} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6, cursor: "grab", userSelect: "none" }}>
        <div style={{ width: 16, height: 16, borderRadius: 4, background: hex, border: "1.5px solid rgba(0,0,0,0.15)", flexShrink: 0 }} />
        <input
          value={point.name || ""}
          placeholder={`Point ${idx + 1}`}
          onChange={e => onChange({ ...point, name: e.target.value })}
          onMouseDown={e => e.stopPropagation()}
          style={{ flex: 1, fontSize: 10, fontWeight: 600, border: "none", background: "transparent", outline: "none", color: "var(--color-text-primary)", minWidth: 0, cursor: "text" }}
        />
        {(isStandard || isEchantillon) && showDelta && (
          <span style={{
            fontSize: 7, fontWeight: 800, padding: "1px 4px", borderRadius: 3, flexShrink: 0,
            background: isStandard ? "rgba(24,95,165,0.12)" : "rgba(30,158,117,0.12)",
            color: isStandard ? "#185FA5" : "#1D9E75",
            border: `0.5px solid ${isStandard ? "#185FA5" : "#1D9E75"}44`,
          }}>
            {isStandard ? "STD" : "ÉCH"}
          </span>
        )}
        {/* Drag handle zone */}
        <div style={{ flexShrink: 0, display: "flex", alignItems: "center", gap: 2, opacity: 0.3, cursor: "grab" }}>
          {[0,1].map(i => (
            <div key={i} style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              {[0,1,2].map(j => <div key={j} style={{ width: 3, height: 3, borderRadius: "50%", background: "#555" }} />)}
            </div>
          ))}
        </div>
        <button onClick={onClose} onMouseDown={e => e.stopPropagation()} style={{
          width: 15, height: 15, borderRadius: "50%", border: "none",
          background: "rgba(0,0,0,0.08)", color: "#666", cursor: "pointer",
          fontSize: 10, lineHeight: 1, display: "flex", alignItems: "center", justifyContent: "center",
          flexShrink: 0, padding: 0,
        }}>×</button>
      </div>

      {/* Steppers row: L* a* b* in a single horizontal line */}
      <div style={{ display: "flex", gap: 6, marginBottom: 5, alignItems: "center" }}>
        {[
          { label: "L*", color: "#888",    value: point.L, min: 0,    max: 100,
            minHint: "+ Sombre", minHintColor: "#555", maxHint: "+ Clair", maxHintColor: "#aaa",
            onSet: v => onChange({ ...point, L: Math.round(v * 10) / 10 }) },
          { label: "a*", color: "#c0392b", value: point.a, min: -100, max: 100,
            minHint: "+ Vert", minHintColor: "#1a7a1a", maxHint: "+ Rouge", maxHintColor: "#c0392b",
            onSet: v => onChange({ ...point, a: Math.round(v * 10) / 10 }) },
          { label: "b*", color: "#e6ac00", value: point.b, min: -100, max: 100,
            minHint: "+ Bleu", minHintColor: "#185FA5", maxHint: "+ Jaune", maxHintColor: "#b8860b",
            onSet: v => onChange({ ...point, b: Math.round(v * 10) / 10 }) },
        ].map(({ label, color, value, min, max, minHint, minHintColor, maxHint, maxHintColor, onSet }) => {
          const stepBtn = { width: 18, height: 18, borderRadius: 4, border: `1px solid ${color}33`, background: `${color}11`, color, cursor: "pointer", fontSize: 13, fontWeight: 700, lineHeight: 1, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, padding: 0, userSelect: "none" };
          return (
            <div key={label} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
              <span style={{ fontSize: 7, fontWeight: 700, color }}>{label}</span>
              <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
                <HintBtn style={stepBtn} hint={minHint} hintColor={minHintColor || color}
                  onClick={() => onSet(Math.max(min, Math.round((value - 0.1) * 10) / 10))}>−</HintBtn>
                <span style={{ fontSize: 9, fontWeight: 700, fontFamily: "monospace", color, minWidth: 32, textAlign: "center" }}>{(Math.round(value * 10) / 10).toFixed(1)}</span>
                <HintBtn style={stepBtn} hint={maxHint} hintColor={maxHintColor || color}
                  onClick={() => onSet(Math.min(max, Math.round((value + 0.1) * 10) / 10))}>+</HintBtn>
              </div>
            </div>
          );
        })}
      </div>

      {/* C* h° + ΔE row */}
      <div style={{ display: "flex", gap: 5, marginBottom: 6 }}>
        {/* C* and h° badges */}
        {[["C*", C.toFixed(1), "#1D9E75"], ["h°", h.toFixed(1) + "°", "#185FA5"]].map(([label, value, color]) => (
          <div key={label} style={{ flex: 1, background: "var(--color-background-secondary)", borderRadius: 5, padding: "3px 5px", textAlign: "center" }}>
            <div style={{ fontSize: 7, color: "var(--color-text-secondary)" }}>{label}</div>
            <div style={{ fontSize: 10, fontWeight: 700, fontFamily: "monospace", color }}>{value}</div>
          </div>
        ))}
        {/* ΔE inline if applicable */}
        {showDelta && de !== null && otherPoint && (
          <div style={{
            flex: 2, padding: "3px 6px", borderRadius: 5,
            background: `${deInfo.color}10`, border: `0.5px solid ${deInfo.color}44`,
            display: "flex", alignItems: "center", justifyContent: "space-between",
          }}>
            <div>
              <div style={{ fontSize: 7, fontWeight: 700, color: "var(--color-text-secondary)" }}>ΔE*₇₆ {isStandard ? "-> Éch." : "-> Std."}</div>
              <div style={{ fontSize: 7, color: "var(--color-text-secondary)" }}>{otherPoint.name || `Pt ${allPoints.indexOf(otherPoint) + 1}`}</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 16, fontWeight: 800, fontFamily: "monospace", color: deInfo.color, lineHeight: 1 }}>{de.toFixed(2)}</div>
              <div style={{ fontSize: 7, color: deInfo.color, fontWeight: 600 }}>{deInfo.label}</div>
            </div>
          </div>
        )}
      </div>

      {/* Delete with confirm */}
      {confirmDelete ? (
        <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
          <span style={{ fontSize: 9, color: "#c0392b", fontWeight: 600, flex: 1 }}>Supprimer ce point ?</span>
          <button onClick={e => { e.stopPropagation(); setConfirmDelete(false); }} style={{
            padding: "3px 10px", cursor: "pointer", borderRadius: 5, border: "1px solid #e4e4e7",
            background: "#f4f4f5", color: "#555", fontSize: 9, fontWeight: 700,
          }}>Non</button>
          <button onClick={e => { e.stopPropagation(); onDelete(); }} style={{
            padding: "3px 10px", cursor: "pointer", borderRadius: 5, border: "1px solid rgba(220,50,40,0.4)",
            background: "#c0392b", color: "#fff", fontSize: 9, fontWeight: 700,
          }}>Oui</button>
        </div>
      ) : (
        <button onClick={e => { e.stopPropagation(); setConfirmDelete(true); }} style={{
          width: "100%", padding: "3px 0", cursor: "pointer",
          border: "1px solid rgba(220,50,40,0.25)", borderRadius: 5,
          background: "rgba(220,50,40,0.05)", color: "#c0392b",
          fontSize: 9, fontWeight: 700, letterSpacing: ".04em",
        }}>
          🗑 Supprimer
        </button>
      )}
    </div>
  );
  return content;
}

// --- Disc canvas -------------------------------------------------------------
function AbDisc({ L, points, setPoints, zoom, setZoom, showColor, showGrid, Lval, coordMode, exportRef, pairLine = null, pairA = null, pairB = null, showDelta = false, showEllipse = false, ellipseDE = 1, ellipseFormula = "76", ellipseCmcL = 1, ellipseCmcC = 1}) {
  const colRef    = useRef(null);
  const ovRef     = useRef(null);
  const discContainerRef = useRef(null);
  // drag state: { kind: "point"|"pan", idx?, startPx, startPy, startPanA, startPanB }
  const drag      = useRef(null);
  const didMove   = useRef(false);
  const lastWh    = useRef(0);
  const pinch     = useRef(null);   // { dist0, zoom0 } for pinch-to-zoom
  // pan offset in LAB units (how much the view center is shifted)
  const [pan, setPan] = useState({ a: 0, b: 0 });
  // popup state: null | { idx }
  const [popup, setPopup] = useState(null);
  // hover hint: null | { x, y, kind: "point"|"empty", idx? }
  const [hoverHint, setHoverHint] = useState(null);
  // track dragging for hint visibility
  const [isDragging, setIsDragging] = useState(false);

  // Close popup when clicking anywhere outside it
  useEffect(() => {
    if (popup === null) return;
    const handler = (e) => {
      if (!e.target.closest('[data-popup]')) setPopup(null);
    };
    // delay so the same click that opened it doesn't close it
    const tid = setTimeout(() => document.addEventListener("pointerdown", handler), 100);
    return () => { clearTimeout(tid); document.removeEventListener("pointerdown", handler); };
  }, [popup]);

  const visRange = ARANGE / zoom; // LAB units visible from center to edge

  // LAB -> canvas pixel  (pan shifts the origin)
  const l2p = useCallback((a, b) => ({
    x: CX + ((a - pan.a) / visRange) * (SIZE / 2),
    y: CY - ((b - pan.b) / visRange) * (SIZE / 2),
  }), [visRange, pan]);

  // canvas pixel -> LAB  (pan shifts origin back)
  const p2l = useCallback((px, py) => {
    const a = ((px - CX) / (SIZE / 2)) * visRange + pan.a;
    const b = -((py - CY) / (SIZE / 2)) * visRange + pan.b;
    return [Math.round(a), Math.round(b)];
  }, [visRange, pan]);

  // pixel delta -> LAB delta
  const dp2dl = useCallback((dpx, dpy) => ({
    da: (dpx / (SIZE / 2)) * visRange,
    db: -(dpy / (SIZE / 2)) * visRange,
  }), [visRange]);

  const clampPt = (a, b) => {
    const d = Math.sqrt(a * a + b * b);
    if (d > ARANGE) return [Math.round(a / d * ARANGE), Math.round(b / d * ARANGE)];
    return [Math.round(a), Math.round(b)];
  };

  // -- Color fill --------------------------------------------------------------
  useEffect(() => {
    const cv = colRef.current; if (!cv) return;
    const ctx = cv.getContext("2d");
    if (!showColor) { ctx.clearRect(0, 0, SIZE, SIZE); return; }
    const img = ctx.createImageData(SIZE, SIZE);
    const d = img.data;
    const R2 = (SIZE / 2 - 1) ** 2;
    for (let py = 0; py < SIZE; py++) {
      for (let px = 0; px < SIZE; px++) {
        const dx = px - CX, dy = py - CY;
        const idx = (py * SIZE + px) * 4;
        if (dx * dx + dy * dy <= R2) {
          // color at screen pixel = LAB coord accounting for pan
          const a = (dx / (SIZE / 2)) * visRange + pan.a;
          const b = -(dy / (SIZE / 2)) * visRange + pan.b;
          const [r, g, bv] = xyzToRgb(...labToXYZ(L, a, b));
          d[idx] = r; d[idx+1] = g; d[idx+2] = bv; d[idx+3] = 255;
        } else { d[idx+3] = 0; }
      }
    }
    ctx.putImageData(img, 0, 0);
  }, [L, zoom, showColor, visRange, pan]);

  // -- Overlay: grid + axes + labels + points ---------------------------------
  useEffect(() => {
    const cv = ovRef.current; if (!cv) return;
    const ctx = cv.getContext("2d");
    ctx.clearRect(0, 0, SIZE, SIZE);
    const R = SIZE / 2 - 1;

    // helper: LAB value v -> canvas x (for a* axis) accounting for pan
    const vToX = v => CX + ((v - pan.a) / visRange) * (SIZE / 2);
    // LAB value v -> canvas y (for b* axis) accounting for pan
    const vToY = v => CY - ((v - pan.b) / visRange) * (SIZE / 2);

    // -- Grid (clipped to disc) ---------------------------------------------
    ctx.save();
    ctx.beginPath(); ctx.arc(CX, CY, R, 0, Math.PI * 2); ctx.clip();

    if (showGrid) {
      const lo  = Math.floor((pan.a - visRange) / 5) * 5 - 5;
      const hi  = Math.ceil((pan.a + visRange)  / 5) * 5 + 5;
      const loB = Math.floor((pan.b - visRange) / 5) * 5 - 5;
      const hiB = Math.ceil((pan.b + visRange)  / 5) * 5 + 5;

      for (let v = lo; v <= hi; v += 5) {
        const major = v % 10 === 0;
        const px = vToX(v);
        if (px < -10 || px > SIZE + 10) continue;
        const col_ = showColor
          ? (major ? "rgba(0,0,0,0.28)" : "rgba(0,0,0,0.09)")
          : (major ? "rgba(70,70,70,0.55)" : "rgba(120,120,120,0.2)");
        ctx.beginPath(); ctx.moveTo(px, 0); ctx.lineTo(px, SIZE);
        ctx.strokeStyle = col_; ctx.lineWidth = major ? 0.9 : 0.45; ctx.stroke();
      }
      for (let v = loB; v <= hiB; v += 5) {
        const major = v % 10 === 0;
        const py = vToY(v);
        if (py < -10 || py > SIZE + 10) continue;
        const col_ = showColor
          ? (major ? "rgba(0,0,0,0.28)" : "rgba(0,0,0,0.09)")
          : (major ? "rgba(70,70,70,0.55)" : "rgba(120,120,120,0.2)");
        ctx.beginPath(); ctx.moveTo(0, py); ctx.lineTo(SIZE, py);
        ctx.strokeStyle = col_; ctx.lineWidth = major ? 0.9 : 0.45; ctx.stroke();
      }
    }

    // Main axes (zero lines) -- always visible but clamped to central zone of disc
    // "central zone": axes never go closer than 15% of SIZE from the disc edge
    const axisX    = vToX(0);
    const axisY    = vToY(0);
    const NEAR     = SIZE * 0.15;   // min distance from edge
    const FAR      = SIZE * 0.85;   // max distance from edge
    const clampedX = Math.min(Math.max(axisX, NEAR), FAR);
    const clampedY = Math.min(Math.max(axisY, NEAR), FAR);
    const axisInX  = axisX >= 0 && axisX <= SIZE;
    const axisInY  = axisY >= 0 && axisY <= SIZE;

    ctx.save();
    ctx.beginPath(); ctx.arc(CX, CY, R, 0, Math.PI * 2); ctx.clip();

    ctx.lineWidth = 2;
    ctx.setLineDash([]);
    ctx.strokeStyle = "rgba(0,0,0,0.85)";

    // Vertical axis
    ctx.beginPath();
    ctx.moveTo(axisInX ? axisX : clampedX, 0);
    ctx.lineTo(axisInX ? axisX : clampedX, SIZE);
    ctx.stroke();

    // Horizontal axis
    ctx.beginPath();
    ctx.moveTo(0,    axisInY ? axisY : clampedY);
    ctx.lineTo(SIZE, axisInY ? axisY : clampedY);
    ctx.stroke();

    // Dot at true 0,0 when in view
    if (axisInX && axisInY) {
      ctx.fillStyle = "rgba(0,0,0,0.9)";
      ctx.beginPath(); ctx.arc(axisX, axisY, 3.5, 0, Math.PI * 2); ctx.fill();
    }

    // -- Reticule at screen centre (CX, CY) -- always visible --------------
    const RET = 14;  // half-length of reticule arms
    const GAP = 4;   // gap around centre dot
    ctx.strokeStyle = "rgba(0,0,0,0.60)";
    ctx.lineWidth = 1.5;
    ctx.setLineDash([]);
    // Horizontal arms
    ctx.beginPath(); ctx.moveTo(CX - RET, CY); ctx.lineTo(CX - GAP, CY); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(CX + GAP, CY); ctx.lineTo(CX + RET, CY); ctx.stroke();
    // Vertical arms
    ctx.beginPath(); ctx.moveTo(CX, CY - RET); ctx.lineTo(CX, CY - GAP); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(CX, CY + GAP); ctx.lineTo(CX, CY + RET); ctx.stroke();
    // Small circle at reticule centre
    ctx.beginPath(); ctx.arc(CX, CY, GAP - 0.5, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(0,0,0,0.50)"; ctx.lineWidth = 1; ctx.stroke();

    ctx.restore();

    // -- Tick labels (no background -- direct text with shadow for readability) -
    if (showGrid) {
      ctx.font = "900 12px sans-serif"; // maximum weight
      ctx.textBaseline = "middle";
      const txtCol    = showColor ? "rgba(0,0,0,0.92)" : "rgba(20,20,20,0.98)";
      const shadowCol = showColor ? "rgba(255,255,255,0.7)" : "rgba(255,255,255,0.5)";

      const loA  = Math.floor((pan.a - visRange) / 10) * 10;
      const hiA  = Math.ceil((pan.a + visRange)  / 10) * 10;
      const loB2 = Math.floor((pan.b - visRange) / 10) * 10;
      const hiB2 = Math.ceil((pan.b + visRange)  / 10) * 10;

      // a* labels sit just below the horizontal axis, clamped to disc
      const labelY = Math.min(Math.max(clampedY + 8, 10), SIZE - 14);
      for (let v = loA; v <= hiA; v += 10) {
        if (v === 0) continue;
        const px = vToX(v);
        if (px < 14 || px > SIZE - 14) continue;
        ctx.textAlign = "center";
        ctx.shadowColor = shadowCol; ctx.shadowBlur = 3;
        ctx.fillStyle = txtCol;
        ctx.fillText(String(v), px, labelY);
        ctx.shadowBlur = 0;
      }

      // b* labels sit just right of the vertical axis, clamped to disc
      const labelX = Math.min(Math.max(clampedX + 5, 5), SIZE - 30);
      for (let v = loB2; v <= hiB2; v += 10) {
        if (v === 0) continue;
        const py = vToY(v);
        if (py < 14 || py > SIZE - 14) continue;
        ctx.textAlign = "left";
        ctx.shadowColor = shadowCol; ctx.shadowBlur = 3;
        ctx.fillStyle = txtCol;
        ctx.fillText(String(v), labelX, py);
        ctx.shadowBlur = 0;
      }
    }

    // Axis name labels -- white pill background, 4px padding, border-radius = height/2 (≈1em)
    ctx.shadowBlur = 0;
    ctx.font = "900 13px sans-serif";

    const drawAxisLabel = (text, x, y, textAlign, textBaseline, textColor) => {
      ctx.font = "900 13px sans-serif";
      ctx.textAlign = textAlign;
      ctx.textBaseline = textBaseline;
      const tw = ctx.measureText(text).width;
      const PAD = 4;
      const H = 18; // pill height
      const R = H / 2; // border-radius = 1em ≈ half height for pill

      // Compute pill rect top-left based on alignment
      let rx, ry;
      if (textAlign === "right")  rx = x - tw - PAD;
      else if (textAlign === "left") rx = x - PAD;
      else rx = x - tw / 2 - PAD; // center

      if (textBaseline === "bottom") ry = y - H;
      else if (textBaseline === "top") ry = y;
      else ry = y - H / 2;

      const rw = tw + PAD * 2;

      // White pill
      ctx.fillStyle = "rgba(255,255,255,0.92)";
      ctx.beginPath();
      ctx.moveTo(rx + R, ry);
      ctx.lineTo(rx + rw - R, ry);
      ctx.arcTo(rx + rw, ry, rx + rw, ry + H, R);
      ctx.lineTo(rx + rw, ry + R);
      ctx.arcTo(rx + rw, ry + H, rx + rw - R, ry + H, R);
      ctx.lineTo(rx + R, ry + H);
      ctx.arcTo(rx, ry + H, rx, ry + H - R, R);
      ctx.lineTo(rx, ry + R);
      ctx.arcTo(rx, ry, rx + R, ry, R);
      ctx.closePath();
      ctx.fill();

      // Text on top
      ctx.fillStyle = textColor;
      // vertically centre text in pill
      const textY = ry + H / 2;
      const prevBaseline = ctx.textBaseline;
      ctx.textBaseline = "middle";
      ctx.fillText(text, x, textY);
      ctx.textBaseline = prevBaseline;
    };

    drawAxisLabel("+a* Rouge", SIZE - 8,  CY - 10, "right",  "bottom", "rgba(185,30,30,1)");
    drawAxisLabel("−a* Vert",  8,          CY - 10, "left",   "bottom", "rgba(20,110,20,1)");
    drawAxisLabel("+b* Jaune", CX,         8,        "center", "top",    "rgba(140,100,0,1)");
    drawAxisLabel("−b* Bleu",  CX,         SIZE - 8, "center", "bottom", "rgba(15,55,185,1)");



    // -- C*/h° cylindrical visuals --------------------------------------------
    if (coordMode === "ch") {
      // NO disc clip -- circles must be fully visible outside disc boundary too
      points.forEach((p, i) => {
        if (p.a === 0 && p.b === 0) return;
        const { x: px, y: py } = l2p(p.a, p.b);

        const C    = Math.sqrt(p.a * p.a + p.b * p.b);
        const hRad = Math.atan2(p.b, p.a);
        const hDeg = ((hRad * 180 / Math.PI) + 360) % 360;

        const origX = vToX(0);
        const origY = vToY(0);

        // C* radius in canvas pixels, grows with zoom
        const cPx = (C / visRange) * (SIZE / 2);

        // -- Single solid circle at C* distance (no sub-rings) -------------
        if (cPx >= 3) {
          ctx.beginPath();
          ctx.arc(origX, origY, cPx, 0, Math.PI * 2);
          ctx.strokeStyle = "rgba(0,0,0,0.80)";
          ctx.lineWidth = 2;
          ctx.setLineDash([]);
          ctx.stroke();
        }

        // C* label: tangent to the circle, perpendicular to the radius direction
        // Place it 90° rotated from the point direction, at circle edge, offset outward
        const perpAngle = hRad + Math.PI / 2; // 90° from radius
        // Position: on the circle edge, then push outward by 12px, also shift 24px along perp
        const cEdgeX = origX + Math.cos(hRad) * cPx;
        const cEdgeY = origY - Math.sin(hRad) * cPx;
        const cLblX = cEdgeX + Math.cos(perpAngle) * 32 + Math.cos(hRad) * (-6);
        const cLblY = cEdgeY - Math.sin(perpAngle) * 32 - Math.sin(hRad) * (-6);
        ctx.font = "600 9px sans-serif";
        ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.strokeStyle = "rgba(255,255,255,0.95)"; ctx.lineWidth = 3; ctx.lineJoin = "round";
        ctx.strokeText(`C*=${C.toFixed(1)}`, cLblX, cLblY);
        ctx.fillStyle = "rgba(30,158,117,0.95)";
        ctx.fillText(`C*=${C.toFixed(1)}`, cLblX, cLblY);

        // -- Radius line from origin to point --------------------------------
        ctx.beginPath();
        ctx.moveTo(origX, origY);
        ctx.lineTo(px, py);
        ctx.strokeStyle = "rgba(0,0,0,0.55)";
        ctx.lineWidth = 1.4;
        ctx.setLineDash([6, 4]);
        ctx.stroke();
        ctx.setLineDash([]);

        // -- Angle arc -- scales with zoom, minimum useful size ---------------
        // Base arc radius = 40px at zoom=1, grows with zoom
        const arcR = Math.max(28, Math.min(cPx * 0.55, 28 * zoom));
        // Canvas angle convention: LAB +a* = canvas right (angle 0)
        // LAB b* grows upward but canvas y grows downward -> flip sign
        const canvasAngle = -hRad;

        // Reference line: 0° = +a* direction
        ctx.beginPath();
        ctx.moveTo(origX, origY);
        ctx.lineTo(origX + arcR + 10, origY);
        ctx.strokeStyle = "rgba(0,0,0,0.30)";
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 3]);
        ctx.stroke();
        ctx.setLineDash([]);

        // The arc itself (from 0 to h°)
        ctx.beginPath();
        ctx.moveTo(origX, origY);
        const ccw = canvasAngle < 0;
        ctx.arc(origX, origY, arcR, 0, canvasAngle, ccw);
        ctx.closePath();
        ctx.fillStyle = "rgba(0,0,0,0.07)";
        ctx.fill();
        ctx.beginPath();
        ctx.arc(origX, origY, arcR, 0, canvasAngle, ccw);
        ctx.strokeStyle = "rgba(0,0,0,0.75)";
        ctx.lineWidth = 1.8;
        ctx.stroke();

        // h° label: along the dashed radius line, at ~60% from origin toward point, offset slightly sideways
        const hLblFrac = 0.60; // 60% of the way from origin to point
        const hLblX = origX + Math.cos(hRad) * cPx * hLblFrac + Math.cos(hRad + Math.PI / 2) * 10;
        const hLblY = origY - Math.sin(hRad) * cPx * hLblFrac - Math.sin(hRad + Math.PI / 2) * (-10);
        ctx.font = "600 9px sans-serif";
        ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.strokeStyle = "rgba(255,255,255,0.95)"; ctx.lineWidth = 3; ctx.lineJoin = "round";
        ctx.strokeText(`${hDeg.toFixed(1)}°`, hLblX, hLblY);
        ctx.fillStyle = "rgba(24,95,165,0.95)";
        ctx.fillText(`${hDeg.toFixed(1)}°`, hLblX, hLblY);
      });

    } else {
      // Cartesian mode: no extra decorations from origin
    }
    // -- Line between selected pair only --------------------------------------
    if (pairLine && points[pairLine[0]] && points[pairLine[1]]) {
      const pa = l2p(points[pairLine[0]].a, points[pairLine[0]].b);
      const pb = l2p(points[pairLine[1]].a, points[pairLine[1]].b);
      ctx.beginPath(); ctx.moveTo(pa.x, pa.y); ctx.lineTo(pb.x, pb.y);
      ctx.strokeStyle = "rgba(255,255,255,0.90)"; ctx.lineWidth = 1.5;
      ctx.setLineDash([5, 3]); ctx.stroke(); ctx.setLineDash([]);
    }

    // -- Ellipse de tolérance --------------------------------------------------
    if (showEllipse) {
      points.forEach((p) => {
        if (p.id !== pairA) return;
        const { x: cx, y: cy } = l2p(p.a, p.b);
        const labToPxS = (SIZE / 2) / visRange;
        const hRad = Math.atan2(p.b, p.a);
        const C1 = Math.sqrt(p.a**2 + p.b**2);
        let rx_px, ry_px, rotation, label;
        if (ellipseFormula === "76") {
          rx_px = ellipseDE * labToPxS; ry_px = rx_px; rotation = 0;
          label = `ΔE₇₆ ${ellipseDE.toFixed(1)}`;
        } else if (ellipseFormula === "cmc") {
          const h1 = ((hRad*180/Math.PI)+360)%360;
          const SL = p.L<16?0.511:(0.040975*p.L)/(1+0.01765*p.L);
          const SC = (0.0638*C1)/(1+0.0131*C1)+0.638;
          const T = (h1>=164&&h1<=345)?0.56+Math.abs(0.2*Math.cos((h1+168)*Math.PI/180)):0.36+Math.abs(0.4*Math.cos((h1+35)*Math.PI/180));
          const F = Math.sqrt(C1**4/(C1**4+1900));
          const SH = SC*(F*T+1-F);
          rx_px = SC*ellipseCmcC*ellipseDE*labToPxS; ry_px = SH*ellipseDE*labToPxS;
          rotation = -hRad; label = `ΔE CMC(${ellipseCmcL}:${ellipseCmcC}) ${ellipseDE.toFixed(1)}`;
        } else {
          const C7=C1**7, G=0.5*(1-Math.sqrt(C7/(C7+25**7)));
          const a1p=p.a*(1+G), C1p=Math.sqrt(a1p**2+p.b**2);
          const h1p=((Math.atan2(p.b,a1p)*180/Math.PI)+360)%360;
          const T=1-0.17*Math.cos((h1p-30)*Math.PI/180)+0.24*Math.cos(2*h1p*Math.PI/180)+0.32*Math.cos((3*h1p+6)*Math.PI/180)-0.20*Math.cos((4*h1p-63)*Math.PI/180);
          const SC=1+0.045*C1p, SH=1+0.015*C1p*T;
          rx_px=SC*ellipseDE*labToPxS; ry_px=SH*ellipseDE*labToPxS;
          rotation=-hRad; label=`ΔE₂₀₀₀ ${ellipseDE.toFixed(1)}`;
        }
        if (rx_px < 0.5) return;
        ctx.save(); ctx.translate(cx, cy); ctx.rotate(rotation);
        ctx.beginPath(); ctx.ellipse(0,0,Math.max(rx_px,0.5),Math.max(ry_px,0.5),0,0,Math.PI*2);
        ctx.strokeStyle="rgba(80,0,180,0.80)"; ctx.lineWidth=1.5; ctx.setLineDash([5,3]); ctx.stroke(); ctx.setLineDash([]); ctx.restore();
        // Label
        const cosR=Math.cos(-rotation), sinR=Math.sin(-rotation);
        const t1=Math.atan2(ry_px*Math.cos(rotation),rx_px*Math.sin(rotation)), t2=t1+Math.PI;
        const y1=cy+rx_px*Math.cos(t1)*sinR+ry_px*Math.sin(t1)*cosR;
        const y2b=cy+rx_px*Math.cos(t2)*sinR+ry_px*Math.sin(t2)*cosR;
        const tTop=y1<y2b?t1:t2;
        const lblX=cx+rx_px*Math.cos(tTop)*cosR-ry_px*Math.sin(tTop)*sinR;
        const lblY=cy+rx_px*Math.cos(tTop)*sinR+ry_px*Math.sin(tTop)*cosR-5;
        ctx.save(); ctx.font="700 11px sans-serif"; ctx.textAlign="center"; ctx.textBaseline="bottom";
        ctx.strokeStyle="rgba(255,255,255,0.9)"; ctx.lineWidth=2.5; ctx.lineJoin="round"; ctx.strokeText(label,lblX,lblY);
        ctx.fillStyle="rgba(80,0,180,0.90)"; ctx.fillText(label,lblX,lblY); ctx.restore();
      });
    }

    // -- Points ---------------------------------------------------------------
    points.forEach((p, i) => {
      const { x, y } = l2p(p.a, p.b);
      const hex = labToHex(p.L, p.a, p.b);
      // Circle: r=6, fill=color, white inner ring, black outer border
      ctx.beginPath(); ctx.arc(x, y, 6, 0, Math.PI * 2);
      ctx.fillStyle = hex; ctx.fill();
      // White inner border
      ctx.strokeStyle = "white"; ctx.lineWidth = 1.5; ctx.stroke();
      // Black outer border
      ctx.beginPath(); ctx.arc(x, y, 7.5, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(0,0,0,0.85)"; ctx.lineWidth = 1; ctx.stroke();
      // Plain bold label above -- white stroke halo for readability
      const lbl = p.name ? p.name.slice(0, 8) : PLBLS[i];
      ctx.font = "bold 13px sans-serif";
      ctx.textAlign = "center"; ctx.textBaseline = "bottom";
      // White halo: stroke first, then fill
      ctx.strokeStyle = "rgba(255,255,255,0.95)";
      ctx.lineWidth = 4;
      ctx.lineJoin = "round";
      ctx.strokeText(lbl, x, y - 10);
      ctx.fillStyle = "rgba(0,0,0,1)";
      ctx.fillText(lbl, x, y - 10);
    });
  }, [L, points, zoom, showColor, showGrid, visRange, pan, l2p, coordMode, pairLine]);

  // -- Input helpers ----------------------------------------------------------
  const getPos = useCallback((e) => {
    const rect = ovRef.current.getBoundingClientRect();
    const sc = SIZE / rect.width;
    const src = e.touches ? e.touches[0] : e;
    return { x: (src.clientX - rect.left) * sc, y: (src.clientY - rect.top) * sc };
  }, []);

  const hitTest = useCallback((px, py) => {
    for (let i = 0; i < points.length; i++) {
      const { x, y } = l2p(points[i].a, points[i].b);
      if (Math.hypot(px - x, py - y) < 14) return i;
    }
    return -1;
  }, [points, l2p]);

  const inDisc = useCallback((px, py) =>
    Math.hypot(px - CX, py - CY) <= SIZE / 2 - 2, []);

  const panRef = useRef({ a: 0, b: 0 });
  // keep panRef in sync so mousedown can read current pan without stale closure
  useEffect(() => { panRef.current = pan; }, [pan]);

  // -- Double-click / double-tap detection ----------------------------------
  const lastTap    = useRef({ t: 0, x: 0, y: 0 });

  const onMouseDown = useCallback((e) => {
    // Ignore events originating from the popup
    if (e.target && e.target.closest && e.target.closest('[data-popup]')) return;
    // ignore multi-touch (pinch handled separately)
    if (e.touches && e.touches.length >= 2) return;
    didMove.current = false;
    const { x, y } = getPos(e);
    const hit = hitTest(x, y);
    if (hit >= 0) {
      drag.current = { kind: "point", idx: hit };
    } else if (inDisc(x, y)) {
      drag.current = { kind: "pan", startX: x, startY: y,
        basePanA: panRef.current.a, basePanB: panRef.current.b };
    }
    e.preventDefault();
  }, [getPos, hitTest, inDisc]);

  const onMouseMove = useCallback((e) => {
    if (!drag.current) return;
    if (e.touches && e.touches.length >= 2) { drag.current = null; return; }
    if (!didMove.current) setIsDragging(true);
    didMove.current = true;
    const { x, y } = getPos(e);

    if (drag.current.kind === "point") {
      const [a, b] = p2l(x, y);
      const [ca, cb] = clampPt(a, b);
      setPoints(pts => pts.map((p, i) => i === drag.current.idx ? { ...p, a: ca, b: cb } : p));
    } else if (drag.current.kind === "pan") {
      const dpx = x - drag.current.startX;
      const dpy = y - drag.current.startY;
      const { da, db } = dp2dl(dpx, dpy);
      setPan({ a: drag.current.basePanA - da, b: drag.current.basePanB - db });
    }
    e.preventDefault();
  }, [getPos, p2l, dp2dl, setPoints]);

  const onMouseUp = useCallback((e) => {
    // Ignore events that originate from inside the popup
    if (e.target && e.target.closest && e.target.closest('[data-popup]')) return;

    const wasDrag = drag.current !== null && didMove.current;
    const dragKind = drag.current?.kind;
    const dragIdx  = drag.current?.idx;
    drag.current = null;
    didMove.current = false;
    setIsDragging(false);
    // If we dragged a point, don't close its popup
    if (wasDrag && dragKind === "point") return;
    if (wasDrag) return;

    const rect = ovRef.current.getBoundingClientRect();
    const sc = SIZE / rect.width;
    const src = e.changedTouches ? e.changedTouches[0] : e;
    const px = (src.clientX - rect.left) * sc;
    const py = (src.clientY - rect.top) * sc;

    const hit = hitTest(px, py);
    const now = Date.now();

    // -- Click on existing point -> open popup ------------------------
    if (hit >= 0) {
      setHoverHint(null);
      setPopup(p => p?.idx === hit ? null : { idx: hit });
      return;
    }

    // -- Click on empty disc area -------------------------------------
    if (!inDisc(px, py) || e.button === 2) return;

    // Close popup on click outside
    setPopup(null);

    // Double-click / double-tap detection (within 400ms and 20px)
    const dt = now - lastTap.current.t;
    const dist = Math.hypot(px - lastTap.current.x, py - lastTap.current.y);
    const isDouble = dt < 400 && dist < 20;

    if (isDouble) {
      // Create point on double click
      lastTap.current = { t: 0, x: 0, y: 0 };
      if (points.length >= 8) return;
      const [a, b] = p2l(px, py);
      const [ca, cb] = clampPt(a, b);
      const newIdx = points.length; // will be appended at this index
      setPoints(pts => [...pts, { id: `p${Date.now()}`, L: Lval, a: ca, b: cb, name: "" }]);
      // Auto-open popup for the newly created point
      setPopup({ idx: newIdx });
    } else {
      // Single click on empty area -> show hint + record for double-click detection
      lastTap.current = { t: now, x: px, y: py };
      // Show double-click hint at click position, auto-hide after 1.8s
      setHoverHint({ x: px, y: py, kind: "empty", fromClick: true });
      clearTimeout(window.__hintTimer);
      window.__hintTimer = setTimeout(() => setHoverHint(h => h?.fromClick ? null : h), 1800);
    }
  }, [hitTest, inDisc, p2l, setPoints, points.length, Lval]);

  const onContextMenu = useCallback((e) => {
    e.preventDefault();
  }, []);

  // -- Wheel zoom -------------------------------------------------------------
  const onWheel = useCallback((e) => {
    e.preventDefault();
    const now = Date.now();
    if (now - lastWh.current < 40) return;
    lastWh.current = now;
    const steps = [1, 1.5, 2, 3, 4, 6, 8, 10, 15, 20, 30, 50, 75, 100];
    setZoom(z => {
      const idx = steps.findIndex(s => Math.abs(s - z) < 0.01);
      const ni = Math.max(0, Math.min(steps.length - 1, idx + (e.deltaY > 0 ? -1 : 1)));
      return steps[ni];
    });
  }, [setZoom]);

  // -- Pinch-to-zoom ------------------------------------------------------------
  const ZOOM_STEPS_P = [1, 1.5, 2, 3, 4, 6, 8, 10, 15, 20, 30, 50, 75, 100];

  const onTouchStartPinch = useCallback((e) => {
    if (e.touches.length === 2) {
      const d = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY,
      );
      pinch.current = { dist0: d, zoom0: zoom };
      e.preventDefault();
    }
  }, [zoom]);

  const onTouchMovePinch = useCallback((e) => {
    if (e.touches.length === 2 && pinch.current) {
      e.preventDefault();
      const d = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY,
      );
      const ratio = d / pinch.current.dist0;
      const target = pinch.current.zoom0 * ratio;
      // snap to nearest step
      let best = 0;
      for (let i = 1; i < ZOOM_STEPS_P.length; i++) {
        if (Math.abs(ZOOM_STEPS_P[i] - target) < Math.abs(ZOOM_STEPS_P[best] - target)) best = i;
      }
      setZoom(ZOOM_STEPS_P[best]);
    }
  }, [setZoom]);

  const onTouchEndPinch = useCallback(() => {
    pinch.current = null;
  }, []);

  useEffect(() => {
    const el = ovRef.current; if (!el) return;
    el.addEventListener("wheel", onWheel, { passive: false });
    el.addEventListener("touchstart", onTouchStartPinch, { passive: false });
    el.addEventListener("touchmove", onTouchMovePinch, { passive: false });
    el.addEventListener("touchend", onTouchEndPinch);
    return () => {
      el.removeEventListener("wheel", onWheel);
      el.removeEventListener("touchstart", onTouchStartPinch);
      el.removeEventListener("touchmove", onTouchMovePinch);
      el.removeEventListener("touchend", onTouchEndPinch);
    };
  }, [onWheel, onTouchStartPinch, onTouchMovePinch, onTouchEndPinch]);

  useEffect(() => {
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    window.addEventListener("touchmove", onMouseMove, { passive: false });
    window.addEventListener("touchend", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      window.removeEventListener("touchmove", onMouseMove);
      window.removeEventListener("touchend", onMouseUp);
    };
  }, [onMouseMove, onMouseUp]);

  // Expose export function via ref
  useEffect(() => {
    if (!exportRef) return;
    exportRef.current = () => {
      const SCALE = 2; // HD
      const W = SIZE * SCALE;
      // Info panel height
      const INFO_H = Math.max(120, points.length * 36 + 80) * SCALE;
      const TOTAL_H = W + INFO_H;

      const out = document.createElement("canvas");
      out.width  = W;
      out.height = TOTAL_H;
      const ctx = out.getContext("2d");

      // -- White background --------------------------------------------------
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, W, TOTAL_H);

      // -- Disc: composite color + overlay ----------------------------------
      ctx.save();
      ctx.beginPath();
      ctx.arc(W / 2, W / 2, W / 2 - 1, 0, Math.PI * 2);
      ctx.clip();
      if (colRef.current) ctx.drawImage(colRef.current, 0, 0, W, W);
      if (ovRef.current)  ctx.drawImage(ovRef.current,  0, 0, W, W);
      ctx.restore();
      // disc border
      ctx.beginPath();
      ctx.arc(W / 2, W / 2, W / 2 - 1, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(0,0,0,0.15)"; ctx.lineWidth = 2 * SCALE; ctx.stroke();

      // -- Info panel --------------------------------------------------------
      const iY = W + 8 * SCALE; // start y of info
      ctx.fillStyle = "#f7f7f7";
      ctx.fillRect(0, W, W, INFO_H);
      ctx.strokeStyle = "rgba(0,0,0,0.08)"; ctx.lineWidth = SCALE;
      ctx.beginPath(); ctx.moveTo(0, W); ctx.lineTo(W, W); ctx.stroke();

      // Title
      ctx.font = `900 ${13 * SCALE}px sans-serif`;
      ctx.fillStyle = "#111";
      ctx.textAlign = "left"; ctx.textBaseline = "top";
      ctx.fillText(`Plan a*b* CIELAB · L*=${L} · Zoom ×${zoom} · Mode ${coordMode === "ch" ? "C*/h°" : "a*/b*"}`, 16 * SCALE, iY);

      // Points table
      const rowH = 30 * SCALE;
      let ry = iY + 22 * SCALE;
      ctx.font = `bold ${10 * SCALE}px sans-serif`;
      ctx.fillStyle = "#555";
      ctx.fillText("Pt   L*     a*     b*     C*     h°     HEX", 16 * SCALE, ry);
      ry += rowH * 0.8;

      ctx.font = `${10 * SCALE}px sans-serif`;
      points.forEach((p, i) => {
        const C   = Math.sqrt(p.a * p.a + p.b * p.b);
        const hRad = Math.atan2(p.b, p.a);
        const hDeg = ((hRad * 180 / Math.PI) + 360) % 360;
        const hex  = labToHex(p.L, p.a, p.b);
        const pc   = PCOLS[i % PCOLS.length];

        // color swatch
        ctx.fillStyle = hex;
        ctx.fillRect(16 * SCALE, ry - 2 * SCALE, 14 * SCALE, 14 * SCALE);
        ctx.strokeStyle = pc; ctx.lineWidth = 1.5 * SCALE;
        ctx.strokeRect(16 * SCALE, ry - 2 * SCALE, 14 * SCALE, 14 * SCALE);

        ctx.fillStyle = "#111";
        const txt = `${PLBLS[i]}   ${p.L.toFixed(1)}     ${p.a.toFixed(1)}     ${p.b.toFixed(1)}     ${C.toFixed(1)}     ${hDeg.toFixed(1)}°     ${hex.toUpperCase()}`;
        ctx.fillText(txt, 36 * SCALE, ry);
        ry += rowH;
      });

      // Delta E section
      if (points.length >= 2) {
        ry += 4 * SCALE;
        ctx.font = `bold ${10 * SCALE}px sans-serif`;
        ctx.fillStyle = "#555";
        ctx.fillText("Écarts ΔE*₇₆", 16 * SCALE, ry);
        ry += rowH * 0.8;
        ctx.font = `${10 * SCALE}px sans-serif`;
        for (let i = 0; i < points.length - 1; i++) {
          for (let j = i + 1; j < points.length; j++) {
            const de = dE(points[i].L, points[i].a, points[i].b, points[j].L, points[j].a, points[j].b);
            const { label } = interpDE(de);
            ctx.fillStyle = "#111";
            ctx.fillText(`${PLBLS[i]} ↔ ${PLBLS[j]}  ΔE = ${de.toFixed(2)}  (${label})`, 16 * SCALE, ry);
            ry += rowH * 0.8;
          }
        }
      }

      // Trigger download
      const a = document.createElement("a");
      a.download = `cielab_L${L}_z${zoom}.png`;
      a.href = out.toDataURL("image/png");
      a.click();
    };
  }, [points, L, zoom, coordMode, exportRef]);

  // Cursor + hover hint
  const [cursor, setCursor] = useState("crosshair");
  const onHover = useCallback((e) => {
    const { x, y } = getPos(e);
    const hit = hitTest(x, y);
    const isPanning = drag.current?.kind === "pan";
    const isDraggingNow = drag.current !== null;

    if (isPanning) {
      setCursor("grabbing");
      setHoverHint(null);
    } else if (hit >= 0) {
      setCursor("pointer");
      setHoverHint(h => h?.fromClick ? h : { x, y, kind: "point", idx: hit });
    } else if (inDisc(x, y)) {
      setCursor(isDraggingNow ? "grabbing" : "crosshair");
      // Only clear point hint when moving to empty area; don't set empty hint on hover
      setHoverHint(h => (h && !h.fromClick) ? null : h);
    } else {
      setCursor("default");
      setHoverHint(h => h?.fromClick ? h : null);
    }
  }, [getPos, hitTest, inDisc]);

  return (
    <>
    <div ref={discContainerRef} style={{ position: "relative", width: "100%", borderRadius: "50%",
      background: showColor ? "transparent" : "var(--color-background-secondary)", flexShrink: 0 }}>
      <canvas ref={colRef} width={SIZE} height={SIZE}
        style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", display: "block" }} />
      <canvas ref={ovRef} width={SIZE} height={SIZE}
        style={{ position: "relative", width: "100%", display: "block", cursor, background: "transparent", touchAction: "none" }}
        onMouseDown={onMouseDown}
        onTouchStart={onMouseDown}
        onMouseMove={onHover}
        onMouseLeave={() => setHoverHint(null)}
        onContextMenu={onContextMenu} />

      {/* Hover hint bubble */}
      {hoverHint && !isDragging && (() => {
        const isPoint = hoverHint.kind === "point";
        if (isPoint && popup?.idx === hoverHint.idx) return null;
        if (!isPoint && !hoverHint.fromClick) return null;
        const text = isPoint
          ? "Cliquer pour afficher les détails"
          : "Double-clic pour créer un point";
        const leftPct = hoverHint.x / 520 * 100;
        const topPct  = hoverHint.y / 520 * 100;
        return (
          <div style={{
            position: "absolute",
            left: `${leftPct}%`,
            top:  `calc(${topPct}% - 34px)`,
            transform: "translateX(-50%)",
            background: isPoint ? "rgba(24,95,165,0.88)" : "rgba(0,0,0,0.72)",
            color: "white",
            fontSize: 10, fontWeight: 600, padding: "4px 10px",
            borderRadius: 20, whiteSpace: "nowrap", pointerEvents: "none",
            zIndex: 50, backdropFilter: "blur(4px)",
          }}>
            {text}
          </div>
        );
      })()}


      {/* Reset pan button */}
      {(pan.a !== 0 || pan.b !== 0) && (
        <button
          onClick={() => setPan({ a: 0, b: 0 })}
          style={{
            position: "absolute", bottom: "8%", left: "50%", transform: "translateX(-50%)",
            fontSize: 10, padding: "3px 10px", cursor: "pointer",
            border: "0.5px solid rgba(255,255,255,0.6)",
            background: "rgba(0,0,0,0.35)", color: "white",
            borderRadius: 20, backdropFilter: "blur(4px)", zIndex: 10,
          }}>
          ↺ Recentrer
        </button>
      )}
      {/* Zoom −/+ buttons -- bottom-left of disc */}
      {(() => {
        const STEPS = [1, 1.5, 2, 3, 4, 6, 8, 10, 15, 20, 30, 50, 75, 100];
        const idx = STEPS.findIndex(s => Math.abs(s - zoom) < 0.01);
        const canZoomOut = idx > 0;
        const canZoomIn  = idx < STEPS.length - 1;
        const btnStyle = (enabled) => ({
          width: 28, height: 28, borderRadius: 7,
          border: "0.5px solid rgba(255,255,255,0.55)",
          background: "rgba(0,0,0,0.38)", color: "white",
          fontSize: 18, lineHeight: 1, fontWeight: 400,
          cursor: enabled ? "pointer" : "default",
          opacity: enabled ? 1 : 0.35,
          display: "flex", alignItems: "center", justifyContent: "center",
          backdropFilter: "blur(4px)",
          userSelect: "none",
        });
        return (
          <div style={{
            position: "absolute", bottom: "7%", left: "7%",
            display: "flex", flexDirection: "column", gap: 4, zIndex: 10,
          }}>
            <button style={btnStyle(canZoomIn)}
              onClick={() => canZoomIn && setZoom(STEPS[idx + 1])}
              title="Agrandir">+</button>
            <button style={btnStyle(canZoomOut)}
              onClick={() => canZoomOut && setZoom(STEPS[idx - 1])}
              title="Réduire">−</button>
          </div>
        );
      })()}
    </div>

    {/* Point popup -- outside disc div so not clipped by borderRadius:50% */}
    {popup !== null && points[popup.idx] && (() => {
      const rect = discContainerRef.current?.getBoundingClientRect();
      const initX = rect ? rect.left + rect.width / 2 - 140 : window.innerWidth / 2 - 140;
      const initY = rect ? rect.bottom - 160 : window.innerHeight - 200;
      return (
        <PointPopup
          point={points[popup.idx]}
          idx={popup.idx}
          allPoints={points}
          pairA={pairA}
          pairB={pairB}
          showDelta={showDelta}
          initialX={initX}
          initialY={initY}
          onClose={() => setPopup(null)}
          onDelete={() => { setPoints(pts => pts.filter((_, i) => i !== popup.idx)); setPopup(null); }}
          onChange={updated => setPoints(pts => pts.map((p, i) => i === popup.idx ? updated : p))}
        />
      );
    })()}
    </>
  );
}

// --- Slider with precision ----------------------------------------------------
function Slider({ label, color, min, max, value, onChange, step = 0.1 }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 4 }}>
      <span style={{ fontSize: 9, color: color || "var(--color-text-secondary)", fontWeight: 600, minWidth: 14, flexShrink: 0 }}>{label}</span>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(Math.round(+e.target.value * 10) / 10)}
        style={{ flex: 1, height: 3, accentColor: color || "var(--color-text-primary)", cursor: "pointer", minWidth: 0 }} />
      <input type="number" min={min} max={max} step={step}
        value={(+value).toFixed(1)}
        onChange={e => { const v = parseFloat(e.target.value); if (!isNaN(v)) onChange(Math.min(max, Math.max(min, v))); }}
        style={{
          width: 38, fontSize: 9, fontWeight: 700, fontFamily: "monospace",
          border: "0.5px solid var(--color-border-secondary)", borderRadius: 3,
          background: "var(--color-background-secondary)", textAlign: "right",
          padding: "1px 3px", color: color || "var(--color-text-primary)", flexShrink: 0,
        }} />
    </div>
  );
}


// -- Coord helpers --------------------------------------------------------------
function abToCH(a, b) {
  const C = Math.sqrt(a * a + b * b);
  const h = (a === 0 && b === 0) ? 0 : ((Math.atan2(b, a) * 180 / Math.PI) + 360) % 360;
  return { C: Math.round(C * 10) / 10, h: Math.round(h * 10) / 10 };
}
function chToAB(C, h) {
  const rad = h * Math.PI / 180;
  return { a: Math.round(C * Math.cos(rad)), b: Math.round(C * Math.sin(rad)) };
}


// --- Delta panel -------------------------------------------------------------
function DeltaPanel({ points, pairA, setPairA, pairB, setPairB, compact = false }) {
  // Resolve IDs -> point objects (fallback to first/second if ID not found)
  const pa = points.find(p => p.id === pairA) || points[0];
  const pb = points.find(p => p.id === pairB) || points[1];

  if (points.length < 2) return (
    <div style={{ background: "var(--color-background-secondary)", borderRadius: 12, padding: "14px", fontSize: 11, color: "var(--color-text-secondary)", textAlign: "center", lineHeight: 1.6 }}>
      Ajoutez au moins<br />2 points pour calculer ΔE
    </div>
  );

  const same = pa?.id === pb?.id;
  const de = (!same && pa && pb) ? dE(pa.L, pa.a, pa.b, pb.L, pb.a, pb.b) : 0;
  const { label, color } = interpDE(de);
  const pct = Math.min(100, (de / 20) * 100);

  const ptLabel = (p, i) => `${i + 1}${p.name ? ` · ${p.name}` : ""}`;

  return (
    <div className="cielab-card" style={{ padding: compact ? "8px 10px" : "12px 14px" }}>
      <div style={{ fontSize: 9, fontWeight: 800, color: "var(--color-text-secondary)", letterSpacing: ".07em", textTransform: "uppercase", marginBottom: compact ? 7 : 10 }}>Écart colorimétrique</div>

      {/* Pair selector */}
      <div style={{ display: "flex", flexDirection: "column", gap: compact ? 4 : 5, marginBottom: compact ? 8 : 12 }}>
        {[["Standard", pairA, setPairA], ["Échantillon", pairB, setPairB]].map(([lbl, val, setter]) => {
          const pt = points.find(p => p.id === val);
          return (
            <div key={lbl} style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <span style={{ fontSize: 8, fontWeight: 700, color: "var(--color-text-secondary)", minWidth: compact ? 52 : 62, flexShrink: 0 }}>{lbl}</span>
              <Select value={val} onValueChange={setter}>
                <SelectTrigger style={{ fontSize: compact ? 10 : 11 }}>
                  <SelectValue label={pt ? ptLabel(pt, points.indexOf(pt)) : "--"} />
                </SelectTrigger>
                <SelectContent>
                  {points.map((p, i) => (
                    <SelectItem key={p.id} value={p.id}>{ptLabel(p, i)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          );
        })}
      </div>

      {/* Swatches */}
      {pa && pb && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: compact ? 5 : 8, marginBottom: compact ? 8 : 12 }}>
          {[[pa, "Std"], [pb, "Éch"]].map(([p, role]) => (
            <div key={p.id}>
              <div style={{ fontSize: 8, color: "var(--color-text-secondary)", marginBottom: 2 }}>
                {role} -- {ptLabel(p, points.indexOf(p))}
              </div>
              <div style={{ height: compact ? 18 : 28, borderRadius: 5, background: labToHex(p.L, p.a, p.b), border: "0.5px solid rgba(0,0,0,0.1)" }} />
            </div>
          ))}
        </div>
      )}

      {same ? (
        <div style={{ fontSize: 11, color: "var(--color-text-secondary)", textAlign: "center", padding: "8px 0" }}>
          Sélectionnez deux points différents
        </div>
      ) : (
        <>
          <div style={{ textAlign: "center", padding: compact ? "2px 0 4px" : "4px 0 6px" }}>
            <div style={{ fontSize: compact ? 9 : 11, color: "var(--color-text-secondary)", marginBottom: 1 }}>ΔE*₇₆ =</div>
            <div style={{ fontSize: compact ? 32 : 44, fontWeight: 700, color, lineHeight: 1, fontFamily: "monospace" }}>{de.toFixed(2)}</div>
            <div style={{ fontSize: compact ? 9 : 11, color: "var(--color-text-secondary)", marginTop: 2 }}>{label}</div>
          </div>
          <div style={{ height: 4, background: "var(--color-background-secondary)", borderRadius: 3, overflow: "hidden", margin: compact ? "6px 0 7px" : "8px 0 10px" }}>
            <div style={{ height: "100%", width: `${pct}%`, background: color, borderRadius: 3, transition: "width .2s, background .2s" }} />
          </div>
          {/* Decomposition */}
          <div style={{ display: "flex", gap: 3, marginBottom: compact ? 7 : 10 }}>
            {[["ΔL*", pb.L - pa.L, "#888"], ["Δa*", pb.a - pa.a, "#c0392b"], ["Δb*", pb.b - pa.b, "#e6ac00"]].map(([k, v, c]) => (
              <div key={k} style={{ flex: 1, background: "var(--color-background-secondary)", borderRadius: 5, padding: "4px 3px", textAlign: "center" }}>
                <div style={{ fontSize: 8, color: c, fontWeight: 700 }}>{k}</div>
                <div style={{ fontSize: compact ? 9 : 10, fontWeight: 700, fontFamily: "monospace" }}>{v > 0 ? "+" : ""}{v.toFixed(1)}</div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Scale legend */}
      <div style={{ fontSize: 8, color: "var(--color-text-secondary)", display: "flex", flexWrap: "wrap", gap: "2px 6px" }}>
        {[["<1","Imperceptible","#1D9E75"],["1–2","Expert","#639922"],["2–3.5","Œil nu","#EF9F27"],["3.5–5","Nette","#D85A30"],[">5","Majeure","#E24B4A"]].map(([r,l,c]) => (
          <span key={r} style={{ display: "inline-flex", alignItems: "center", gap: 2 }}>
            <span style={{ width: 5, height: 5, borderRadius: 1, background: c, display: "inline-block", flexShrink: 0 }} />
            {r} {l}
          </span>
        ))}
      </div>
    </div>
  );
}


// Tabs now provided by shadcn/ui

const Sep = () => <div style={{ width: 1, height: 14, background: "var(--color-border-secondary)", alignSelf: "center", flexShrink: 0 }} />;

const CoordPill = ({ coordMode, setCoordMode }) => (
  <div style={{
    display: "flex", flexDirection: "column", gap: 3,
    background: "var(--color-background-secondary)",
    borderRadius: 9, padding: 4,
    border: "0.5px solid var(--color-border-tertiary)",
    alignSelf: "flex-start", marginTop: 30,
  }}>
    {[["ab","a*b*"],["ch","C*h°"]].map(([m, lbl]) => (
      <button key={m} onClick={() => setCoordMode(m)} style={{
        padding: "8px 6px", fontSize: 9, fontWeight: 800, cursor: "pointer",
        borderRadius: 6, border: "none", letterSpacing: ".06em",
        background: coordMode === m ? "var(--color-text-primary)" : "transparent",
        color: coordMode === m ? "var(--color-background-primary)" : "var(--color-text-secondary)",
        transition: "background .15s, color .15s",
        writingMode: "vertical-rl", textOrientation: "mixed", transform: "rotate(180deg)",
        minHeight: 50, minWidth: 22,
      }}>{lbl}</button>
    ))}
  </div>
);

// --- L* vertical axis ---------------------------------------------------------
function LAxis({ points, setPoints }) {
  const svgRef = useRef(null);
  const dragging = useRef(null);
  const AXIS_W = 112;  // doubled from 56
  const PAD_T = 16, PAD_B = 16;

  const lToY = useCallback((L, height) => {
    return PAD_T + ((100 - L) / 100) * (height - PAD_T - PAD_B);
  }, []);
  const yToL = useCallback((y, height) => {
    const raw = 100 - ((y - PAD_T) / (height - PAD_T - PAD_B)) * 100;
    return Math.round(Math.min(100, Math.max(0, raw)));
  }, []);

  const getHeight = () => svgRef.current?.getBoundingClientRect().height || 400;
  const getY = (e) => {
    const rect = svgRef.current.getBoundingClientRect();
    const src = e.touches ? e.touches[0] : e;
    return src.clientY - rect.top;
  };

  const onDown = useCallback((e, idx) => {
    dragging.current = idx;
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const onMove = useCallback((e) => {
    if (dragging.current === null) return;
    const y = getY(e);
    const L = yToL(y, getHeight());
    setPoints(pts => pts.map((p, i) => i === dragging.current ? { ...p, L } : p));
    e.preventDefault();
  }, [yToL, setPoints]);

  const onUp = useCallback(() => { dragging.current = null; }, []);

  useEffect(() => {
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    window.addEventListener("touchmove", onMove, { passive: false });
    window.addEventListener("touchend", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onUp);
    };
  }, [onMove, onUp]);

  const ticks = [];
  for (let v = 0; v <= 100; v += 10) ticks.push(v);

  return (
    <div style={{ position: "relative", width: AXIS_W, height: "100%", minHeight: 200 }}>
      <svg ref={svgRef} width="100%" height="100%" style={{ display: "block", overflow: "visible" }} />
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
        <AxisContent points={points} lToY={lToY} ticks={ticks} onDown={onDown} AXIS_W={AXIS_W} PAD_T={PAD_T} PAD_B={PAD_B} />
      </div>
    </div>
  );
}

function AxisContent({ points, lToY, ticks, onDown, AXIS_W, PAD_T, PAD_B }) {
  const ref = useRef(null);
  const [height, setHeight] = useState(400);

  useEffect(() => {
    if (!ref.current) return;
    const obs = new ResizeObserver(entries => {
      setHeight(entries[0].contentRect.height);
    });
    obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);

  // Layout: name labels on left, track, graduation numbers + badges on right
  const trackX = 52;  // x of the axis track line
  const TRACK_H = height - PAD_T - PAD_B;

  return (
    <div ref={ref} style={{ position: "absolute", inset: 0 }}>
      <svg width="100%" height="100%" style={{ overflow: "visible" }}>
        <defs>
          <linearGradient id="lgrad2" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#000000" stopOpacity="0.6" />
          </linearGradient>
        </defs>

        {/* Gradient track bar */}
        <rect x={trackX - 6} y={PAD_T} width={12} height={TRACK_H}
          fill="url(#lgrad2)" rx="6" />

        {/* Axis line */}
        <line x1={trackX} y1={PAD_T} x2={trackX} y2={height - PAD_B}
          stroke="rgba(0,0,0,0.35)" strokeWidth="1.5" />

        {/* L* title */}
        <text x={trackX} y={PAD_T - 6} textAnchor="middle" fontSize="10" fontWeight="800"
          fill="var(--color-text-secondary)" letterSpacing="0.06em">L*</text>

        {/* Ticks + right-side number labels */}
        {ticks.map(v => {
          const y = lToY(v, height);
          const major = v % 20 === 0;
          return (
            <g key={v}>
              <line
                x1={trackX - (major ? 8 : 4)} y1={y}
                x2={trackX + (major ? 8 : 4)} y2={y}
                stroke="rgba(0,0,0,0.45)"
                strokeWidth={major ? 1.4 : 0.8}
                opacity={major ? 0.85 : 0.45}
              />
              {major && (
                <text
                  x={trackX + 11} y={y}
                  textAnchor="start" dominantBaseline="middle"
                  fontSize="10" fontWeight="700"
                  fill="var(--color-text-secondary)"
                  style={{ fontFamily: "monospace" }}
                >{v}</text>
              )}
            </g>
          );
        })}

        {/* Point handles -- draggable, on the right of the track */}
        {points.map((p, i) => {
          const y = lToY(p.L, height);
          const hex = labToHex(p.L, p.a, p.b);
          const pc = PCOLS[i % PCOLS.length];
          const lbl = p.name ? p.name.slice(0, 5) : PLBLS[i];
          const hx = trackX; // handle centered on track

          return (
            <g key={i} style={{ cursor: "ns-resize", pointerEvents: "all" }}
              onMouseDown={e => onDown(e, i)} onTouchStart={e => onDown(e, i)}>
              {/* Horizontal guide line */}
              <line x1={0} y1={y} x2={AXIS_W} y2={y}
                stroke="rgba(0,0,0,0.15)" strokeWidth="1" strokeDasharray="3 2" />
              {/* Circle handle: color fill, white inner ring, black outer border */}
              <circle cx={hx} cy={y} r={6} fill={hex} />
              <circle cx={hx} cy={y} r={6} fill="none" stroke="white" strokeWidth="1" />
              <circle cx={hx} cy={y} r={7.5} fill="none" stroke="rgba(0,0,0,0.85)" strokeWidth="1" />
              {/* Name label -- plain bold, white stroke halo, to the LEFT of the handle */}
              <text x={hx - 16} y={y} textAnchor="end" dominantBaseline="middle"
                fontSize="12" fontWeight="800" fill="var(--color-text-primary)"
                stroke="rgba(255,255,255,0.95)" strokeWidth="4" strokeLinejoin="round"
                paintOrder="stroke"
                style={{ pointerEvents: "none", fontFamily: "var(--font-sans)" }}>{lbl}</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}



// --- Math helpers -------------------------------------------------------------
function rnd(min, max, dec = 2) {
  return Math.round((Math.random() * (max - min) + min) * 10**dec) / 10**dec;
}

function dEval(std, f) {
  const dL = f.L - std.L, da = f.a - std.a, db = f.b - std.b;
  const de = Math.sqrt(dL**2 + da**2 + db**2);
  const C1 = Math.sqrt(std.a**2 + std.b**2);
  const C2 = Math.sqrt(f.a**2 + f.b**2);
  const dC = C2 - C1;
  const h1 = ((Math.atan2(std.b, std.a)*180/Math.PI)+360)%360;
  const h2 = ((Math.atan2(f.b, f.a)*180/Math.PI)+360)%360;
  let dh = h2 - h1;
  if (dh > 180) dh -= 360; if (dh < -180) dh += 360;
  return { dL, da, db, dC, dh, de };
}

function deltaCMC(std, f, l=1, c=1) {
  const dL = f.L-std.L, da = f.a-std.a, db = f.b-std.b;
  const C1 = Math.sqrt(std.a**2+std.b**2);
  const C2 = Math.sqrt(f.a**2+f.b**2);
  const dC = C2-C1;
  const dH = Math.sqrt(Math.max(0, da**2+db**2-dC**2));
  const h1Rad = Math.atan2(std.b, std.a);
  const h1 = ((h1Rad*180/Math.PI)+360)%360;
  const SL = std.L < 16 ? 0.511 : (0.040975*std.L)/(1+0.01765*std.L);
  const SC = (0.0638*C1)/(1+0.0131*C1)+0.638;
  const T = (h1>=164&&h1<=345) ? 0.56+Math.abs(0.2*Math.cos((h1+168)*Math.PI/180)) : 0.36+Math.abs(0.4*Math.cos((h1+35)*Math.PI/180));
  const F = Math.sqrt(C1**4/(C1**4+1900));
  const SH = SC*(F*T+1-F);
  const de = Math.sqrt((dL/(l*SL))**2+(dC/(c*SC))**2+(dH/SH)**2);
  return { dL, da, db, dC, dh: dC, de, SL, SC, SH, C1, h1 };
}

// --- genExercice --------------------------------------------------------------
function genExercice(forcedType) {
  const std = { L: rnd(30,80), a: rnd(-80,80), b: rnd(-60,80) };
  const deMax = rnd(0.4, 1.5, 1);
  const deType = forcedType || "simple";
  const dCmax = deType==="ch" ? rnd(0.3,1.2,1) : null;
  const dhMax = deType==="ch" ? rnd(0.5,3.0,1) : null;
  const passes = (s,f) => {
    if (deType==="cmc") return deltaCMC(s,f).de<=deMax;
    if (deType==="ch") { const ev=dEval(s,f); return ev.de<=deMax && Math.abs(ev.dC)<=dCmax && Math.abs(ev.dh)<=dhMax; }
    return dEval(s,f).de<=deMax;
  };
  const fails = (s,f) => !passes(s,f);
  const formules=[]; const okIdx=Math.floor(Math.random()*3);
  const others=[0,1,2].filter(i=>i!==okIdx);
  const trickIdx=others[Math.floor(Math.random()*2)];
  for (let i=0;i<3;i++) {
    let f; let attempts=0;
    if (i===okIdx) {
      do { const sp=deMax*0.75; f={L:rnd(std.L-sp,std.L+sp),a:rnd(std.a-sp,std.a+sp),b:rnd(std.b-sp,std.b+sp)}; if(passes(std,f)) break; attempts++; } while(attempts<120);
    } else if (i===trickIdx) {
      do { const abS=deMax*0.3; const dL=(Math.random()>0.5?1:-1)*rnd(deMax*1.2,deMax*2.5); f={L:Math.min(100,Math.max(0,std.L+dL)),a:rnd(std.a-abS,std.a+abS),b:rnd(std.b-abS,std.b+abS)}; if(fails(std,f)) break; attempts++; } while(attempts<120);
    } else {
      do { const sp=deMax*1.5; f={L:rnd(std.L-sp,std.L+sp),a:rnd(std.a-sp,std.a+sp),b:rnd(std.b-sp,std.b+sp)}; if(fails(std,f)) break; attempts++; } while(attempts<120);
    }
    formules.push(f);
  }
  return { std, deMax, dCmax, dhMax, deType, formules, okIdx, trickIdx };
}

// --- FrozenDisc ---------------------------------------------------------------
function FrozenDisc({ std, formules, deMax, okIdx, COLS, deType="simple", exportRef }) {
  const canvasRef = useRef(null);
  const [zoom, setZoom] = useState(20);
  const [showColor, setShowColor] = useState(false);
  const [showIsoTon, setShowIsoTon] = useState(true);
  const [showIsoSat, setShowIsoSat] = useState(true);
  const [canvasSize, setCanvasSize] = useState(340);
  const SIZE = canvasSize;
  const ZOOM_STEPS = [1,2,3,4,6,8,10,15,20,30,50,75,100,150];
  const zoomIdx = ZOOM_STEPS.findIndex(s=>Math.abs(s-zoom)<0.01);
  useEffect(() => {
    if (exportRef) exportRef.current = canvasRef.current;
  }, [exportRef]);
  const labToPx = useCallback((a,b) => {
    const visRange = 150/zoom;
    const cx=SIZE/2, cy=SIZE/2;
    return { x: cx + (a - std.a)*((SIZE/2)/visRange), y: cy - (b - std.b)*((SIZE/2)/visRange) };
  }, [zoom, std]);
  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0,0,SIZE,SIZE);
    const visRange = 150/zoom;
    const l2p = (a,b) => { const cx=SIZE/2,cy=SIZE/2; return {x:cx+(a-std.a)*((SIZE/2)/visRange),y:cy-(b-std.b)*((SIZE/2)/visRange)}; };
    const labToPxScale = (SIZE/2)/visRange;
    // Liang-Barsky clip helper -- defined early so all drawing can use it
    const clipLine = (x0, y0, x1, y1) => {
      let t0=0, t1=1;
      const dx=x1-x0, dy=y1-y0;
      for (const [p,q] of [[-dx,-x0],[dx,SIZE-x0],[-dy,-y0],[dy,SIZE-y0]]) {
        if (p===0) { if (q<0) return null; continue; }
        const t=q/p;
        if (p<0) { if (t>t1) return null; if (t>t0) t0=t; }
        else     { if (t<t0) return null; if (t<t1) t1=t; }
      }
      return { x0:x0+t0*dx, y0:y0+t0*dy, x1:x0+t1*dx, y1:y0+t1*dy };
    };
    // Background
    if (showColor) {
      const id = ctx.createImageData(SIZE,SIZE);
      for (let py=0;py<SIZE;py++) for (let px=0;px<SIZE;px++) {
        const a=(px-SIZE/2)/labToPxScale+std.a, b=(SIZE/2-py)/labToPxScale+std.b;
        const [r,g,bl] = typeof labToHex === "function" ? (() => {
          const h=labToHex(std.L,a,b); return [parseInt(h.slice(1,3),16),parseInt(h.slice(3,5),16),parseInt(h.slice(5,7),16)];
        })() : [200,200,200];
        const i=(py*SIZE+px)*4; id.data[i]=r;id.data[i+1]=g;id.data[i+2]=bl;id.data[i+3]=255;
      }
      ctx.putImageData(id,0,0);
    } else { ctx.fillStyle="#f8f8f8"; ctx.fillRect(0,0,SIZE,SIZE); }
    // -- Grid every 10 units --------------------------------------------------
    const aMin = std.a - visRange, aMax = std.a + visRange;
    const bMin = std.b - visRange, bMax = std.b + visRange;
    for (let v = Math.ceil(aMin/10)*10; v <= aMax; v += 10) {
      const {x} = l2p(v, std.b);
      const major = v % 20 === 0;
      ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,SIZE);
      ctx.strokeStyle = major ? "rgba(0,0,0,0.12)" : "rgba(0,0,0,0.06)";
      ctx.lineWidth = major ? 0.8 : 0.4; ctx.stroke();
    }
    for (let v = Math.ceil(bMin/10)*10; v <= bMax; v += 10) {
      const {y} = l2p(std.a, v);
      const major = v % 20 === 0;
      ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(SIZE,y);
      ctx.strokeStyle = major ? "rgba(0,0,0,0.12)" : "rgba(0,0,0,0.06)";
      ctx.lineWidth = major ? 0.8 : 0.4; ctx.stroke();
    }

    // -- Main axes (a*=0 vertical, b*=0 horizontal) --------------------------
    const {x:ox,y:oy} = l2p(0,0);
    ctx.strokeStyle="rgba(0,0,0,0.30)"; ctx.lineWidth=1;
    if (ox >= 0 && ox <= SIZE) { ctx.beginPath(); ctx.moveTo(ox,0); ctx.lineTo(ox,SIZE); ctx.stroke(); }
    if (oy >= 0 && oy <= SIZE) { ctx.beginPath(); ctx.moveTo(0,oy); ctx.lineTo(SIZE,oy); ctx.stroke(); }

    // -- Tick marks + numeric labels on axes ---------------------------------
    ctx.font = "bold 8px sans-serif"; ctx.fillStyle = "rgba(0,0,0,0.55)";
    // a* ticks on horizontal axis (b*=0 line, or top of canvas if out of view)
    const tickY = Math.min(SIZE - 2, Math.max(2, oy)); // clamp to canvas
    for (let v = Math.ceil(aMin/10)*10; v <= aMax; v += 10) {
      if (v === 0) continue;
      const {x} = l2p(v, 0);
      if (x < 4 || x > SIZE-4) continue;
      // Tick
      ctx.beginPath(); ctx.moveTo(x, tickY-4); ctx.lineTo(x, tickY+4);
      ctx.strokeStyle="rgba(0,0,0,0.45)"; ctx.lineWidth=1; ctx.stroke();
      // Label
      ctx.textAlign="center"; ctx.textBaseline="top";
      ctx.fillText(v, x, tickY+5);
    }
    // b* ticks on vertical axis (a*=0 line, or left of canvas if out of view)
    const tickX = Math.min(SIZE - 2, Math.max(2, ox));
    for (let v = Math.ceil(bMin/10)*10; v <= bMax; v += 10) {
      if (v === 0) continue;
      const {y} = l2p(0, v);
      if (y < 4 || y > SIZE-4) continue;
      ctx.beginPath(); ctx.moveTo(tickX-4, y); ctx.lineTo(tickX+4, y);
      ctx.strokeStyle="rgba(0,0,0,0.45)"; ctx.lineWidth=1; ctx.stroke();
      ctx.textAlign="left"; ctx.textBaseline="middle";
      ctx.fillText(v, tickX+6, y);
    }

    // -- Segment from (0,0) to STD -------------------------------------------
    {
      const ox0c = SIZE/2 - std.a * labToPxScale;
      const oy0c = SIZE/2 + std.b * labToPxScale;
      const seg = clipLine(ox0c, oy0c, SIZE/2, SIZE/2);
      if (seg) {
        ctx.beginPath(); ctx.moveTo(seg.x0, seg.y0); ctx.lineTo(seg.x1, seg.y1);
        ctx.strokeStyle = "rgba(100,20,200,0.70)"; ctx.lineWidth = 1.5;
        ctx.setLineDash([4,3]); ctx.stroke(); ctx.setLineDash([]);
        // Small dot at origin if visible
        if (ox0c >= 0 && ox0c <= SIZE && oy0c >= 0 && oy0c <= SIZE) {
          ctx.beginPath(); ctx.arc(ox0c, oy0c, 3, 0, Math.PI*2);
          ctx.fillStyle="rgba(100,20,200,0.70)"; ctx.fill();
          ctx.font="bold 8px sans-serif"; ctx.fillStyle="rgba(100,20,200,0.80)";
          ctx.textAlign="center"; ctx.textBaseline="bottom";
          ctx.fillText("(0,0)", ox0c, oy0c-4);
        }
      }
    }
    // -- Helper: find angle on circle [cx,cy,r] where arc enters/exits [0,SIZE] -
    // Returns array of angles (in canvas coords) where the circle intersects canvas border
    const circleCanvasIntersections = (cx, cy, r) => {
      const pts = [];
      // Each border: check intersection with circle
      // top (y=0), bottom (y=SIZE), left (x=0), right (x=SIZE)
      for (const [axis, val] of [[1,0],[1,SIZE],[0,0],[0,SIZE]]) {
        // axis=1 -> horizontal line y=val; axis=0 -> vertical line x=val
        const d = axis===1 ? Math.abs(cy-val) : Math.abs(cx-val);
        if (d > r) continue;
        const half = Math.sqrt(r*r - d*d);
        const p1 = axis===1 ? [cx-half, val] : [val, cy-half];
        const p2 = axis===1 ? [cx+half, val] : [val, cy+half];
        for (const [px,py] of [p1,p2]) {
          if (px>=0 && px<=SIZE && py>=0 && py<=SIZE) {
            pts.push(Math.atan2(py-cy, px-cx));
          }
        }
      }
      return pts;
    };

    // -- Helper: find a canvas-visible point on circle -------------------------
    // Samples angles and returns first one whose point is inside [0,SIZE]
    const visibleArcMidAngle = (cx, cy, r, angles) => {
      if (angles.length < 2) return null;
      // Sort angles
      let angs = [...angles].sort((a,b)=>a-b);
      // Try midpoints between consecutive intersection angles
      const candidates = [];
      for (let i=0;i<angs.length;i++) {
        const a1 = angs[i], a2 = angs[(i+1)%angs.length];
        let mid = (a1+a2)/2;
        // for the wrap-around gap, adjust
        if (i===angs.length-1) mid = (a1 + a2 + Math.PI*2)/2;
        const px = cx + r*Math.cos(mid), py = cy + r*Math.sin(mid);
        if (px>=0 && px<=SIZE && py>=0 && py<=SIZE) candidates.push(mid);
      }
      if (candidates.length > 0) return candidates[0];
      // Fallback: sample every 30°
      for (let deg=0;deg<360;deg+=30) {
        const a=deg*Math.PI/180;
        const px=cx+r*Math.cos(a), py=cy+r*Math.sin(a);
        if (px>=0 && px<=SIZE && py>=0 && py<=SIZE) return a;
      }
      return null;
    };

    // -- Iso-saturation circle -------------------------------------------------
    if (showIsoSat) {
      const C1 = Math.sqrt(std.a**2 + std.b**2);
      const rPx = C1 * labToPxScale;
      const {x:ocx, y:ocy} = l2p(0,0);
      // Always draw the full circle -- canvas clipping will hide parts outside
      ctx.save();
      ctx.beginPath(); ctx.rect(0,0,SIZE,SIZE); ctx.clip();
      ctx.beginPath(); ctx.arc(ocx, ocy, rPx, 0, Math.PI*2);
      ctx.strokeStyle="rgba(0,120,180,0.55)"; ctx.lineWidth=1.5; ctx.setLineDash([5,3]); ctx.stroke(); ctx.setLineDash([]);
      ctx.restore();

      // Find a visible point on the arc for the label
      const intersections = circleCanvasIntersections(ocx, ocy, rPx);
      let labelAng;
      if (intersections.length >= 2) {
        labelAng = visibleArcMidAngle(ocx, ocy, rPx, intersections);
      } else {
        // Circle is fully inside canvas -- use upper-left quadrant of arc toward STD direction
        const stdAng = Math.atan2(std.b, std.a); // angle from origin to STD
        labelAng = stdAng + Math.PI * 0.5; // 90° offset
      }
      if (labelAng !== null) {
        const lx = ocx + rPx * Math.cos(labelAng);
        const ly = ocy + rPx * Math.sin(labelAng);
        // Keep label inside canvas with margin
        const margin = 8;
        const clampedLx = Math.min(SIZE-margin, Math.max(margin, lx));
        const clampedLy = Math.min(SIZE-margin, Math.max(margin, ly));
        ctx.save();
        ctx.translate(clampedLx, clampedLy);
        ctx.rotate(labelAng + Math.PI/2); // tangent to circle
        ctx.font="bold 9px sans-serif"; ctx.fillStyle="rgba(0,100,180,0.85)";
        ctx.textAlign="center"; ctx.textBaseline="bottom";
        ctx.strokeStyle="rgba(255,255,255,0.9)"; ctx.lineWidth=2.5; ctx.lineJoin="round";
        ctx.strokeText("Iso-saturation", 0, -2);
        ctx.fillText("Iso-saturation", 0, -2);
        ctx.restore();
      }
    }


    // -- Iso-tonalité line (from LAB origin (0,0) through STD, to canvas edge) --
    if (showIsoTon) {
      // Canvas coords of LAB origin (0,0)
      const ox0 = SIZE/2 - std.a * labToPxScale;
      const oy0 = SIZE/2 + std.b * labToPxScale;
      // Canvas coords of STD (always at center SIZE/2, SIZE/2)
      const stxC = SIZE/2, styC = SIZE/2;
      // Direction vector in canvas space: from origin toward STD
      const dxC = stxC - ox0, dyC = styC - oy0;
      const lenC = Math.sqrt(dxC*dxC + dyC*dyC);
      if (lenC > 0.5) {
        const uxC = dxC/lenC, uyC = dyC/lenC; // unit vector in canvas
        // Extend far in both directions from origin
        const BIG = SIZE * 4;
        const clipped = clipLine(ox0 - uxC*BIG, oy0 - uyC*BIG, ox0 + uxC*BIG, oy0 + uyC*BIG);
        if (clipped) {
          const {x0:lx1,y0:ly1,x1:lx2,y1:ly2} = clipped;
          // Forward end = the one with larger dot product along uxC,uyC from origin
          const d1 = (lx1-ox0)*uxC + (ly1-oy0)*uyC;
          const d2 = (lx2-ox0)*uxC + (ly2-oy0)*uyC;
          const [arrowX,arrowY,tailX,tailY] = d2>=d1
            ? [lx2,ly2,lx1,ly1] : [lx1,ly1,lx2,ly2];
          const ang = Math.atan2(arrowY-tailY, arrowX-tailX);

          // Dashed line
          ctx.beginPath(); ctx.moveTo(tailX,tailY); ctx.lineTo(arrowX,arrowY);
          ctx.strokeStyle="rgba(180,80,0,0.70)"; ctx.lineWidth=1.5;
          ctx.setLineDash([5,3]); ctx.stroke(); ctx.setLineDash([]);

          // Arrowhead at forward end
          const arrLen=11, arrW=5;
          ctx.save();
          ctx.translate(arrowX,arrowY); ctx.rotate(ang);
          ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(-arrLen,-arrW); ctx.lineTo(-arrLen,arrW); ctx.closePath();
          ctx.fillStyle="rgba(180,80,0,0.90)"; ctx.fill();
          ctx.restore();

          // Label near arrow, along the line, inside canvas
          const labelDist = 65;
          const lblX = arrowX - Math.cos(ang)*labelDist;
          const lblY = arrowY - Math.sin(ang)*labelDist;
          const mg = 12;
          const clx = Math.min(SIZE-mg, Math.max(mg, lblX));
          const cly = Math.min(SIZE-mg, Math.max(mg, lblY));
          ctx.save();
          ctx.translate(clx, cly);
          let tAng = ang;
          if (tAng > Math.PI/2 || tAng < -Math.PI/2) tAng += Math.PI;
          ctx.rotate(tAng);
          ctx.font="bold 11px sans-serif"; ctx.fillStyle="rgba(160,65,0,0.95)";
          ctx.textAlign="center"; ctx.textBaseline="middle";
          ctx.strokeStyle="rgba(255,255,255,0.92)"; ctx.lineWidth=3; ctx.lineJoin="round";
          ctx.strokeText("Iso-tonalité", 0, -7);
          ctx.fillText("Iso-tonalité", 0, -7);
          ctx.restore();
        }
      }
    }

    // -- Axis labels: +a* rouge, −a* vert, +b* jaune, −b* bleu ----------------
    const drawFrozenAxisLabel = (text, x, y, color) => {
      ctx.save();
      ctx.font="bold 9px sans-serif"; ctx.fillStyle=color;
      ctx.textAlign="center"; ctx.textBaseline="middle";
      ctx.strokeStyle="rgba(255,255,255,0.88)"; ctx.lineWidth=2.5; ctx.lineJoin="round";
      ctx.strokeText(text, x, y); ctx.fillText(text, x, y);
      ctx.restore();
    };
    const pad = 10;
    drawFrozenAxisLabel("+a* rouge", SIZE-pad, SIZE/2, "rgba(185,30,30,0.9)");
    drawFrozenAxisLabel("−a* vert",  pad,       SIZE/2, "rgba(20,110,20,0.9)");
    drawFrozenAxisLabel("+b* jaune", SIZE/2,    pad,    "rgba(140,100,0,0.9)");
    drawFrozenAxisLabel("−b* bleu",  SIZE/2,    SIZE-pad, "rgba(15,55,185,0.9)");
    const rDE=deMax*labToPxScale;
    const {x:sx,y:sy}=l2p(std.a,std.b);
    ctx.beginPath(); ctx.arc(sx,sy,rDE,0,Math.PI*2);
    ctx.strokeStyle="rgba(124,58,237,0.7)"; ctx.lineWidth=1.5; ctx.setLineDash([5,3]); ctx.stroke(); ctx.setLineDash([]);
    // Formules points
    formules.forEach((f,fi) => {
      const {x,y}=l2p(f.a,f.b);
      ctx.beginPath(); ctx.moveTo(x-5,y-5); ctx.lineTo(x+5,y+5); ctx.moveTo(x+5,y-5); ctx.lineTo(x-5,y+5);
      ctx.strokeStyle=COLS[fi]; ctx.lineWidth=2.5; ctx.stroke();
      ctx.font="bold 10px sans-serif"; ctx.fillStyle=COLS[fi]; ctx.textAlign="center"; ctx.textBaseline="bottom";
      ctx.fillText("F"+(fi+1),x,y-7);
    });
    // Standard point
    const {x:stx,y:sty}=l2p(std.a,std.b);
    ctx.beginPath(); ctx.arc(stx,sty,5,0,Math.PI*2); ctx.fillStyle="#18181b"; ctx.fill();
    ctx.font="bold 10px sans-serif"; ctx.fillStyle="#18181b"; ctx.textAlign="center"; ctx.textBaseline="bottom";
    ctx.fillText("STD",stx,sty-7);
  }, [std, formules, deMax, zoom, showColor, showIsoTon, showIsoSat, COLS, deType, canvasSize]);
  return (
    <div style={{marginTop:10}}>
      <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:6,flexWrap:"wrap"}}>
        <button onClick={()=>setZoom(ZOOM_STEPS[Math.max(0,zoomIdx-1)])} disabled={zoomIdx===0} style={{padding:"2px 7px",fontSize:11,cursor:"pointer",border:"1px solid #e4e4e7",borderRadius:4,background:"#f4f4f5"}}>−</button>
        <span style={{fontSize:10,fontWeight:700,minWidth:32,textAlign:"center"}}>×{zoom}</span>
        <button onClick={()=>setZoom(ZOOM_STEPS[Math.min(ZOOM_STEPS.length-1,zoomIdx+1)])} style={{padding:"2px 7px",fontSize:11,cursor:"pointer",border:"1px solid #e4e4e7",borderRadius:4,background:"#f4f4f5"}}>+</button>
        <button onClick={()=>setShowColor(v=>!v)} style={{padding:"2px 7px",fontSize:10,cursor:"pointer",border:"1px solid #e4e4e7",borderRadius:4,background:showColor?"#f0fdf4":"#f4f4f5",color:showColor?"#166534":"#525252"}}>
          {showColor?"Enlever couleur":"Mettre couleur"}
        </button>
        <button onClick={()=>setShowIsoTon(v=>!v)} style={{padding:"2px 7px",fontSize:10,cursor:"pointer",border:`1px solid ${showIsoTon?"#b45309":"#e4e4e7"}`,borderRadius:4,background:showIsoTon?"#fff7ed":"#f4f4f5",color:showIsoTon?"#b45309":"#525252",whiteSpace:"nowrap"}}>
          {showIsoTon?"Enlever iso-ton.":"Mettre iso-ton."}
        </button>
        <button onClick={()=>setShowIsoSat(v=>!v)} style={{padding:"2px 7px",fontSize:10,cursor:"pointer",border:`1px solid ${showIsoSat?"#1d4ed8":"#e4e4e7"}`,borderRadius:4,background:showIsoSat?"#eff6ff":"#f4f4f5",color:showIsoSat?"#1d4ed8":"#525252",whiteSpace:"nowrap"}}>
          {showIsoSat?"Enlever iso-sat.":"Mettre iso-sat."}
        </button>
        <span style={{fontSize:9,color:"#888",marginLeft:4}}>Taille</span>
        <input type="range" min={200} max={600} step={20} value={canvasSize}
          onChange={e=>setCanvasSize(+e.target.value)}
          style={{width:70,accentColor:"#525252",cursor:"pointer"}} />
        <span style={{fontSize:9,fontWeight:700,fontFamily:"monospace",minWidth:28,color:"#525252"}}>{canvasSize}</span>
      </div>
      <canvas ref={canvasRef} width={canvasSize} height={canvasSize}
        style={{borderRadius:8,border:"1px solid #e4e4e7",display:"block",maxWidth:"100%"}}/>
    </div>
  );
}

// --- FormulaReminderButton ----------------------------------------------------
function FormulaReminderButton({ deType, std, katexRef, compact=false }) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);
  const label = deType==="cmc" ? "ΔE CMC(1:1)" : deType==="ch" ? "ΔE₇₆+C*h°" : "ΔE₇₆ (CIELab)";

  const Tex = ({ t, display }) => {
    const ref = useRef(null);
    useEffect(() => {
      if (!ref.current) return;
      const K = katexRef?.current || window.katex;
      if (!K) return;
      try { K.render(t, ref.current, { throwOnError:false, displayMode:!!display }); } catch(e){}
    }, [t, display]);
    return <span ref={ref} style={{ display: display?"block":"inline" }} />;
  };

  const headStyle = { fontSize:9, fontWeight:800, color:"#525252", letterSpacing:".08em", textTransform:"uppercase", marginTop:14, marginBottom:4 };
  const rowStyle = { background:"#f8f8fb", borderRadius:6, padding:"8px 12px", marginBottom:4, border:"1px solid #ede9fe" };
  const blueRow = { background:"#eff6ff", borderRadius:6, padding:"8px 12px", marginBottom:4, border:"1px solid #bfdbfe" };

  // Compute example values
  const ex2 = { L: parseFloat((std.L+1.2).toFixed(2)), a: parseFloat((std.a-0.8).toFixed(2)), b: parseFloat((std.b+1.5).toFixed(2)) };
  const dL2 = parseFloat((ex2.L-std.L).toFixed(2));
  const da2 = parseFloat((ex2.a-std.a).toFixed(2));
  const db2 = parseFloat((ex2.b-std.b).toFixed(2));
  const deS = Math.sqrt(dL2**2+da2**2+db2**2);
  const cmcR = deltaCMC(std, ex2);
  const dC2 = parseFloat((Math.sqrt(ex2.a**2+ex2.b**2)-Math.sqrt(std.a**2+std.b**2)).toFixed(4));
  const dH2 = parseFloat(Math.sqrt(Math.max(0,da2**2+db2**2-dC2**2)).toFixed(4));

  const handleExportFormulas = () => {
    const popupEl = containerRef.current; if (!popupEl) return;
    const cloneHtml = popupEl.innerHTML;
    const links = Array.from(document.querySelectorAll("link[rel=\"stylesheet\"]")).map(l=>l.href).filter(h=>h.includes("katex"));
    const katexLink = links.length ? `<link rel="stylesheet" href="${links[0]}">` : "";
    const isCmc = deType==="cmc";
    const title = isCmc ? "ΔE CMC(1:1) -- Différence colorimétrique perceptuelle" : deType==="ch" ? "ΔE₇₆+C*h° -- Contrôle cylindrique" : "ΔE₇₆ -- Différence colorimétrique CIELab 1976";
    const win = window.open("","_blank"); if (!win) return;
    win.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"/><title>${title}</title>${katexLink}<style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:-apple-system,sans-serif;background:#fff;padding:32px;max-width:860px;margin:auto;color:#18181b}.katex-display{margin:6px 0;overflow-x:auto}@media print{body{padding:16px}button{display:none!important}}</style></head><body><div style="margin-bottom:24px"><div style="font-size:20px;font-weight:900;margin-bottom:6px">${title}</div></div><hr style="border:none;border-top:1px solid #e4e4e7;margin-bottom:20px"/>${cloneHtml}<script>document.querySelectorAll("button").forEach(b=>b.remove());setTimeout(()=>window.print(),600);<\/script></body></html>`);
    win.document.close();
  };

  return (
    <>
      <button onClick={()=>setOpen(true)} style={{
        fontSize:compact?9:10, fontWeight:700, padding:compact?"3px 8px":"6px 14px", cursor:"pointer",
        border:"1px solid #7c3aed", borderRadius:6, background:"#f5f3ff", color:"#7c3aed",
        display:"flex", alignItems:"center", gap:4, whiteSpace:"nowrap", flexShrink:0,
      }}>
        <span style={{fontSize:compact?11:14}}>∑</span>
        {compact ? "Formules" : `Rappel des formules (${label})`}
      </button>
      {open && (
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.45)",zIndex:9998,display:"flex",alignItems:"flex-start",justifyContent:"center",overflowY:"auto",padding:"24px 8px"}} onClick={()=>setOpen(false)}>
          <div ref={containerRef} onClick={e=>e.stopPropagation()} style={{background:"#fff",borderRadius:14,padding:24,width:"92%",maxWidth:820,boxShadow:"0 8px 40px rgba(0,0,0,0.25)"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:20}}>
              <div>
                <div style={{fontSize:17,fontWeight:900,color:"#18181b",marginBottom:4}}>
                  {deType==="simple" ? "ΔE₇₆  --  Différence colorimétrique CIELab 1976" : deType==="ch" ? "ΔE₇₆+C*h°  --  Contrôle colorimétrique cylindrique" : "ΔE CMC(1:1)  --  Différence colorimétrique perceptuelle"}
                </div>
                <div style={{fontSize:10,color:"#7c3aed",fontWeight:700,lineHeight:1.5}}>
                  {deType==="simple" ? "Distance euclidienne dans l'espace L*a*b* · CIE 1976 · Uniforme pour les petits écarts" : deType==="ch" ? "ΔE₇₆ + contrôle séparé ΔC* (saturation) et Δh° (teinte)" : "Clarke et al. 1984 · Ellipse de tolérance adaptée à la couleur · l=c=1"}
                </div>
              </div>
              <div style={{display:"flex",gap:8,flexShrink:0,marginLeft:16}}>
                <button onClick={handleExportFormulas} style={{fontSize:10,fontWeight:700,padding:"5px 12px",cursor:"pointer",border:"1px solid #185FA5",borderRadius:7,background:"#EFF6FF",color:"#185FA5"}}>⬇ Exporter</button>
                <button onClick={()=>setOpen(false)} style={{border:"none",background:"none",fontSize:20,cursor:"pointer",color:"#888"}}>×</button>
              </div>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0 24px"}}>
              <div>
                <div style={{fontSize:11,fontWeight:800,color:"#18181b",marginBottom:8,paddingBottom:4,borderBottom:"1.5px solid #e4e4e7"}}>Formules générales</div>
                <div style={headStyle}>Étape 1 -- Écarts</div>
                <div style={rowStyle}>
                  <Tex t={"\\Delta L^* = L^*_f - L^*_s"} display />
                  <Tex t={"\\Delta a^* = a^*_f - a^*_s"} display />
                  <Tex t={"\\Delta b^* = b^*_f - b^*_s"} display />
                </div>
                {deType==="simple" || deType==="ch" ? (
                  <>
                    <div style={headStyle}>Étape 2 -- ΔE₇₆</div>
                    <div style={rowStyle}>
                      <Tex t={"\\Delta E_{76} = \\sqrt{(\\Delta L^*)^2 + (\\Delta a^*)^2 + (\\Delta b^*)^2}"} display />
                    </div>
                    {deType==="ch" && (<>
                      <div style={headStyle}>Étape 3 -- C* et h° (coordonnées cylindriques)</div>
                      <div style={rowStyle}>
                        <Tex t={"C^*_1 = \\sqrt{(a^*_1)^2+(b^*_1)^2},\\quad C^*_2 = \\sqrt{(a^*_2)^2+(b^*_2)^2}"} display />
                        <Tex t={"\\Delta C^* = C^*_2 - C^*_1"} display />
                        <Tex t={"h_1 = \\arctan\\left(\\frac{b^*_1}{a^*_1}\\right),\\quad \\Delta h^\\circ = h_2 - h_1"} display />
                      </div>
                    </>)}
                  </>
                ) : (
                  <>
                    <div style={headStyle}>Étape 2 -- C* et h du standard</div>
                    <div style={rowStyle}>
                      <Tex t={"C^*_1 = \\sqrt{(a^*_1)^2 + (b^*_1)^2}"} display />
                      <Tex t={"h_1 = \\arctan\\left(\\frac{b^*_1}{a^*_1}\\right)"} display />
                    </div>
                    <div style={headStyle}>Étape 3 -- Facteurs de pondération</div>
                    <div style={rowStyle}>
                      <Tex t={"S_L = \\frac{0.040975\\,L^*}{1+0.01765\\,L^*} \\quad (L^* \\geq 16)"} display />
                      <Tex t={"S_C = \\frac{0.0638\\,C^*_1}{1+0.0131\\,C^*_1}+0.638"} display />
                      <Tex t={"F = \\sqrt{\\frac{(C^*_1)^4}{(C^*_1)^4+1900}},\\quad S_H = S_C(F\\,T+1-F)"} display />
                    </div>
                    <div style={headStyle}>Étape 4 -- ΔE CMC(l:c)</div>
                    <div style={rowStyle}>
                      <Tex t={"\\Delta C^* = C^*_2 - C^*_1"} display />
                      <Tex t={"\\Delta H^* = \\sqrt{(\\Delta a^*)^2+(\\Delta b^*)^2-(\\Delta C^*)^2}"} display />
                      <Tex t={"\\Delta E_{CMC} = \\sqrt{\\left(\\frac{\\Delta L^*}{l\\,S_L}\\right)^2+\\left(\\frac{\\Delta C^*}{c\\,S_C}\\right)^2+\\left(\\frac{\\Delta H^*}{S_H}\\right)^2}"} display />
                    </div>
                  </>
                )}
                <div style={{fontSize:9,color:"#888",fontStyle:"italic",marginTop:8}}>
                  {deType==="cmc" ? "Clarke et al., 1984. l=c=1 (acceptation)." : deType==="ch" ? "Contrôle triple : ΔE + ΔC* + Δh° doivent tous être dans les tolérances." : "Distance euclidienne dans L*a*b*. Référence : CIE 1976."}
                </div>
              </div>
              <div>
                <div style={{fontSize:11,fontWeight:800,color:"#18181b",marginBottom:8,paddingBottom:4,borderBottom:"1.5px solid #e4e4e7"}}>Exemple numérique</div>
                <div style={{fontSize:9,color:"#888",fontStyle:"italic",marginBottom:8}}>
                  Standard (L*={std.L.toFixed(2)}, a*={std.a.toFixed(2)}, b*={std.b.toFixed(2)})<br/>
                  Formule (L*={ex2.L}, a*={ex2.a}, b*={ex2.b})
                </div>
                <div style={headStyle}>Étape 1</div>
                <div style={blueRow}>
                  <Tex t={`\\Delta L^* = ${ex2.L} - (${std.L.toFixed(2)}) = ${dL2>=0?"+":""}${dL2}`} display />
                  <Tex t={`\\Delta a^* = ${ex2.a} - (${std.a.toFixed(2)}) = ${da2>=0?"+":""}${da2}`} display />
                  <Tex t={`\\Delta b^* = ${ex2.b} - (${std.b.toFixed(2)}) = ${db2>=0?"+":""}${db2}`} display />
                </div>
                {deType==="simple"||deType==="ch" ? (
                  <>
                    <div style={headStyle}>Étape 2</div>
                    <div style={blueRow}><Tex t={`\\Delta E = \\sqrt{${dL2}^2+${da2}^2+${db2}^2} = ${deS.toFixed(4)}`} display /></div>
                    {deType==="ch" && (<>
                      <div style={headStyle}>Étape 3</div>
                      <div style={blueRow}>
                        <Tex t={`\\Delta C^* = ${dC2.toFixed(4)},\\quad \\Delta h^\\circ = ${dH2.toFixed(4)}`} display />
                      </div>
                    </>)}
                  </>
                ) : (
                  <>
                    <div style={headStyle}>Étape 2</div>
                    <div style={blueRow}><Tex t={`C^*_1 = ${cmcR.C1.toFixed(4)},\\quad h_1 = ${cmcR.h1.toFixed(2)}^\\circ`} display /></div>
                    <div style={headStyle}>Étape 3</div>
                    <div style={blueRow}><Tex t={`S_L=${cmcR.SL.toFixed(4)},\\; S_C=${cmcR.SC.toFixed(4)},\\; S_H=${cmcR.SH.toFixed(4)}`} display /></div>
                    <div style={headStyle}>Étape 4</div>
                    <div style={blueRow}>
                      <Tex t={`\\Delta C^*=${dC2.toFixed(4)},\\; \\Delta H^*=${dH2.toFixed(4)}`} display />
                      <Tex t={`\\Delta E_{CMC}=${cmcR.de.toFixed(4)}`} display />
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}


// --- COLS ---------------------------------------------------------------------
const COLS = ["#e74c3c","#3498db","#2ecc71","#f39c12","#9b59b6","#1abc9c","#e67e22","#e91e63"];

// --- ExerciceDE ---------------------------------------------------------------
function ExerciceDE() {
  const [ex, setEx] = useState(() => genExercice("simple"));
  const [inputs, setInputs] = useState(() => Array(3).fill(null).map(()=>({dL:"",da:"",db:"",dC:"",dh:"",de:""})));
  const [rowValid, setRowValid] = useState([false,false,false]);
  const [rowCorr, setRowCorr]   = useState([false,false,false]);
  const [choix, setChoix]       = useState(null);
  const [q3, setQ3]             = useState({clarte:"",rouge:"",jaune:"",saturation:""});
  const [showDisc, setShowDisc] = useState(false);
  const [equPopup, setEquPopup] = useState(null);
  const [allowedTypes, setAllowedTypes] = useState({simple:true, cmc:false, ch:false});
  const discExportRef = useRef(null);
  const katexRef = useRef(null);

  useEffect(() => {
    if (window.katex) { katexRef.current = window.katex; return; }
    const link = document.createElement("link"); link.rel="stylesheet";
    link.href="https://cdnjs.cloudflare.com/ajax/libs/KaTeX/0.16.9/katex.min.css";
    document.head.appendChild(link);
    const script = document.createElement("script");
    script.src="https://cdnjs.cloudflare.com/ajax/libs/KaTeX/0.16.9/katex.min.js";
    script.onload = () => { katexRef.current = window.katex; };
    document.head.appendChild(script);
  }, []);

  const reset = () => {
    const opts = Object.entries(allowedTypes).filter(([,v])=>v).map(([k])=>k);
    const t = opts.length>0 ? opts[Math.floor(Math.random()*opts.length)] : "simple";
    setEx(genExercice(t));
    setInputs(Array(3).fill(null).map(()=>({dL:"",da:"",db:"",dC:"",dh:"",de:""})));
    setRowValid([false,false,false]); setRowCorr([false,false,false]);
    setChoix(null); setQ3({clarte:"",rouge:"",jaune:"",saturation:""}); setShowDisc(false);
  };

  const { std, deMax, dCmax, dhMax, deType, formules, trickIdx } = ex;
  const okIdx = ex.okIdx;
  const correct = (fi) => deType==="cmc" ? deltaCMC(std, formules[fi]) : dEval(std, formules[fi]);
  const parse = (v) => parseFloat((v||"").toString().replace(",","."));
  const stdC = Math.sqrt(std.a**2+std.b**2).toFixed(1);
  const stdH = ((Math.atan2(std.b,std.a)*180/Math.PI+360)%360).toFixed(1);
  const setInp = (fi,key,val) => setInputs(prev=>prev.map((row,i)=>i===fi?{...row,[key]:val}:row));

  // Q2 unlocks
  const q2Unlocked = (() => {
    const c = correct(okIdx); const inp = inputs[okIdx];
    const deOk = Math.abs(parse(inp.de)-c.de)<=0.05;
    if (deType==="ch") {
      const dCOk = Math.abs(parse(inp.dC)-c.dC)<=0.05;
      const dhOk = Math.abs(parse(inp.dh)-c.dh)<=0.05;
      return (deOk && dCOk && dhOk) || rowCorr[okIdx];
    }
    return deOk || rowCorr[okIdx];
  })();
  const q3Unlocked = choix === okIdx;

  // handleExport
  const handleExport = () => {
    const canvas = discExportRef.current;
    const W=600, H=canvas?canvas.height+300:700;
    const exp=document.createElement("canvas"); exp.width=W; exp.height=H;
    const ctx=exp.getContext("2d"); ctx.fillStyle="#fff"; ctx.fillRect(0,0,W,H);
    ctx.fillStyle="#18181b"; ctx.font="bold 16px sans-serif"; ctx.fillText("Exercice -- Contrôle colorimétrique",24,36);
    ctx.font="12px sans-serif"; ctx.fillStyle="#525252";
    ctx.fillText(`Formule : ΔE${deType==="cmc"?" CMC(1:1)":deType==="ch"?"₇₆+C*h°":"₇₆"}   ·   ΔEmax = ${deMax}${dCmax?`   ·   ΔC*max=${dCmax}   ·   Δh°max=${dhMax}°`:""}`, 24, 58);
    ctx.font="11px sans-serif"; ctx.fillStyle="#333";
    const obj=`Objectif : Calculer les écarts colorimétriques entre le standard et chaque formule, puis identifier la formule qui respecte le cahier des charges (ΔE ≤ ${deMax}${dCmax?`, |ΔC*| ≤ ${dCmax}, |Δh°| ≤ ${dhMax}°`:""}).`;
    const words=obj.split(' '); let line2=''; let lineY=80;
    for (const w of words) { const t=line2+(line2?' ':'')+w; if(ctx.measureText(t).width>W-48){ctx.fillText(line2,24,lineY);lineY+=16;line2=w;}else{line2=t;} }
    if(line2){ctx.fillText(line2,24,lineY);lineY+=20;}
    ctx.strokeStyle="#e4e4e7"; ctx.lineWidth=0.5; ctx.beginPath(); ctx.moveTo(24,lineY); ctx.lineTo(W-24,lineY); ctx.stroke(); lineY+=14;
    ctx.font="bold 11px sans-serif"; ctx.fillStyle="#18181b"; ctx.fillText("Standard :",24,lineY);
    ctx.font="11px monospace"; ctx.fillStyle="#333"; ctx.fillText(`L* = ${std.L.toFixed(2)}   a* = ${std.a.toFixed(2)}   b* = ${std.b.toFixed(2)}`,100,lineY); lineY+=22;
    ctx.font="bold 11px sans-serif"; ctx.fillStyle="#18181b"; ctx.fillText("Formules à évaluer :",24,lineY); lineY+=18;
    const fcols=["#e74c3c","#3498db","#2ecc71"];
    formules.forEach((f,fi) => { ctx.font="bold 11px sans-serif"; ctx.fillStyle=fcols[fi]; ctx.fillText(`Formule ${fi+1} :`,24,lineY+fi*20); ctx.font="11px monospace"; ctx.fillStyle="#333"; ctx.fillText(`L* = ${f.L.toFixed(2)}   a* = ${f.a.toFixed(2)}   b* = ${f.b.toFixed(2)}`,110,lineY+fi*20); });
    lineY+=formules.length*20+10;
    const tableY=lineY;
    const hdrs = deType==="ch" ? ["Formule","L*","a*","b*","C*","h°","ΔL*","Δa*","Δb*","ΔC*","Δh°","ΔE"] : ["Formule","L*","a*","b*","ΔL*","Δa*","Δb*","ΔE"];
    ctx.font="bold 10px sans-serif"; ctx.fillStyle="#525252";
    hdrs.forEach((h,i)=>ctx.fillText(h,24+i*60,tableY));
    ctx.strokeStyle="#ccc"; ctx.lineWidth=0.5; ctx.beginPath(); ctx.moveTo(24,tableY+6); ctx.lineTo(W-24,tableY+6); ctx.stroke();
    formules.forEach((f,fi) => {
      const y2=tableY+22+fi*22; ctx.font="bold 10px sans-serif"; ctx.fillStyle=fcols[fi]; ctx.fillText(`F${fi+1}`,24,y2);
      ctx.font="10px monospace"; ctx.fillStyle="#333"; [f.L,f.a,f.b].forEach((v,i)=>ctx.fillText(v.toFixed(2),24+(i+1)*60,y2));
      const nDelta=deType==="ch"?6:4;
      for(let i=0;i<nDelta;i++){ctx.strokeStyle="#ccc"; ctx.strokeRect(24+(i+(deType==="ch"?5:3))*60,y2-13,52,16);}
    });
    if(canvas){const discW=Math.min(canvas.width,W-48),scale=discW/canvas.width,discH=canvas.height*scale,discX=(W-discW)/2,discY=tableY+90;ctx.drawImage(canvas,discX,discY,discW,discH);}
    const a=document.createElement("a"); a.download=`exercice_${Date.now()}.png`; a.href=exp.toDataURL("image/png"); a.click();
  };

  // EquationPopup component
  const EquationPopup = ({ fi, onClose }) => {
    const c = correct(fi); const f = formules[fi]; const popupRef = useRef(null);
    useEffect(() => {
      if (!popupRef.current || !katexRef.current) return;
      const K = katexRef.current;
      const render = (id, tex) => { const el=popupRef.current.querySelector(`#${id}`); if(el) K.render(tex,el,{throwOnError:false,displayMode:true}); };
      render("eq-dL",`\\Delta L^* = ${f.L.toFixed(2)} - (${std.L.toFixed(2)}) = ${c.dL.toFixed(2)}`);
      render("eq-da",`\\Delta a^* = ${f.a.toFixed(2)} - (${std.a.toFixed(2)}) = ${c.da.toFixed(2)}`);
      render("eq-db",`\\Delta b^* = ${f.b.toFixed(2)} - (${std.b.toFixed(2)}) = ${c.db.toFixed(2)}`);
      if(deType==="cmc"){
        const r=deltaCMC(std,f);
        render("eq-C1",`C^*_1 = \\sqrt{${std.a.toFixed(2)}^2+${std.b.toFixed(2)}^2} = ${r.C1.toFixed(2)}`);
        render("eq-SL",`S_L = ${r.SL.toFixed(4)}`); render("eq-SC",`S_C = ${r.SC.toFixed(4)}`); render("eq-SH",`S_H = ${r.SH.toFixed(4)}`);
        const dC=Math.sqrt(f.a**2+f.b**2)-r.C1; const dH=Math.sqrt(Math.max(0,c.da**2+c.db**2-dC**2));
        render("eq-dC",`\\Delta C^* = ${dC.toFixed(4)}`); render("eq-dH",`\\Delta H^* = ${dH.toFixed(4)}`);
        render("eq-de",`\\Delta E_{CMC} = \\sqrt{\\left(\\frac{${c.dL.toFixed(2)}}{${r.SL.toFixed(3)}}\\right)^2+\\left(\\frac{${dC.toFixed(2)}}{${r.SC.toFixed(3)}}\\right)^2+\\left(\\frac{${dH.toFixed(2)}}{${r.SH.toFixed(3)}}\\right)^2} = ${c.de.toFixed(4)}`);
      } else {
        if(deType==="ch"){
          render("eq-dC",`\\Delta C^* = ${c.dC.toFixed(4)}`); render("eq-dh",`\\Delta h^\\circ = ${c.dh.toFixed(4)}`);
        }
        render("eq-de",`\\Delta E = \\sqrt{(${c.dL.toFixed(2)})^2+(${c.da.toFixed(2)})^2+(${c.db.toFixed(2)})^2} = ${c.de.toFixed(4)}`);
      }
    },[]);
    return (
      <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.4)",zIndex:9999,display:"flex",alignItems:"center",justifyContent:"center"}} onClick={onClose}>
        <div ref={popupRef} onClick={e=>e.stopPropagation()} style={{background:"#fff",borderRadius:12,padding:24,maxWidth:480,width:"90%",boxShadow:"0 8px 40px rgba(0,0,0,0.2)"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
            <div style={{fontSize:13,fontWeight:800}}>∑ Détail du calcul -- Formule {fi+1}</div>
            <button onClick={onClose} style={{border:"none",background:"none",fontSize:20,cursor:"pointer",color:"#888"}}>×</button>
          </div>
          <div style={{background:"#f8f8ff",borderRadius:8,padding:12,border:"1px solid #ede9fe",marginBottom:8}}><div id="eq-dL"/><div id="eq-da"/><div id="eq-db"/></div>
          {deType==="cmc"&&<><div style={{background:"#f0fdf4",borderRadius:8,padding:12,border:"1px solid #bbf7d0",marginBottom:8}}><div id="eq-C1"/><div id="eq-SL"/><div id="eq-SC"/><div id="eq-SH"/></div><div style={{background:"#f0fdf4",borderRadius:8,padding:12,border:"1px solid #bbf7d0",marginBottom:8}}><div id="eq-dC"/><div id="eq-dH"/></div></>}
          {deType==="ch"&&<div style={{background:"#f0fdf4",borderRadius:8,padding:12,border:"1px solid #bbf7d0",marginBottom:8}}><div id="eq-dC"/><div id="eq-dh"/></div>}
          <div style={{background:"#eff6ff",borderRadius:8,padding:12,border:"1px solid #bfdbfe"}}><div id="eq-de"/></div>
        </div>
      </div>
    );
  };

  return (
    <div style={{display:"flex",flexDirection:"column",gap:10}}>
      {equPopup!==null && <EquationPopup fi={equPopup} onClose={()=>setEquPopup(null)} />}

      {/* Header */}
      <div style={{background:"#fff",border:"0.5px solid #e4e4e7",borderRadius:11,padding:14}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:10,flexWrap:"wrap"}}>
          <div>
            <div style={{fontSize:12,fontWeight:800,marginBottom:4}}>Exercice -- Contrôle colorimétrique</div>
            <div style={{fontSize:10,color:"#525252",lineHeight:1.6}}>
              Votre société fabrique un produit en plastique teinté dans la masse.<br/>
              Vous devez valider une formule de coloration par rapport au standard ci-dessous.
            </div>
          </div>
          <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
            {/* TYPE checkboxes */}
            <div style={{display:"flex",gap:10,alignItems:"center",padding:"4px 12px",background:"#f4f4f5",borderRadius:6,border:"0.5px solid #e4e4e7"}}>
              <span style={{fontSize:11,fontWeight:800,color:"#525252",letterSpacing:".04em"}}>TYPE :</span>
              {[["simple","ΔE₇₆"],["cmc","ΔE CMC"],["ch","ΔE₇₆+C*h°"]].map(([key,lbl])=>(
                <label key={key} style={{display:"flex",alignItems:"center",gap:4,cursor:"pointer",fontSize:11,fontWeight:700,
                  color:allowedTypes[key]?(key==="cmc"?"#7c3aed":key==="ch"?"#92400e":"#185FA5"):"#aaa"}}>
                  <input type="checkbox" checked={allowedTypes[key]}
                    onChange={e=>setAllowedTypes(prev=>({...prev,[key]:e.target.checked}))}
                    style={{accentColor:key==="cmc"?"#7c3aed":key==="ch"?"#d97706":"#185FA5",cursor:"pointer"}} />
                  {lbl}
                </label>
              ))}
            </div>
            <button onClick={reset} style={{fontSize:10,fontWeight:700,padding:"5px 12px",cursor:"pointer",border:"1px solid #e4e4e7",borderRadius:6,background:"#f4f4f5",color:"#525252",whiteSpace:"nowrap"}}>
              🔄 Nouvel exercice
            </button>
            <button onClick={handleExport} style={{fontSize:10,fontWeight:700,padding:"5px 12px",cursor:"pointer",border:"1px solid #185FA5",borderRadius:6,background:"#EFF6FF",color:"#185FA5",whiteSpace:"nowrap"}}>
              ⬇ Exporter énoncé
            </button>
          </div>
        </div>

        {/* Standard + tolerance -- 50/50 */}
        <div style={{display:"flex",gap:10,marginTop:12,flexWrap:"wrap"}}>
          <div style={{flex:1,minWidth:180,background:"#f4f4f5",borderRadius:8,padding:"10px 14px"}}>
            <div style={{fontSize:9,fontWeight:800,letterSpacing:".06em",textTransform:"uppercase",color:"#525252",marginBottom:8}}>Standard (référence)</div>
            <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
              {[["L*",std.L,"#888"],["a*",std.a,"#c0392b"],["b*",std.b,"#e6ac00"]].map(([k,v,c])=>(
                <div key={k} style={{textAlign:"center"}}>
                  <div style={{fontSize:8,color:c,fontWeight:700}}>{k}</div>
                  <div style={{fontSize:14,fontWeight:800,fontFamily:"monospace",color:c}}>{v.toFixed(2)}</div>
                </div>
              ))}
              <div style={{width:32,height:32,borderRadius:6,background:labToHex(std.L,std.a,std.b),border:"1.5px solid rgba(0,0,0,0.15)",flexShrink:0}} />
              <div style={{fontSize:9,color:"#525252"}}>
                <div>C* = {stdC}</div><div>h = {stdH}°</div>
                <div style={{fontWeight:700}}>{hueName(std.a,std.b)}</div>
              </div>
            </div>
          </div>
          <div style={{flex:1,minWidth:180,background:"#fff3cd",border:"1px solid #ffc107",borderRadius:8,padding:"10px 14px",display:"flex",flexDirection:"column",justifyContent:"center",gap:4}}>
            <div style={{fontSize:9,fontWeight:800,letterSpacing:".06em",textTransform:"uppercase",color:"#856404",marginBottom:2}}>Tolérance cahier des charges</div>
            <div style={{fontSize:20,fontWeight:900,fontFamily:"monospace",color:"#856404"}}>
              ΔE<sup style={{fontSize:11}}>{deType==="cmc"?"CMC":""}</sup><sub style={{fontSize:13}}>max</sub> = {deMax}
            </div>
            {deType==="ch"&&(
              <div style={{fontSize:13,fontWeight:800,fontFamily:"monospace",color:"#856404"}}>
                ΔC*<sub style={{fontSize:11}}>max</sub> = {dCmax} · Δh°<sub style={{fontSize:11}}>max</sub> = {dhMax}°
              </div>
            )}
            <div style={{display:"inline-flex",alignItems:"center",gap:5,marginTop:2}}>
              <span style={{fontSize:9,fontWeight:700,padding:"2px 8px",borderRadius:10,
                background:deType==="cmc"?"#e0e7ff":deType==="ch"?"#fef3c7":"#f0fdf4",
                color:deType==="cmc"?"#3730a3":deType==="ch"?"#92400e":"#166534",
                border:`1px solid ${deType==="cmc"?"#818cf8":deType==="ch"?"#fcd34d":"#86efac"}`}}>
                {deType==="cmc"?"Formule ΔE CMC(1:1)":deType==="ch"?"ΔE₇₆ + ΔC* + Δh°":"Formule ΔE₇₆"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Q1 */}
      <div style={{background:"#fff",border:"0.5px solid #e4e4e7",borderRadius:11,padding:14}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10,gap:8}}>
          <div style={{fontSize:11,fontWeight:800}}>Q1 -- Calculez les écarts colorimétriques pour chaque formule</div>
          <FormulaReminderButton deType={deType} std={std} katexRef={katexRef} compact />
        </div>
        <div style={{fontSize:9,color:"#525252",marginBottom:10,fontStyle:"italic"}}>
          {deType==="cmc"
            ? <>Rappel ΔE CMC(1:1) : ΔL*=L<sub>f</sub>−L<sub>s</sub> · Δa*=a<sub>f</sub>−a<sub>s</sub> · ΔE = √[(ΔL*/S<sub>L</sub>)²+(ΔC*/S<sub>C</sub>)²+(ΔH*/S<sub>H</sub>)²]</>
            : deType==="ch"
            ? <>Rappel : ΔL*=L<sub>f</sub>−L<sub>s</sub> · ΔE=√(ΔL*²+Δa*²+Δb*²) · ΔC*=C*<sub>f</sub>−C*<sub>s</sub> · Δh°=h<sub>f</sub>−h<sub>s</sub></>
            : <>Rappel : ΔL* = L*<sub>formule</sub> − L*<sub>standard</sub> · ΔE = √(ΔL*²+Δa*²+Δb*²)</>}
        </div>
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
            <thead>
              <tr style={{background:"#f4f4f5"}}>
                <th style={{padding:"6px 10px",textAlign:"left",fontWeight:700,fontSize:9}}></th>
                {(deType==="ch"
                  ? ["L*","a*","b*","C*","h°","ΔL*","Δa*","Δb*","ΔC*","Δh°","ΔE","",""]
                  : ["L*","a*","b*","ΔL*","Δa*","Δb*","ΔE","",""]
                ).map((h,i)=>(
                  <th key={i} style={{padding:"6px 8px",textAlign:"center",fontWeight:700,fontSize:9,
                    color:h.startsWith("Δ")?"#185FA5":(h==="C*"||h==="h°")?"#1D9E75":"#525252"}}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {/* Standard row */}
              <tr style={{borderBottom:"2px solid #e4e4e7"}}>
                <td style={{padding:"6px 10px",fontWeight:700,fontSize:10,whiteSpace:"nowrap"}}>
                  <span style={{display:"inline-flex",alignItems:"center",gap:5}}>
                    <span style={{width:10,height:10,borderRadius:2,background:labToHex(std.L,std.a,std.b),flexShrink:0,border:"1px solid #0002"}} />
                    Standard
                  </span>
                </td>
                {[std.L,std.a,std.b].map((v,i)=>(
                  <td key={i} style={{padding:"6px 8px",textAlign:"center",fontFamily:"monospace",fontWeight:700,fontSize:11}}>{v.toFixed(2)}</td>
                ))}
                {deType==="ch"&&[parseFloat(stdC),parseFloat(stdH)].map((v,i)=>(
                  <td key={i} style={{padding:"6px 8px",textAlign:"center",fontFamily:"monospace",fontWeight:700,fontSize:11,color:"#1D9E75"}}>{v.toFixed(2)}{i===1?"°":""}</td>
                ))}
                <td colSpan={deType==="ch"?8:6} style={{textAlign:"center",color:"#aaa",fontSize:9}}>--</td>
              </tr>
              {/* Formule rows */}
              {formules.map((f,fi)=>{
                const c = correct(fi); const inp = inputs[fi];
                const rowValidated = rowValid[fi]; const rowCorrected = rowCorr[fi];
                const isOk = (k,cv) => Math.abs(parse(inp[k])-cv)<=0.05;
                const requiredKeys = deType==="ch"
                  ? [["dL",c.dL],["da",c.da],["db",c.db],["dC",c.dC],["dh",c.dh],["de",c.de]]
                  : [["dL",c.dL],["da",c.da],["db",c.db],["de",c.de]];
                const allOk = requiredKeys.every(([k,cv])=>isOk(k,cv));
                const rowBorder = rowValidated?(allOk?"2px solid #1D9E75":"1px solid #E24B4A"):"1px solid #f0f0f0";
                const fC=Math.sqrt(f.a**2+f.b**2);
                const fH=((Math.atan2(f.b,f.a)*180/Math.PI)+360)%360;
                return (
                  <tr key={fi} style={{borderBottom:rowBorder,background:fi%2===0?"#fafafa":"#fff"}}>
                    <td style={{padding:"6px 10px",fontWeight:700,fontSize:10,whiteSpace:"nowrap"}}>
                      <span style={{display:"inline-flex",alignItems:"center",gap:5}}>
                        <span style={{width:10,height:10,borderRadius:2,background:labToHex(f.L,f.a,f.b),flexShrink:0,border:"1px solid #0002"}} />
                        <span style={{color:COLS[fi]}}>Formule {fi+1}</span>
                        {rowCorr[fi]&&fi===trickIdx&&(
                          <span style={{fontSize:7,fontWeight:800,padding:"1px 5px",borderRadius:8,background:"#fff3cd",color:"#856404",border:"0.5px solid #ffc107",marginLeft:2}}>⚠ ΔL* important !</span>
                        )}
                      </span>
                    </td>
                    {[f.L,f.a,f.b].map((v,i)=>(
                      <td key={i} style={{padding:"4px 8px",textAlign:"center",fontFamily:"monospace",fontWeight:700,fontSize:11}}>{v.toFixed(2)}</td>
                    ))}
                    {deType==="ch"&&[fC,fH].map((v,i)=>(
                      <td key={i} style={{padding:"4px 8px",textAlign:"center",fontFamily:"monospace",fontWeight:700,fontSize:11,color:"#1D9E75"}}>
                        {v.toFixed(2)}{i===1?"°":""}
                      </td>
                    ))}
                    {[...([["dL",c.dL],["da",c.da],["db",c.db]].concat(deType==="ch"?[["dC",c.dC],["dh",c.dh]]:[]).concat([["de",c.de]]))].map(([k,cv])=>{
                      const ok=isOk(k,cv);
                      const bg=!rowValidated?"#fff":ok?"#d4f4e2":"#fde8e8";
                      const border=!rowValidated?"#e4e4e7":ok?"#1D9E75":"#E24B4A";
                      const isChExtra=(k==="dC"||k==="dh");
                      return (
                        <td key={k} style={{padding:"4px 6px",textAlign:"center"}}>
                          {rowCorrected?(
                            <div style={{fontFamily:"monospace",fontWeight:800,fontSize:11,
                              color:isChExtra?"#1D9E75":"#185FA5",
                              background:isChExtra?"#d4f4e2":"#EFF6FF",
                              border:`1.5px solid ${isChExtra?"#1D9E75":"#185FA5"}`,
                              borderRadius:5,padding:"3px 6px",display:"inline-block"}}>
                              {cv.toFixed(2)}{k==="dh"?"°":""}
                            </div>
                          ):(
                            <input type="text" inputMode="decimal" value={inp[k]}
                              onChange={e=>!rowValidated&&setInp(fi,k,e.target.value.replace(",","."))}
                              disabled={rowValidated} placeholder="?"
                              style={{width:58,fontSize:11,fontWeight:700,fontFamily:"monospace",
                                border:`1.5px solid ${border}`,borderRadius:5,padding:"3px 5px",textAlign:"right",
                                background:bg,outline:"none",transition:"background .2s,border-color .2s",
                                cursor:rowValidated?"default":"text"}} />
                          )}
                        </td>
                      );
                    })}
                    <td style={{padding:"4px 6px",whiteSpace:"nowrap"}}>
                      {!rowValidated&&!rowCorrected&&(
                        <button onClick={()=>{
                          const deOk=isOk("de",c.de);
                          if(deOk){
                            const filled={...inp};
                            const allCols=deType==="ch"?[["dL",c.dL],["da",c.da],["db",c.db],["dC",c.dC],["dh",c.dh],["de",c.de]]:[["dL",c.dL],["da",c.da],["db",c.db],["de",c.de]];
                            allCols.forEach(([k,cv])=>{if(!isOk(k,cv))filled[k]=cv.toFixed(2);});
                            setInputs(prev=>prev.map((row,i)=>i===fi?filled:row));
                          }
                          setRowValid(rv=>{const n=[...rv];n[fi]=true;return n;});
                        }} style={{fontSize:9,fontWeight:700,padding:"3px 9px",cursor:"pointer",border:"1px solid #185FA5",borderRadius:5,background:"#185FA5",color:"#fff",whiteSpace:"nowrap"}}>Valider</button>
                      )}
                      {rowValidated&&allOk&&!rowCorrected&&<span style={{fontSize:12,color:"#1D9E75"}}>✓</span>}
                    </td>
                    <td style={{padding:"4px 6px"}}>
                      {!rowCorrected?(
                        <button onClick={()=>{setRowCorr(rc=>{const n=[...rc];n[fi]=true;return n;});setRowValid(rv=>{const n=[...rv];n[fi]=true;return n;});}}
                          style={{fontSize:9,fontWeight:700,padding:"3px 9px",cursor:"pointer",border:"1px solid #e4e4e7",borderRadius:5,background:"#f4f4f5",color:"#525252",whiteSpace:"nowrap"}}>Correction</button>
                      ):(
                        <button onClick={()=>setEquPopup(fi)}
                          style={{fontSize:9,fontWeight:700,padding:"3px 9px",cursor:"pointer",border:"1px solid #7c3aed",borderRadius:5,background:"#f5f3ff",color:"#7c3aed",whiteSpace:"nowrap"}}>∑ Équation</button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Visualiser button */}
      <div style={{display:"flex",alignItems:"center",gap:10}}>
        <button onClick={()=>setShowDisc(v=>!v)}
          style={{fontSize:10,fontWeight:700,padding:"5px 12px",cursor:"pointer",border:"1px solid #e4e4e7",borderRadius:6,background:showDisc?"#f0fdf4":"#f4f4f5",color:showDisc?"#166534":"#525252"}}>
          📊 {showDisc?"Masquer":"Visualiser"} les points
        </button>
      </div>
      {showDisc&&(
        <FrozenDisc std={std} formules={formules} deMax={deMax} okIdx={okIdx} COLS={COLS} deType={deType} exportRef={discExportRef} />
      )}

      {/* Q2 */}
      {q2Unlocked&&(
        <div style={{background:"#fff",border:"0.5px solid #e4e4e7",borderRadius:11,padding:14}}>
          <div style={{fontSize:11,fontWeight:800,marginBottom:10}}>Q2 -- Quelle formule respecte le cahier des charges ?</div>
          <div style={{fontSize:9,color:"#525252",marginBottom:12,fontStyle:"italic"}}>
            {deType==="ch"
              ? <>Sélectionnez la formule qui respecte <strong>les trois critères simultanément</strong> : ΔE ≤ {deMax} ET |ΔC*| ≤ {dCmax} ET |Δh°| ≤ {dhMax}°</>
              : <>Sélectionnez la formule dont le ΔE{deType==="cmc"?" CMC":""} ≤ {deMax}</>}
          </div>
          <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
            {formules.map((f,fi)=>{
              const c=correct(fi);
              const isOkDE=c.de<=deMax;
              const isOkCh=deType!=="ch"||( Math.abs(c.dC)<=dCmax && Math.abs(c.dh)<=dhMax);
              const isCorrect=fi===okIdx;
              const selected=choix===fi;
              const hasFeedback=selected;
              return (
                <button key={fi} onClick={()=>{if(choix===null||choix===fi)setChoix(fi);}}
                  style={{padding:"10px 18px",borderRadius:8,cursor:"pointer",fontWeight:700,fontSize:11,
                    border:hasFeedback?`2px solid ${isCorrect?"#1D9E75":"#E24B4A"}`:"1px solid #e4e4e7",
                    background:hasFeedback?(isCorrect?"#d4f4e2":"#fde8e8"):"#f4f4f5",
                    color:hasFeedback?(isCorrect?"#166534":"#991b1b"):COLS[fi]}}>
                  <div style={{marginBottom:4}}>Formule {fi+1}</div>
                  <div style={{fontSize:9,fontWeight:400,color:"#666"}}>ΔE = {c.de.toFixed(2)}{deType==="ch"?` · ΔC*=${c.dC.toFixed(2)} · Δh°=${c.dh.toFixed(2)}°`:""}</div>
                  {hasFeedback&&(
                    <div style={{marginTop:6,fontSize:9,fontWeight:700,color:isCorrect?"#166534":"#991b1b"}}>
                      {isCorrect ? (
                        deType==="ch"
                          ? `✓ Tous les critères sont respectés : ΔE=${c.de.toFixed(2)}≤${deMax} · |ΔC*|=${Math.abs(c.dC).toFixed(2)}≤${dCmax} · |Δh°|=${Math.abs(c.dh).toFixed(2)}≤${dhMax}°`
                          : `✓ ΔE = ${c.de.toFixed(2)} ≤ ${deMax} -- dans la tolérance`
                      ) : (
                        deType==="ch" ? (() => {
                          const reasons=[];
                          if(!isOkDE) reasons.push(`ΔE=${c.de.toFixed(2)}>${deMax}`);
                          if(Math.abs(c.dC)>dCmax) reasons.push(`|ΔC*|=${Math.abs(c.dC).toFixed(2)}>${dCmax}`);
                          if(Math.abs(c.dh)>dhMax) reasons.push(`|Δh°|=${Math.abs(c.dh).toFixed(2)}>${dhMax}°`);
                          return "✗ Hors tolérance : "+reasons.join(" · ");
                        })() : `✗ ΔE = ${c.de.toFixed(2)} > ${deMax} -- hors tolérance`
                      )}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Q3 */}
      {q3Unlocked&&(
        <div style={{background:"#fff",border:"0.5px solid #e4e4e7",borderRadius:11,padding:14}}>
          <div style={{fontSize:11,fontWeight:800,marginBottom:8}}>Q3 -- Interprétez les écarts de la formule retenue</div>
          <div style={{fontSize:9,color:"#525252",marginBottom:12,fontStyle:"italic"}}>Pour chaque attribut, indiquez si la formule est plus (+), moins (−) ou identique (=) au standard</div>
          {(()=>{
            const c=correct(okIdx);
            const attrs=[
              {key:"clarte",label:"Clarté (L*)",val:c.dL,pos:"Plus clair",neg:"Plus sombre",nul:"Même clarté"},
              {key:"rouge",label:"Rouge/Vert (a*)",val:c.da,pos:"Plus rouge",neg:"Plus vert",nul:"Même a*"},
              {key:"jaune",label:"Jaune/Bleu (b*)",val:c.db,pos:"Plus jaune",neg:"Plus bleu",nul:"Même b*"},
              {key:"saturation",label:"Saturation (C*)",val:c.dC,pos:"Plus saturé",neg:"Moins saturé",nul:"Même saturation"},
            ];
            return attrs.map(({key,label,val,pos,neg,nul})=>{
              const correctAns=Math.abs(val)<0.05?"nul":val>0?"pos":"neg";
              return (
                <div key={key} style={{marginBottom:10}}>
                  <div style={{fontSize:10,fontWeight:700,marginBottom:4}}>{label} <span style={{fontSize:9,color:"#888",fontWeight:400}}>({val>=0?"+":""}{val.toFixed(2)})</span></div>
                  <div style={{display:"flex",gap:6}}>
                    {[["pos",pos],["neg",neg],["nul",nul]].map(([v,lbl])=>{
                      const sel=q3[key]===v; const isRight=v===correctAns;
                      return (
                        <button key={v} onClick={()=>setQ3(prev=>({...prev,[key]:v}))}
                          style={{padding:"4px 10px",fontSize:10,cursor:"pointer",borderRadius:6,fontWeight:sel?700:400,
                            border:sel?`2px solid ${isRight?"#1D9E75":"#E24B4A"}`:"1px solid #e4e4e7",
                            background:sel?(isRight?"#d4f4e2":"#fde8e8"):"#f4f4f5",
                            color:sel?(isRight?"#166534":"#991b1b"):"#525252"}}>
                          {lbl}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            });
          })()}
        </div>
      )}
    </div>
  );
}

export default function CIELABExplorer() {
  const [tab,       setTab]       = useState("carto");
  const [Lval,      setLval]      = useState(60);
  const [zoom,      setZoom]      = useState(1);
  const [showColor, setShowColor] = useState(true);
  const [showGrid,  setShowGrid]  = useState(true);
  const [coordMode, setCoordMode] = useState("ab");
  const [showEllipse, setShowEllipse] = useState(false);
  const [ellipseDE,   setEllipseDE]   = useState(1.0);
  const [ellipseFormula, setEllipseFormula] = useState("76");
  const [ellipseCmcL, setEllipseCmcL] = useState(1);
  const [ellipseCmcC, setEllipseCmcC] = useState(1);
  const [points,    setPoints]    = useState([
    { id: "p1", L: 60, a: 40,  b: 15, name: "" },
    { id: "p2", L: 60, a: -28, b: 40, name: "" },
  ]);
  const exportRef = useRef(null);

  const ZOOM_STEPS = [1, 1.5, 2, 3, 4, 6, 8, 10, 15, 20, 30, 50, 75, 100];
  const zoomIdx = ZOOM_STEPS.findIndex(s => Math.abs(s - zoom) < 0.01);
  const handleLval = (v) => { setLval(v); };

  // pairA/pairB store stable point IDs, not array indices
  const [pairA, setPairA] = useState("p1");
  const [pairB, setPairB] = useState("p2");

  // Resolve IDs -> current indices for disc line drawing
  const idxA = points.findIndex(p => p.id === pairA);
  const idxB = points.findIndex(p => p.id === pairB);

  const disc = (
    <AbDisc L={Lval} points={points} setPoints={setPoints}
      zoom={zoom} setZoom={setZoom}
      showColor={showColor} showGrid={showGrid} Lval={Lval}
      coordMode={coordMode} exportRef={exportRef}
      pairA={pairA} pairB={pairB}
      showDelta={tab === "analyse"}
      showEllipse={tab==="analyse" && showEllipse}
      ellipseDE={ellipseDE} ellipseFormula={ellipseFormula}
      ellipseCmcL={ellipseCmcL} ellipseCmcC={ellipseCmcC}
      pairLine={tab === "analyse" && idxA >= 0 && idxB >= 0 && idxA !== idxB ? [idxA, idxB] : null} />
  );

  const toolbar = (
    <div style={{
      display: "flex", flexWrap: "wrap", alignItems: "center", gap: 5,
      padding: "6px 12px", marginBottom: 10,
      background: "var(--color-background-primary)",
      borderRadius: 10, border: "1px solid var(--color-border-secondary)",
      boxShadow: "var(--shadow-sm)",
    }}>
      <span style={{ fontSize: 9, fontWeight: 700, color: "var(--color-text-secondary)", letterSpacing: ".06em" }}>L*</span>
      <input type="range" min={10} max={95} value={Lval} onChange={e => handleLval(+e.target.value)}
        style={{ width: 72, accentColor: "#18181b", cursor: "pointer" }} />
      <span style={{ fontSize: 11, fontWeight: 700, minWidth: 20, fontFamily: "monospace", color: "var(--color-text-primary)" }}>{Lval}</span>
      <Sep />
      <span style={{ fontSize: 9, fontWeight: 700, color: "var(--color-text-secondary)", letterSpacing: ".06em" }}>ZOOM</span>
      <button className="cielab-tb-btn" onClick={() => setZoom(ZOOM_STEPS[Math.max(0, zoomIdx - 1)])} disabled={zoomIdx === 0} title="Dézoomer">
        <ZoomOut size={13} />
      </button>
      <span style={{ fontSize: 11, fontWeight: 700, minWidth: 28, textAlign: "center", fontFamily: "monospace" }}>×{zoom}</span>
      <button className="cielab-tb-btn" onClick={() => setZoom(ZOOM_STEPS[Math.min(ZOOM_STEPS.length - 1, zoomIdx + 1)])} disabled={zoomIdx === ZOOM_STEPS.length - 1} title="Zoomer">
        <ZoomIn size={13} />
      </button>
      {zoom !== 1 && (
        <button className="cielab-tb-btn" onClick={() => setZoom(1)} title="Réinitialiser zoom">
          <RotateCcw size={11} />
        </button>
      )}
      <Sep />
      <button className={`cielab-tb-btn${showColor ? " active-clr" : ""}`} onClick={() => setShowColor(v => !v)} title={showColor ? "Désactiver couleur" : "Activer couleur"}>
        {showColor ? <Eye size={13} /> : <EyeOff size={13} />}
      </button>
      <button className={`cielab-tb-btn${showGrid ? " active-grid" : ""}`} onClick={() => setShowGrid(v => !v)} title={showGrid ? "Masquer grille" : "Afficher grille"}>
        <Grid3x3 size={13} />
      </button>
      {tab === "analyse" && (
        <>
          <button className={`cielab-tb-btn${showEllipse ? " active-clr" : ""}`}
            onClick={() => setShowEllipse(v => !v)}
            style={showEllipse ? { background: "#7c3aed", color: "#fff", borderColor: "#7c3aed" } : {}}>
            <span style={{ fontSize: 10, fontWeight: 800 }}>ΔE</span>
          </button>
          {showEllipse && (
            <div style={{ display: "flex", alignItems: "center", gap: 4, background: "var(--color-background-secondary)", borderRadius: 8, padding: "3px 8px", border: "1px solid #e4e4e7", flexWrap: "wrap" }}>
              {[["76","ΔE₇₆"],["cmc","ΔE CMC"],["2000","ΔE₂₀₀₀"]].map(([key, lbl]) => (
                <button key={key} onClick={() => setEllipseFormula(key)} style={{
                  fontSize: 9, fontWeight: 700, padding: "2px 8px", cursor: "pointer",
                  borderRadius: 5, border: `1px solid ${ellipseFormula===key?"#7c3aed":"#e4e4e7"}`,
                  background: ellipseFormula===key ? "#7c3aed" : "#fff",
                  color: ellipseFormula===key ? "#fff" : "#525252",
                }}>{lbl}</button>
              ))}
              <Sep />
              <span style={{ fontSize: 9, color: "#888" }}>val</span>
              <button onClick={() => setEllipseDE(v => Math.max(0.1, Math.round((v-0.1)*10)/10))} style={{ width:16, border:"none", background:"transparent", cursor:"pointer", fontSize:10, fontWeight:700, color:"#525252" }}>‹</button>
              <span style={{ fontSize: 11, fontWeight: 700, fontFamily: "monospace", minWidth: 28, textAlign: "center", color: "#7c3aed" }}>{ellipseDE.toFixed(1)}</span>
              <button onClick={() => setEllipseDE(v => Math.min(20, Math.round((v+0.1)*10)/10))} style={{ width:16, border:"none", background:"transparent", cursor:"pointer", fontSize:10, fontWeight:700, color:"#525252" }}>›</button>
              {ellipseFormula === "cmc" && (<>
                <Sep />
                <span style={{ fontSize: 9, color: "#888" }}>l</span>
                <button onClick={() => setEllipseCmcL(v => Math.max(0.5, Math.round((v-0.5)*10)/10))} style={{ width:16, border:"none", background:"transparent", cursor:"pointer", fontSize:10, color:"#525252" }}>‹</button>
                <span style={{ fontSize: 10, fontWeight: 700, fontFamily: "monospace", minWidth: 24, textAlign:"center", color:"#185FA5" }}>{ellipseCmcL.toFixed(1)}</span>
                <button onClick={() => setEllipseCmcL(v => Math.min(4, Math.round((v+0.5)*10)/10))} style={{ width:16, border:"none", background:"transparent", cursor:"pointer", fontSize:10, color:"#525252" }}>›</button>
                <span style={{ fontSize: 9, color: "#888" }}>c</span>
                <button onClick={() => setEllipseCmcC(v => Math.max(0.5, Math.round((v-0.5)*10)/10))} style={{ width:16, border:"none", background:"transparent", cursor:"pointer", fontSize:10, color:"#525252" }}>‹</button>
                <span style={{ fontSize: 10, fontWeight: 700, fontFamily: "monospace", minWidth: 24, textAlign:"center", color:"#185FA5" }}>{ellipseCmcC.toFixed(1)}</span>
                <button onClick={() => setEllipseCmcC(v => Math.min(4, Math.round((v+0.5)*10)/10))} style={{ width:16, border:"none", background:"transparent", cursor:"pointer", fontSize:10, color:"#525252" }}>›</button>
              </>)}
            </div>
          )}
        </>
      )}
      <div style={{ marginLeft: "auto" }}>
        <button className="cielab-export-btn" onClick={() => exportRef.current && exportRef.current()} title="Exporter PNG">
          <Download size={12} /> PNG
        </button>
      </div>
    </div>
  );

  return (
    <div style={{ fontFamily: "var(--font-sans, sans-serif)", padding: "1rem 0 2rem", width: "100%" }}>
      <CSSInjector />
      <Tabs value={tab} onValueChange={setTab} className="w-full">
        <TabsList className="mb-2 h-9" style={{ marginLeft: 90, display: "inline-flex" }}>
          {["carto","analyse","exercice","explorer","theory"].map(v => (
            <TabsTrigger key={v} value={v} activeValue={tab} onValueChange={setTab}>
              {v==="carto"?"CIE LAB":v==="analyse"?"Analyse ΔE":v==="exercice"?"Exercice":v==="explorer"?"Explorateur":"Théorie"}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {/* -- SHARED DISC LAYOUT -- */}
      {(tab === "carto" || tab === "analyse") && (
        <div>
          {toolbar}
          <div style={{ display: "flex", gap: 10, justifyContent: "center", alignItems: "flex-start" }}>
            <CoordPill coordMode={coordMode} setCoordMode={setCoordMode} />
            <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ maxWidth: "calc(100vh - 140px)", display: "flex", gap: 8, alignItems: "stretch" }}>
                <div style={{ flex: 1, minWidth: 0 }}>{disc}</div>
                {tab === "analyse" && (
                  <div style={{ width: 200, flexShrink: 0, alignSelf: "flex-start" }}>
                    <DeltaPanel points={points} pairA={pairA} setPairA={setPairA} pairB={pairB} setPairB={setPairB} compact />
                  </div>
                )}
                <div style={{ width: 112, alignSelf: "stretch", flexShrink: 0 }}><LAxis points={points} setPoints={setPoints} /></div>
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === "exercice" && (
        <div style={{ padding: "0 4px" }}>
          <ExerciceDE />
        </div>
      )}

      {tab === "explorer" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 11, padding: 14 }}>
            <div style={{ fontSize: 9, fontWeight: 800, color: "var(--color-text-secondary)", letterSpacing: ".07em", textTransform: "uppercase", marginBottom: 12 }}>Point ① courant</div>
            {points.length > 0 ? <>
              <div style={{ height: 60, borderRadius: 7, background: labToHex(points[0].L, points[0].a, points[0].b), marginBottom: 10, border: "0.5px solid rgba(0,0,0,0.07)" }} />
              <div style={{ display: "grid", gridTemplateColumns: "repeat(6,1fr)", gap: 5, marginBottom: 10 }}>
                {[["L*",points[0].L.toFixed(1),"#888"],["a*",points[0].a.toFixed(1),"#c0392b"],["b*",points[0].b.toFixed(1),"#e6ac00"],
                  ["C*",Math.sqrt(points[0].a**2+points[0].b**2).toFixed(1),"#1D9E75"],
                  ["h°",(((Math.atan2(points[0].b,points[0].a)*180/Math.PI)+360)%360).toFixed(1)+"°","#185FA5"],
                  ["HEX",labToHex(points[0].L,points[0].a,points[0].b).toUpperCase(),"#888"]
                ].map(([k,v,c]) => (
                  <div key={k} style={{ background: "var(--color-background-secondary)", borderRadius: 6, padding: "5px 3px", textAlign: "center" }}>
                    <div style={{ fontSize: 8, color: "var(--color-text-secondary)", marginBottom: 2, letterSpacing: ".04em" }}>{k}</div>
                    <div style={{ fontSize: k==="HEX"?7:12, fontWeight: 700, fontFamily: "monospace", color: c }}>{v}</div>
                  </div>
                ))}
              </div>
            </> : <div style={{ textAlign: "center", fontSize: 11, color: "var(--color-text-secondary)", padding: "16px 0" }}>Ajoutez un point depuis Plan a*b*</div>}
          </div>
          <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 11, padding: 14 }}>
            <div style={{ fontSize: 9, fontWeight: 800, color: "var(--color-text-secondary)", letterSpacing: ".07em", textTransform: "uppercase", marginBottom: 12 }}>Contrôles (point ①)</div>
            {points.length > 0 ? <>
              <Slider label="L*" color="#888" min={0} max={100} step={0.1} value={points[0].L}
                onChange={v => setPoints(pts => pts.map((p,i) => i===0?{...p,L:Math.round(v*10)/10}:p))} />
              <Slider label="a*  rouge(+) / vert(−)" color="#c0392b" min={-ARANGE} max={ARANGE} step={0.1} value={points[0].a}
                onChange={v => setPoints(pts => pts.map((p,i) => i===0?{...p,a:Math.round(v*10)/10}:p))} />
              <Slider label="b*  jaune(+) / bleu(−)" color="#e6ac00" min={-ARANGE} max={ARANGE} step={0.1} value={points[0].b}
                onChange={v => setPoints(pts => pts.map((p,i) => i===0?{...p,b:Math.round(v*10)/10}:p))} />
              <div style={{ marginTop: 12 }}>
                <div style={{ fontSize: 9, fontWeight: 800, color: "var(--color-text-secondary)", letterSpacing: ".07em", textTransform: "uppercase", marginBottom: 7 }}>Préréglages</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                  {[["Rouge vif",50,72,38],["Vert herbe",72,-45,51],["Bleu nuit",32,15,-50],
                    ["Jaune soleil",85,-5,80],["Rouge profond",27,50,36],["Neutre",50,0,0]].map(([name,L,a,b]) => (
                    <button key={name} onClick={() => setPoints(pts => pts.map((p,i) => i===0?{...p,L,a,b}:p))}
                      style={{ fontSize: 10, padding: "3px 8px", cursor: "pointer", border: "0.5px solid var(--color-border-secondary)", background: "var(--color-background-secondary)", borderRadius: 5, display: "flex", alignItems: "center", gap: 4 }}>
                      <span style={{ width: 8, height: 8, borderRadius: 2, background: labToHex(L,a,b), flexShrink: 0 }} />{name}
                    </button>
                  ))}
                </div>
              </div>
            </> : null}
          </div>
        </div>
      )}

      {tab === "theory" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 11, padding: 14 }}>
            <div style={{ fontSize: 9, fontWeight: 800, color: "var(--color-text-secondary)", letterSpacing: ".07em", textTransform: "uppercase", marginBottom: 12 }}>Historique CIELAB</div>
            {[["1931 -- CIE XYZ","Premières valeurs tristimulus standardisées. Précis mais sans corrélation perceptive."],
              ["1905–1942 -- Munsell & MacAdam","Atlas perceptif + ellipses MacAdam : non-uniformité visuelle de CIE31."],
              ["1976 -- CIELAB","Transformation non-linéaire de XYZ. ΔE ≈ écart visuel perçu."]].map(([t,d]) => (
              <div key={t} style={{ padding: "8px 10px", background: "var(--color-background-secondary)", borderRadius: 6, marginBottom: 6 }}>
                <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 2 }}>{t}</div>
                <div style={{ fontSize: 10, color: "var(--color-text-secondary)", lineHeight: 1.6 }}>{d}</div>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 11, padding: 14 }}>
              <div style={{ fontSize: 9, fontWeight: 800, color: "var(--color-text-secondary)", letterSpacing: ".07em", textTransform: "uppercase", marginBottom: 10 }}>Transformation XYZ {'->'}  L*a*b*</div>
              <div style={{ fontFamily: "monospace", fontSize: 10, background: "var(--color-background-secondary)", padding: "9px 11px", borderRadius: 6, lineHeight: 2 }}>
                f(t) = t^(1/3) si t {">"} 0.008856<br />
                f(t) = 7.787·t + 16/116 sinon<br /><br />
                <span style={{ color: "#888" }}>L* = 116·f(Y/Yn) − 16</span><br />
                <span style={{ color: "#c0392b" }}>a* = 500·[f(X/Xn) − f(Y/Yn)]</span><br />
                <span style={{ color: "#e6ac00" }}>b* = 200·[f(Y/Yn) − f(Z/Zn)]</span>
              </div>
              <div style={{ marginTop: 7, fontSize: 10, color: "var(--color-text-secondary)" }}>D65/2° : Xn=95.04 · Yn=100 · Zn=108.88</div>
            </div>
            <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 11, padding: 14 }}>
              <div style={{ fontSize: 9, fontWeight: 800, color: "var(--color-text-secondary)", letterSpacing: ".07em", textTransform: "uppercase", marginBottom: 10 }}>Formules clés</div>
              <div style={{ fontFamily: "monospace", fontSize: 10, background: "var(--color-background-secondary)", padding: "9px 11px", borderRadius: 6, lineHeight: 2 }}>
                <span style={{ color: "#1D9E75" }}>C* = √(a*² + b*²)  {'->'}  saturation</span><br />
                <span style={{ color: "#185FA5" }}>h  = arctan(b*/a*) {'->'}  teinte (0–360°)</span><br />
                <span style={{ color: "#E24B4A" }}>ΔE = √(ΔL*² + Δa*² + Δb*²)</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}