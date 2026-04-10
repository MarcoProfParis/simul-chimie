import { useState, useRef, useEffect, useCallback, forwardRef, useImperativeHandle } from "react";
import { useTheme } from "../../ThemeContext";
import { SPECTRUM_LOCUS } from "./spectrumLocus";

// Point-in-polygon test for the gamut bounded by spectrum locus + purple line
function isInsideGamut(px, py) {
  // Build polygon: spectrum locus points (380→780) + purple line closing segment
  const locus = SPECTRUM_LOCUS.filter(p => p.nm >= 380);
  const poly = locus.map(p => [p.x, p.y]);
  // poly[0] is 380nm, poly[last] is 780nm — connect with straight purple line
  let inside = false;
  const n = poly.length;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if (((yi > py) !== (yj > py)) && (px < (xj - xi) * (py - yi) / (yj - yi) + xi)) {
      inside = !inside;
    }
  }
  return inside;
}

const _planckXY = (T) => {
  let x;
  if (T >= 1667 && T <= 4000) x = -0.2661239e9/(T*T*T) - 0.2343580e6/(T*T) + 0.8776956e3/T + 0.179910;
  else if (T > 4000 && T <= 25000) x = -3.0258469e9/(T*T*T) + 2.1070379e6/(T*T) + 0.2226347e3/T + 0.240390;
  else return null;
  let y;
  if (T >= 1667 && T <= 2222) y = -1.1063814*x*x*x - 1.34811020*x*x + 2.18555832*x - 0.20219683;
  else if (T > 2222 && T <= 4000) y = -0.9549476*x*x*x - 1.37418593*x*x + 2.09137015*x - 0.16748867;
  else y = 3.0817580*x*x*x - 5.87338670*x*x + 3.75112997*x - 0.37001483;
  return { x, y };
};

const ILLUMINANTS = {
  D65: { ...(_planckXY(6504) || { x: 0.3127, y: 0.3290 }), label: "D65 (Lumière du jour)", cct: 6504 },
  A:   { ...(_planckXY(2856) || { x: 0.4476, y: 0.4074 }), label: "A (Lampe incandescente)", cct: 2856 },
  C:   { ...(_planckXY(6774) || { x: 0.3101, y: 0.3162 }), label: "C (Lumière naturelle moyenne)", cct: 6774 },
  E:   { x: 0.3333, y: 0.3333, label: "E (Blanc égal)", cct: null },
};

const PRIMARY_SETS = {
  sRGB:     { r: { x: 0.6400, y: 0.3300 }, g: { x: 0.3000, y: 0.6000 }, b: { x: 0.1500, y: 0.0600 }, label: "sRGB / HDTV" },
  AdobeRGB: { r: { x: 0.6400, y: 0.3300 }, g: { x: 0.2100, y: 0.7100 }, b: { x: 0.1500, y: 0.0600 }, label: "Adobe RGB" },
  DCI_P3:   { r: { x: 0.6800, y: 0.3200 }, g: { x: 0.2650, y: 0.6900 }, b: { x: 0.1500, y: 0.0600 }, label: "DCI-P3 (Cinéma)" },
};

function nmToRGB(nm) {
  let r = 0, g = 0, b = 0;
  if (nm >= 380 && nm < 440) { r = -(nm - 440) / 60; b = 1; }
  else if (nm >= 440 && nm < 490) { g = (nm - 440) / 50; b = 1; }
  else if (nm >= 490 && nm < 510) { g = 1; b = -(nm - 510) / 20; }
  else if (nm >= 510 && nm < 580) { r = (nm - 510) / 70; g = 1; }
  else if (nm >= 580 && nm < 645) { r = 1; g = -(nm - 645) / 65; }
  else if (nm >= 645 && nm <= 780) { r = 1; }
  let factor = 1;
  if (nm >= 380 && nm < 420) factor = 0.3 + 0.7 * (nm - 380) / 40;
  else if (nm > 700 && nm <= 780) factor = 0.3 + 0.7 * (780 - nm) / 80;
  r = Math.round(Math.pow(Math.max(r * factor, 0), 0.8) * 255);
  g = Math.round(Math.pow(Math.max(g * factor, 0), 0.8) * 255);
  b = Math.round(Math.pow(Math.max(b * factor, 0), 0.8) * 255);
  return `rgb(${r},${g},${b})`;
}

const W = 780, H = 780;
const PAD = { l: 48, r: 28, t: 28, b: 48 };
const PW = W - PAD.l - PAD.r;
const PH = H - PAD.t - PAD.b;

function useCanvasColors(dark) {
  return {
    ink:        dark ? "rgba(240,240,240,0.90)" : "rgba(20,20,20,0.85)",
    inkStrong:  dark ? "rgba(255,255,255,0.95)" : "rgba(10,10,10,0.90)",
    inkMid:     dark ? "rgba(200,200,200,0.70)" : "rgba(30,30,30,0.55)",
    inkLight:   dark ? "rgba(180,180,180,0.45)" : "rgba(0,0,0,0.35)",
    dotFill:    dark ? "rgba(220,220,220,0.88)" : "rgba(20,20,20,0.85)",
    dotStroke:  dark ? "#1e293b"                : "white",
    gridMajor:  dark ? "rgba(255,255,255,0.20)" : "rgba(0,0,0,0.35)",
    gridMinor:  dark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.18)",
    locus:      dark ? "rgba(255,255,255,0.55)" : "rgba(0,0,0,0.60)",
    labelBg:    dark ? "rgba(15,23,42,0.85)"    : "rgba(20,20,20,0.82)",
    labelFg:    dark ? "#e2e8f0"                : "white",
    planck:     dark ? "rgba(255,255,255,0.75)" : "rgba(0,0,0,0.85)",
    planckTick: dark ? "rgba(200,200,200,0.40)" : "rgba(0,0,0,0.40)",
    satLine:    dark ? "rgba(160,160,160,0.55)" : "rgba(20,20,20,0.55)",
    satDot:     dark ? "rgba(180,180,180,0.75)" : "rgba(20,20,20,0.70)",
    purpleLine: dark ? "rgba(180,120,210,0.55)" : "rgba(140,100,160,0.50)",
    macadam:    dark ? "rgba(200,200,200,0.75)" : "rgba(20,20,20,0.80)",
    wlLabel:    dark ? "rgba(220,220,220,0.88)" : "rgba(20,20,20,0.85)",
    wlLabelC:   dark ? "rgba(230,160,80,0.90)"  : "rgba(140,60,0,0.85)",
    reticle:    dark ? "rgba(200,200,200,0.40)" : "rgba(20,20,20,0.45)",
    reticleDot: dark ? "rgba(180,180,180,0.65)" : "rgba(20,20,20,0.70)",
    axis:       dark ? "rgba(210,210,210,0.85)" : "rgba(30,30,30,0.90)",
  };
}

const ChromaticityDiagram = forwardRef(function ChromaticityDiagram({ illuminant, onHover, userPoints = [], onAddPoint, onMovePoint, showReticle = true, onToggleReticle, showPlanckian = false, onTogglePlanckian, macadamFactor = 0, onSetMacadam, showColorFill = true, onToggleColorFill, onDblClickPoint, onClickPoint, onToggleAllSat, allSatOn = false, annotations = [], onAnnotationsChange }, ref) {
  const canvasRef = useRef(null);
  const [hovered, setHovered] = useState(null);
  const { dark } = useTheme();
  const C = useCanvasColors(dark);

  useImperativeHandle(ref, () => ({ getCanvas: () => canvasRef.current }));
  const [view, setView] = useState([0, 0, 0.85, 0.85]);
  const viewRef = useRef([0, 0, 0.85, 0.85]);
  const [mode, setMode] = useState("point");
  const modeRef = useRef("point");
  const switchMode = (m) => { modeRef.current = m; setMode(m); };
  const panStartRef = useRef(null);
  const dragPointRef = useRef(null);
  const mouseDownPosRef = useRef(null);
  const [nearPoint, setNearPoint] = useState(false);
  const drawingRef = useRef(null);
  const [hint, setHint] = useState(null);
  const hintTimerRef = useRef(null);

  const toCv = useCallback((x, y, v) => {
    const [x0, y0, x1, y1] = v;
    const cx = PAD.l + (x - x0) / (x1 - x0) * (W - PAD.l - PAD.r);
    const cy = PAD.t + (1 - (y - y0) / (y1 - y0)) * (H - PAD.t - PAD.b);
    return [cx, cy];
  }, []);

  const draw = useCallback((v) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, W, H);
    const [vx0, vy0, vx1, vy1] = v;
    const toC = (x, y) => {
      const cx = PAD.l + (x - vx0) / (vx1 - vx0) * (W - PAD.l - PAD.r);
      const cy = PAD.t + (1 - (y - vy0) / (vy1 - vy0)) * (H - PAD.t - PAD.b);
      return [cx, cy];
    };

    const LOCUS_380 = SPECTRUM_LOCUS.filter(p => p.nm >= 380);

    const buildLocusPath = (path, toCfn) => {
      let started = false;
      let skipUntil460 = false;
      const pts = LOCUS_380;
      for (let i = 0; i < pts.length; i++) {
        const { nm, x, y } = pts[i];
        const [cx, cy] = toCfn(x, y);
        if (!started) { path.moveTo(cx, cy); started = true; continue; }
        if (nm === 460 && skipUntil460) {
          const p400 = pts.find(p => p.nm === 400);
          if (p400) {
            const [x400, y400] = toCfn(p400.x, p400.y);
            const cpx = (x400 + cx) / 2 + (cy - y400) * 0.15;
            const cpy = (y400 + cy) / 2 - (cx - x400) * 0.15;
            path.quadraticCurveTo(cpx, cpy, cx, cy);
          } else { path.lineTo(cx, cy); }
          skipUntil460 = false; continue;
        }
        if (nm > 400 && nm < 460) { skipUntil460 = true; continue; }
        if (nm === 400 && !skipUntil460) { skipUntil460 = true; path.lineTo(cx, cy); continue; }
        if (nm > 505 && nm <= 530) {
          const prev = pts[i - 1];
          const next = pts[Math.min(i + 1, pts.length - 1)];
          const pp   = pts[Math.max(i - 2, 0)];
          const [px2, py2] = toCfn(prev.x, prev.y);
          const [nx2, ny2] = toCfn(next.x, next.y);
          const [ppx, ppy] = toCfn(pp.x, pp.y);
          const cp1x = px2 + (cx - ppx) / 6; const cp1y = py2 + (cy - ppy) / 6;
          const cp2x = cx - (nx2 - px2) / 6;  const cp2y = cy - (ny2 - py2) / 6;
          path.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, cx, cy);
        } else { path.lineTo(cx, cy); }
      }
    };

    const locusPath = new Path2D();
    buildLocusPath(locusPath, toC);
    locusPath.closePath();

    const off = document.createElement("canvas");
    off.width = W; off.height = H;
    const octx = off.getContext("2d");
    const imgData = octx.createImageData(W, H);
    const pdata = imgData.data;
    const gam = (v) => {
      const c = Math.max(0, Math.min(1, v));
      return c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1/2.4) - 0.055;
    };
    const drawW = W - PAD.l - PAD.r, drawH = H - PAD.t - PAD.b;
    for (let py = 0; py < H; py++) {
      for (let px = 0; px < W; px++) {
        const chrx = vx0 + (px - PAD.l) / drawW * (vx1 - vx0);
        const chry = vy0 + (1 - (py - PAD.t) / drawH) * (vy1 - vy0);
        if (chrx < 0 || chry < 0.001 || chrx + chry > 1) continue;
        const X = chrx / chry;
        const Z = (1 - chrx - chry) / chry;
        let r =  3.2406 * X - 1.5372 - 0.4986 * Z;
        let g = -0.9689 * X + 1.8758 + 0.0415 * Z;
        let b2 = 0.0557 * X - 0.2040 + 1.0570 * Z;
        const mx = Math.max(r, g, b2, 0.001);
        r /= mx; g /= mx; b2 /= mx;
        const ii = (py * W + px) * 4;
        pdata[ii]   = Math.round(gam(r) * 255);
        pdata[ii+1] = Math.round(gam(g) * 255);
        pdata[ii+2] = Math.round(gam(b2) * 255);
        pdata[ii+3] = 255;
      }
    }
    octx.putImageData(imgData, 0, 0);

    if (showColorFill) {
      ctx.save();
      ctx.clip(locusPath);
      ctx.drawImage(off, 0, 0);
      ctx.restore();
    }

    // Grid
    ctx.lineWidth = 0.5;
    for (let gv = 0; gv <= 0.85; gv += 0.05) {
      const isMajor = Math.round(gv * 100) % 10 === 0;
      ctx.setLineDash(isMajor ? [] : [4, 4]);
      ctx.strokeStyle = isMajor ? C.gridMajor : C.gridMinor;
      const [x0, y0] = toC(0, gv);
      const [x1] = toC(0.85, gv);
      ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y0); ctx.stroke();
      const [ax, ay] = toC(gv, 0);
      const [, ay1] = toC(gv, 0.85);
      ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(ax, ay1); ctx.stroke();
    }
    ctx.setLineDash([]);

    // Locus outline
    ctx.beginPath();
    buildLocusPath(ctx, toC);
    ctx.closePath();
    ctx.strokeStyle = C.locus;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Illuminant dot
    if (illuminant && ILLUMINANTS[illuminant]) {
      const ill = ILLUMINANTS[illuminant];
      const [cx, cy] = toC(ill.x, ill.y);
      ctx.beginPath(); ctx.arc(cx, cy, 6, 0, Math.PI * 2);
      ctx.fillStyle = C.dotFill; ctx.fill();
      ctx.strokeStyle = C.dotStroke; ctx.lineWidth = 1.5; ctx.stroke();
      ctx.font = "bold 11px sans-serif";
      ctx.fillStyle = C.ink;
      ctx.fillText(illuminant, cx + 9, cy - 4);
    }

    // Annotations
    annotations.forEach(ann => {
      if (ann.type === "stroke" && ann.points.length > 1) {
        ctx.beginPath();
        ann.points.forEach(([x2, y2], i) => {
          const [cx2, cy2] = toC(x2, y2);
          i === 0 ? ctx.moveTo(cx2, cy2) : ctx.lineTo(cx2, cy2);
        });
        ctx.strokeStyle = ann.color || "rgba(220,50,50,0.85)";
        ctx.lineWidth = ann.width || 2;
        ctx.lineCap = "round"; ctx.lineJoin = "round";
        ctx.setLineDash([]); ctx.stroke();
      } else if (ann.type === "text") {
        const [cx2, cy2] = toC(ann.x, ann.y);
        ctx.font = `bold ${ann.size || 13}px sans-serif`;
        ctx.fillStyle = ann.color || "rgba(220,50,50,0.9)";
        ctx.textAlign = "left";
        ctx.fillText(ann.text, cx2, cy2);
      }
    });

    // MacAdam ellipses
    if (macadamFactor > 0) {
      const r = macadamFactor * 0.0011;
      const nPts = 72;
      userPoints.forEach((pt) => {
        const { u: uc, v: vc } = xyToUV(pt.x, pt.y);
        let labelX = -Infinity, labelY = 0;
        ctx.beginPath();
        for (let i = 0; i <= nPts; i++) {
          const angle = (2 * Math.PI * i) / nPts;
          const u2 = uc + r * Math.cos(angle);
          const v2 = vc + r * Math.sin(angle);
          const denom = 6*u2 - 16*v2 + 12;
          const ex = 9*u2/denom; const ey = 4*v2/denom;
          const [px2, py2] = toC(ex, ey);
          if (px2 > labelX) { labelX = px2; labelY = py2; }
          i === 0 ? ctx.moveTo(px2, py2) : ctx.lineTo(px2, py2);
        }
        ctx.closePath();
        ctx.strokeStyle = C.macadam;
        ctx.lineWidth = 1.3;
        ctx.setLineDash([4, 2]); ctx.stroke(); ctx.setLineDash([]);
        ctx.font = "bold 9px sans-serif";
        ctx.fillStyle = C.macadam;
        ctx.textAlign = "left"; ctx.textBaseline = "middle";
        ctx.fillText(`×${macadamFactor}`, labelX + 4, labelY);
        ctx.textBaseline = "alphabetic"; ctx.textAlign = "left";
      });
    }

    // Planckian locus
    if (showPlanckian) {
      const Tmin = 1667, Tmax = 20000, steps = 300;
      const planckPts = [];
      for (let i = 0; i <= steps; i++) {
        const logT = Math.log(Tmin) + (Math.log(Tmax) - Math.log(Tmin)) * i / steps;
        const T = Math.exp(logT);
        const pt2 = _planckXY(T);
        if (pt2) planckPts.push({ T, ...pt2 });
      }
      ctx.beginPath();
      planckPts.forEach(({ x, y }, i) => {
        const [px2, py2] = toC(x, y);
        i === 0 ? ctx.moveTo(px2, py2) : ctx.lineTo(px2, py2);
      });
      ctx.strokeStyle = C.planck;
      ctx.lineWidth = 0.5; ctx.setLineDash([]); ctx.stroke();

      const planckNormal = (T) => {
        const dt = T * 0.01;
        const p1 = _planckXY(Math.max(1667, T - dt));
        const p2 = _planckXY(Math.min(20000, T + dt));
        if (!p1 || !p2) return { nx: 0, ny: -1 };
        const [c1x, c1y] = toC(p1.x, p1.y);
        const [c2x, c2y] = toC(p2.x, p2.y);
        const dx2 = c2x - c1x, dy2 = c2y - c1y;
        const len = Math.sqrt(dx2*dx2 + dy2*dy2) || 1;
        return { nx: -dy2/len, ny: dx2/len };
      };

      const labelTemps = [1700, 2000, 2500, 3000, 4000, 5000, 6500, 8000, 10000, 15000, 20000];
      const intermediateTicks = [1850, 3500, 7500];
      intermediateTicks.forEach(T => {
        const pt3 = _planckXY(T); if (!pt3) return;
        const [px2, py2] = toC(pt3.x, pt3.y);
        ctx.beginPath(); ctx.arc(px2, py2, 1.8, 0, Math.PI*2);
        ctx.fillStyle = C.planckTick; ctx.fill();
      });
      ctx.font = "bold 11px sans-serif";
      labelTemps.forEach(T => {
        const pt3 = _planckXY(T); if (!pt3) return;
        const [px2, py2] = toC(pt3.x, pt3.y);
        const { nx, ny } = planckNormal(T);
        const above = T <= 4000;
        const sign = above ? -1 : 1;
        const offset = 32;
        const lx = px2 + sign * nx * offset;
        const ly = py2 + sign * ny * offset;
        ctx.beginPath(); ctx.arc(px2, py2, 3.5, 0, Math.PI*2);
        ctx.fillStyle = C.planck; ctx.fill();
        ctx.beginPath(); ctx.moveTo(px2, py2); ctx.lineTo(lx, ly);
        ctx.strokeStyle = C.planckTick; ctx.lineWidth = 0.8; ctx.stroke();
        ctx.fillStyle = C.planck;
        ctx.textAlign = "center";
        ctx.textBaseline = above ? "bottom" : "top";
        ctx.fillText(T + " K", lx, ly + (above ? -1 : 1));
      });
      ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
    }

    // User points + saturation lines
    userPoints.forEach((pt, idx) => {
      const [cx, cy] = toC(pt.x, pt.y);
      if (pt.showSat && illuminant && ILLUMINANTS[illuminant]) {
        const ill = ILLUMINANTS[illuminant];
        const [ix, iy] = toC(ill.x, ill.y);
        const dx = pt.x - ill.x, dy = pt.y - ill.y;
        let bestT = Infinity, bx = pt.x, by = pt.y;
        const locus = SPECTRUM_LOCUS;
        for (let k = 0; k < locus.length - 1; k++) {
          const ax = locus[k].x, ay = locus[k].y;
          const bx2 = locus[k+1].x, by2 = locus[k+1].y;
          const ex = bx2 - ax, ey = by2 - ay;
          const denom = dx * ey - dy * ex;
          if (Math.abs(denom) < 1e-10) continue;
          const t = ((ax - ill.x) * ey - (ay - ill.y) * ex) / denom;
          const s = ((ax - ill.x) * dy - (ay - ill.y) * dx) / denom;
          if (t > 0.001 && s >= 0 && s <= 1 && t < bestT) { bestT = t; bx = ill.x + t * dx; by = ill.y + t * dy; }
        }
        {
          const ax = locus[locus.length-1].x, ay = locus[locus.length-1].y;
          const bx2 = locus[0].x, by2 = locus[0].y;
          const ex = bx2 - ax, ey = by2 - ay;
          const denom = dx * ey - dy * ex;
          if (Math.abs(denom) > 1e-10) {
            const t = ((ax - ill.x) * ey - (ay - ill.y) * ex) / denom;
            const s = ((ax - ill.x) * dy - (ay - ill.y) * dx) / denom;
            if (t > 0.001 && s >= 0 && s <= 1 && t < bestT) { bestT = t; bx = ill.x + t * dx; by = ill.y + t * dy; }
          }
        }
        const lastIdx = locus.length - 1;
        let hitPurple = false;
        {
          const ax2 = locus[lastIdx].x, ay2 = locus[lastIdx].y;
          const bx3 = locus[0].x, by3 = locus[0].y;
          const ex3 = bx3 - ax2, ey3 = by3 - ay2;
          const denom2 = dx * ey3 - dy * ex3;
          if (Math.abs(denom2) > 1e-10) {
            const t2 = ((ax2 - ill.x) * ey3 - (ay2 - ill.y) * ex3) / denom2;
            const s2 = ((ax2 - ill.x) * dy - (ay2 - ill.y) * dx) / denom2;
            if (t2 > 0.001 && s2 >= 0 && s2 <= 1 && Math.abs(t2 - bestT) < 1e-6) hitPurple = true;
          }
        }
        const [ex2, ey2] = toC(bx, by);
        if (hitPurple) {
          ctx.beginPath(); ctx.moveTo(ix, iy); ctx.lineTo(ex2, ey2);
          ctx.strokeStyle = C.purpleLine; ctx.lineWidth = 1;
          ctx.setLineDash([3, 4]); ctx.stroke(); ctx.setLineDash([]);
          let cBestT = Infinity, cbx = pt.x, cby = pt.y;
          const cdx = -dx, cdy = -dy;
          for (let k = 0; k < locus.length - 1; k++) {
            const ax3 = locus[k].x, ay3 = locus[k].y;
            const bx4 = locus[k+1].x, by4 = locus[k+1].y;
            const cex = bx4 - ax3, cey = by4 - ay3;
            const cdenom = cdx * cey - cdy * cex;
            if (Math.abs(cdenom) < 1e-10) continue;
            const ct = ((ax3 - ill.x) * cey - (ay3 - ill.y) * cex) / cdenom;
            const cs = ((ax3 - ill.x) * cdy - (ay3 - ill.y) * cdx) / cdenom;
            if (ct > 0.001 && cs >= 0 && cs <= 1 && ct < cBestT) { cBestT = ct; cbx = ill.x + ct*cdx; cby = ill.y + ct*cdy; }
          }
          const [cex2, cey2] = toC(cbx, cby);
          ctx.beginPath(); ctx.moveTo(ix, iy); ctx.lineTo(cex2, cey2);
          ctx.strokeStyle = C.satLine; ctx.lineWidth = 1.5;
          ctx.setLineDash([6, 3]); ctx.stroke(); ctx.setLineDash([]);
          ctx.beginPath(); ctx.arc(cex2, cey2, 4, 0, Math.PI * 2);
          ctx.fillStyle = C.satDot; ctx.fill();
        } else {
          ctx.beginPath(); ctx.moveTo(ix, iy); ctx.lineTo(ex2, ey2);
          ctx.strokeStyle = C.satLine; ctx.lineWidth = 1;
          ctx.setLineDash([4, 3]); ctx.stroke(); ctx.setLineDash([]);
          ctx.beginPath(); ctx.arc(ex2, ey2, 4, 0, Math.PI * 2);
          ctx.fillStyle = C.satDot; ctx.fill();
          const wl = computeSaturation(pt, illuminant);
          if (wl && wl.domWl !== null) {
            ctx.font = "bold 10px sans-serif";
            ctx.fillStyle = C.wlLabel;
            ctx.textAlign = "left"; ctx.textBaseline = "bottom";
            ctx.fillText(wl.domWl + " nm", ex2 + 6, ey2 - 2);
          }
        }
        if (hitPurple) {
          const wl2 = computeSaturation(pt, illuminant);
          if (wl2 && wl2.domWl !== null) {
            ctx.font = "bold 10px sans-serif";
            ctx.fillStyle = C.wlLabelC;
            ctx.textAlign = "left"; ctx.textBaseline = "bottom";
            ctx.fillText(wl2.domWl + " nm (c)", ex2 + 6, ey2 - 2);
          }
        }
      }
      ctx.beginPath(); ctx.arc(cx, cy, 6, 0, Math.PI * 2);
      ctx.fillStyle = C.dotFill; ctx.fill();
      ctx.strokeStyle = C.dotStroke; ctx.lineWidth = 1.5; ctx.stroke();
      const label = pt.name ? pt.name : ("#" + (idx + 1));
      ctx.font = "bold 11px sans-serif";
      ctx.fillStyle = C.ink;
      ctx.textAlign = "center"; ctx.textBaseline = "bottom";
      ctx.fillText(label, cx, cy - 9);
      ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
    });

    // Reticle
    if (hovered && showReticle) {
      const [cx, cy] = toC(hovered.x, hovered.y);
      ctx.save();
      ctx.setLineDash([4, 4]);
      ctx.lineWidth = 0.8;
      ctx.strokeStyle = C.reticle;
      ctx.beginPath(); ctx.moveTo(PAD.l, cy); ctx.lineTo(W - PAD.r, cy); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx, PAD.t); ctx.lineTo(cx, H - PAD.b); ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
      ctx.beginPath(); ctx.arc(cx, cy, 4, 0, Math.PI * 2);
      ctx.strokeStyle = C.reticleDot; ctx.lineWidth = 1.2; ctx.stroke();
      const label = "x=" + hovered.x.toFixed(3) + "  y=" + hovered.y.toFixed(3);
      ctx.font = "bold 11px sans-serif";
      const tw = ctx.measureText(label).width;
      const labelPad = 5;
      const labelW = tw + labelPad * 2;
      const labelH = 18;
      let lx = cx + 10;
      if (lx + labelW > W - PAD.r) lx = cx - labelW - 10;
      let ly = cy - 24;
      if (ly < PAD.t + labelH) ly = cy + 8;
      ctx.fillStyle = C.labelBg;
      ctx.beginPath(); ctx.roundRect(lx, ly, labelW, labelH, 4); ctx.fill();
      ctx.fillStyle = C.labelFg;
      ctx.fillText(label, lx + labelPad, ly + 13);
    }

    // Axis labels
    ctx.fillStyle = C.axis;
    ctx.font = "bold 11px sans-serif";
    for (let gv = 0; gv <= 0.8; gv += 0.1) {
      const [x0, y0] = toC(0, gv);
      ctx.fillText(gv.toFixed(1), x0 - 34, y0 + 4);
      const [ax, ay] = toC(gv, 0);
      ctx.fillText(gv.toFixed(1), ax - 8, ay + 16);
    }
    ctx.font = "bold 13px sans-serif";
    ctx.fillText("x", W / 2, H - 4);
    ctx.save(); ctx.translate(12, H / 2); ctx.rotate(-Math.PI / 2);
    ctx.fillText("y", 0, 0); ctx.restore();

    // Wavelength tick marks
    const LABEL_NMS = new Set([
      380, 400, 460, 470, 480, 485, 490, 495, 500, 505, 510, 515, 520,
      530, 540, 550, 560, 570, 580, 590, 600, 610, 620, 630, 640, 650, 700
    ]);
    const labeled = LOCUS_380.filter(p => LABEL_NMS.has(p.nm));
    labeled.forEach(({ nm, x, y }, i) => {
      const [cx, cy] = toC(x, y);
      const prev = labeled[i - 1] || labeled[i];
      const next = labeled[i + 1] || labeled[i];
      const [px2, py2] = toC(prev.x, prev.y);
      const [nx2, ny2] = toC(next.x, next.y);
      const dx = nx2 - px2, dy = ny2 - py2;
      const len = Math.sqrt(dx*dx + dy*dy) || 1;
      let nx = dy / len, ny = -dx / len;
      const [ccx, ccy] = toC(0.33, 0.33);
      if ((cx + nx * 10 - ccx) * (cx - ccx) + (cy + ny * 10 - ccy) * (cy - ccy) < 0) { nx = -nx; ny = -ny; }
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + nx * 6, cy + ny * 6);
      ctx.strokeStyle = C.locus; ctx.lineWidth = 1; ctx.stroke();
      ctx.font = "bold 13px sans-serif";
      ctx.fillStyle = C.axis;
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText(nm, cx + nx * 18, cy + ny * 18);
    });
    ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";

  }, [illuminant, hovered, userPoints, toCv, showReticle, showPlanckian, macadamFactor, showColorFill, annotations, C]);

  useEffect(() => { draw(viewRef.current); }, [draw]);

  const getXY = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const scale = W / rect.width;
    const cpx = (e.clientX - rect.left) * scale;
    const cpy = (e.clientY - rect.top) * scale;
    const [vx0, vy0, vx1, vy1] = viewRef.current;
    const drawW = W - PAD.l - PAD.r, drawH = H - PAD.t - PAD.b;
    const x = vx0 + (cpx - PAD.l) / drawW * (vx1 - vx0);
    const y = vy0 + (1 - (cpy - PAD.t) / drawH) * (vy1 - vy0);
    return { x: +x.toFixed(4), y: +y.toFixed(4), valid: x >= 0 && x <= 0.85 && y >= 0 && y <= 0.85 };
  };

  const handleMouseMove = (e) => {
    if (panStartRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      const scale = W / rect.width;
      const cpx = (e.clientX - rect.left) * scale;
      const cpy = (e.clientY - rect.top) * scale;
      const [vx0, vy0, vx1, vy1] = viewRef.current;
      const drawW = W - PAD.l - PAD.r, drawH = H - PAD.t - PAD.b;
      const dx = -(cpx - panStartRef.current.cpx) / drawW * (vx1 - vx0);
      const dy =  (cpy - panStartRef.current.cpy) / drawH * (vy1 - vy0);
      const nv = [panStartRef.current.vx0 + dx, panStartRef.current.vy0 + dy,
                  panStartRef.current.vx1 + dx, panStartRef.current.vy1 + dy];
      viewRef.current = nv; setView(nv); draw(nv); return;
    }
    if (modeRef.current === "draw" && drawingRef.current) {
      const { x, y, valid } = getXY(e);
      if (valid) {
        drawingRef.current.points.push([x, y]);
        draw(viewRef.current);
        const [cx2, cy2] = toCv(x, y, viewRef.current);
        const ctx2 = canvasRef.current.getContext("2d");
        if (drawingRef.current.points.length > 1) {
          const [px2, py2] = toCv(drawingRef.current.points[drawingRef.current.points.length-2][0],
                                   drawingRef.current.points[drawingRef.current.points.length-2][1], viewRef.current);
          ctx2.beginPath(); ctx2.moveTo(px2, py2); ctx2.lineTo(cx2, cy2);
          ctx2.strokeStyle = "rgba(220,50,50,0.85)"; ctx2.lineWidth = 2;
          ctx2.lineCap = "round"; ctx2.lineJoin = "round"; ctx2.stroke();
        }
      }
      return;
    }
    if (dragPointRef.current) {
      const { x, y, valid } = getXY(e);
      if (valid) onMovePoint && onMovePoint(dragPointRef.current, x, y);
      return;
    }
    const { x, y, valid } = getXY(e);
    if (valid) {
      setHovered({ x, y }); onHover && onHover({ x, y });
      if (userPoints && userPoints.length > 0) {
        const [vx0,,vx1,] = viewRef.current;
        const threshold = (vx1 - vx0) * 0.025;
        let closestId = null, bestD = Infinity;
        userPoints.forEach(pt => {
          const d = Math.sqrt((pt.x-x)**2+(pt.y-y)**2);
          if (d < threshold && d < bestD) { bestD = d; closestId = pt.id; }
        });
        setNearPoint(!!closestId);
      } else { setNearPoint(false); }
    } else { setHovered(null); setNearPoint(false); onHover && onHover(null); }
  };

  const handleMouseDown = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const scale = W / rect.width;
    const cpx = (e.clientX - rect.left) * scale;
    const cpy = (e.clientY - rect.top) * scale;
    mouseDownPosRef.current = { cpx, cpy };
    if (modeRef.current === "pan") {
      const [vx0, vy0, vx1, vy1] = viewRef.current;
      panStartRef.current = { cpx, cpy, vx0, vy0, vx1, vy1 }; return;
    }
    if (modeRef.current === "draw") {
      const { x, y, valid } = getXY(e);
      if (valid) drawingRef.current = { points: [[x, y]] }; return;
    }
    if (modeRef.current === "point") {
      const { x, y } = getXY(e);
      const [vx0, vy0, vx1, vy1] = viewRef.current;
      const threshold = (vx1 - vx0) * 0.025;
      let closest = null, bestD = Infinity;
      if (userPoints) userPoints.forEach(pt => {
        const d = Math.sqrt((pt.x - x) ** 2 + (pt.y - y) ** 2);
        if (d < threshold && d < bestD) { bestD = d; closest = pt.id; }
      });
      if (closest) { dragPointRef.current = closest; }
      else { panStartRef.current = { cpx, cpy, vx0, vy0, vx1, vy1, isPanFromPoint: true }; }
    }
  };

  const handleMouseUp = () => {
    if (modeRef.current === "draw" && drawingRef.current) {
      const stroke = drawingRef.current;
      drawingRef.current = null;
      if (stroke.points.length > 1) {
        onAnnotationsChange && onAnnotationsChange(prev => [...prev, { type: "stroke", id: Date.now(), points: stroke.points, color: "rgba(220,50,50,0.85)", width: 2 }]);
      }
    }
    panStartRef.current = null; dragPointRef.current = null; setNearPoint(false);
  };

  const handleDblClick = (e) => {
    const { x, y, valid } = getXY(e);
    if (!valid) return;
    if (hintTimerRef.current) clearTimeout(hintTimerRef.current);
    setHint(null);
    const [vx0,,vx1,] = viewRef.current;
    const threshold = (vx1 - vx0) * 0.04;
    let closest = null, bestD = Infinity;
    if (userPoints && userPoints.length) {
      userPoints.forEach(pt => {
        const d = Math.sqrt((pt.x - x)**2 + (pt.y - y)**2);
        if (d < threshold && d < bestD) { bestD = d; closest = pt.id; }
      });
    }
    if (closest) {
      onDblClickPoint && onDblClickPoint(closest);
    } else if (isInsideGamut(x, y)) {
      onAddPoint && onAddPoint({ x, y });
    }
  };

  const handleClick = (e) => {
    if (modeRef.current === "pan") return;
    if (dragPointRef.current) return;
    if (mouseDownPosRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      const scale = W / rect.width;
      const cpx = (e.clientX - rect.left) * scale;
      const cpy = (e.clientY - rect.top) * scale;
      const moved = Math.sqrt((cpx - mouseDownPosRef.current.cpx)**2 + (cpy - mouseDownPosRef.current.cpy)**2);
      if (moved > 5) return;
    }
    const { x, y, valid } = getXY(e);
    if (!valid) return;
    const [vx0,,vx1,] = viewRef.current;
    const threshold = (vx1 - vx0) * 0.025;
    const near = userPoints && userPoints.some(pt => Math.sqrt((pt.x-x)**2+(pt.y-y)**2) < threshold);

    if (modeRef.current === "text") {
      const label = window.prompt("Texte à ajouter :");
      if (label && label.trim()) {
        onAnnotationsChange && onAnnotationsChange(prev => [...prev, { type: "text", id: Date.now(), x, y, text: label.trim(), color: "rgba(220,50,50,0.9)", size: 13 }]);
      }
      return;
    }
    if (!near && modeRef.current === "point") {
      const rect2 = canvasRef.current.getBoundingClientRect();
      const scale2 = W / rect2.width;
      const cpx2 = (e.clientX - rect2.left) * scale2;
      const cpy2 = (e.clientY - rect2.top) * scale2;
      if (hintTimerRef.current) clearTimeout(hintTimerRef.current);
      // Delay hint so double-clicks don't flash it
      hintTimerRef.current = setTimeout(() => {
        setHint({ cpx: cpx2, cpy: cpy2, outside: !isInsideGamut(x, y) });
        hintTimerRef.current = setTimeout(() => setHint(null), 2000);
      }, 220);
    }
    if (near && modeRef.current === "point" && !dragPointRef.current) {
      let closest = null, bestD = Infinity;
      userPoints.forEach(pt => {
        const d = Math.sqrt((pt.x-x)**2+(pt.y-y)**2);
        if (d < threshold && d < bestD) { bestD = d; closest = pt.id; }
      });
      if (closest) {
        onClickPoint && onClickPoint(closest, e.clientX, e.clientY);
      }
    }
  };

  // ── Zoom ────────────────────────────────────────────────────────────────────
  const ZOOM_FACTOR = 1.35;
  const MIN_SPAN = 0.05;
  const MAX_SPAN = 1.6;

  const applyZoom = useCallback((factor) => {
    const [vx0, vy0, vx1, vy1] = viewRef.current;
    const mx = (vx0 + vx1) / 2;
    const my = (vy0 + vy1) / 2;
    const nx0 = mx + (vx0 - mx) * factor;
    const ny0 = my + (vy0 - my) * factor;
    const nx1 = mx + (vx1 - mx) * factor;
    const ny1 = my + (vy1 - my) * factor;
    const span = Math.min(nx1 - nx0, ny1 - ny0);
    if (span < MIN_SPAN || span > MAX_SPAN) return;
    const nv = [nx0, ny0, nx1, ny1];
    viewRef.current = nv; setView(nv); draw(nv);
  }, [draw]);

  const zoomIn  = useCallback(() => applyZoom(1 / ZOOM_FACTOR), [applyZoom]);
  const zoomOut = useCallback(() => applyZoom(ZOOM_FACTOR),     [applyZoom]);

  const resetZoom = () => {
    const nv = [0, 0, 0.85, 0.85];
    viewRef.current = nv; setView(nv); draw(nv);
  };
  const currentSpan = view[2] - view[0];
  const zoomLevel = 0.85 / currentSpan;
  const isZoomed = Math.abs(zoomLevel - 1) > 0.02;

  // ── Touch handlers ──────────────────────────────────────────────────────────
  const touchStartRef = useRef(null);
  const lastTapRef    = useRef(0);

  const getTouchXY = (touch) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const scale = W / rect.width;
    const cpx = (touch.clientX - rect.left) * scale;
    const cpy = (touch.clientY - rect.top) * scale;
    const [vx0, vy0, vx1, vy1] = viewRef.current;
    const drawW = W - PAD.l - PAD.r, drawH = H - PAD.t - PAD.b;
    const x = vx0 + (cpx - PAD.l) / drawW * (vx1 - vx0);
    const y = vy0 + (1 - (cpy - PAD.t) / drawH) * (vy1 - vy0);
    return { x: +x.toFixed(4), y: +y.toFixed(4), cpx, cpy, valid: x >= 0 && x <= 0.85 && y >= 0 && y <= 0.85 };
  };

  const handleTouchStart = (e) => {
    if (e.touches.length !== 1) return;
    const t = e.touches[0];
    const pos = getTouchXY(t);
    touchStartRef.current = { ...pos, ts: Date.now() };
    const [vx0, vy0, vx1, vy1] = viewRef.current;
    const rect = canvasRef.current.getBoundingClientRect();
    const scale = W / rect.width;
    const cpx = (t.clientX - rect.left) * scale;
    const cpy = (t.clientY - rect.top) * scale;
    panStartRef.current = { cpx, cpy, vx0, vy0, vx1, vy1 };
  };

  const handleTouchMove = (e) => {
    e.preventDefault();
    if (e.touches.length !== 1 || !panStartRef.current) return;
    const t = e.touches[0];
    const rect = canvasRef.current.getBoundingClientRect();
    const scale = W / rect.width;
    const cpx = (t.clientX - rect.left) * scale;
    const cpy = (t.clientY - rect.top) * scale;
    const [vx0, vy0, vx1, vy1] = viewRef.current;
    const drawW = W - PAD.l - PAD.r, drawH = H - PAD.t - PAD.b;
    const dx = -(cpx - panStartRef.current.cpx) / drawW * (vx1 - vx0);
    const dy =  (cpy - panStartRef.current.cpy) / drawH * (vy1 - vy0);
    const nv = [panStartRef.current.vx0 + dx, panStartRef.current.vy0 + dy,
                panStartRef.current.vx1 + dx, panStartRef.current.vy1 + dy];
    viewRef.current = nv; setView(nv); draw(nv);
  };

  const handleTouchEnd = (e) => {
    panStartRef.current = null;
    if (!touchStartRef.current) return;
    const now = Date.now();
    const dt = now - touchStartRef.current.ts;
    if (dt < 300) {
      const { x, y, cpx, cpy, valid } = touchStartRef.current;
      if (!valid) return;
      const dtap = now - lastTapRef.current;
      if (dtap < 400) {
        lastTapRef.current = 0;
        if (hintTimerRef.current) clearTimeout(hintTimerRef.current);
        setHint(null);
        const [vx0,,vx1,] = viewRef.current;
        const threshold = (vx1 - vx0) * 0.04;
        let closest = null, bestD = Infinity;
        if (userPoints && userPoints.length) {
          userPoints.forEach(pt => {
            const d = Math.sqrt((pt.x - x)**2 + (pt.y - y)**2);
            if (d < threshold && d < bestD) { bestD = d; closest = pt.id; }
          });
        }
        if (closest) { onDblClickPoint && onDblClickPoint(closest); }
        else if (isInsideGamut(x, y)) { onAddPoint && onAddPoint({ x, y }); }
      } else {
        lastTapRef.current = now;
        const [vx0,,vx1,] = viewRef.current;
        const threshold = (vx1 - vx0) * 0.025;
        let closestId = null, bestD2 = Infinity;
        if (userPoints && userPoints.length) {
          userPoints.forEach(pt => {
            const d = Math.sqrt((pt.x-x)**2+(pt.y-y)**2);
            if (d < threshold && d < bestD2) { bestD2 = d; closestId = pt.id; }
          });
        }
        if (closestId) {
          const rect4 = canvasRef.current.getBoundingClientRect();
          const absX = rect4.left + cpx / W * rect4.width;
          const absY = rect4.top  + cpy / H * rect4.height;
          onClickPoint && onClickPoint(closestId, absX, absY);
        } else {
          if (hintTimerRef.current) clearTimeout(hintTimerRef.current);
          // Delay so rapid second tap (double-tap) cancels the hint before it shows
          hintTimerRef.current = setTimeout(() => {
            setHint({ cpx, cpy, outside: !isInsideGamut(x, y) });
            hintTimerRef.current = setTimeout(() => setHint(null), 2000);
          }, 220);
        }
      }
    }
    touchStartRef.current = null;
  };

  // ── Styles boutons latéraux ─────────────────────────────────────────────────
  const btnBase = {
    background: "var(--bg-card)",
    border: `0.5px solid var(--border)`,
    color: "var(--text)",
    borderRadius: 10, width: 50, height: 50, cursor: "pointer",
    display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22,
  };
  const btnActive = {
    ...btnBase,
    background: dark ? "rgba(255,255,255,0.12)" : "rgba(20,20,20,0.10)",
    border: `1.5px solid ${dark ? "rgba(255,255,255,0.35)" : "rgba(0,0,0,0.35)"}`,
  };

  const [showInfo, setShowInfo] = useState(false);
  const infoRef = useRef(null);
  const [macadamOpen, setMacadamOpen] = useState(false);
  const macadamRef = useRef(null);
  useEffect(() => {
    if (!macadamOpen) return;
    const handler = (e) => { if (macadamRef.current && !macadamRef.current.contains(e.target)) setMacadamOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [macadamOpen]);
  useEffect(() => {
    if (!showInfo) return;
    const handler = (e) => { if (infoRef.current && !infoRef.current.contains(e.target)) setShowInfo(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showInfo]);

  const popupStyle = {
    background: "var(--bg-card)",
    border: `1px solid var(--border)`,
    color: "var(--text)",
    boxShadow: "0 4px 16px rgba(0,0,0,0.18)",
  };

  return (
    <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
      {/* Boutons latéraux gauche — sticky */}
      <div style={{
        display: "flex", flexDirection: "column", gap: 4, paddingTop: 4,
        position: "sticky", top: 56, alignSelf: "flex-start", zIndex: 5,
      }}>
        <button title={showReticle ? "Masquer le réticule" : "Afficher le réticule"} onClick={() => onToggleReticle && onToggleReticle()} style={showReticle ? btnActive : btnBase}>
          <svg width="26" height="26" viewBox="0 0 16 16" fill="none">
            <circle cx="8" cy="8" r="5.5" stroke="currentColor" strokeWidth="1.3"/>
            <line x1="8" y1="1" x2="8" y2="15" stroke="currentColor" strokeWidth="1.3"/>
            <line x1="1" y1="8" x2="15" y2="8" stroke="currentColor" strokeWidth="1.3"/>
          </svg>
        </button>

        <button
          title={showPlanckian ? "Masquer le locus des corps noirs" : "Afficher le locus des corps noirs (K)"}
          onClick={() => onTogglePlanckian && onTogglePlanckian()}
          style={{ ...(showPlanckian ? { ...btnActive, border: "1.5px solid rgba(180,80,0,0.6)", background: dark ? "rgba(180,80,0,0.25)" : "rgba(180,80,0,0.12)" } : btnBase), flexDirection: "column", height: 56, gap: 2 }}
        >
          <svg width="26" height="20" viewBox="0 0 16 16" fill="none">
            <path d="M2 13 Q4 10 6 8 Q9 5 14 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            <circle cx="6" cy="8" r="1.5" fill="currentColor" opacity="0.6"/>
            <circle cx="10" cy="5.5" r="1.5" fill="currentColor" opacity="0.6"/>
          </svg>
          <span style={{ fontSize: 13, fontWeight: 700, lineHeight: 1, letterSpacing: "0.02em" }}>K</span>
        </button>

        <button
          title={showColorFill ? "Masquer le fond coloré" : "Afficher le fond coloré"}
          onClick={() => onToggleColorFill && onToggleColorFill()}
          style={showColorFill
            ? { ...btnBase, background: "transparent", border: `1px solid var(--border)`, overflow: "hidden" }
            : { ...btnBase, background: dark ? "rgba(255,255,255,0.07)" : "rgba(200,200,200,0.3)" }}
        >
          {showColorFill ? (
            <svg width="50" height="50" viewBox="0 0 28 28" fill="none" style={{ margin: "-6px" }}>
              <defs>
                <linearGradient id="cgOn" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#ff2200"/>
                  <stop offset="25%" stopColor="#ffcc00"/>
                  <stop offset="50%" stopColor="#00cc44"/>
                  <stop offset="75%" stopColor="#0066ff"/>
                  <stop offset="100%" stopColor="#cc00ff"/>
                </linearGradient>
              </defs>
              <rect width="28" height="28" fill="url(#cgOn)"/>
              <path d="M4 24 Q14 4 24 24 Z" fill="rgba(255,255,255,0.25)"/>
              <path d="M4 24 Q14 4 24 24" stroke="rgba(0,0,0,0.5)" strokeWidth="1.5" fill="none"/>
            </svg>
          ) : (
            <svg width="26" height="26" viewBox="0 0 16 16" fill="none">
              <path d="M2 14 Q8 2 14 14 Z" fill="currentColor" opacity="0.25"/>
              <path d="M2 14 Q8 2 14 14" stroke="currentColor" strokeWidth="1.3" fill="none" opacity="0.6"/>
              <line x1="3" y1="3" x2="13" y2="13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.7"/>
            </svg>
          )}
        </button>

        <div style={{ borderTop: `0.5px solid var(--border)`, margin: "4px 0" }} />

        <div style={{ position: "relative" }}>
          <div ref={macadamRef}>
            <button title="Tolérance colorimétrique (ellipses MacAdam)" onClick={() => setMacadamOpen(v => !v)} style={macadamFactor > 0 ? btnActive : btnBase}>
              <svg width="26" height="26" viewBox="0 0 16 16" fill="none">
                <ellipse cx="8" cy="8" rx="6" ry="3.5" stroke="currentColor" strokeWidth="1.3" transform="rotate(-30 8 8)"/>
                <circle cx="8" cy="8" r="1.2" fill="currentColor"/>
              </svg>
            </button>
            {macadamOpen && (
              <div style={{ position: "absolute", left: 58, top: 0, zIndex: 10, borderRadius: 8, padding: "8px 10px", whiteSpace: "nowrap", ...popupStyle }}>
                <p style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-muted)", margin: "0 0 6px" }}>Tolérance colorimétrique</p>
                <div style={{ display: "flex", gap: 4 }}>
                  {[0, 1, 2, 5, 10].map(f => (
                    <button key={f} onClick={() => { onSetMacadam && onSetMacadam(f); if (f === 0) setMacadamOpen(false); }}
                      style={{ fontSize: 11, fontWeight: 600, padding: "3px 7px", borderRadius: 4, cursor: "pointer",
                        border: macadamFactor === f ? `1.5px solid var(--text)` : `0.5px solid var(--border)`,
                        background: macadamFactor === f ? "var(--text)" : "none",
                        color: macadamFactor === f ? "var(--bg-card)" : "var(--text)" }}
                    >{f === 0 ? "✕" : `×${f}`}</button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <button
          title={allSatOn ? "Masquer toutes les saturations" : "Activer toutes les saturations"}
          onClick={() => onToggleAllSat && onToggleAllSat()}
          style={allSatOn ? { ...btnActive, fontSize: 20, fontWeight: 700 } : { ...btnBase, fontSize: 20, fontWeight: 700 }}
        >%</button>

        <div style={{ borderTop: `0.5px solid var(--border)`, margin: "4px 0" }} />

        <button title="Dessiner (crayon)" onClick={() => switchMode(mode === "draw" ? "point" : "draw")} style={mode === "draw" ? btnActive : btnBase}>
          <svg width="24" height="24" viewBox="0 0 15 15" fill="none">
            <path d="M11 2 L13 4 L5 12 L2 13 L3 10 Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/>
            <line x1="9" y1="4" x2="11" y2="6" stroke="currentColor" strokeWidth="1.3"/>
          </svg>
        </button>
        <button title="Ajouter du texte" onClick={() => switchMode(mode === "text" ? "point" : "text")} style={mode === "text" ? btnActive : btnBase}>
          <svg width="24" height="24" viewBox="0 0 15 15" fill="none">
            <text x="2" y="12" fontSize="11" fontWeight="bold" fill="currentColor">T</text>
          </svg>
        </button>
        {annotations.length > 0 && (
          <button title="Effacer les annotations" onClick={() => onAnnotationsChange && onAnnotationsChange(() => [])} style={{ ...btnBase }}>
            <svg width="22" height="22" viewBox="0 0 14 14" fill="none">
              <line x1="2" y1="2" x2="12" y2="12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              <line x1="12" y1="2" x2="2" y2="12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
        )}

        <div style={{ borderTop: `0.5px solid var(--border)`, margin: "4px 0" }} />

        <div style={{ position: "relative" }} ref={infoRef}>
          <button title="Aide" onClick={() => setShowInfo(v => !v)} style={{ ...(showInfo ? btnActive : btnBase), fontSize: 18, fontWeight: 600 }}>?</button>
          {showInfo && (
            <div style={{ position: "absolute", left: 58, top: 0, zIndex: 10, borderRadius: 8, padding: "12px 14px", width: 240, fontSize: 12, lineHeight: 1.6, ...popupStyle }}>
              <p style={{ margin: "0 0 10px", fontWeight: 600, fontSize: 13, color: "var(--text)" }}>Comment utiliser l'espace Colorimétrique</p>
              <p style={{ margin: "0 0 8px", color: "var(--text-muted)" }}>🖱️ <strong style={{ color: "var(--text)" }}>Double-cliquer</strong> sur le graphique pour ajouter un point. Un simple clic sur un point permet de le déplacer.</p>
              <p style={{ margin: "0 0 6px", color: "var(--text-muted)" }}><strong style={{ color: "var(--text)" }}>+ / −</strong> — boutons en haut du graphe pour zoomer ou dézoomer.</p>
              <p style={{ margin: "0 0 6px", color: "var(--text-muted)" }}><strong style={{ color: "var(--text)" }}>Courbe K</strong> — locus de Planck (corps noir) de 1667 K à 20 000 K.</p>
              <p style={{ margin: "0 0 12px", color: "var(--text-muted)" }}><strong style={{ color: "var(--text)" }}>Ellipses</strong> — tolérance MacAdam (×1, ×2, ×5, ×10).</p>
              <hr style={{ border: "none", borderTop: `0.5px solid var(--border)`, margin: "0 0 10px" }}/>
              <p style={{ margin: 0, color: "var(--text-muted)" }}>⬇ <strong style={{ color: "var(--text)" }}>Exporter</strong> — PNG haute résolution.</p>
            </div>
          )}
        </div>
      </div>

      {/* Canvas */}
      <div style={{ position: "relative", flex: 1 }}>
        {/* Barre zoom sticky */}
        <div style={{
          position: "sticky", top: 56, zIndex: 10,
          display: "flex", alignItems: "center", gap: 6,
          padding: "6px 8px",
          background: "var(--bg-card)",
          borderBottom: `1px solid var(--border)`,
          borderRadius: "8px 8px 0 0",
        }}>
          <button onClick={zoomOut} title="Dézoomer" style={{ ...btnBase, fontSize: 26, fontWeight: 300, lineHeight: 1 }}>−</button>
          <button onClick={zoomIn}  title="Zoomer"   style={{ ...btnBase, fontSize: 26, fontWeight: 300, lineHeight: 1 }}>+</button>
          <span style={{ fontSize: 12, fontWeight: 600, minWidth: 40, textAlign: "center", color: "var(--text-muted)", fontVariantNumeric: "tabular-nums" }}>
            ×{zoomLevel.toFixed(zoomLevel < 10 ? 1 : 0)}
          </span>
          {isZoomed && (
            <button onClick={resetZoom} title="Réinitialiser le zoom"
              style={{ ...btnBase, fontSize: 12, fontWeight: 600, width: "auto", padding: "0 10px", color: "var(--text-muted)" }}
            >↺ ×1</button>
          )}
        </div>

        <div style={{ position: "relative" }}>
          <canvas
            ref={canvasRef}
            width={W} height={H}
            style={{
              width: "100%", height: "auto", borderRadius: "0 0 8px 8px", display: "block",
              background: dark ? "#0f172a" : "#ffffff",
              cursor: panStartRef.current ? "grabbing" : modeRef.current === "draw" ? "crosshair" : modeRef.current === "text" ? "text" : (dragPointRef.current ? "grabbing" : nearPoint ? "grab" : "default"),
            }}
            onMouseMove={handleMouseMove}
            onMouseDown={handleMouseDown}
            onMouseUp={handleMouseUp}
            onMouseLeave={() => { panStartRef.current = null; setHovered(null); setNearPoint(false); onHover && onHover(null); }}
            onClick={handleClick}
            onDoubleClick={handleDblClick}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          />
          {hint && (
            <div style={{
              position: "absolute",
              left: `${hint.cpx / W * 100}%`,
              top: `${hint.cpy / H * 100}%`,
              transform: "translate(-50%, -120%)",
              pointerEvents: "none",
              background: "var(--bg-card)",
              border: `1px solid var(--border)`,
              borderRadius: 6,
              padding: "4px 10px",
              fontSize: 11,
              fontWeight: 500,
              color: hint.outside ? "rgba(200,60,60,0.85)" : "var(--text-muted)",
              boxShadow: "0 2px 8px rgba(0,0,0,0.12)",
              whiteSpace: "nowrap",
              zIndex: 20,
              animation: "fadeInHint 0.15s ease",
            }}>
              {hint.outside ? "Hors du gamut visible" : "Double-cliquer pour ajouter un point"}
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

// ── Fonctions utilitaires ─────────────────────────────────────────────────────
function xyToUV(x, y) {
  const denom = -2 * x + 12 * y + 3;
  return { u: 4 * x / denom, v: 9 * y / denom };
}
function uvToXY(u, v) {
  const denom = 6 * u - 16 * v + 12;
  return { x: 9 * u / denom, y: 4 * v / denom };
}
function deltaUV(x1, y1, x2, y2) {
  const p1 = xyToUV(x1, y1); const p2 = xyToUV(x2, y2);
  return Math.sqrt((p2.u - p1.u) ** 2 + (p2.v - p1.v) ** 2);
}
function sdcmStep(x1, y1, x2, y2) {
  return deltaUV(x1, y1, x2, y2) / 0.0011;
}
function rayLocus(ox, oy, dx, dy, minT = 0.001) {
  const locus = SPECTRUM_LOCUS;
  let bestT = Infinity, bestS = 0, bestK = -1;
  for (let k = 0; k < locus.length; k++) {
    const a = locus[k], b = locus[(k + 1) % locus.length];
    const ex = b.x - a.x, ey = b.y - a.y;
    const denom = dx * ey - dy * ex;
    if (Math.abs(denom) < 1e-10) continue;
    const t = ((a.x - ox) * ey - (a.y - oy) * ex) / denom;
    const s = ((a.x - ox) * dy - (a.y - oy) * dx) / denom;
    if (t > minT && s >= 0 && s <= 1 && t < bestT) { bestT = t; bestS = s; bestK = k; }
  }
  return { t: bestT, s: bestS, k: bestK };
}
function segmentWavelength(k, s) {
  const locus = SPECTRUM_LOCUS;
  const a = locus[k], b = locus[(k + 1) % locus.length];
  if (k >= locus.length - 1) return null;
  if (a.nm >= 700 && b.nm >= 380 && b.nm <= 400) return null;
  if (a.nm >= 700 || b.nm > 700) return null;
  return a.nm + s * (b.nm - a.nm);
}
function computeSaturation(pt, illuminantKey) {
  if (!illuminantKey || !ILLUMINANTS[illuminantKey]) return null;
  const ill = ILLUMINANTS[illuminantKey];
  const dx = pt.x - ill.x, dy = pt.y - ill.y;
  const d1 = Math.sqrt(dx * dx + dy * dy);
  const fwd = rayLocus(ill.x, ill.y, dx, dy);
  if (!isFinite(fwd.t)) return null;
  const d_total = fwd.t * d1;
  const d2 = Math.max(0, d_total - d1);
  const sat = d1 / d_total * 100;
  let domWl = null, complementary = false;
  const fwdWl = segmentWavelength(fwd.k, fwd.s);
  if (fwdWl !== null) {
    domWl = fwdWl;
  } else {
    const bwd = rayLocus(ill.x, ill.y, -dx, -dy);
    if (isFinite(bwd.t)) {
      const bwdWl = segmentWavelength(bwd.k, bwd.s);
      if (bwdWl !== null) { domWl = bwdWl; complementary = true; }
    }
  }
  return { d1: d1.toFixed(5), d2: d2.toFixed(5), sat: sat.toFixed(1), domWl: domWl !== null ? Math.round(domWl) : null, complementary };
}

// ── Popup flottant compact et draggable ──────────────────────────────────────
function PointPopup({ pt, screenX, screenY, index, illuminant, onClose, onMove, onNameChange, onToggleSat, onDelete }) {
  const popupRef  = useRef(null);
  const offsetRef = useRef({ x: 0, y: 0 });
  const posRef    = useRef({ x: screenX, y: screenY });
  const [pos, setPos]           = useState({ x: screenX, y: screenY });
  const [dragging, setDragging] = useState(false);

  const clampPos = (x, y) => {
    const el = popupRef.current;
    const w = el ? el.offsetWidth  : 200;
    const h = el ? el.offsetHeight : 260;
    return {
      x: Math.max(8, Math.min(window.innerWidth  - w - 8, x)),
      y: Math.max(8, Math.min(window.innerHeight - h - 8, y)),
    };
  };

  const startDrag = (clientX, clientY) => {
    offsetRef.current = { x: clientX - posRef.current.x, y: clientY - posRef.current.y };
    setDragging(true);
  };

  const handleHeaderMouseDown = (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'BUTTON') return;
    e.preventDefault();
    startDrag(e.clientX, e.clientY);
  };
  const handleHeaderTouchStart = (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'BUTTON') return;
    const t = e.touches[0];
    startDrag(t.clientX, t.clientY);
  };

  useEffect(() => {
    if (!dragging) return;
    const onMove_ = (e) => {
      const cx = e.clientX ?? e.touches?.[0]?.clientX;
      const cy = e.clientY ?? e.touches?.[0]?.clientY;
      if (cx == null) return;
      const clamped = clampPos(cx - offsetRef.current.x, cy - offsetRef.current.y);
      posRef.current = clamped;
      setPos(clamped);
      onMove(clamped.x, clamped.y);
    };
    const onUp = () => setDragging(false);
    document.addEventListener('mousemove', onMove_);
    document.addEventListener('mouseup',   onUp);
    document.addEventListener('touchmove', onMove_, { passive: false });
    document.addEventListener('touchend',  onUp);
    return () => {
      document.removeEventListener('mousemove', onMove_);
      document.removeEventListener('mouseup',   onUp);
      document.removeEventListener('touchmove', onMove_);
      document.removeEventListener('touchend',  onUp);
    };
  }, [dragging, onMove]);

  useEffect(() => { posRef.current = pos; }, [pos]);

  const s        = illuminant ? computeSaturation(pt, illuminant) : null;
  const satPct   = s ? parseFloat(s.sat) : 0;
  const domColor = s?.domWl ? nmToRGB(s.domWl) : null;

  return (
    <div
      ref={popupRef}
      style={{
        position: "fixed",
        left: pos.x, top: pos.y,
        zIndex: 200,
        width: 196,                          /* ← réduit de 240 → 196 */
        background: "var(--bg-card)",
        border: "1px solid var(--border)",
        borderRadius: 10,
        boxShadow: dragging
          ? "0 16px 48px rgba(0,0,0,0.24)"
          : "0 6px 24px rgba(0,0,0,0.14)",
        fontSize: 11,
        userSelect: "none",
        touchAction: "none",
        transition: dragging ? "none" : "box-shadow 0.2s ease",
        overflow: "hidden",
      }}
    >
      {/* ── En-tête drag ── */}
      <div
        onMouseDown={handleHeaderMouseDown}
        onTouchStart={handleHeaderTouchStart}
        style={{
          display: "flex", alignItems: "center", gap: 6,
          padding: "7px 8px 6px",
          background: "var(--bg)",
          borderBottom: "1px solid var(--border)",
          cursor: dragging ? "grabbing" : "grab",
        }}
      >
        {/* Pastille couleur */}
        <div style={{
          width: 8, height: 8, borderRadius: "50%", flexShrink: 0,
          background: domColor || "var(--text-muted)",
          border: "1.5px solid var(--border)",
        }} />

        {/* Nom éditable */}
        <input
          type="text"
          placeholder={`Point #${index + 1}`}
          value={pt.name || ""}
          onMouseDown={e => e.stopPropagation()}
          onTouchStart={e => e.stopPropagation()}
          onChange={e => onNameChange(e.target.value)}
          style={{
            flex: 1, fontSize: 11, fontWeight: 600,
            border: "none", background: "transparent", outline: "none",
            color: "var(--text)", padding: 0, cursor: "text",
          }}
        />

        {/* Icône drag */}
        <svg width="10" height="10" viewBox="0 0 12 12" fill="none" style={{ opacity: 0.25, flexShrink: 0 }}>
          <circle cx="3.5" cy="3.5" r="1.2" fill="currentColor"/>
          <circle cx="8.5" cy="3.5" r="1.2" fill="currentColor"/>
          <circle cx="3.5" cy="8.5" r="1.2" fill="currentColor"/>
          <circle cx="8.5" cy="8.5" r="1.2" fill="currentColor"/>
        </svg>

        {/* Boutons */}
        <div style={{ display: "flex", gap: 1, alignItems: "center" }}>
          <button
            onMouseDown={e => e.stopPropagation()}
            onTouchStart={e => e.stopPropagation()}
            onClick={onDelete}
            title="Supprimer"
            style={{ background: "none", border: "none", cursor: "pointer", width: 20, height: 20, borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center", color: "rgba(200,60,60,0.7)" }}
            onMouseEnter={e => e.currentTarget.style.background = "rgba(200,60,60,0.1)"}
            onMouseLeave={e => e.currentTarget.style.background = "none"}
          >
            <svg width="11" height="11" viewBox="0 0 14 14" fill="none">
              <path d="M2 3.5h10M5.5 3.5V2.5a.5.5 0 01.5-.5h2a.5.5 0 01.5.5v1M6 6.5v4M8 6.5v4M3 3.5l.7 7.2A1 1 0 004.7 12h4.6a1 1 0 001-.8L11 3.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <button
            onMouseDown={e => e.stopPropagation()}
            onTouchStart={e => e.stopPropagation()}
            onClick={onClose}
            title="Fermer"
            style={{ background: "none", border: "none", cursor: "pointer", width: 20, height: 20, borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)", fontSize: 14, lineHeight: 1 }}
            onMouseEnter={e => e.currentTarget.style.background = "var(--bg-card)"}
            onMouseLeave={e => e.currentTarget.style.background = "none"}
          >×</button>
        </div>
      </div>

      {/* ── Corps compact ── */}
      <div style={{ padding: "8px 10px", display: "flex", flexDirection: "column", gap: 7 }}>

        {/* Coordonnées */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 5 }}>
          {[["x", pt.x], ["y", pt.y]].map(([axis, val]) => (
            <div key={axis} style={{
              background: "var(--bg)", border: "1px solid var(--border)",
              borderRadius: 6, padding: "4px 8px", textAlign: "center",
            }}>
              <div style={{ fontSize: 9, color: "var(--text-muted)", marginBottom: 1, fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase" }}>{axis}</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text)", fontVariantNumeric: "tabular-nums", letterSpacing: "-0.02em" }}>
                {val.toFixed(4)}
              </div>
            </div>
          ))}
        </div>

        {/* Saturation */}
        {!pt.showSat ? (
          <button
            onMouseDown={e => e.stopPropagation()}
            onTouchStart={e => e.stopPropagation()}
            onClick={onToggleSat}
            style={{
              width: "100%", fontSize: 11, fontWeight: 600,
              padding: "6px 0", borderRadius: 6, cursor: "pointer",
              border: "1px solid var(--border)",
              background: "var(--bg)", color: "var(--text)",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 5,
              transition: "background 0.15s, border-color 0.15s",
            }}
            onMouseEnter={e => { e.currentTarget.style.background = "var(--bg-card)"; e.currentTarget.style.borderColor = "var(--text-muted)"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "var(--bg)"; e.currentTarget.style.borderColor = "var(--border)"; }}
          >
            <svg width="12" height="12" viewBox="0 0 13 13" fill="none">
              <circle cx="6.5" cy="6.5" r="5.5" stroke="currentColor" strokeWidth="1.3"/>
              <circle cx="6.5" cy="6.5" r="2" stroke="currentColor" strokeWidth="1.3"/>
            </svg>
            Saturation
          </button>
        ) : s ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {/* d1 / d2 */}
            <div style={{
              background: "var(--bg)", border: "1px solid var(--border)",
              borderRadius: 6, padding: "6px 8px",
              display: "grid", gridTemplateColumns: "1fr 1fr", gap: 3,
            }}>
              {[
                ["d₁", s.d1, illuminant ? `${illuminant} → ${pt.name || `#${index+1}`}` : ""],
                ["d₂", s.d2, `${pt.name || `#${index+1}`} → locus`],
              ].map(([lbl, val, sub]) => (
                <div key={lbl}>
                  <div style={{ fontSize: 8, color: "var(--text-muted)", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 1 }}>{lbl}</div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text)", fontVariantNumeric: "tabular-nums" }}>{val}</div>
                  <div style={{ fontSize: 8, color: "var(--text-muted)", lineHeight: 1.3, marginTop: 1 }}>{sub}</div>
                </div>
              ))}
            </div>

            {/* Barre saturation */}
            <div style={{ position: "relative" }}>
              <button
                onMouseDown={e => e.stopPropagation()}
                onTouchStart={e => e.stopPropagation()}
                onClick={onToggleSat}
                title="Masquer"
                style={{
                  position: "absolute", top: -5, right: -5, zIndex: 2,
                  width: 16, height: 16, borderRadius: "50%",
                  background: "var(--bg-card)", border: "1px solid var(--border)",
                  cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 9, color: "var(--text-muted)", lineHeight: 1,
                }}
              >×</button>
              <div style={{ borderRadius: 6, overflow: "hidden", border: "1px solid var(--border)" }}>
                <div style={{ height: 4, background: "var(--bg)", position: "relative" }}>
                  <div style={{
                    position: "absolute", left: 0, top: 0, height: "100%",
                    width: `${satPct}%`,
                    background: domColor || "var(--text-muted)",
                    borderRadius: "0 3px 3px 0",
                    transition: "width 0.4s ease",
                  }} />
                </div>
                <div style={{
                  padding: "5px 8px",
                  background: domColor ? `${domColor}14` : "var(--bg)",
                  display: "flex", alignItems: "baseline", justifyContent: "center", gap: 3,
                }}>
                  <span style={{ fontSize: 18, fontWeight: 800, color: "var(--text)", fontVariantNumeric: "tabular-nums", letterSpacing: "-0.03em" }}>{s.sat}%</span>
                  <span style={{ fontSize: 9, color: "var(--text-muted)" }}>sat.</span>
                </div>
              </div>
            </div>

            {/* λ dominante */}
            {s.domWl !== null && (
              <div style={{
                background: domColor ? `${domColor}12` : "var(--bg)",
                border: `1px solid ${domColor ? `${domColor}40` : "var(--border)"}`,
                borderRadius: 6, padding: "6px 8px",
                display: "flex", alignItems: "center", justifyContent: "space-between",
              }}>
                <div>
                  <div style={{ fontSize: 8, color: "var(--text-muted)", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 1 }}>
                    {s.complementary ? "λ compl." : "λ dom."}
                  </div>
                  {s.complementary && <div style={{ fontSize: 8, color: "var(--text-muted)" }}>(pourpre)</div>}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  {domColor && <div style={{ width: 12, height: 12, borderRadius: 3, background: domColor, border: "1px solid rgba(0,0,0,0.1)" }} />}
                  <span style={{ fontSize: 15, fontWeight: 800, color: "var(--text)", fontVariantNumeric: "tabular-nums" }}>
                    {s.domWl} <span style={{ fontSize: 10, fontWeight: 500, color: "var(--text-muted)" }}>nm</span>
                  </span>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div style={{ fontSize: 9, color: "var(--text-muted)", textAlign: "center", padding: "3px 0" }}>
            Sélectionner un illuminant
          </div>
        )}
      </div>
    </div>
  );
}

// ── Composant principal ───────────────────────────────────────────────────────
export default function AppCouleur() {
  const [illuminant, setIlluminant] = useState("D65");
  const [hovered, setHovered] = useState(null);
  const [tab, setTab] = useState("diagram");
  const [userPoints, setUserPoints] = useState([]);
  const diagramRef = useRef(null);
  const toggleSat   = (id) => setUserPoints(prev => prev.map(p => p.id === id ? { ...p, showSat: !p.showSat } : p));
  const setPointName = (id, name) => setUserPoints(prev => prev.map(p => p.id === id ? { ...p, name } : p));
  const [showReticle, setShowReticle] = useState(true);
  const [showPlanckian, setShowPlanckian] = useState(false);
  const [pointPopups, setPointPopups] = useState([]);
  const closePopup = (id) => setPointPopups(prev => prev.filter(p => p.id !== id));
  const movePopup  = (id, x, y) => setPointPopups(prev => prev.map(p => p.id === id ? { ...p, x, y } : p));
  const openPopup  = (id, clientX, clientY) => {
    setPointPopups(prev => {
      if (prev.find(p => p.id === id)) return prev;
      return [...prev, { id, x: clientX + 14, y: clientY - 24 }];
    });
  };
  const [macadamFactor, setMacadamFactor] = useState(0);
  const [showColorFill, setShowColorFill] = useState(true);
  const [annotations, setAnnotations] = useState([]);

  const tabs = [
    { id: "diagram", label: "Diagramme de chromaticité" },
    { id: "info",    label: "À propos" },
  ];

  const exportPNG = () => {
    const diagCanvas = diagramRef.current?.getCanvas();
    if (!diagCanvas) return;
    const SCALE = 3;
    const DW = diagCanvas.width * SCALE, DH = diagCanvas.height * SCALE;
    const EPAD = 36 * SCALE, COL = 340 * SCALE, ROWH = 22 * SCALE;
    const date = new Date().toLocaleDateString("fr-FR", { day:"2-digit", month:"long", year:"numeric" });
    const HEADER = 80 * SCALE;
    let pointsH = 50 * SCALE;
    userPoints.forEach(pt => {
      pointsH += ROWH * 2 + 10 * SCALE;
      if (pt.showSat && illuminant) { const s = computeSaturation(pt, illuminant); if (s) pointsH += ROWH * 3 + 6 * SCALE; }
    });
    const totalH = Math.max(DH + HEADER + EPAD * 2, pointsH + HEADER + EPAD * 2);
    const totalW = DW + EPAD * 3 + COL;
    const out = document.createElement("canvas");
    out.width = totalW; out.height = totalH;
    const ctx = out.getContext("2d");
    ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, totalW, totalH);
    ctx.fillStyle = "#111111"; ctx.font = `bold ${20 * SCALE}px sans-serif`;
    ctx.fillText("Espace colorimétrique CIE 1931", EPAD, EPAD + 22 * SCALE);
    ctx.fillStyle = "#555555"; ctx.font = `${13 * SCALE}px sans-serif`;
    ctx.fillText("Diagramme de chromaticité xy · Observateur 2° · Illuminant : " + (illuminant || "Aucun"), EPAD, EPAD + 42 * SCALE);
    ctx.fillStyle = "#999999"; ctx.font = `${11 * SCALE}px sans-serif`;
    ctx.fillText("Exporté le " + date, EPAD, EPAD + 60 * SCALE);
    ctx.drawImage(diagCanvas, 0, 0, diagCanvas.width, diagCanvas.height, EPAD, HEADER + EPAD, DW, DH);
    ctx.strokeStyle = "#cccccc"; ctx.lineWidth = SCALE;
    ctx.strokeRect(EPAD, HEADER + EPAD, DW, DH);
    const sepX = EPAD * 2 + DW;
    ctx.strokeStyle = "#e0e0e0"; ctx.lineWidth = SCALE;
    ctx.beginPath(); ctx.moveTo(sepX, HEADER + EPAD); ctx.lineTo(sepX, totalH - EPAD); ctx.stroke();
    const colX = sepX + EPAD;
    let y = HEADER + EPAD + 10 * SCALE;
    ctx.fillStyle = "#111111"; ctx.font = `bold ${15 * SCALE}px sans-serif`;
    ctx.fillText("Points ajoutés", colX, y); y += 28 * SCALE;
    if (userPoints.length === 0) {
      ctx.fillStyle = "#aaaaaa"; ctx.font = `italic ${13 * SCALE}px sans-serif`;
      ctx.fillText("Aucun point", colX, y);
    } else {
      userPoints.forEach((pt, i) => {
        const label = pt.name || ("#" + (i + 1));
        ctx.fillStyle = "#111111"; ctx.font = `bold ${14 * SCALE}px sans-serif`;
        ctx.fillText(label, colX, y); y += ROWH;
        ctx.fillStyle = "#333333"; ctx.font = `${13 * SCALE}px sans-serif`;
        ctx.fillText("x = " + pt.x.toFixed(4) + "   y = " + pt.y.toFixed(4), colX, y); y += ROWH;
        if (pt.showSat && illuminant) {
          const s = computeSaturation(pt, illuminant);
          if (s) {
            ctx.fillStyle = "#555555"; ctx.font = `${12 * SCALE}px sans-serif`;
            ctx.fillText("d₁ = " + s.d1 + "   d₂ = " + s.d2, colX, y); y += ROWH - 2 * SCALE;
            ctx.fillText("Saturation : " + s.sat + "%", colX, y); y += ROWH - 2 * SCALE;
            if (s.domWl !== null) { ctx.fillText((s.complementary ? "λ compl. : " : "λ dom. : ") + s.domWl + " nm" + (s.complementary ? " (pourpre)" : ""), colX, y); y += ROWH - 2 * SCALE; }
          }
        }
        ctx.strokeStyle = "#eeeeee"; ctx.lineWidth = SCALE;
        ctx.beginPath(); ctx.moveTo(colX, y + 5 * SCALE); ctx.lineTo(colX + COL - EPAD, y + 5 * SCALE); ctx.stroke();
        y += 16 * SCALE;
      });
    }
    ctx.fillStyle = "#bbbbbb"; ctx.font = `${11 * SCALE}px sans-serif`;
    ctx.fillText("CIE 1931 · CIE 015:2018 · Observateur standard 2°", EPAD, totalH - 12 * SCALE);
    out.toBlob(blob => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = "cie1931_chromaticite.png"; a.click();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
    }, "image/png");
  };

  return (
    <div style={{ fontFamily: "system-ui, sans-serif", color: "var(--text)", maxWidth: 1040, margin: "0 auto", padding: "1rem 0" }}>
      <style>{`@keyframes fadeInHint { from { opacity:0; transform:translate(-50%,-110%) } to { opacity:1; transform:translate(-50%,-120%) } }`}</style>

      {/* En-tête */}
      <div style={{ marginBottom: "1.25rem" }}>
        <h2 style={{ fontSize: 20, fontWeight: 500, margin: "0 0 4px", color: "var(--text)" }}>Espace colorimétrique CIE 1931</h2>
        <p style={{ fontSize: 13, color: "var(--text-muted)", margin: 0 }}>Diagramme de chromaticité xy · Observateur standard 2°</p>
      </div>

      {/* Onglets */}
      <div style={{ display: "flex", gap: 0, marginBottom: "1rem", borderBottom: `0.5px solid var(--border)` }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            background: "none", border: "none", padding: "8px 16px", cursor: "pointer",
            fontSize: 13, fontWeight: tab === t.id ? 500 : 400,
            color: tab === t.id ? "var(--text)" : "var(--text-muted)",
            borderBottom: tab === t.id ? `2px solid var(--text)` : "2px solid transparent",
            marginBottom: -1,
          }}>{t.label}</button>
        ))}
        <button onClick={exportPNG} style={{
          marginLeft: "auto", background: "none", border: `0.5px solid var(--border)`,
          padding: "6px 14px", cursor: "pointer", fontSize: 12, fontWeight: 500,
          color: "var(--text)", borderRadius: 5, display: "flex", alignItems: "center", gap: 5, marginBottom: 4,
        }}>⬇ Exporter</button>
      </div>

      {tab === "diagram" && (
        <div>
          {/* Barre illuminants */}
          <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 12, padding: "10px 16px", background: "var(--bg-card)", borderRadius: 8, border: `1px solid var(--border)`, flexWrap: "wrap" }}>
            <span style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}>Illuminant</span>
            <div style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "center" }}>
              {[...Object.entries(ILLUMINANTS), ["", { label: "Aucun" }]].map(([k, v]) => (
                <label key={k || "none"} style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontSize: 13, fontWeight: illuminant === k ? 600 : 400, color: illuminant === k ? "var(--text)" : "var(--text-muted)" }}>
                  <input type="radio" name="illuminant-bar" checked={illuminant === k} onChange={() => setIlluminant(k)}
                    style={{ accentColor: "var(--text)", width: 15, height: 15, cursor: "pointer" }}
                  />
                  {k || "Aucun"}
                </label>
              ))}
            </div>
            {illuminant && ILLUMINANTS[illuminant] && (
              <span style={{ fontSize: 11, color: "var(--text-muted)", marginLeft: 4 }}>
                — {ILLUMINANTS[illuminant].label} · x={ILLUMINANTS[illuminant].x.toFixed(4)}, y={ILLUMINANTS[illuminant].y.toFixed(4)}
              </span>
            )}
          </div>

          {/* Diagramme — pleine largeur, sans panneau droite */}
          <ChromaticityDiagram
            ref={diagramRef}
            illuminant={illuminant}
            onHover={setHovered}
            userPoints={userPoints}
            showReticle={showReticle}
            onToggleReticle={() => setShowReticle(v => !v)}
            showPlanckian={showPlanckian}
            onTogglePlanckian={() => setShowPlanckian(v => !v)}
            macadamFactor={macadamFactor}
            onSetMacadam={setMacadamFactor}
            showColorFill={showColorFill}
            onToggleColorFill={() => setShowColorFill(v => !v)}
            onDblClickPoint={(id) => openPopup(id, window.innerWidth / 2, window.innerHeight / 2)}
            onClickPoint={(id, clientX, clientY) => openPopup(id, clientX, clientY)}
            allSatOn={userPoints.length > 0 && userPoints.every(p => p.showSat)}
            annotations={annotations}
            onAnnotationsChange={setAnnotations}
            onToggleAllSat={() => { const allOn = userPoints.every(p => p.showSat); setUserPoints(prev => prev.map(p => ({ ...p, showSat: !allOn }))); }}
            onAddPoint={(p) => setUserPoints(prev => [...prev, { ...p, id: Date.now(), name: "" }])}
            onMovePoint={(id, x, y) => setUserPoints(prev => prev.map(p => p.id === id ? { ...p, x, y } : p))}
          />
        </div>
      )}

      {tab === "info" && (
        <div style={{ fontSize: 13, lineHeight: 1.7, color: "var(--text-muted)" }}>
          <h3 style={{ fontSize: 15, fontWeight: 500, color: "var(--text)", margin: "0 0 8px" }}>Le modèle CIE 1931</h3>
          <p>L'espace colorimétrique CIE 1931 XYZ est fondé sur des expériences psychophysiques d'égalisation des couleurs à partir de trois primaires monochromatiques : 700 nm (rouge), 546,1 nm (vert) et 435,8 nm (bleu), frappant la fovéa sous un angle de 2°.</p>
          <p>Le diagramme de chromaticité xy est obtenu par projection : x = X/(X+Y+Z), y = Y/(X+Y+Z). Il représente la teinte et la saturation indépendamment de la luminance.</p>
          <p>Le <em>spectrum locus</em> est la courbe enveloppant le diagramme, sur laquelle se trouvent toutes les couleurs monochromatiques.</p>
          <div style={{ borderTop: `0.5px solid var(--border)`, paddingTop: 12, marginTop: 8, fontSize: 12 }}>
            <p style={{ margin: "0 0 4px" }}><strong style={{ color: "var(--text)" }}>Source :</strong> Mathieu Hébert, « Mesurer les couleurs », <em>Photoniques</em>, 2021, 106, pp.44–47</p>
            <p style={{ margin: "0 0 4px" }}><strong style={{ color: "var(--text)" }}>Données :</strong> CIE 015:2018, fonctions d'égalisation 2° CIE 1931</p>
            <p style={{ margin: 0 }}><strong style={{ color: "var(--text)" }}>Ellipses MacAdam :</strong>{" "}
              <a href="https://datalore.jetbrains.com/report/static/N3ySXyPhUwg0hxmd2Mzq8Y/BhQs3wmfC7jZdxnP3yJPpe" target="_blank" rel="noopener noreferrer" style={{ color: "var(--text)", textDecoration: "underline", wordBreak: "break-all" }}>
                datalore.jetbrains.com — MacAdam Calculations
              </a>
            </p>
          </div>
        </div>
      )}

      {/* Popups flottants draggables */}
      {pointPopups.map(popup => {
        const pt = userPoints.find(p => p.id === popup.id);
        if (!pt) return null;
        const index = userPoints.indexOf(pt);
        return (
          <PointPopup
            key={popup.id}
            pt={pt}
            screenX={popup.x}
            screenY={popup.y}
            index={index}
            illuminant={illuminant}
            onClose={() => closePopup(popup.id)}
            onMove={(nx, ny) => movePopup(popup.id, nx, ny)}
            onNameChange={(name) => setPointName(pt.id, name)}
            onToggleSat={() => toggleSat(pt.id)}
            onDelete={() => { setUserPoints(prev => prev.filter(p => p.id !== pt.id)); closePopup(popup.id); }}
          />
        );
      })}
    </div>
  );
}