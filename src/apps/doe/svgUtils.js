import { isQuadPure, quadPureTerm } from "./modelUtils.js";

export function buildResidualSVG(yHat, residuals, dotColor) {
  if (!yHat || yHat.length === 0) return "";
  const W = 480, H = 220, PAD = 40;
  const minX = Math.min(...yHat), maxX = Math.max(...yHat);
  const rangeX = maxX - minX || 1;
  const maxR = Math.max(...residuals.map(Math.abs)) || 1;
  const cx = (v) => PAD + (v - minX) / rangeX * (W - 2 * PAD);
  const cy = (v) => H / 2 - v / maxR * (H / 2 - PAD);
  const points = yHat.map((x, i) =>
    `<circle cx="${cx(x).toFixed(1)}" cy="${cy(residuals[i]).toFixed(1)}" r="5" fill="${dotColor}" fill-opacity="0.85"/>`
  ).join("");
  const labels = yHat.map((x, i) => {
    const px = cx(x), py = cy(residuals[i]);
    const above = py > H / 2;
    return `<text x="${px.toFixed(1)}" y="${(above ? py - 8 : py + 14).toFixed(1)}" text-anchor="middle" font-size="8" fill="#6b7280">${i + 1}</text>`;
  }).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
    <rect width="${W}" height="${H}" fill="#f9fafb" rx="4"/>
    <line x1="${PAD}" y1="${H / 2}" x2="${W - PAD}" y2="${H / 2}" stroke="#d1d5db" stroke-width="1"/>
    <line x1="${PAD}" y1="${PAD}" x2="${PAD}" y2="${H - PAD}" stroke="#d1d5db" stroke-width="1"/>
    <text x="${PAD - 6}" y="${H / 2 + 4}" text-anchor="end" font-size="9" fill="#9ca3af">0</text>
    ${points}
    ${labels}
    <text x="${W / 2}" y="${H - 4}" text-anchor="middle" font-size="10" fill="#9ca3af">Ŷ</text>
    <text x="10" y="${H / 2}" text-anchor="middle" font-size="10" fill="#9ca3af" transform="rotate(-90,10,${H / 2})">Résidu</text>
  </svg>`;
}

export function buildParetoSVG(effects, color) {
  if (!effects || effects.length === 0) return "";
  const BAR_H = 20, GAP = 6, LABEL_W = 60, VAL_W = 60, PAD_T = 10, PAD_R = 16;
  const W = 500, maxAbs = effects[0]?.absCoeff || 1;
  const BAR_W = W - LABEL_W - VAL_W - PAD_R;
  const H = effects.length * (BAR_H + GAP) + PAD_T * 2;
  const rows = effects.map((ef, i) => {
    const y = PAD_T + i * (BAR_H + GAP);
    const barPx = Math.max(2, ef.absCoeff / maxAbs * BAR_W);
    const signif = ef.p !== null && ef.p < 0.05;
    const barColor = signif ? (ef.coeff >= 0 ? color : "#ef4444") : "#d1d5db";
    return `
      <text x="${LABEL_W - 4}" y="${y + BAR_H / 2 + 4}" text-anchor="end" font-size="9" fill="#6b7280">${ef.label}</text>
      <rect x="${LABEL_W}" y="${y}" width="${BAR_W}" height="${BAR_H}" fill="#f3f4f6" rx="3"/>
      <rect x="${LABEL_W}" y="${y}" width="${barPx.toFixed(1)}" height="${BAR_H}" fill="${barColor}" rx="3"/>
      <text x="${LABEL_W + BAR_W + 4}" y="${y + BAR_H / 2 + 4}" font-size="9" fill="#374151" font-family="monospace">${ef.coeff >= 0 ? "+" : ""}${ef.coeff.toFixed(3)}</text>
    `;
  }).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
    <rect width="${W}" height="${H}" fill="#f9fafb" rx="4"/>
    ${rows}
  </svg>`;
}

export function buildIsoSVG(model, fit, factors, color) {
  const contFactors = factors.filter(f => f.continuous);
  if (contFactors.length < 2) return "";
  const f1 = contFactors[0], f2 = contFactors[1];
  const GRID = 50;
  const W = 320, H = 320, PAD_L = 44, PAD_B = 32, PAD_T = 14, PAD_R = 14;
  const PW = W - PAD_L - PAD_R, PH = H - PAD_T - PAD_B;

  const predict = (c1, c2) => {
    const coded = {};
    factors.forEach(f => { coded[f.id] = 0; });
    coded[f1.id] = c1; coded[f2.id] = c2;
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

  const xs = Array.from({ length: GRID }, (_, i) => -1 + i * 2 / (GRID - 1));
  const grid = xs.map(y2 => xs.map(x1 => predict(x1, y2)));
  const flat = grid.flat();
  const minZ = Math.min(...flat), maxZ = Math.max(...flat);
  const nLevels = 6;
  const levels = Array.from({ length: nLevels }, (_, i) => minZ + (i + 1) * (maxZ - minZ) / (nLevels + 1));
  const lineColors = ["#3b82f6", "#6366f1", "#8b5cf6", "#a855f7", "#ec4899", "#ef4444"];

  const gx = (gi) => PAD_L + (gi / (GRID - 1)) * PW;
  const gy = (gj) => PAD_T + (1 - gj / (GRID - 1)) * PH;

  function marchingSquares(level) {
    const segs = [];
    const lerp = (a, b, va, vb) => a + (b - a) * (level - va) / (vb - va);
    for (let j = 0; j < GRID - 1; j++) {
      for (let i = 0; i < GRID - 1; i++) {
        const v00 = grid[j][i], v10 = grid[j][i + 1], v01 = grid[j + 1][i], v11 = grid[j + 1][i + 1];
        const idx = (v00 >= level ? 8 : 0) | (v10 >= level ? 4 : 0) | (v11 >= level ? 2 : 0) | (v01 >= level ? 1 : 0);
        if (idx === 0 || idx === 15) continue;
        const top = [lerp(i, i + 1, v00, v10), j], right = [i + 1, lerp(j, j + 1, v10, v11)];
        const bottom = [lerp(i, i + 1, v01, v11), j + 1], left = [i, lerp(j, j + 1, v00, v01)];
        const lines = { 1: [left, bottom], 2: [bottom, right], 3: [left, right], 4: [right, top], 6: [bottom, top], 7: [left, top], 8: [top, left], 9: [top, bottom], 11: [top, right], 12: [right, left], 13: [bottom, left], 14: [right, bottom] };
        const pts = lines[idx]; if (!pts) continue;
        if (pts.length === 2) segs.push([pts[0], pts[1]]);
      }
    }
    return segs;
  }

  const toReal = (f, coded) => {
    const mid = (f.low.real + f.high.real) / 2;
    const half = (f.high.real - f.low.real) / 2;
    return (mid + coded * half).toFixed(1);
  };

  const ticks = [-1, -0.5, 0, 0.5, 1];
  const clipId = `clip_${Math.random().toString(36).slice(2, 8)}`;

  const isoLines = levels.map((level, li) => {
    const segs = marchingSquares(level);
    const col = lineColors[li % lineColors.length];
    const lines = segs.map(([p0, p1]) =>
      `<line x1="${gx(p0[0]).toFixed(1)}" y1="${gy(p0[1]).toFixed(1)}" x2="${gx(p1[0]).toFixed(1)}" y2="${gy(p1[1]).toFixed(1)}" stroke="${col}" stroke-width="1.5" stroke-linecap="round"/>`
    ).join("");
    if (segs.length > 0) {
      const mid = segs[Math.floor(segs.length / 2)];
      const lx = ((gx(mid[0][0]) + gx(mid[1][0])) / 2).toFixed(1);
      const ly = ((gy(mid[0][1]) + gy(mid[1][1])) / 2).toFixed(1);
      return `${lines}<rect x="${+lx - 14}" y="${+ly - 7}" width="28" height="13" rx="2" fill="white" fill-opacity="0.9"/>
        <text x="${lx}" y="${+ly + 4}" text-anchor="middle" font-size="8" font-weight="600" fill="${col}">${level.toFixed(1)}</text>`;
    }
    return lines;
  }).join("");

  const ticksX = ticks.map(v => {
    const px = (PAD_L + (v + 1) / 2 * PW).toFixed(1);
    return `<line x1="${px}" y1="${PAD_T + PH}" x2="${px}" y2="${PAD_T + PH + 4}" stroke="#9ca3af" stroke-width="0.8"/>
      <text x="${px}" y="${PAD_T + PH + 14}" text-anchor="middle" font-size="8" fill="#9ca3af">${toReal(f1, v)}</text>`;
  }).join("");
  const ticksY = ticks.map(v => {
    const py = (PAD_T + (1 - (v + 1) / 2) * PH).toFixed(1);
    return `<line x1="${PAD_L - 4}" y1="${py}" x2="${PAD_L}" y2="${py}" stroke="#9ca3af" stroke-width="0.8"/>
      <text x="${PAD_L - 6}" y="${+py + 3}" text-anchor="end" font-size="8" fill="#9ca3af">${toReal(f2, v)}</text>`;
  }).join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
    <defs><clipPath id="${clipId}"><rect x="${PAD_L}" y="${PAD_T}" width="${PW}" height="${PH}"/></clipPath></defs>
    <rect width="${W}" height="${H}" fill="white"/>
    <rect x="${PAD_L}" y="${PAD_T}" width="${PW}" height="${PH}" fill="#f9fafb" stroke="#e5e7eb" stroke-width="0.5"/>
    ${ticks.map(v => {
      const px = (PAD_L + (v + 1) / 2 * PW).toFixed(1);
      const py = (PAD_T + (1 - (v + 1) / 2) * PH).toFixed(1);
      return `<line x1="${px}" y1="${PAD_T}" x2="${px}" y2="${PAD_T + PH}" stroke="#e5e7eb" stroke-width="0.5" stroke-dasharray="3,3"/>
        <line x1="${PAD_L}" y1="${py}" x2="${PAD_L + PW}" y2="${py}" stroke="#e5e7eb" stroke-width="0.5" stroke-dasharray="3,3"/>`;
    }).join("")}
    <g clip-path="url(#${clipId})">${isoLines}</g>
    ${ticksX}${ticksY}
    <text x="${(PAD_L + PW / 2).toFixed(1)}" y="${H - 2}" text-anchor="middle" font-size="9" fill="#6b7280">${f1.name}${f1.unit ? " (" + f1.unit + ")" : ""}</text>
    <text x="10" y="${(PAD_T + PH / 2).toFixed(1)}" text-anchor="middle" font-size="9" fill="#6b7280" transform="rotate(-90,10,${(PAD_T + PH / 2).toFixed(1)})">${f2.name}${f2.unit ? " (" + f2.unit + ")" : ""}</text>
  </svg>`;
}

export function svgToDataUrl(svgStr) {
  return "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgStr)));
}
