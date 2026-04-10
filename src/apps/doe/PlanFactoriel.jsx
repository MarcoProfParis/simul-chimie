import React, { useState, useEffect, useRef, useCallback } from "react";
import { useTheme } from "../../ThemeContext";
import { ChevronDownIcon } from "@heroicons/react/16/solid";
import { EXAMPLE_FILES } from "./exampleFiles";
import {
  Dialog,
  DialogBackdrop,
  DialogPanel,
  DialogTitle,
} from "@headlessui/react";
import {
  ExclamationTriangleIcon,
  Bars3Icon,
  XMarkIcon,
  PlusIcon,
  TrashIcon,
  ArrowPathIcon,
  BookOpenIcon,
} from "@heroicons/react/24/outline";
import { CheckIcon } from "@heroicons/react/24/solid";
import { HelpProvider, HelpButton } from "./HelpDrawer";
import Surface3D from "./Surface3D";
import EffetsPanel from "./EffetsPanel";
import { CompactProvider, useCompact } from "./CompactContext";

// ─── utilitaires ──────────────────────────────────────────────────────────────

const DEFAULT_FACTORS = [
  { id: "X1", name: "Facteur 1", unit: "", continuous: true, low: { real: 0, coded: -1 }, high: { real: 1, coded: 1 } },
  { id: "X2", name: "Facteur 2", unit: "", continuous: true, low: { real: 0, coded: -1 }, high: { real: 1, coded: 1 } },
];
const DEFAULT_RESPONSES = [{ id: "Y1", name: "Réponse 1", unit: "" }];
const DEFAULT_CENTER = { present: false, replicates: 1 };

function genMatrix(factors, responses, centerPoint) {
  const n = factors.length;
  const rows = [];
  const total = 1 << n;
  for (let r = 0; r < total; r++) {
    const coded = {}, real = {};
    for (let f = 0; f < n; f++) {
      const bit = (r >> (n - 1 - f)) & 1;
      const fac = factors[f];
      coded[fac.id] = bit === 0 ? -1 : 1;
      real[fac.id] = fac.continuous
        ? (bit === 0 ? fac.low.real : fac.high.real)
        : (bit === 0 ? (fac.low.label || "−1") : (fac.high.label || "+1"));
    }
    const rv = {};
    responses.forEach(r => { rv[r.id] = ""; });
    rows.push({ id: r + 1, coded, real, center: false, responses: rv });
  }
  if (centerPoint.present) {
    for (let i = 0; i < centerPoint.replicates; i++) {
      const coded = {}, real = {};
      factors.forEach(f => {
        coded[f.id] = 0;
        real[f.id] = f.continuous ? +((f.low.real + f.high.real) / 2).toFixed(3) : null;
      });
      const rv = {};
      responses.forEach(r => { rv[r.id] = ""; });
      rows.push({ id: rows.length + 1, coded, real, center: true, responses: { ...rv } });
    }
  }
  return rows;
}

function computeDefaultModel(factors) {
  const n = factors.length;
  const ids = factors.map(f => f.id);
  const terms = [...ids];
  for (let i = 0; i < n; i++)
    for (let j = i + 1; j < n; j++)
      terms.push(ids[i] + ids[j]);
  if (n > 2) terms.pop();
  return terms;
}

function quadPureTerm(id) { return id + "2"; }
function isQuadPure(t, factors) { return factors.some(f => t === quadPureTerm(f.id)); }
function isInteraction(t, factors) {
  return factors.filter(f => t.includes(f.id)).length >= 2 && !isQuadPure(t, factors);
}

function getAllPossibleTerms(factors) {
  const n = factors.length;
  const ids = factors.map(f => f.id);
  const t = [...ids];
  ids.forEach(id => t.push(quadPureTerm(id)));
  for (let i = 0; i < n; i++)
    for (let j = i + 1; j < n; j++) t.push(ids[i] + ids[j]);
  for (let i = 0; i < n; i++)
    for (let j = i + 1; j < n; j++)
      for (let k = j + 1; k < n; k++) t.push(ids[i] + ids[j] + ids[k]);
  for (let i = 0; i < n; i++)
    for (let j = i + 1; j < n; j++)
      for (let k = j + 1; k < n; k++)
        for (let l = k + 1; l < n; l++) t.push(ids[i] + ids[j] + ids[k] + ids[l]);
  return t;
}

function computePresetModel(preset, factors, modelDefault) {
  const n = factors.length;
  const ids = factors.map(f => f.id);
  if (preset === "linear") return [...ids];
  if (preset === "synergie") {
    const t = [...ids];
    for (let i = 0; i < n; i++)
      for (let j = i + 1; j < n; j++) t.push(ids[i] + ids[j]);
    return t;
  }
  if (preset === "quadratic") {
    const t = [...ids];
    ids.forEach(id => t.push(quadPureTerm(id)));
    for (let i = 0; i < n; i++)
      for (let j = i + 1; j < n; j++) t.push(ids[i] + ids[j]);
    return t;
  }
  if (preset === "cubic") {
    const t = [...ids];
    for (let i = 0; i < n; i++)
      for (let j = i + 1; j < n; j++) t.push(ids[i] + ids[j]);
    for (let i = 0; i < n; i++)
      for (let j = i + 1; j < n; j++)
        for (let k = j + 1; k < n; k++) t.push(ids[i] + ids[j] + ids[k]);
    return t;
  }
  return [...modelDefault];
}

function termOrder(t, factors) {
  if (isQuadPure(t, factors)) return 2;
  return factors.filter(f => t.includes(f.id)).length;
}

function formatTermDisplay(t, factors) {
  for (let i = 0; i < factors.length; i++)
    if (t === quadPureTerm(factors[i].id)) return "X" + (i + 1) + "²";
  let s = t;
  factors.forEach((f, i) => { s = s.split(f.id).join("X" + (i + 1)); });
  return s;
}

function termSubScript(t, factors) {
  for (let i = 0; i < factors.length; i++)
    if (t === quadPureTerm(factors[i].id)) return (i + 1) + "" + (i + 1);
  let s = t;
  factors.forEach((f, i) => { s = s.replaceAll(f.id, (i + 1).toString()); });
  return s;
}

function formatTermHTML(t, factors) {
  for (let i = 0; i < factors.length; i++)
    if (t === quadPureTerm(factors[i].id))
      return "X<sub>" + (i + 1) + "</sub><sup>2</sup>";
  let s = t;
  factors.forEach((f, i) => { s = s.split(f.id).join("X<sub>" + (i + 1) + "</sub>"); });
  return s;
}

function getMissingRows(matrix, responses) {
  const missing = [];
  matrix.forEach((row, ri) => {
    responses.forEach(resp => {
      const v = row.responses[resp.id];
      if (v === "" || v === null || v === undefined) missing.push(ri);
    });
  });
  return [...new Set(missing)];
}

function loadExampleData(exFile) {
  const f = exFile.factors.map(fac => {
    const base = { id: fac.id, name: fac.name, unit: fac.unit || "", continuous: fac.continuous };
    if (fac.continuous) {
      base.low = { real: fac.low.real, coded: -1 };
      base.high = { real: fac.high.real, coded: 1 };
    } else {
      base.low = { label: fac.low.label || "", coded: -1 };
      base.high = { label: fac.high.label || "", coded: 1 };
    }
    return base;
  });
  const r = exFile.responses.map(resp => ({ id: resp.id, name: resp.name, unit: resp.unit || "" }));
  const cp = exFile.center_point
    ? { present: exFile.center_point.present, replicates: exFile.center_point.replicates }
    : { ...DEFAULT_CENTER };
  const md = exFile.model_default || computeDefaultModel(f);

  // Construire la matrice depuis les runs du JSON
  // Chaque run peut avoir plusieurs réplicats — on crée une ligne par réplicat
  let matrix = null;
  if (exFile.runs && exFile.runs.length > 0) {
    matrix = [];
    let rowId = 1;
    exFile.runs.forEach(run => {
      const reps = run.replicates || [];
      reps.forEach(rep => {
        const responses = {};
        r.forEach(resp => {
          responses[resp.id] = rep[resp.id] !== undefined ? rep[resp.id] : "";
        });
        matrix.push({
          id: rowId++,
          coded: { ...run.coded },
          real: { ...run.real },
          center: run.center || false,
          responses,
        });
      });
      // Si pas de réplicats définis, créer une ligne vide
      if (reps.length === 0) {
        const responses = {};
        r.forEach(resp => { responses[resp.id] = ""; });
        matrix.push({
          id: rowId++,
          coded: { ...run.coded },
          real: { ...run.real },
          center: run.center || false,
          responses,
        });
      }
    });
  }

  return { factors: f, responses: r, centerPoint: cp, modelDefault: md, matrix };
}


// ─── calculs statistiques ────────────────────────────────────────────────────

function buildDesignMatrix(terms, matrixRows, factors) {
  // Construit la matrice X du modèle (avec constante en première colonne)
  return matrixRows.map(row => {
    const x = [1]; // constante α₀
    terms.forEach(t => {
      if (isQuadPure(t, factors)) {
        const f = factors.find(f => t === quadPureTerm(f.id));
        const c = row.coded[f.id] ?? 0;
        x.push(c * c);
      } else {
        const facs = factors.filter(f => t.includes(f.id));
        x.push(facs.reduce((prod, f) => prod * (row.coded[f.id] ?? 0), 1));
      }
    });
    return x;
  });
}

function matMul(A, B) {
  const n = A.length, m = B[0].length, k = B.length;
  return Array.from({ length: n }, (_, i) =>
    Array.from({ length: m }, (_, j) =>
      Array.from({ length: k }, (_, l) => A[i][l] * B[l][j]).reduce((a, b) => a + b, 0)
    )
  );
}

function matT(A) {
  return A[0].map((_, j) => A.map(row => row[j]));
}

function luSolve(A, b) {
  const n = A.length;
  const L = Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => i === j ? 1 : 0));
  const U = A.map(r => [...r]);
  const perm = Array.from({ length: n }, (_, i) => i);

  for (let k = 0; k < n; k++) {
    let maxVal = Math.abs(U[k][k]), maxRow = k;
    for (let i = k + 1; i < n; i++) {
      if (Math.abs(U[i][k]) > maxVal) { maxVal = Math.abs(U[i][k]); maxRow = i; }
    }
    if (maxRow !== k) {
      [U[k], U[maxRow]] = [U[maxRow], U[k]];
      [perm[k], perm[maxRow]] = [perm[maxRow], perm[k]];
      for (let j = 0; j < k; j++) [L[k][j], L[maxRow][j]] = [L[maxRow][j], L[k][j]];
    }
    for (let i = k + 1; i < n; i++) {
      if (Math.abs(U[k][k]) < 1e-12) continue;
      L[i][k] = U[i][k] / U[k][k];
      for (let j = k; j < n; j++) U[i][j] -= L[i][k] * U[k][j];
    }
  }

  const pb = perm.map(i => b[i]);
  const y = Array(n).fill(0);
  for (let i = 0; i < n; i++) {
    y[i] = pb[i] - Array.from({ length: i }, (_, j) => L[i][j] * y[j]).reduce((a, c) => a + c, 0);
  }
  const x = Array(n).fill(0);
  for (let i = n - 1; i >= 0; i--) {
    if (Math.abs(U[i][i]) < 1e-12) { x[i] = 0; continue; }
    x[i] = (y[i] - Array.from({ length: n - i - 1 }, (_, j) => U[i][i + j + 1] * x[i + j + 1]).reduce((a, c) => a + c, 0)) / U[i][i];
  }
  return x;
}

function fitOLS(terms, matrixRows, yValues, factors) {
  const X = buildDesignMatrix(terms, matrixRows, factors);
  const Xt = matT(X);
  const XtX = matMul(Xt, X);
  const Xty = matMul(Xt, yValues.map(y => [y])).map(r => r[0]);

  let coeffs;
  try { coeffs = luSolve(XtX, Xty); }
  catch (e) { return null; }

  const n = matrixRows.length;
  const p = terms.length + 1; // nb paramètres incl constante
  const yHat = X.map(row => row.reduce((s, xi, i) => s + xi * coeffs[i], 0));
  const residuals = yValues.map((y, i) => y - yHat[i]);
  const yMean = yValues.reduce((a, b) => a + b, 0) / n;

  const SST = yValues.reduce((s, y) => s + (y - yMean) ** 2, 0);
  const SSR = yHat.reduce((s, yh) => s + (yh - yMean) ** 2, 0);
  const SSE = residuals.reduce((s, r) => s + r ** 2, 0);

  const dfR = p - 1;
  const dfE = n - p;
  const MSR = dfE > 0 ? SSR / dfR : 0;
  const MSE = dfE > 0 ? SSE / dfE : 0;
  const Fstat = MSE > 0 ? MSR / MSE : 0;
  const R2 = SST > 0 ? SSR / SST : 0;
  const R2adj = SST > 0 && dfE > 0 ? 1 - (SSE / dfE) / (SST / (n - 1)) : 0;

  // p-value approx F via incomplete beta
  const pF = dfE > 0 ? fPvalue(Fstat, dfR, dfE) : null;

  // Erreur standard des coefficients
  const seCoeffs = [];
  try {
    // diagonale de (XtX)^-1 * MSE
    const XtXinv = invertMatrix(XtX);
    for (let i = 0; i < p; i++) {
      seCoeffs.push(MSE > 0 ? Math.sqrt(Math.abs(XtXinv[i][i] * MSE)) : 0);
    }
  } catch (e) {
    for (let i = 0; i < p; i++) seCoeffs.push(0);
  }

  const tStats = coeffs.map((c, i) => seCoeffs[i] > 0 ? c / seCoeffs[i] : 0);
  const pCoeffs = tStats.map(t => dfE > 0 ? tPvalue(Math.abs(t), dfE) : null);

  return {
    coeffs, seCoeffs, tStats, pCoeffs,
    yHat, residuals,
    SST, SSR, SSE, dfR, dfE, MSR, MSE, Fstat, pF,
    R2, R2adj, n, p,
  };
}

function invertMatrix(A) {
  const n = A.length;
  const aug = A.map((row, i) => [...row, ...Array.from({ length: n }, (_, j) => i === j ? 1 : 0)]);
  for (let col = 0; col < n; col++) {
    let maxRow = col;
    for (let row = col + 1; row < n; row++)
      if (Math.abs(aug[row][col]) > Math.abs(aug[maxRow][col])) maxRow = row;
    [aug[col], aug[maxRow]] = [aug[maxRow], aug[col]];
    const div = aug[col][col];
    if (Math.abs(div) < 1e-12) throw new Error("Matrice singulière");
    for (let j = 0; j < 2 * n; j++) aug[col][j] /= div;
    for (let row = 0; row < n; row++) {
      if (row === col) continue;
      const factor = aug[row][col];
      for (let j = 0; j < 2 * n; j++) aug[row][j] -= factor * aug[col][j];
    }
  }
  return aug.map(row => row.slice(n));
}

// Approximation p-value F (Abramowitz & Stegun)
function fPvalue(F, d1, d2) {
  if (!isFinite(F) || F < 0) return 1;
  const x = d2 / (d2 + d1 * F);
  return incompleteBeta(x, d2 / 2, d1 / 2);
}

function tPvalue(t, df) {
  if (!isFinite(t)) return 1;
  const x = df / (df + t * t);
  return incompleteBeta(x, df / 2, 0.5);
}

// Table du quantile de Student t(α=0.025, df) — seuil bilatéral 5%
function tCritical(df) {
  const table = {
    1: 12.706, 2: 4.303, 3: 3.182, 4: 2.776, 5: 2.571,
    6: 2.447,  7: 2.365, 8: 2.306, 9: 2.262, 10: 2.228,
    15: 2.131, 20: 2.086, 30: 2.042, 60: 2.000,
  };
  if (table[df]) return table[df];
  if (df > 60)   return 1.96 + 0.5 / Math.sqrt(df);
  const keys = Object.keys(table).map(Number).sort((a,b)=>a-b);
  for (let i = 0; i < keys.length - 1; i++) {
    if (df >= keys[i] && df <= keys[i+1]) {
      const frac = (df - keys[i]) / (keys[i+1] - keys[i]);
      return table[keys[i]] + frac * (table[keys[i+1]] - table[keys[i]]);
    }
  }
  return 1.96;
}

// Approximation du quantile de la loi normale standard (algorithme Beasley-Springer-Moro)
function normalQuantile(p) {
  if (p <= 0) return -4;
  if (p >= 1) return  4;
  if (p === 0.5) return 0;
  const a = [2.515517, 0.802853, 0.010328];
  const b = [1.432788, 0.189269, 0.001308];
  const t = p < 0.5
    ? Math.sqrt(-2 * Math.log(p))
    : Math.sqrt(-2 * Math.log(1 - p));
  const num   = a[0] + a[1]*t + a[2]*t*t;
  const denom = 1 + b[0]*t + b[1]*t*t + b[2]*t*t*t;
  const z = t - num / denom;
  return p < 0.5 ? -z : z;
}

function incompleteBeta(x, a, b) {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  const lbeta = lgamma(a) + lgamma(b) - lgamma(a + b);
  const front = Math.exp(Math.log(x) * a + Math.log(1 - x) * b - lbeta) / a;
  return front * betaCF(x, a, b);
}

function lgamma(x) {
  const c = [76.18009172947146,-86.50532032941677,24.01409824083091,-1.231739572450155,1.208650973866179e-3,-5.395239384953e-6];
  let y = x, tmp = x + 5.5;
  tmp -= (x + 0.5) * Math.log(tmp);
  let ser = 1.000000000190015;
  for (let j = 0; j < 6; j++) { y++; ser += c[j] / y; }
  return -tmp + Math.log(2.5066282746310005 * ser / x);
}

function betaCF(x, a, b) {
  const MAXIT = 200, EPS = 3e-7;
  const qab = a + b, qap = a + 1, qam = a - 1;
  let c = 1, d = 1 - qab * x / qap;
  if (Math.abs(d) < 1e-30) d = 1e-30;
  d = 1 / d; let h = d;
  for (let m = 1; m <= MAXIT; m++) {
    const m2 = 2 * m;
    let aa = m * (b - m) * x / ((qam + m2) * (a + m2));
    d = 1 + aa * d; if (Math.abs(d) < 1e-30) d = 1e-30;
    c = 1 + aa / c; if (Math.abs(c) < 1e-30) c = 1e-30;
    d = 1 / d; h *= d * c;
    aa = -(a + m) * (qab + m) * x / ((a + m2) * (qap + m2));
    d = 1 + aa * d; if (Math.abs(d) < 1e-30) d = 1e-30;
    c = 1 + aa / c; if (Math.abs(c) < 1e-30) c = 1e-30;
    d = 1 / d; const del = d * c; h *= del;
    if (Math.abs(del - 1) < EPS) break;
  }
  return h;
}

function sigStars(p) {
  if (p === null || p === undefined) return "";
  if (p < 0.001) return "***";
  if (p < 0.01) return "**";
  if (p < 0.05) return "*";
  if (p < 0.1) return "·";
  return "";
}

function fmt(v, d = 4) {
  if (v === null || v === undefined || !isFinite(v)) return "—";
  return v.toFixed(d);
}

function fmtP(p) {
  if (p === null || p === undefined) return "—";
  if (p < 0.001) return "< 0.001";
  return p.toFixed(3);
}



// ─── export PDF (impression navigateur) ─────────────────────────────────────

function buildResidualSVG(yHat, residuals, dotColor) {
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
    return `<text x="${px.toFixed(1)}" y="${(above ? py - 8 : py + 14).toFixed(1)}" text-anchor="middle" font-size="8" fill="#6b7280">${i+1}</text>`;
  }).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
    <rect width="${W}" height="${H}" fill="#f9fafb" rx="4"/>
    <line x1="${PAD}" y1="${H/2}" x2="${W-PAD}" y2="${H/2}" stroke="#d1d5db" stroke-width="1"/>
    <line x1="${PAD}" y1="${PAD}" x2="${PAD}" y2="${H-PAD}" stroke="#d1d5db" stroke-width="1"/>
    <text x="${PAD-6}" y="${H/2+4}" text-anchor="end" font-size="9" fill="#9ca3af">0</text>
    ${points}
    ${labels}
    <text x="${W/2}" y="${H-4}" text-anchor="middle" font-size="10" fill="#9ca3af">Ŷ</text>
    <text x="10" y="${H/2}" text-anchor="middle" font-size="10" fill="#9ca3af" transform="rotate(-90,10,${H/2})">Résidu</text>
  </svg>`;
}

function buildParetoSVG(effects, color) {
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
      <text x="${LABEL_W - 4}" y="${y + BAR_H/2 + 4}" text-anchor="end" font-size="9" fill="#6b7280">${ef.label}</text>
      <rect x="${LABEL_W}" y="${y}" width="${BAR_W}" height="${BAR_H}" fill="#f3f4f6" rx="3"/>
      <rect x="${LABEL_W}" y="${y}" width="${barPx.toFixed(1)}" height="${BAR_H}" fill="${barColor}" rx="3"/>
      <text x="${LABEL_W + BAR_W + 4}" y="${y + BAR_H/2 + 4}" font-size="9" fill="#374151" font-family="monospace">${ef.coeff >= 0 ? "+" : ""}${ef.coeff.toFixed(3)}</text>
    `;
  }).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
    <rect width="${W}" height="${H}" fill="#f9fafb" rx="4"/>
    ${rows}
  </svg>`;
}

function buildIsoSVG(model, fit, factors, color) {
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
  const lineColors = ["#3b82f6","#6366f1","#8b5cf6","#a855f7","#ec4899","#ef4444"];

  const gx = (gi) => PAD_L + (gi / (GRID - 1)) * PW;
  const gy = (gj) => PAD_T + (1 - gj / (GRID - 1)) * PH;

  function marchingSquares(level) {
    const segs = [];
    const lerp = (a, b, va, vb) => a + (b - a) * (level - va) / (vb - va);
    for (let j = 0; j < GRID - 1; j++) {
      for (let i = 0; i < GRID - 1; i++) {
        const v00 = grid[j][i], v10 = grid[j][i+1], v01 = grid[j+1][i], v11 = grid[j+1][i+1];
        const idx = (v00>=level?8:0)|(v10>=level?4:0)|(v11>=level?2:0)|(v01>=level?1:0);
        if (idx === 0 || idx === 15) continue;
        const top=[lerp(i,i+1,v00,v10),j], right=[i+1,lerp(j,j+1,v10,v11)];
        const bottom=[lerp(i,i+1,v01,v11),j+1], left=[i,lerp(j,j+1,v00,v01)];
        const lines={1:[left,bottom],2:[bottom,right],3:[left,right],4:[right,top],6:[bottom,top],7:[left,top],8:[top,left],9:[top,bottom],11:[top,right],12:[right,left],13:[bottom,left],14:[right,bottom]};
        const pts = lines[idx]; if (!pts) continue;
        if (pts.length===2) segs.push([pts[0],pts[1]]);
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
  const clipId = `clip_${Math.random().toString(36).slice(2,8)}`;

  const isoLines = levels.map((level, li) => {
    const segs = marchingSquares(level);
    const col = lineColors[li % lineColors.length];
    const lines = segs.map(([p0, p1]) =>
      `<line x1="${gx(p0[0]).toFixed(1)}" y1="${gy(p0[1]).toFixed(1)}" x2="${gx(p1[0]).toFixed(1)}" y2="${gy(p1[1]).toFixed(1)}" stroke="${col}" stroke-width="1.5" stroke-linecap="round"/>`
    ).join("");
    // Label at middle segment
    if (segs.length > 0) {
      const mid = segs[Math.floor(segs.length / 2)];
      const lx = ((gx(mid[0][0]) + gx(mid[1][0])) / 2).toFixed(1);
      const ly = ((gy(mid[0][1]) + gy(mid[1][1])) / 2).toFixed(1);
      return `${lines}<rect x="${+lx-14}" y="${+ly-7}" width="28" height="13" rx="2" fill="white" fill-opacity="0.9"/>
        <text x="${lx}" y="${+ly+4}" text-anchor="middle" font-size="8" font-weight="600" fill="${col}">${level.toFixed(1)}</text>`;
    }
    return lines;
  }).join("");

  const ticksX = ticks.map(v => {
    const px = (PAD_L + (v+1)/2*PW).toFixed(1);
    return `<line x1="${px}" y1="${PAD_T+PH}" x2="${px}" y2="${PAD_T+PH+4}" stroke="#9ca3af" stroke-width="0.8"/>
      <text x="${px}" y="${PAD_T+PH+14}" text-anchor="middle" font-size="8" fill="#9ca3af">${toReal(f1,v)}</text>`;
  }).join("");
  const ticksY = ticks.map(v => {
    const py = (PAD_T + (1-(v+1)/2)*PH).toFixed(1);
    return `<line x1="${PAD_L-4}" y1="${py}" x2="${PAD_L}" y2="${py}" stroke="#9ca3af" stroke-width="0.8"/>
      <text x="${PAD_L-6}" y="${+py+3}" text-anchor="end" font-size="8" fill="#9ca3af">${toReal(f2,v)}</text>`;
  }).join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
    <defs><clipPath id="${clipId}"><rect x="${PAD_L}" y="${PAD_T}" width="${PW}" height="${PH}"/></clipPath></defs>
    <rect width="${W}" height="${H}" fill="white"/>
    <rect x="${PAD_L}" y="${PAD_T}" width="${PW}" height="${PH}" fill="#f9fafb" stroke="#e5e7eb" stroke-width="0.5"/>
    ${ticks.map(v => {
      const px = (PAD_L + (v+1)/2*PW).toFixed(1);
      const py = (PAD_T + (1-(v+1)/2)*PH).toFixed(1);
      return `<line x1="${px}" y1="${PAD_T}" x2="${px}" y2="${PAD_T+PH}" stroke="#e5e7eb" stroke-width="0.5" stroke-dasharray="3,3"/>
        <line x1="${PAD_L}" y1="${py}" x2="${PAD_L+PW}" y2="${py}" stroke="#e5e7eb" stroke-width="0.5" stroke-dasharray="3,3"/>`;
    }).join("")}
    <g clip-path="url(#${clipId})">${isoLines}</g>
    ${ticksX}${ticksY}
    <text x="${(PAD_L+PW/2).toFixed(1)}" y="${H-2}" text-anchor="middle" font-size="9" fill="#6b7280">${f1.name}${f1.unit?" ("+f1.unit+")":""}</text>
    <text x="10" y="${(PAD_T+PH/2).toFixed(1)}" text-anchor="middle" font-size="9" fill="#6b7280" transform="rotate(-90,10,${(PAD_T+PH/2).toFixed(1)})">${f2.name}${f2.unit?" ("+f2.unit+")":""}</text>
  </svg>`;
}

function svgToDataUrl(svgStr) {
  return "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgStr)));
}

function exportPDF({ models, fits, factors, responses, activeResp, allValidRows, activeRows, excludedPoints, validY, modelDefault, matrix }) {
  const date = new Date().toLocaleDateString("fr-FR", { year: "numeric", month: "long", day: "numeric" });
  const modelColors = ["#6366f1", "#10b981", "#f59e0b"];

  const termLbl = (t) => {
    for (let i = 0; i < factors.length; i++)
      if (t === quadPureTerm(factors[i].id)) return `X${i+1}²`;
    let s = t;
    factors.forEach((f, i) => { s = s.split(f.id).join(`X${i+1}`); });
    return s;
  };
  const termSub = (t) => {
    for (let i = 0; i < factors.length; i++)
      if (t === quadPureTerm(factors[i].id)) return `${i+1}${i+1}`;
    let s = t;
    factors.forEach((f, i) => { s = s.replaceAll(f.id, `${i+1}`); });
    return s;
  };
  const sigStar = (p) => { if (p===null||p===undefined) return ""; if (p<0.001) return "***"; if (p<0.01) return "**"; if (p<0.05) return "*"; if (p<0.1) return "·"; return ""; };
  const f4 = (v) => (v===null||v===undefined||!isFinite(v)) ? "—" : v.toFixed(4);
  const f3 = (v) => (v===null||v===undefined||!isFinite(v)) ? "—" : v.toFixed(3);
  const fp = (p) => { if (p===null||p===undefined) return "—"; if (p<0.001) return "< 0.001"; return p.toFixed(3); };

  const modelSection = (m, fit, color) => {
    if (!fit) return `<div class="model-card"><h3 style="color:${color}">${m.name}</h3><p class="error">Calcul impossible — données insuffisantes.</p></div>`;

    const allLabels = ["α₀ (constante)", ...m.terms.map(t => `α${termSub(t)} · ${termLbl(t)}`)];
    const verdict = (fit.pF !== null && fit.pF < 0.05 && fit.R2adj > 0.8) ? "acceptable" : (fit.pF !== null && fit.pF >= 0.05) ? "à rejeter" : "insuffisant";
    const verdictColor = verdict === "acceptable" ? "#059669" : verdict === "à rejeter" ? "#dc2626" : "#d97706";

    const effects = m.terms.map((t, i) => ({ label: termLbl(t), coeff: fit.coeffs[i+1], absCoeff: Math.abs(fit.coeffs[i+1]), p: fit.pCoeffs[i+1] }))
      .sort((a, b) => b.absCoeff - a.absCoeff);
    const maxAbs = effects[0]?.absCoeff || 1;

    // Graphiques SVG
    const residSvg = buildResidualSVG(fit.yHat, fit.residuals, color);
    const paretoSvg = buildParetoSVG(effects, color);
    const isoSvg = buildIsoSVG(m, fit, factors, color);

    return `
    <div class="model-card" style="border-left: 4px solid ${color}">
      <h3 style="color:${color}">${m.name}</h3>

      <h4>Équation du modèle</h4>
      <div class="equation">Ŷ = α₀${m.terms.map(t => ` + α<sub>${termSub(t)}</sub>·${termLbl(t)}`).join("")}</div>

      <div class="metrics-row">
        <div class="metric"><span class="metric-label">R²</span><span class="metric-val">${f4(fit.R2)}</span></div>
        <div class="metric"><span class="metric-label">R² ajusté</span><span class="metric-val">${f4(fit.R2adj)}</span></div>
        <div class="metric"><span class="metric-label">F</span><span class="metric-val">${f3(fit.Fstat)}</span></div>
        <div class="metric"><span class="metric-label">Prob &gt; F</span><span class="metric-val">${fp(fit.pF)}</span></div>
        <div class="metric"><span class="metric-label">Verdict</span><span class="metric-val" style="color:${verdictColor};font-weight:700">Modèle ${verdict}</span></div>
      </div>

      <h4>Coefficients estimés</h4>
      <table>
        <thead><tr><th>Terme</th><th>Estimation</th><th>Écart-type</th><th>t ratio</th><th>Prob &gt; |t|</th><th>Sig.</th></tr></thead>
        <tbody>${fit.coeffs.map((c, ci) => {
          const p = fit.pCoeffs[ci]; const sig = sigStar(p); const signif = p !== null && p < 0.05;
          return `<tr class="${signif?"signif-row":""}"><td class="mono">${allLabels[ci]}</td><td class="mono right bold">${f4(c)}</td><td class="mono right">${f4(fit.seCoeffs[ci])}</td><td class="mono right">${f3(fit.tStats[ci])}</td><td class="mono right ${signif?"signif":""}">${fp(p)}</td><td class="center bold amber">${sig}</td></tr>`;
        }).join("")}</tbody>
      </table>
      <p class="note">Significativité : *** p&lt;0.001 · ** p&lt;0.01 · * p&lt;0.05 · · p&lt;0.1</p>

      <h4>Analyse de la variance (ANOVA)</h4>
      <table>
        <thead><tr><th>Source</th><th>SC</th><th>dl</th><th>CM</th><th>F</th><th>Prob &gt; F</th></tr></thead>
        <tbody>
          <tr><td>Régression</td><td class="mono right">${f4(fit.SSR)}</td><td class="right">${fit.dfR}</td><td class="mono right">${f4(fit.MSR)}</td><td class="mono right">${f3(fit.Fstat)}</td><td class="mono right ${fit.pF<0.05?"signif":""}">${fp(fit.pF)}</td></tr>
          <tr><td>Résidus</td><td class="mono right">${f4(fit.SSE)}</td><td class="right">${fit.dfE}</td><td class="mono right">${f4(fit.MSE)}</td><td>—</td><td>—</td></tr>
          <tr class="total-row"><td>Total</td><td class="mono right">${f4(fit.SST)}</td><td class="right">${fit.n-1}</td><td>—</td><td>—</td><td>—</td></tr>
        </tbody>
      </table>
      <div class="verdict-box" style="border-color:${verdictColor};background:${verdictColor}18">
        <strong style="color:${verdictColor}">Conclusion : Modèle ${verdict}</strong><br>
        R² ajusté = ${f4(fit.R2adj)} ${fit.R2adj>=0.8?"✓ bon ajustement":"△ insuffisant"} · 
        ANOVA Prob&gt;F = ${fp(fit.pF)} ${fit.pF<0.05?"✓ significatif":"✗ non significatif"} · 
        dl résidus = ${fit.dfE}
      </div>

      <h4>Tableau des résidus${excludedPoints.size>0?` (${excludedPoints.size} point(s) exclu(s))`:""}</h4>
      <table>
        <thead><tr><th>#</th><th>Statut</th><th>Y mesuré</th><th>Ŷ calculé</th><th>Résidu</th><th>Résidu normé</th></tr></thead>
        <tbody>${allValidRows.map(({ i: globalIdx, y }) => {
          const isExcluded = excludedPoints.has(globalIdx);
          const activeIdx = activeRows.findIndex(x => x.i === globalIdx);
          const resid = !isExcluded && activeIdx>=0 ? fit.residuals[activeIdx] : null;
          const yHatVal = !isExcluded && activeIdx>=0 ? fit.yHat[activeIdx] : null;
          const normed = resid!==null && fit.MSE>0 ? resid/Math.sqrt(fit.MSE) : null;
          const isLarge = normed!==null && Math.abs(normed)>2;
          return `<tr class="${isExcluded?"excluded-row":isLarge?"large-resid":""}">
            <td class="right">${globalIdx+1}</td><td class="center">${isExcluded?"exclu":"actif"}</td>
            <td class="mono right">${f3(y)}</td><td class="mono right">${yHatVal!==null?f3(yHatVal):"—"}</td>
            <td class="mono right ${resid!==null?(resid>=0?"pos":"neg"):""}">${resid!==null?f3(resid):"—"}</td>
            <td class="mono right ${isLarge?"large-val":""}">${normed!==null?f3(normed):"—"}</td>
          </tr>`;
        }).join("")}</tbody>
      </table>

      <h4>Graphique des résidus vs Ŷ</h4>
      <div class="chart-wrap">
        <img src="${svgToDataUrl(residSvg)}" width="480" height="220" style="max-width:100%" alt="Résidus vs Ŷ"/>
      </div>

      <h4>Diagramme de Pareto des effets</h4>
      <div class="chart-wrap">
        <img src="${svgToDataUrl(paretoSvg)}" width="500" style="max-width:100%" alt="Pareto effets"/>
      </div>

      ${isoSvg ? `<h4>Courbes isoréponses (${factors.filter(f=>f.continuous)[0]?.name} × ${factors.filter(f=>f.continuous)[1]?.name})</h4>
      <div class="chart-wrap">
        <img src="${svgToDataUrl(isoSvg)}" width="320" height="320" style="max-width:100%" alt="Isoréponses"/>
      </div>` : ""}
    </div>`;
  };

  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>Rapport — Plans d'expériences</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 11px; color: #111; background: white; padding: 20mm; }
    h1 { font-size: 20px; font-weight: 700; margin-bottom: 4px; }
    h2 { font-size: 14px; font-weight: 600; color: #374151; margin: 20px 0 8px; border-bottom: 1.5px solid #e5e7eb; padding-bottom: 4px; }
    h3 { font-size: 13px; font-weight: 700; margin-bottom: 12px; }
    h4 { font-size: 10px; font-weight: 600; color: #4b5563; margin: 14px 0 6px; text-transform: uppercase; letter-spacing: 0.05em; }
    .header { margin-bottom: 24px; padding-bottom: 16px; border-bottom: 2px solid #111; }
    .header-meta { font-size: 10px; color: #6b7280; margin-top: 6px; }
    .model-card { margin-bottom: 32px; padding: 16px; border: 1px solid #e5e7eb; border-radius: 8px; break-inside: avoid; }
    .equation { font-family: 'Courier New', monospace; font-size: 12px; background: #f9fafb; border: 1px solid #e5e7eb; padding: 8px 12px; border-radius: 6px; margin-bottom: 12px; }
    .metrics-row { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 12px; }
    .metric { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; padding: 6px 12px; text-align: center; min-width: 90px; }
    .metric-label { display: block; font-size: 9px; color: #9ca3af; margin-bottom: 2px; text-transform: uppercase; }
    .metric-val { display: block; font-size: 12px; font-weight: 600; font-family: 'Courier New', monospace; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 8px; font-size: 10px; }
    th { background: #f3f4f6; text-align: left; padding: 5px 8px; font-size: 9px; font-weight: 600; color: #6b7280; text-transform: uppercase; border-bottom: 1px solid #e5e7eb; }
    td { padding: 4px 8px; border-bottom: 1px solid #f3f4f6; vertical-align: middle; }
    tr:last-child td { border-bottom: none; }
    .mono { font-family: 'Courier New', monospace; }
    .right { text-align: right; } .center { text-align: center; } .bold { font-weight: 700; }
    .signif { color: #4f46e5; font-weight: 700; } .signif-row { background: #eef2ff; }
    .amber { color: #d97706; } .pos { color: #059669; } .neg { color: #dc2626; }
    .large-val { color: #dc2626; font-weight: 700; } .large-resid { background: #fef2f2; }
    .excluded-row { color: #9ca3af; font-style: italic; }
    .total-row { font-weight: 600; background: #f9fafb; }
    .note { font-size: 9px; color: #9ca3af; margin-top: 4px; }
    .error { color: #dc2626; font-style: italic; }
    .verdict-box { padding: 8px 12px; border-radius: 6px; border: 1px solid; margin-top: 8px; font-size: 10px; line-height: 1.6; }
    .chart-wrap { margin: 8px 0 12px; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; padding: 8px; display: inline-block; }
    .bar-bg { width: 100px; height: 10px; background: #f3f4f6; border-radius: 3px; overflow: hidden; }
    .bar-fill { height: 100%; border-radius: 3px; } .bar-signif { background: #6366f1; } .bar-ns { background: #d1d5db; }
    .page-break { page-break-before: always; }
    @media print {
      body { padding: 10mm 15mm; }
      .model-card { break-inside: avoid; }
      h2 { break-after: avoid; } h4 { break-after: avoid; }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>Rapport d'analyse — Plans d'expériences</h1>
    <div class="header-meta">
      Généré le ${date} · Réponse : ${activeResp.name}${activeResp.unit?" ("+activeResp.unit+")":""} · 
      ${allValidRows.length} essais${excludedPoints.size>0?" ("+excludedPoints.size+" exclu(s))":""} · 
      ${models.length} modèle(s)
    </div>
  </div>

  <h2>Facteurs étudiés</h2>
  <table>
    <thead><tr><th>ID</th><th>Nom</th><th>Unité</th><th>Type</th><th>Niveau bas (−1)</th><th>Niveau haut (+1)</th></tr></thead>
    <tbody>${factors.map(f => `<tr><td class="mono">${f.id}</td><td>${f.name}</td><td>${f.unit||"—"}</td><td>${f.continuous?"Continu":"Discret"}</td><td class="mono">${f.continuous?f.low.real:(f.low.label||"—")}</td><td class="mono">${f.continuous?f.high.real:(f.high.label||"—")}</td></tr>`).join("")}</tbody>
  </table>

  <h2>Matrice d'expériences</h2>
  <table>
    <thead><tr><th>#</th>${factors.map(f=>`<th>${f.id}</th>`).join("")}${responses.map(r=>`<th>${r.id} (${r.name}${r.unit?", "+r.unit:""})</th>`).join("")}<th>Statut</th></tr></thead>
    <tbody>${(matrix||[]).map((row,ri) => {
      const isExcluded = excludedPoints.has(ri);
      return `<tr class="${isExcluded?"excluded-row":""}">
        <td class="right">${row.center?"PC":ri+1}</td>
        ${factors.map(f => { const c=row.coded[f.id]; const rv=row.real[f.id]; const cl=c===0?"0":c===-1?"−1":"+1"; return `<td class="mono">(${cl}) ${rv??""}</td>`; }).join("")}
        ${responses.map(r => `<td class="mono right">${row.responses[r.id]!==""&&row.responses[r.id]!==null&&row.responses[r.id]!==undefined?row.responses[r.id]:"—"}</td>`).join("")}
        <td class="center">${isExcluded?"exclu":"actif"}</td>
      </tr>`;
    }).join("")}</tbody>
  </table>

  <h2>Résultats par modèle</h2>
  ${models.map((m,mi) => modelSection(m, fits[mi], modelColors[mi%modelColors.length])).join("")}

  ${models.length > 1 ? `<div class="page-break"></div>
  <h2>Comparaison des modèles</h2>
  <table>
    <thead><tr><th>Modèle</th><th>Termes</th><th>R²</th><th>R² ajusté</th><th>F</th><th>Prob &gt; F</th><th>Verdict</th></tr></thead>
    <tbody>${models.map((m,mi) => {
      const fit=fits[mi];
      if (!fit) return `<tr><td>${m.name}</td><td colspan="6" class="center">—</td></tr>`;
      const verdict=(fit.pF<0.05&&fit.R2adj>0.8)?"acceptable":fit.pF>=0.05?"à rejeter":"insuffisant";
      const vc=verdict==="acceptable"?"#059669":verdict==="à rejeter"?"#dc2626":"#d97706";
      return `<tr><td style="color:${modelColors[mi%modelColors.length]};font-weight:700">${m.name}</td><td class="right">${m.terms.length+1}</td><td class="mono right">${f4(fit.R2)}</td><td class="mono right">${f4(fit.R2adj)}</td><td class="mono right">${f3(fit.Fstat)}</td><td class="mono right ${fit.pF<0.05?"signif":""}">${fp(fit.pF)}</td><td style="color:${vc};font-weight:600">Modèle ${verdict}</td></tr>`;
    }).join("")}</tbody>
  </table>` : ""}
</body>
</html>`;

  const win = window.open("", "_blank", "width=900,height=700");
  win.document.write(html);
  win.document.close();
  win.onload = () => { setTimeout(() => { win.print(); }, 600); };
}


// ─── sous-composants partie 4 ────────────────────────────────────────────────

function Surface3DPanel({ model, fit, factors, col }) {
  const contFactors = factors.filter(f => f.continuous);
  const [f1Idx, setF1Idx] = React.useState(0);
  const [f2Idx, setF2Idx] = React.useState(Math.min(1, contFactors.length - 1));
  const [fixedVals, setFixedVals] = React.useState(() => {
    const fv = {}; factors.forEach(f => { fv[f.id] = 0; }); return fv;
  });
  // Rotation state
  const [rotX, setRotX] = React.useState(0.5);   // elevation (rad, 0=top, PI/2=side)
  const [rotZ, setRotZ] = React.useState(0.6);   // azimuth (rad)
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

  // Color from z value
  const zColor = (z) => {
    const t = (z - minZ) / rangeZ;
    if (col.dot === "bg-indigo-500") {
      const r = Math.round(224 + t * (55 - 224));
      const g = Math.round(231 + t * (48 - 231));
      const b = Math.round(255 + t * (163 - 255));
      return `rgb(${r},${g},${b})`;
    } else if (col.dot === "bg-emerald-500") {
      const r = Math.round(209 + t * (5 - 209));
      const g = Math.round(250 + t * (150 - 250));
      const b = Math.round(229 + t * (105 - 229));
      return `rgb(${r},${g},${b})`;
    } else {
      const r = Math.round(254 + t * (146 - 254));
      const g = Math.round(243 + t * (64 - 243));
      const b = Math.round(199 + t * (14 - 199));
      return `rgb(${r},${g},${b})`;
    }
  };

  // 3D projection with rotation
  const W = 480, H = 380, CX = W / 2, CY = H / 2 - 20, SCALE = 120;
  const project = (x, y, z) => {
    const cosZ = Math.cos(rotZ), sinZ = Math.sin(rotZ);
    const cosX = Math.cos(rotX), sinX = Math.sin(rotX);
    const rx = x * cosZ - y * sinZ;
    const ry = x * sinZ + y * cosZ;
    const rz = z;
    const px = rx;
    const py = ry * cosX - rz * sinX;
    const pz = ry * sinX + rz * cosX;
    return { sx: CX + px * SCALE, sy: CY - py * SCALE, depth: pz };
  };

  // Build quads sorted back-to-front
  const quads = [];
  for (let j = 0; j < GRID - 1; j++) {
    for (let i = 0; i < GRID - 1; i++) {
      const x0 = xs[i], x1 = xs[i+1], y0 = xs[j], y1 = xs[j+1];
      const z00 = grid[j][i], z10 = grid[j][i+1], z01 = grid[j+1][i], z11 = grid[j+1][i+1];
      const avgZ = (z00+z10+z01+z11)/4;
      const normZ = (avgZ - minZ) / rangeZ;
      const p00 = project(x0, y0, normZ * 0.8 - 0.4);
      const p10 = project(x1, y0, ((z10-minZ)/rangeZ)*0.8-0.4);
      const p11 = project(x1, y1, ((z11-minZ)/rangeZ)*0.8-0.4);
      const p01 = project(x0, y1, ((z01-minZ)/rangeZ)*0.8-0.4);
      const depth = (p00.depth+p10.depth+p11.depth+p01.depth)/4;
      quads.push({ p00, p10, p11, p01, depth, avgZ, color: zColor(avgZ) });
    }
  }
  quads.sort((a, b) => a.depth - b.depth);

  // Axis endpoints
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
    <div className={`bg-white dark:bg-gray-900 ${cardCls} ${col.border}`}>
      <div className="flex items-center gap-2 mb-4">
        <span className={`size-2.5 rounded-full ${col.dot}`} />
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{model.name} — Surface de réponse 3D</h3>
      </div>

      {/* Sélecteurs axes */}
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

      {/* Facteurs fixes */}
      {factors.filter(f => f.continuous && f.id !== f1?.id && f.id !== f2?.id).length > 0 && (
        <div className="flex flex-wrap gap-3 mb-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <p className="w-full text-[11px] text-gray-400 font-medium">Autres facteurs fixés :</p>
          {factors.filter(f => f.continuous && f.id !== f1?.id && f.id !== f2?.id).map(f => (
            <div key={f.id} className="flex items-center gap-2">
              <label className="text-xs text-gray-500">{f.id} :</label>
              <input type="range" min="-1" max="1" step="0.1" value={fixedVals[f.id] ?? 0}
                onChange={e => setFixedVals(prev => ({ ...prev, [f.id]: +e.target.value }))}
                className="w-20" />
              <span className="text-xs font-mono text-gray-600 dark:text-gray-300 w-8">{(fixedVals[f.id]??0).toFixed(1)}</span>
              <span className="text-[10px] text-gray-400">({toReal(f, fixedVals[f.id]??0)} {f.unit})</span>
            </div>
          ))}
        </div>
      )}

      {/* SVG surface 3D */}
      <svg
        width={W} height={H} viewBox={`0 0 ${W} ${H}`}
        className="w-full rounded-lg bg-gray-50 dark:bg-gray-800 cursor-grab active:cursor-grabbing select-none"
        onMouseDown={onMouseDown} onMouseMove={onMouseMove} onMouseUp={onMouseUp} onMouseLeave={onMouseUp}
      >
        {/* Quadrilatères surface triés arrière→avant */}
        {quads.map((q, i) => (
          <polygon key={i}
            points={`${q.p00.sx},${q.p00.sy} ${q.p10.sx},${q.p10.sy} ${q.p11.sx},${q.p11.sy} ${q.p01.sx},${q.p01.sy}`}
            fill={q.color} stroke="rgba(255,255,255,0.3)" strokeWidth="0.3"
          />
        ))}
        {/* Axes */}
        <line x1={origin.sx} y1={origin.sy} x2={axX.sx} y2={axX.sy} stroke="#6b7280" strokeWidth="1.5" markerEnd="url(#arrowX)" />
        <line x1={origin.sx} y1={origin.sy} x2={axY.sx} y2={axY.sy} stroke="#6b7280" strokeWidth="1.5" markerEnd="url(#arrowY)" />
        <line x1={origin.sx} y1={origin.sy} x2={axZ.sx} y2={axZ.sy} stroke="#6b7280" strokeWidth="1.5" markerEnd="url(#arrowZ)" />
        <defs>
          <marker id="arrowX" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto"><path d="M0,0 L0,6 L6,3 z" fill="#6b7280"/></marker>
          <marker id="arrowY" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto"><path d="M0,0 L0,6 L6,3 z" fill="#6b7280"/></marker>
          <marker id="arrowZ" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto"><path d="M0,0 L0,6 L6,3 z" fill="#6b7280"/></marker>
        </defs>
        {/* Labels axes */}
        <text x={axX.sx + 6} y={axX.sy + 4} fontSize="10" fill="#4b5563">{f1.name}{f1.unit ? ` (${f1.unit})` : ""}</text>
        <text x={axY.sx + 6} y={axY.sy + 4} fontSize="10" fill="#4b5563">{f2.name}{f2.unit ? ` (${f2.unit})` : ""}</text>
        <text x={axZ.sx + 4} y={axZ.sy - 4} fontSize="10" fill="#4b5563">Ŷ</text>
        {/* Min/Max labels */}
        <text x={W - 100} y={22} fontSize="9" fill="#9ca3af">max Ŷ = {maxZ.toFixed(3)}</text>
        <text x={W - 100} y={34} fontSize="9" fill="#9ca3af">min Ŷ = {minZ.toFixed(3)}</text>
      </svg>

      {/* Légende couleur */}
      <div className="flex items-center gap-3 mt-3">
        <div className="flex-1 h-3 rounded-full" style={{
          background: col.dot === "bg-indigo-500"
            ? "linear-gradient(to right, #e0e7ff, #6366f1, #3730a3)"
            : col.dot === "bg-emerald-500"
              ? "linear-gradient(to right, #d1fae5, #10b981, #065f46)"
              : "linear-gradient(to right, #fef3c7, #f59e0b, #92400e)"
        }} />
        <div className="flex justify-between w-full text-[10px] font-mono text-gray-400 -mt-3">
          <span>{minZ.toFixed(2)}</span>
          <span>{((minZ + maxZ) / 2).toFixed(2)}</span>
          <span>{maxZ.toFixed(2)}</span>
        </div>
      </div>
      <p className="text-[10px] text-gray-400 mt-2">Cliquez et faites glisser pour faire pivoter la surface</p>
    </div>
  );
}



function PredictionPanel({ model, fit, factors, col }) {
  const initVals = () => {
    const v = {};
    factors.forEach(f => { v[f.id] = f.continuous ? 0 : -1; });
    return v;
  };
  const [vals, setVals] = React.useState(initVals);
  const [predicted, setPredicted] = React.useState(null);

  const compute = () => {
    let y = fit.coeffs[0];
    model.terms.forEach((t, i) => {
      let val;
      if (isQuadPure(t, factors)) {
        const fac = factors.find(fc => t === quadPureTerm(fc.id));
        val = (vals[fac.id] ?? 0) ** 2;
      } else {
        val = factors.filter(fac => t.includes(fac.id)).reduce((p, fac) => p * (vals[fac.id] ?? 0), 1);
      }
      y += fit.coeffs[i + 1] * val;
    });
    setPredicted(y);
  };

  const toReal = (f, coded) => {
    if (!f.continuous) return coded === -1 ? (f.low.label || "−1") : (f.high.label || "+1");
    const mid = (f.low.real + f.high.real) / 2;
    const half = (f.high.real - f.low.real) / 2;
    return (mid + (+coded) * half).toFixed(2);
  };

  return (
    <div className="mt-4 border-t border-gray-100 dark:border-gray-800 pt-4">
      <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-3">
        Prédiction de réponse
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
        {factors.map(f => {
          const coded = vals[f.id] ?? 0;
          return (
            <div key={f.id} className="flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-gray-600 dark:text-gray-300">
                  {f.id} — {f.name}
                </label>
                <span className="text-xs font-mono text-gray-500 dark:text-gray-400">
                  {f.continuous
                    ? <>{toReal(f, coded)} {f.unit || ""} <span className="text-gray-300">({(+coded).toFixed(2)})</span></>
                    : toReal(f, coded)
                  }
                </span>
              </div>
              {f.continuous ? (
                <div className="flex items-center gap-2">
                  <input type="range" min="-1" max="1" step="0.05"
                    value={coded}
                    onChange={e => { setVals(v => ({ ...v, [f.id]: +e.target.value })); setPredicted(null); }}
                    className="flex-1" />
                  <input type="number" min="-1" max="1" step="0.05" value={coded}
                    onChange={e => { setVals(v => ({ ...v, [f.id]: Math.max(-1, Math.min(1, +e.target.value)) })); setPredicted(null); }}
                    className="w-16 rounded-md border border-gray-200 dark:border-gray-700 bg-transparent px-2 py-1 text-xs font-mono text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-400" />
                </div>
              ) : (
                <div className="flex gap-2">
                  <button
                    onClick={() => { setVals(v => ({ ...v, [f.id]: -1 })); setPredicted(null); }}
                    className={`flex-1 rounded-lg border px-2 py-1.5 text-xs font-mono transition-colors ${coded === -1 ? "bg-red-50 border-red-300 text-red-700 dark:bg-red-900/30 dark:border-red-500 dark:text-red-300" : "border-gray-200 dark:border-gray-700 text-gray-500 hover:border-gray-300"}`}>
                    −1 {f.low.label ? `(${f.low.label})` : ""}
                  </button>
                  <button
                    onClick={() => { setVals(v => ({ ...v, [f.id]: 1 })); setPredicted(null); }}
                    className={`flex-1 rounded-lg border px-2 py-1.5 text-xs font-mono transition-colors ${coded === 1 ? "bg-emerald-50 border-emerald-300 text-emerald-700 dark:bg-emerald-900/30 dark:border-emerald-500 dark:text-emerald-300" : "border-gray-200 dark:border-gray-700 text-gray-500 hover:border-gray-300"}`}>
                    +1 {f.high.label ? `(${f.high.label})` : ""}
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex items-center gap-4">
        <button onClick={compute}
          className={`rounded-lg px-4 py-2 text-sm font-semibold text-white transition-colors ${col.tab || "bg-indigo-600 hover:bg-indigo-500"}`}
          style={{ background: col.dot === "bg-indigo-500" ? "#6366f1" : col.dot === "bg-emerald-500" ? "#10b981" : "#f59e0b" }}>
          Calculer Ŷ
        </button>
        {predicted !== null && (
          <div className={`flex-1 flex items-center gap-3 rounded-xl border-2 ${col.border} ${col.bg} px-4 py-3`}>
            <div>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 mb-0.5">Réponse prédite</p>
              <p className={`text-2xl font-bold font-mono ${col.text}`}>{predicted.toFixed(4)}</p>
            </div>
            <div className="ml-auto text-xs text-gray-400 dark:text-gray-500 font-mono">
              Ŷ = {fit.coeffs[0].toFixed(4)}
              {model.terms.map((t, i) => {
                const c = fit.coeffs[i + 1];
                return ` ${c >= 0 ? "+" : "−"} ${Math.abs(c).toFixed(4)}·${formatTermDisplay(t, factors)}`;
              }).join("")}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}



function ResidualPlot({ yHat, residuals, MSE, globalIndices, allValidRows, onExclude, onReinclude, excludedGlobalIndices, minRequired, color }) {
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

  // Graduation axe Y
  const nTicks = 4;
  const tickStep = absMaxY / nTicks;
  const yTicks = [];
  for (let i = -nTicks; i <= nTicks; i++) yTicks.push(i * tickStep);

  // Graduation axe X
  const xTicks = 5;
  const xTickStep = rangeX / (xTicks - 1);
  const xTickVals = Array.from({ length: xTicks }, (_, i) => minX + i * xTickStep);


  return (
    <div style={{ position: "relative" }}>
      {/* Overlay HTML pour les popups cliqués — z-index au-dessus du SVG */}
      {clicked !== null && (() => {
        const i = clicked;
        const x = yHat[i];
        const normed = Math.abs(residuals[i]) / s;
        const gIdx = globalIndices ? globalIndices[i] : i;
        const canExclude = (allValidRows ? allValidRows.length - (excludedGlobalIndices?.size || 0) - 1 : 999) >= (minRequired || 2);
        // Position : en % du container
        const pxRatio = (PAD.l + (x - minX) / rangeX * PW) / W;
        const pyRatio = (PAD.t + PH / 2 - (residuals[i] / absMaxY) * (PH / 2)) / H;
        const left = pxRatio > 0.6 ? "auto" : `${(pxRatio * 100 + 3).toFixed(1)}%`;
        const right = pxRatio > 0.6 ? `${((1 - pxRatio) * 100 + 3).toFixed(1)}%` : "auto";
        const top = pyRatio > 0.6 ? "auto" : `${(pyRatio * 100 + 2).toFixed(1)}%`;
        const bottom = pyRatio > 0.6 ? `${((1 - pyRatio) * 100 + 2).toFixed(1)}%` : "auto";
        return (
          <div style={{ position:"absolute", left, right, top, bottom, zIndex:200, minWidth:180 }}
            onClick={e => e.stopPropagation()}>
            <div style={{ background:"white", border:"1.5px solid #6366f1", borderRadius:10, boxShadow:"0 6px 24px rgba(0,0,0,0.22)", padding:"10px 12px", fontSize:11 }}>
              <div style={{ fontWeight:700, color:"#1e293b", marginBottom:5 }}>Point {i + 1}</div>
              <div style={{ fontFamily:"monospace", color:"#475569", marginBottom:3, fontSize:10 }}>
                Y = {allValidRows?.[i]?.y?.toFixed(3) ?? "—"}
              </div>
              <div style={{ fontFamily:"monospace", color:"#475569", marginBottom:3, fontSize:10 }}>
                Ŷ = {x.toFixed(3)}
              </div>
              <div style={{ fontFamily:"monospace", color: residuals[i] >= 0 ? "#059669" : "#dc2626", marginBottom:6, fontSize:10 }}>
                r = {residuals[i] >= 0 ? "+" : ""}{residuals[i].toFixed(3)} (normé : {normed.toFixed(2)})
              </div>
              {canExclude ? (
                <button
                  style={{ width:"100%", fontSize:10, padding:"3px 8px", background:"#fee2e2", color:"#dc2626", border:"1px solid #fca5a5", borderRadius:6, cursor:"pointer", fontWeight:700 }}
                  onClick={(e) => { e.stopPropagation(); onExclude && onExclude(gIdx); setClicked(null); setHovered(null); }}>
                  ✕ Exclure ce point
                </button>
              ) : (
                <div style={{ fontSize:9, color:"#f59e0b", textAlign:"center" }}>Pas assez de points restants</div>
              )}
            </div>
          </div>
        );
      })()}
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ overflow: "visible" }}
        onClick={() => { if (clicked !== null) setClicked(null); }}>

        {/* Grille horizontale */}
        {yTicks.map((v, i) => (
          <line key={i} x1={PAD.l} y1={cy(v)} x2={PAD.l + PW} y2={cy(v)}
            stroke={v === 0 ? "#94a3b8" : "#f1f5f9"} strokeWidth={v === 0 ? 1.5 : 1}
            strokeDasharray={v === 0 ? "none" : "4 3"} />
        ))}

        {/* Axe X et Y */}
        <line x1={PAD.l} y1={PAD.t} x2={PAD.l} y2={PAD.t + PH} stroke="#e2e8f0" strokeWidth="1" />
        <line x1={PAD.l} y1={PAD.t + PH} x2={PAD.l + PW} y2={PAD.t + PH} stroke="#e2e8f0" strokeWidth="1" />

        {/* Ticks Y */}
        {yTicks.filter((_, i) => i % 2 === 0).map((v, i) => (
          <text key={i} x={PAD.l - 6} y={cy(v) + 3.5} textAnchor="end" fontSize="9" fill="#94a3b8" fontFamily="monospace">
            {v.toFixed(v === 0 ? 0 : 2)}
          </text>
        ))}

        {/* Ticks X */}
        {xTickVals.map((v, i) => (
          <text key={i} x={cx(v)} y={PAD.t + PH + 14} textAnchor="middle" fontSize="9" fill="#94a3b8" fontFamily="monospace">
            {v.toFixed(2)}
          </text>
        ))}

        {/* Labels axes */}
        <text x={PAD.l + PW / 2} y={H - 4} textAnchor="middle" fontSize="11" fill="#94a3b8">Ŷ (valeur prédite)</text>
        <text x={10} y={PAD.t + PH / 2} textAnchor="middle" fontSize="11" fill="#94a3b8" transform={`rotate(-90, 10, ${PAD.t + PH / 2})`}>Résidu</text>

        {/* Points */}
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
              {/* Label numéro */}
              <text x={px} y={py - 10} textAnchor="middle" fontSize="9" fill={isLarge ? "#ef4444" : "#64748b"} fontWeight="600">
                {i + 1}
              </text>

              {/* Tooltip survol */}
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

              {/* Popup clic — rendu en HTML sur le SVG pour z-index fiable */}
              {isClick && (() => {
                // Position relative dans le SVG → convertir en % pour le div HTML
                const pxPct = (px / W * 100).toFixed(1);
                const pyPct = (py / H * 100).toFixed(1);
                return null; // handled below via HTML overlay
              })()}
            </g>
          );
        })}
      </svg>

      {/* Indicateurs résidus */}
      {(() => {
        const SCE = residuals.reduce((s, r) => s + r * r, 0);
        const maxNormed = MSE > 0 ? Math.max(...residuals.map(r => Math.abs(r / Math.sqrt(MSE)))) : null;
        const hasAberrant = maxNormed !== null && maxNormed > 2;
        return (
          <div className="flex flex-wrap items-center gap-4 mt-2 pt-2 border-t border-gray-100 dark:border-gray-800">
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] text-gray-400">SCE :</span>
              <span className="text-[11px] font-mono font-semibold text-gray-600 dark:text-gray-300">{SCE.toFixed(4)}</span>
              <span className="text-[10px] text-gray-400">(somme des carrés des écarts)</span>
            </div>
            {maxNormed !== null && (
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] text-gray-400">Résidu normé max :</span>
                <span className={`text-[11px] font-mono font-semibold ${hasAberrant ? "text-red-500 dark:text-red-400" : "text-emerald-600 dark:text-emerald-400"}`}>
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

function QQPlotSVG({ residuals, MSE, col }) {
  if (!residuals || residuals.length < 3) return null;

  const W = 280, H = 220;
  const PAD = { l: 44, r: 16, t: 16, b: 36 };
  const PW = W - PAD.l - PAD.r;
  const PH = H - PAD.t - PAD.b;

  // Résidus normés triés
  const s = MSE > 0 ? Math.sqrt(MSE) : 1;
  const normed = residuals.map(r => r / s);
  const sorted = [...normed].sort((a, b) => a - b);
  const n = sorted.length;

  // Quantiles théoriques normaux (formule de Blom : (i - 3/8) / (n + 1/4))
  const theoretical = sorted.map((_, i) => normalQuantile((i + 1 - 0.375) / (n + 0.25)));

  // Échelles
  const allX = theoretical, allY = sorted;
  const xMin = Math.min(...allX) - 0.2;
  const xMax = Math.max(...allX) + 0.2;
  const yMin = Math.min(...allY, xMin) - 0.2;
  const yMax = Math.max(...allY, xMax) + 0.2;
  const sx = v => PAD.l + (v - xMin) / (xMax - xMin) * PW;
  const sy = v => PAD.t + (1 - (v - yMin) / (yMax - yMin)) * PH;

  // Couleur selon le modèle
  const dotColor = col?.dot === "bg-indigo-500" ? "#6366f1"
    : col?.dot === "bg-emerald-500" ? "#10b981" : "#f59e0b";

  // Droite de référence y = x (normalité parfaite)
  const x1ref = xMin, y1ref = xMin, x2ref = xMax, y2ref = xMax;

  // Détection anomalies : distance à la droite > 0.65
  const anomalies = sorted.map((yv, i) => Math.abs(yv - theoretical[i])).map(d => d > 0.65);

  // Ticks
  const ticks = [-2, -1, 0, 1, 2].filter(t => t >= xMin && t <= xMax);

  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}
         style={{ fontFamily: "monospace", overflow: "visible" }}>

      {/* Fond zone de tracé */}
      <rect x={PAD.l} y={PAD.t} width={PW} height={PH}
            fill="#f9fafb" stroke="#e5e7eb" strokeWidth="0.5" className="dark:fill-gray-800/50 dark:stroke-gray-700"/>

      {/* Grille légère */}
      {ticks.map(t => (
        <g key={t}>
          <line x1={sx(t)} y1={PAD.t} x2={sx(t)} y2={PAD.t+PH}
                stroke="#e5e7eb" strokeWidth="0.5" strokeDasharray="3,3"/>
          <line x1={PAD.l} y1={sy(t)} x2={PAD.l+PW} y2={sy(t)}
                stroke="#e5e7eb" strokeWidth="0.5" strokeDasharray="3,3"/>
        </g>
      ))}

      {/* Droite de référence (normalité parfaite y = x) */}
      <line
        x1={sx(x1ref)} y1={sy(y1ref)} x2={sx(x2ref)} y2={sy(y2ref)}
        stroke="#ef4444" strokeWidth="1.2" strokeDasharray="5,3" opacity="0.7"
      />

      {/* Zone de confiance approximative (± 0.8 autour de la droite) */}
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

      {/* Points */}
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

      {/* Axes labels */}
      {ticks.map(t => (
        <g key={t}>
          <text x={sx(t)} y={PAD.t+PH+12} textAnchor="middle" fontSize="8" fill="#9ca3af">{t}</text>
          <text x={PAD.l-4} y={sy(t)+3} textAnchor="end" fontSize="8" fill="#9ca3af">{t}</text>
        </g>
      ))}

      {/* Titre axes */}
      <text x={W/2} y={H-2} textAnchor="middle" fontSize="9" fill="#9ca3af">
        Quantiles théoriques N(0,1)
      </text>
      <text
        x={10} y={PAD.t + PH/2}
        textAnchor="middle" fontSize="9" fill="#9ca3af"
        transform={`rotate(-90, 10, ${PAD.t + PH/2})`}
      >
        Résidus normés
      </text>

      {/* Légende */}
      <line x1={PAD.l+4} y1={PAD.t+8} x2={PAD.l+18} y2={PAD.t+8}
            stroke="#ef4444" strokeWidth="1.2" strokeDasharray="5,3" opacity="0.7"/>
      <text x={PAD.l+21} y={PAD.t+11} fontSize="8" fill="#6b7280">Droite de normalité</text>
    </svg>
  );
}

function IsoResponsePanel({ model, fit, factors, modelColors }) {
  const [f1Idx, setF1Idx] = React.useState(0);
  const [f2Idx, setF2Idx] = React.useState(1);
  const [fixedVals, setFixedVals] = React.useState(() => {
    const fv = {};
    factors.forEach(f => { fv[f.id] = 0; });
    return fv;
  });
  // Réticule
  const [cursor, setCursor] = React.useState(null); // { cx, cy, c1, c2, z } ou null

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

  // Build grid
  const xs = Array.from({ length: GRID }, (_, i) => -1 + i * 2 / (GRID - 1));
  const ys = Array.from({ length: GRID }, (_, i) => -1 + i * 2 / (GRID - 1));
  const grid = ys.map(y2 => xs.map(x1 => predict(x1, y2)));
  const flat = grid.flat();
  const minZ = Math.min(...flat), maxZ = Math.max(...flat);

  // Choose ~6 iso levels evenly spaced
  const nLevels = 6;
  const levels = Array.from({ length: nLevels }, (_, i) => minZ + (i + 1) * (maxZ - minZ) / (nLevels + 1));

  // Marching squares — extract iso-contour segments for a given level
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
        // Edge midpoints (fractional grid indices)
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

  // Convert grid index to SVG coords
  const gx = (gi) => PAD_L + (gi / (GRID - 1)) * PW;
  const gy = (gj) => PAD_T + (1 - gj / (GRID - 1)) * PH;

  // Label position: find middle segment of contour for a level
  function labelPos(segs) {
    if (segs.length === 0) return null;
    const mid = segs[Math.floor(segs.length / 2)];
    return { x: (gx(mid[0][0]) + gx(mid[1][0])) / 2, y: (gy(mid[0][1]) + gy(mid[1][1])) / 2 };
  }

  const lineColors = ["#3b82f6","#6366f1","#8b5cf6","#a855f7","#ec4899","#ef4444"];

  // Axis ticks
  const ticks = [-1, -0.5, 0, 0.5, 1];

  return (
    <div className={`bg-white dark:bg-gray-900 border-2 ${modelColors.border} rounded-xl p-5`}>
      <div className="flex items-center gap-2 mb-4">
        <span className={`size-2.5 rounded-full ${modelColors.dot}`} />
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{model.name} — Courbes isoréponses</h3>
      </div>

      {/* Sélecteurs axes */}
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

      {/* Valeurs fixes des autres facteurs */}
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

      {/* SVG isoréponses */}
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
          {/* Zone de tracé */}
          <rect x={PAD_L} y={PAD_T} width={PW} height={PH} fill="#f9fafb" stroke="#e5e7eb" strokeWidth="0.5" />

          {/* Grille légère */}
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

          {/* Courbes isoréponses */}
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

          {/* Ticks axe X (valeurs réelles) */}
          {ticks.map(v => {
            const px = PAD_L + (v + 1) / 2 * PW;
            return (
              <g key={v}>
                <line x1={px} y1={PAD_T + PH} x2={px} y2={PAD_T + PH + 4} stroke="#9ca3af" strokeWidth="0.8" />
                <text x={px} y={PAD_T + PH + 14} textAnchor="middle" fontSize="9" fill="#9ca3af">{toReal(f1, v)}</text>
              </g>
            );
          })}

          {/* Ticks axe Y (valeurs réelles) */}
          {ticks.map(v => {
            const py = PAD_T + (1 - (v + 1) / 2) * PH;
            return (
              <g key={v}>
                <line x1={PAD_L - 4} y1={py} x2={PAD_L} y2={py} stroke="#9ca3af" strokeWidth="0.8" />
                <text x={PAD_L - 8} y={py + 3} textAnchor="end" fontSize="9" fill="#9ca3af">{toReal(f2, v)}</text>
              </g>
            );
          })}

          {/* Noms axes */}
          <text x={PAD_L + PW / 2} y={H - 2} textAnchor="middle" fontSize="10" fill="#6b7280">
            {f1.name}{f1.unit ? ` (${f1.unit})` : ""}
          </text>
          <text x={10} y={PAD_T + PH / 2} textAnchor="middle" fontSize="10" fill="#6b7280"
            transform={`rotate(-90, 10, ${PAD_T + PH / 2})`}>
            {f2.name}{f2.unit ? ` (${f2.unit})` : ""}
          </text>

          {/* ── Réticule interactif ── */}
          {cursor && (() => {
            const { cx, cy, c1, c2, z } = cursor;
            const r1 = toReal(f1, c1);
            const r2 = toReal(f2, c2);

            // Tooltip dimensions
            const tipW = 110, tipH = 52, tipPad = 7;
            let tx = cx + 12;
            let ty = cy - tipH - 8;
            if (tx + tipW > W - 4) tx = cx - tipW - 12;
            if (ty < PAD_T)        ty = cy + 10;

            return (
              <g style={{ pointerEvents: "none" }}>
                {/* Ligne verticale */}
                <line
                  x1={cx} y1={PAD_T} x2={cx} y2={PAD_T + PH}
                  stroke="#6366f1" strokeWidth="0.8" strokeDasharray="4,3" opacity="0.7"
                />
                {/* Ligne horizontale */}
                <line
                  x1={PAD_L} y1={cy} x2={PAD_L + PW} y2={cy}
                  stroke="#6366f1" strokeWidth="0.8" strokeDasharray="4,3" opacity="0.7"
                />
                {/* Point central */}
                <circle cx={cx} cy={cy} r="4" fill="#6366f1" fillOpacity="0.9" stroke="white" strokeWidth="1.5" />

                {/* Graduation X en bas */}
                <line x1={cx} y1={PAD_T+PH} x2={cx} y2={PAD_T+PH+5} stroke="#6366f1" strokeWidth="1" />
                <text x={cx} y={PAD_T+PH+14} textAnchor="middle" fontSize="8" fill="#6366f1" fontWeight="600">
                  {r1}{f1.unit ? ` ${f1.unit}` : ""}
                </text>

                {/* Graduation Y à gauche */}
                <line x1={PAD_L-5} y1={cy} x2={PAD_L} y2={cy} stroke="#6366f1" strokeWidth="1" />
                <text x={PAD_L-7} y={cy+3} textAnchor="end" fontSize="8" fill="#6366f1" fontWeight="600">
                  {r2}{f2.unit ? ` ${f2.unit}` : ""}
                </text>

                {/* Tooltip */}
                <rect x={tx} y={ty} width={tipW} height={tipH} rx="5"
                  fill="white" stroke="#e5e7eb" strokeWidth="0.8"
                  style={{ filter: "drop-shadow(0 2px 6px rgba(0,0,0,0.15))" }}
                />
                <text x={tx+tipPad} y={ty+14} fontSize="9" fontWeight="700" fill="#111">
                  Ŷ = {z.toFixed(3)}
                </text>
                <text x={tx+tipPad} y={ty+27} fontSize="8" fill="#6b7280">
                  {f1.name||f1.id} : {r1}{f1.unit ? ` ${f1.unit}` : ""}
                </text>
                <text x={tx+tipPad} y={ty+40} fontSize="8" fill="#6b7280">
                  {f2.name||f2.id} : {r2}{f2.unit ? ` ${f2.unit}` : ""}
                </text>
              </g>
            );
          })()}
        </svg>
      </div>

      {/* Légende niveaux */}
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

// ─── composant principal ──────────────────────────────────────────────────────

// ─── Sous-composant modal import Excel/CSV ────────────────────────────────────
function ExcelImportModal({ onClose, excelDragOver, setExcelDragOver, importFromExcel, excelImportError, setExcelImportError }) {
  const [xlsTab, setXlsTab] = React.useState('plan');

  const downloadTemplate = async () => {
    if (!window.XLSX) {
      await new Promise((res, rej) => {
        const s = document.createElement('script');
        s.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
        s.onload = res; s.onerror = rej;
        document.head.appendChild(s);
      });
    }
    const XLSX = window.XLSX;
    const wsData = [
      ['Essai','coded_X1','coded_X2','real_X1','real_X2','Y1'],
      [1,-1,-1,50,25,''], [2,1,-1,80,25,''], [3,-1,1,50,65,''], [4,1,1,80,65,''],
    ];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    ws['!cols'] = [8,12,12,10,10,8].map(w => ({wch:w}));
    const wsFact = XLSX.utils.aoa_to_sheet([
      ['ID','Nom','Unité','Type','Niveau bas','Niveau haut'],
      ['X1','Facteur 1','','Continu',50,80],
      ['X2','Facteur 2','','Continu',25,65],
    ]);
    wsFact['!cols'] = [6,16,8,10,12,12].map(w => ({wch:w}));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Plan');
    XLSX.utils.book_append_sheet(wb, wsFact, 'Facteurs');
    XLSX.writeFile(wb, 'modele_plan.xlsx');
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/30 dark:bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white dark:bg-gray-950 rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        {/* Header sticky */}
        <div className="sticky top-0 bg-white dark:bg-gray-950 border-b border-gray-100 dark:border-gray-800 px-6 py-4 flex items-center justify-between z-10">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">Importer depuis Excel / CSV</h2>
          <button onClick={onClose} className="size-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="size-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-6 py-5 flex flex-col gap-4">
          {/* Zone drag & drop */}
          <div
            onDragOver={e => { e.preventDefault(); setExcelDragOver(true); }}
            onDragLeave={() => setExcelDragOver(false)}
            onDrop={e => { e.preventDefault(); setExcelDragOver(false); const f = e.dataTransfer.files[0]; if (f) importFromExcel(f); }}
            className={`rounded-xl border-2 border-dashed p-5 text-center transition-colors ${excelDragOver ? "border-amber-400 bg-amber-50 dark:bg-amber-900/20" : "border-gray-200 dark:border-gray-700"}`}>
            <div className="size-10 rounded-xl bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center mx-auto mb-2">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="size-5 text-amber-600 dark:text-amber-400">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
              </svg>
            </div>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Glissez votre fichier ici</p>
            <p className="text-xs text-gray-400 mb-3">.xlsx · .xls · .csv acceptés</p>
            <label className="inline-flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-400 transition-colors cursor-pointer">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="size-4">
                <path d="M9.25 13.25a.75.75 0 001.5 0V4.636l2.955 3.129a.75.75 0 001.09-1.03l-4.25-4.5a.75.75 0 00-1.09 0l-4.25 4.5a.75.75 0 101.09 1.03L9.25 4.636v8.614z"/>
                <path d="M3.5 12.75a.75.75 0 00-1.5 0v2.5A2.75 2.75 0 004.75 18h10.5A2.75 2.75 0 0018 15.25v-2.5a.75.75 0 00-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5z"/>
              </svg>
              Parcourir…
              <input type="file" accept=".xlsx,.xls,.csv" className="hidden"
                onChange={e => { const f = e.target.files[0]; if (f) importFromExcel(f); e.target.value = ''; }} />
            </label>
          </div>

          {/* Erreur */}
          {excelImportError && (
            <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 px-3 py-2">
              <p className="text-xs font-medium text-red-600 dark:text-red-400 mb-0.5">Erreur d'import</p>
              <p className="text-xs text-red-500 dark:text-red-400">{excelImportError}</p>
            </div>
          )}

          {/* Format — tabs Plan / Facteurs */}
          <div className="rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="px-3 pt-3 pb-0 border-b border-gray-200 dark:border-gray-700">
              <p className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 mb-2">
                Format Excel attendu — <span className="text-amber-600 dark:text-amber-400">2 onglets requis</span>
              </p>
              <div className="flex gap-1">
                {[{id:'plan', label:'Onglet "Plan"'}, {id:'facteurs', label:'Onglet "Facteurs"'}].map(t => (
                  <button key={t.id} onClick={() => setXlsTab(t.id)}
                    className={`px-3 py-1.5 text-[11px] font-medium rounded-t-lg border border-b-0 transition-colors ${
                      xlsTab === t.id
                        ? 'bg-white dark:bg-gray-950 border-gray-200 dark:border-gray-700 text-amber-600 dark:text-amber-400'
                        : 'border-transparent text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
                    }`}>
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {xlsTab === 'plan' && (
              <div className="p-3">
                <p className="text-[10px] text-gray-400 mb-2">Contient la matrice des essais. <strong className="text-gray-500">Colonnes obligatoires :</strong> une colonne codée et une réelle par facteur, une par réponse.</p>
                <div className="overflow-x-auto">
                  <table className="text-[10px] font-mono border-collapse w-full">
                    <thead>
                      <tr className="bg-gray-200 dark:bg-gray-700">
                        {["Essai","coded_X1","coded_X2","real_X1","real_X2","Y1"].map(h => (
                          <th key={h} className={`border border-gray-300 dark:border-gray-600 px-1.5 py-1 text-left font-semibold ${
                            h.startsWith('coded') ? 'text-indigo-600 dark:text-indigo-400'
                            : h.startsWith('real') ? 'text-emerald-600 dark:text-emerald-400'
                            : h.startsWith('Y') ? 'text-amber-600 dark:text-amber-400'
                            : 'text-gray-600 dark:text-gray-300'
                          }`}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {[[1,-1,-1,50,25,""],[2,1,-1,80,25,"62.4"],[3,-1,1,50,65,""],[4,1,1,80,65,"71.2"]].map((row, i) => (
                        <tr key={i} className={i%2===0?"bg-white dark:bg-gray-900":"bg-gray-50 dark:bg-gray-800/50"}>
                          {row.map((cell, j) => (
                            <td key={j} className={`border border-gray-200 dark:border-gray-700 px-1.5 py-1 ${cell===""?"text-gray-300":""} ${j===5&&cell?"font-semibold text-amber-600 dark:text-amber-400":"text-gray-600 dark:text-gray-300"}`}>{cell}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="flex flex-wrap gap-3 mt-2">
                  {[['text-indigo-600 dark:text-indigo-400','coded_Xi / Xi_code','Valeur codée −1/0/+1'],['text-emerald-600 dark:text-emerald-400','real_Xi / Xi_reel','Valeur réelle du facteur'],['text-amber-600 dark:text-amber-400','Y1, Y2…','Réponse mesurée']].map(([cls,k,v]) => (
                    <span key={k} className="text-[9px] text-gray-500 flex items-center gap-1">
                      <code className={`bg-gray-200 dark:bg-gray-700 px-1 rounded ${cls}`}>{k}</code> — {v}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {xlsTab === 'facteurs' && (
              <div className="p-3">
                <p className="text-[10px] text-gray-400 mb-2">Onglet optionnel mais recommandé. Permet de nommer les facteurs, indiquer les unités et niveaux réels.</p>
                <div className="overflow-x-auto">
                  <table className="text-[10px] font-mono border-collapse w-full">
                    <thead>
                      <tr className="bg-gray-200 dark:bg-gray-700">
                        {["ID","Nom","Unité","Type","Niveau bas","Niveau haut"].map(h => (
                          <th key={h} className="border border-gray-300 dark:border-gray-600 px-1.5 py-1 text-left text-gray-600 dark:text-gray-300 font-semibold">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {[["X1","Température","°C","Continu","50","80"],["X2","Durée","min","Continu","25","65"]].map((row, i) => (
                        <tr key={i} className={i%2===0?"bg-white dark:bg-gray-900":"bg-gray-50 dark:bg-gray-800/50"}>
                          {row.map((cell, j) => <td key={j} className="border border-gray-200 dark:border-gray-700 px-1.5 py-1 text-gray-600 dark:text-gray-300">{cell}</td>)}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="text-[10px] text-gray-400 mt-2">
                  Si absent, les facteurs seront nommés X1, X2… et les niveaux déduits des colonnes <code className="bg-gray-200 dark:bg-gray-700 px-1 rounded">real_Xi</code>.
                </p>
              </div>
            )}
          </div>

          {/* Boutons */}
          <div className="flex gap-2 mt-2">
            <button onClick={onClose}
              className="flex-1 rounded-lg border border-gray-200 dark:border-gray-700 px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
              Fermer
            </button>
            <button onClick={downloadTemplate}
              className="flex-1 rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-400 transition-colors">
              ↓ Télécharger le modèle .xlsx
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function PlanFactorielInner() {
  const { theme } = useTheme();
  void ChevronDownIcon;

  const [part, setPart] = useState(0); // 0=accueil, 1=facteurs, 2=matrice, 3=modèle, 4=résultats
  // ── États écran d'accueil ────────────────────────────────────────────────
  const [welcomeModal, setWelcomeModal] = useState(null);
  const [showWelcomePopup, setShowWelcomePopup] = useState(false);
  const [showExportPopup, setShowExportPopup] = useState(false);   // popup export depuis "Exemple chargé"
  const [showQuitConfirm, setShowQuitConfirm] = useState(false);   // popup confirmation quitter sans sauvegarder
  const [dataModified, setDataModified] = useState(false);         // true si l'utilisateur a modifié qq chose
  const [newNbFactors, setNewNbFactors] = useState(2);
  const [newNbResponses, setNewNbResponses] = useState(1);
  const [jsonPasteText, setJsonPasteText] = useState('');
  const [jsonImportError, setJsonImportError] = useState(null);
  const [jsonDragOver, setJsonDragOver] = useState(false);
  const [excelImportError, setExcelImportError] = useState(null);
  const [excelDragOver, setExcelDragOver] = useState(false);
  const [exampleEditData, setExampleEditData] = useState(null); // données de l'exemple sélectionné
  // ── Mode compact ──────────────────────────────────────────────────────────
  const { compact: isCompact, setCompact } = useCompact();
  const cardCls = isCompact ? "border rounded-lg p-3" : "border-2 rounded-xl p-5";
  const cardSpace = isCompact ? "space-y-2" : "space-y-4";
  const [factors, setFactors] = useState(DEFAULT_FACTORS.map(f => ({ ...f, low: { ...f.low }, high: { ...f.high } })));
  const [responses, setResponses] = useState(DEFAULT_RESPONSES.map(r => ({ ...r })));
  const [centerPoint, setCenterPoint] = useState({ ...DEFAULT_CENTER });
  const [matrix, setMatrix] = useState(null);
  const [modelDefault, setModelDefault] = useState(() => computeDefaultModel(DEFAULT_FACTORS));
  // Multi-modèles : tableau de { id, name, terms, preset }
  const [models, setModels] = useState(() => {
    const def = computeDefaultModel(DEFAULT_FACTORS);
    return [{ id: 1, name: "Modèle 1", terms: [...def], preset: "default" }];
  });
  const [activeModelId, setActiveModelId] = useState(1);
  const [part4Tab, setPart4Tab] = useState("coefficients");
  const [part4Response, setPart4Response] = useState(0); // index de la réponse active
  const [excludedPoints, setExcludedPoints] = useState(new Set()); // indices des points exclus
  // Compat legacy pour le reste du composant
  const modelActive = models.find(m => m.id === activeModelId)?.terms || [];
  const modelPreset = models.find(m => m.id === activeModelId)?.preset || "default";
  const setModelActive = (terms) => setModels(ms => ms.map(m => m.id === activeModelId ? { ...m, terms } : m));
  const setModelPreset = (preset) => setModels(ms => ms.map(m => m.id === activeModelId ? { ...m, preset } : m));
  const [addRowLevels, setAddRowLevels] = useState(null);
  const [showRandomDialog, setShowRandomDialog] = useState(false);
  const [showRandomDone, setShowRandomDone] = useState(false);
  const [showCubicDialog, setShowCubicDialog] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loadedExampleId, setLoadedExampleId] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [importError, setImportError] = useState(null);
  const [importedExamples, setImportedExamples] = useState([]);
  const [editMode, setEditMode] = useState(false);
  const [editMeta, setEditMeta] = useState({ id: "", title: "", context: "", difficulty: "débutant", real_data: false, source: "" });
  const [validationHelpFit, setValidationHelpFit] = useState(null); // { fit, modelName }
  const [improvementHelpFit, setImprovementHelpFit] = useState(null); // { fit, verdict, modelName, modelTerms }
  const [nsTermHelp, setNsTermHelp] = useState(null); // { term, label, p, coeff, isInteraction, dfE, se }

  const loadExample = async (ex) => {
    setLoadError(null);
    try {
      // Exemples importés : données déjà embarquées dans _data
      const data = ex._data ? ex._data : await fetch(ex.url).then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status} — ${ex.url}`);
        return r.json();
      });
      const { factors: f, responses: r, centerPoint: cp, modelDefault: md, matrix: m } = loadExampleData(data);
      setFactors(f);
      setResponses(r);
      setCenterPoint(cp);
      setModelDefault(md);
      setModels([{ id: 1, name: "Modèle 1", terms: [...md], preset: "default" }]);
      setActiveModelId(1);
      setMatrix(m);
      setLoadedExampleId(ex.file);
      setSidebarOpen(false);
      setWelcomeModal(null);
      setPart(1);
    } catch (e) {
      console.error("Erreur chargement exemple:", e);
      setLoadError(e.message);
    }
  };

  // ── Créer un nouveau plan depuis l'écran d'accueil ──────────────────────────
  const createNewPlan = (nbFactors, nbResponses) => {
    const newFactors = Array.from({ length: nbFactors }, (_, i) => ({
      id: `X${i+1}`, name: `Facteur ${i+1}`, unit: '', continuous: true,
      low: { real: 0, coded: -1 }, high: { real: 1, coded: 1 },
    }));
    const newResponses = Array.from({ length: nbResponses }, (_, i) => ({
      id: `Y${i+1}`, name: `Réponse ${i+1}`, unit: '',
    }));
    const def = computeDefaultModel(newFactors);
    setFactors(newFactors);
    setResponses(newResponses);
    setCenterPoint({ ...DEFAULT_CENTER });
    setModelDefault(def);
    setModels([{ id: 1, name: 'Modèle 1', terms: [...def], preset: 'default' }]);
    setActiveModelId(1);
    setMatrix(null);
    setLoadedExampleId(null);
    setEditMode(false);
    setEditMeta({ id: '', title: '', context: '', difficulty: 'débutant', real_data: false, source: '' });
    setWelcomeModal(null);
    setPart(1);
  };

  // ── Importer JSON depuis texte (copier-coller) ou fichier ─────────────────
  const importFromJsonText = (text) => {
    setJsonImportError(null);
    try {
      const data = JSON.parse(text);
      const errors = [];
      if (!Array.isArray(data.factors) || data.factors.length < 1) errors.push("'factors' manquant");
      if (!Array.isArray(data.responses) || data.responses.length < 1) errors.push("'responses' manquant");
      if (errors.length > 0) { setJsonImportError(errors.join(' · ')); return; }
      const { factors: f, responses: r, centerPoint: cp, modelDefault: md, matrix: m } = loadExampleData(data);
      setFactors(f); setResponses(r); setCenterPoint(cp); setModelDefault(md);
      setModels([{ id: 1, name: 'Modèle 1', terms: [...md], preset: 'default' }]);
      setActiveModelId(1); setMatrix(m);
      setLoadedExampleId(data.meta?.id || 'import.json');
      setWelcomeModal(null); setPart(1);
    } catch (err) {
      setJsonImportError('JSON invalide : ' + err.message);
    }
  };

  // ── Télécharger un modèle CSV ──────────────────────────────────────────────
  const downloadCsvTemplate = () => {
    const header = 'id,coded_X1,coded_X2,real_X1,real_X2,Y1';
    const rows = [
      '1,-1,-1,0,0,',
      '2,1,-1,1,0,',
      '3,-1,1,0,1,',
      '4,1,1,1,1,',
    ];
    const csv = [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'modele_plan.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  const resetToNew = () => {
    setFactors(DEFAULT_FACTORS.map(f => ({ ...f, low: { ...f.low }, high: { ...f.high } })));
    setResponses(DEFAULT_RESPONSES.map(r => ({ ...r })));
    setCenterPoint({ ...DEFAULT_CENTER });
    const def = computeDefaultModel(DEFAULT_FACTORS);
    setModelDefault(def);
    setModels([{ id: 1, name: "Modèle 1", terms: [...def], preset: "default" }]);
    setActiveModelId(1);
    setMatrix(null);
    setLoadedExampleId(null);
    setEditMode(false);
    setEditMeta({ id: "", title: "", context: "", difficulty: "débutant", real_data: false, source: "" });
    setSidebarOpen(false);
    setPart(0);
  };

  // ── édition exemple ──
  const loadForEdit = async (ex) => {
    setLoadError(null);
    try {
      const data = ex._data ? ex._data : await fetch(ex.url).then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status} — ${ex.url}`);
        return r.json();
      });
      const { factors: f, responses: r, centerPoint: cp, modelDefault: md, matrix: m } = loadExampleData(data);
      setFactors(f);
      setResponses(r);
      setCenterPoint(cp);
      setModelDefault(md);
      setModels([{ id: 1, name: "Modèle 1", terms: [...md], preset: "default" }]);
      setActiveModelId(1);
      setMatrix(m);
      setLoadedExampleId(ex.file);
      setEditMeta({
        id: data.meta?.id || ex.file.replace(".json", ""),
        title: data.meta?.title || ex.title,
        context: data.meta?.context || ex.context,
        difficulty: data.meta?.difficulty || ex.difficulty,
        real_data: data.meta?.real_data ?? ex.real_data,
        source: data.meta?.source || "",
      });
      setEditMode(true);
      setSidebarOpen(false);
      setPart(1);
    } catch (e) {
      console.error("Erreur chargement exemple:", e);
      setLoadError(e.message);
    }
  };

  const validateAndImport = (file) => {
    setImportError(null);
    if (!file) return;
    if (!file.name.endsWith(".json")) {
      setImportError("Le fichier doit être un fichier .json");
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        // Validation du format
        const errors = [];
        if (!data.meta || typeof data.meta !== "object") errors.push("Champ 'meta' manquant ou invalide");
        if (!Array.isArray(data.factors) || data.factors.length < 2) errors.push("'factors' doit être un tableau d'au moins 2 facteurs");
        if (!Array.isArray(data.responses) || data.responses.length < 1) errors.push("'responses' doit contenir au moins une réponse");
        if (!Array.isArray(data.model_default)) errors.push("'model_default' doit être un tableau");
        if (!Array.isArray(data.runs)) errors.push("'runs' doit être un tableau");
        if (data.factors) {
          data.factors.forEach((f, i) => {
            if (!f.id) errors.push(`Facteur ${i+1} : 'id' manquant`);
            if (!f.name) errors.push(`Facteur ${i+1} : 'name' manquant`);
            if (f.continuous === undefined) errors.push(`Facteur ${i+1} : 'continuous' manquant`);
            if (f.continuous && (f.low?.real === undefined || f.high?.real === undefined))
              errors.push(`Facteur ${i+1} : 'low.real' ou 'high.real' manquant`);
            if (!f.continuous && (f.low?.label === undefined || f.high?.label === undefined))
              errors.push(`Facteur ${i+1} : 'low.label' ou 'high.label' manquant`);
          });
        }
        if (errors.length > 0) {
          setImportError(errors.join(" · "));
          return;
        }
        // Créer l'entrée exemple à partir des métadonnées
        const newEx = {
          file: file.name,
          url: null,
          title: data.meta?.title || file.name.replace(".json", ""),
          context: data.meta?.context || `${data.factors.length} facteurs`,
          difficulty: data.meta?.difficulty || "débutant",
          real_data: data.meta?.real_data ?? false,
          _data: data, // données embarquées directement
          imported: true,
        };
        // Éviter les doublons (même nom de fichier)
        setImportedExamples(prev => {
          const exists = prev.findIndex(e => e.file === file.name);
          if (exists >= 0) {
            const updated = [...prev];
            updated[exists] = newEx;
            return updated;
          }
          return [...prev, newEx];
        });
        // Charger directement comme un exemple normal
        const { factors: f, responses: r, centerPoint: cp, modelDefault: md, matrix: m } = loadExampleData(data);
        setFactors(f);
        setResponses(r);
        setCenterPoint(cp);
        setModelDefault(md);
        setModels([{ id: 1, name: "Modèle 1", terms: [...md], preset: "default" }]);
        setActiveModelId(1);
        setMatrix(m);
        setLoadedExampleId(file.name);
        setSidebarOpen(false);
        setPart(1);
      } catch (err) {
        setImportError("JSON invalide : " + err.message);
      }
    };
    reader.readAsText(file);
  };

  // ── Import depuis Excel/CSV ─────────────────────────────────────────────────
  const importFromExcel = async (file) => {
    setExcelImportError(null);
    // Charger SheetJS si besoin
    if (!window.XLSX) {
      await new Promise((resolve, reject) => {
        const s = document.createElement('script');
        s.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
        s.onload = resolve; s.onerror = reject;
        document.head.appendChild(s);
      });
    }
    const XLSX = window.XLSX;
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: 'array' });

      // ── Lire la feuille "Plan" (ou la première feuille) ──────────────────
      const sheetName = wb.SheetNames.includes('Plan') ? 'Plan' : wb.SheetNames[0];
      const ws = wb.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
      if (rows.length < 2) { setExcelImportError("Le fichier est vide ou ne contient qu'une ligne d'en-têtes."); return; }

      const headers = rows[0].map(h => String(h).trim());
      const dataRows = rows.slice(1).filter(r => r.some(c => c !== ''));

      // ── Détecter les colonnes ─────────────────────────────────────────────
      // Format attendu : Essai | Xi_code | Xi_reel | Yi
      // Ou : id | coded_Xi | real_Xi | Yi
      const codeIdxs = [];  // indices des colonnes codées
      const realIdxs = [];  // indices des colonnes réelles
      const yIdxs = [];     // indices des colonnes réponses
      const factorIds = [];
      const responseIds = [];

      headers.forEach((h, i) => {
        const hl = h.toLowerCase();
        if (hl === 'essai' || hl === 'id' || hl === '#') return;
        // Colonnes codées : coded_X1, X1_code, X1 (code), col contenant "cod"
        if (hl.includes('cod') || hl.match(/^x\d+_?c/i)) {
          const id = h.match(/x\d+/i)?.[0]?.toUpperCase() || `X${codeIdxs.length + 1}`;
          codeIdxs.push({ idx: i, id });
          if (!factorIds.includes(id)) factorIds.push(id);
        }
        // Colonnes réelles : real_X1, X1_reel, X1 (réel)
        else if (hl.includes('reel') || hl.includes('réel') || hl.includes('real') || hl.match(/^x\d+_?r/i)) {
          const id = h.match(/x\d+/i)?.[0]?.toUpperCase() || `X${realIdxs.length + 1}`;
          realIdxs.push({ idx: i, id });
        }
        // Colonnes réponses : Y1, Y2, réponse
        else if (hl.match(/^y\d*/i) || hl.includes('réponse') || hl.includes('reponse') || hl.includes('response')) {
          const id = h.match(/y\d*/i)?.[0]?.toUpperCase() || `Y${yIdxs.length + 1}`;
          yIdxs.push({ idx: i, id, name: h });
          if (!responseIds.includes(id)) responseIds.push(id);
        }
      });

      // ── Cas CSV simple : si peu de colonnes détectées, essayer format basique ─
      if (codeIdxs.length === 0 && realIdxs.length === 0) {
        // Essayer de détecter des facteurs par position
        // Ex : id, X1, X2, Y1 → colonnes 1..n-1 = facteurs, dernière = réponse
        const numCols = headers.length;
        if (numCols >= 3) {
          for (let i = 1; i < numCols - 1; i++) {
            const id = headers[i].match(/x\d+/i)?.[0]?.toUpperCase() || `X${i}`;
            codeIdxs.push({ idx: i, id });
            factorIds.push(id);
          }
          const lastH = headers[numCols - 1];
          const yId = lastH.match(/y\d*/i)?.[0]?.toUpperCase() || 'Y1';
          yIdxs.push({ idx: numCols - 1, id: yId, name: lastH });
          responseIds.push(yId);
        }
      }

      if (factorIds.length === 0) {
        setExcelImportError("Impossible de détecter les colonnes de facteurs. Vérifiez que les en-têtes contiennent 'coded_Xi' ou 'Xi_code' pour les colonnes codées.");
        return;
      }

      // ── Lire la feuille "Facteurs" si disponible ───────────────────────────
      const factorMeta = {};
      if (wb.SheetNames.includes('Facteurs')) {
        const wsFact = wb.Sheets['Facteurs'];
        const factRows = XLSX.utils.sheet_to_json(wsFact, { header: 1, defval: '' }).slice(1);
        factRows.forEach(r => {
          if (r[0]) factorMeta[String(r[0]).trim()] = {
            name: String(r[1] || r[0]).trim(),
            unit: String(r[2] || '').trim(),
            low: isNaN(+r[4]) ? null : +r[4],
            high: isNaN(+r[5]) ? null : +r[5],
          };
        });
      }

      // ── Construire les facteurs ────────────────────────────────────────────
      const builtFactors = factorIds.map((id, fi) => {
        const meta = factorMeta[id] || {};
        const codeCol = codeIdxs.find(c => c.id === id);
        const realCol = realIdxs.find(c => c.id === id);
        // Détecter les niveaux depuis les données
        const codedVals = codeCol ? [...new Set(dataRows.map(r => +r[codeCol.idx]).filter(v => !isNaN(v)))] : [-1, 1];
        const realVals = realCol ? dataRows.map(r => +r[realCol.idx]) : [];
        const lowReal = meta.low ?? (realVals.length ? Math.min(...realVals.filter(v => !isNaN(v))) : 0);
        const highReal = meta.high ?? (realVals.length ? Math.max(...realVals.filter(v => !isNaN(v))) : 1);
        return {
          id,
          name: meta.name || id,
          unit: meta.unit || '',
          continuous: true,
          low: { real: lowReal, coded: -1 },
          high: { real: highReal, coded: 1 },
        };
      });

      // ── Construire les réponses ───────────────────────────────────────────
      const builtResponses = yIdxs.length > 0
        ? yIdxs.map(({ id, name }) => ({ id, name: name || id, unit: '' }))
        : [{ id: 'Y1', name: 'Réponse 1', unit: '' }];

      // ── Construire la matrice ─────────────────────────────────────────────
      const builtMatrix = dataRows.map((row, ri) => {
        const coded = {}, real = {};
        factorIds.forEach((id, fi) => {
          const codeCol = codeIdxs.find(c => c.id === id);
          const realCol = realIdxs.find(c => c.id === id);
          coded[id] = codeCol ? (+row[codeCol.idx] || 0) : 0;
          real[id] = realCol ? (+row[realCol.idx] || 0) : 0;
        });
        const responses = {};
        yIdxs.forEach(({ idx, id }) => {
          const v = row[idx];
          responses[id] = v === '' || v === null || v === undefined ? '' : +v || '';
        });
        return { id: ri + 1, coded, real, center: Math.abs(coded[factorIds[0]]) < 0.5, responses };
      });

      // ── Charger ───────────────────────────────────────────────────────────
      const def = computeDefaultModel(builtFactors);
      setFactors(builtFactors);
      setResponses(builtResponses);
      setCenterPoint({ present: builtMatrix.some(r => r.center), replicates: 1 });
      setModelDefault(def);
      setModels([{ id: 1, name: 'Modèle 1', terms: [...def], preset: 'default' }]);
      setActiveModelId(1);
      setMatrix(builtMatrix);
      setLoadedExampleId(file.name);
      setWelcomeModal(null);
      setPart(1);
    } catch (err) {
      console.error('Import Excel error:', err);
      setExcelImportError("Erreur de lecture : " + err.message);
    }
  };

  const exportJSON = () => {
    // Reconstruit les runs depuis la matrice courante
    // Regroupe les lignes qui partagent les mêmes niveaux codés (réplicats)
    const runsMap = new Map();
    (matrix || []).forEach((row) => {
      const key = JSON.stringify(row.coded);
      if (!runsMap.has(key)) {
        runsMap.set(key, { coded: row.coded, real: row.real, center: row.center, replicates: [] });
      }
      const rep = { rep: runsMap.get(key).replicates.length + 1 };
      responses.forEach(r => { rep[r.id] = row.responses[r.id] ?? ""; });
      runsMap.get(key).replicates.push(rep);
    });
    const runs = Array.from(runsMap.values()).map((r, i) => ({ id: i + 1, ...r }));

    const json = {
      meta: {
        id: editMeta.id,
        title: editMeta.title,
        context: editMeta.context,
        difficulty: editMeta.difficulty,
        real_data: editMeta.real_data,
        source: editMeta.source,
      },
      factors: factors.map(f => {
        const base = { id: f.id, name: f.name, unit: f.unit || null, continuous: f.continuous };
        if (f.continuous) { base.low = { real: f.low.real, coded: -1 }; base.high = { real: f.high.real, coded: 1 }; }
        else { base.low = { label: f.low.label || "", coded: -1 }; base.high = { label: f.high.label || "", coded: 1 }; }
        return base;
      }),
      responses: responses.map(r => ({ id: r.id, name: r.name, unit: r.unit || null })),
      center_point: centerPoint,
      model_default: modelDefault,
      runs,
    };

    const blob = new Blob([JSON.stringify(json, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${editMeta.id || "plan"}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ── Export CSV — 3 sections : Métadonnées / Facteurs+Réponses / Matrice ──────
  const exportCSV = () => {
    const esc = (v) => {
      const s = String(v ?? '');
      return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g,'""')}"` : s;
    };
    const row = (...cells) => cells.map(esc).join(',');
    const lines = [];

    // ── Section 1 : Métadonnées ──
    lines.push('=== MÉTADONNÉES ===');
    lines.push(row('Titre', editMeta.title || ''));
    lines.push(row('ID', editMeta.id || ''));
    lines.push(row('Contexte', editMeta.context || ''));
    lines.push(row('Difficulté', editMeta.difficulty || ''));
    lines.push('');

    // ── Section 2 : Facteurs et Réponses ──
    lines.push('=== FACTEURS ===');
    lines.push(row('ID','Nom','Unité','Type','Niveau bas (-1)','Niveau haut (+1)'));
    factors.forEach(f => {
      lines.push(row(
        f.id, f.name, f.unit || '',
        f.continuous ? 'Continu' : 'Qualitatif',
        f.continuous ? f.low.real : (f.low.label || ''),
        f.continuous ? f.high.real : (f.high.label || ''),
      ));
    });
    lines.push('');
    lines.push('=== RÉPONSES ===');
    lines.push(row('ID','Nom','Unité'));
    responses.forEach(r => lines.push(row(r.id, r.name, r.unit || '')));
    lines.push('');

    // ── Section 3 : Matrice ──
    lines.push('=== MATRICE ===');
    lines.push(row('Essai', ...factors.map(f => `${f.id}_niveau`), ...responses.map(r => r.id)));
    (matrix || []).forEach((matRow, i) => {
      lines.push(row(
        i + 1,
        ...factors.map(f => matRow.coded[f.id] ?? ''),
        ...responses.map(r => matRow.responses[r.id] ?? ''),
      ));
    });

    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url;
    a.download = `${editMeta.title || editMeta.id || 'plan'}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  // ── Export Excel — 3 feuilles : Métadonnées / Facteurs+Réponses / Matrice ─────
  const exportXLSX = async () => {
    if (!window.XLSX) {
      await new Promise((resolve, reject) => {
        const s = document.createElement('script');
        s.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
        s.onload = resolve; s.onerror = reject;
        document.head.appendChild(s);
      });
    }
    const XLSX = window.XLSX;
    const toNum = (v) => { if (v === '' || v == null) return ''; const n = Number(v); return isNaN(n) ? String(v) : n; };

    // ── Feuille 1 : Métadonnées ──────────────────────────────────────────────
    const wsMeta = XLSX.utils.aoa_to_sheet([
      ["Plan d'expériences — BTS Métiers de la Chimie"],
      [],
      ['Titre',      editMeta.title || ''],
      ['ID',         editMeta.id || ''],
      ['Contexte',   editMeta.context || ''],
      ['Difficulté', editMeta.difficulty || ''],
      ['Données réelles', editMeta.real_data ? 'Oui' : 'Non'],
      ['Source',     editMeta.source || ''],
    ]);
    wsMeta['!cols'] = [{ wch: 16 }, { wch: 40 }];

    // ── Feuille 2 : Facteurs et Réponses ─────────────────────────────────────
    const factData = [
      ['FACTEURS'],
      ['ID', 'Nom', 'Unité', 'Type', 'Niveau bas (−1)', 'Niveau haut (+1)'],
      ...factors.map(f => [
        f.id, f.name, f.unit || '',
        f.continuous ? 'Continu' : 'Qualitatif',
        f.continuous ? toNum(f.low.real) : (f.low.label || ''),
        f.continuous ? toNum(f.high.real) : (f.high.label || ''),
      ]),
      [],
      ['RÉPONSES'],
      ['ID', 'Nom', 'Unité'],
      ...responses.map(r => [r.id, r.name, r.unit || '']),
    ];
    const wsFact = XLSX.utils.aoa_to_sheet(factData);
    wsFact['!cols'] = [{ wch: 6 }, { wch: 20 }, { wch: 8 }, { wch: 12 }, { wch: 16 }, { wch: 16 }];

    // ── Feuille 3 : Matrice ───────────────────────────────────────────────────
    // En-têtes : Essai | X1_niveau | X2_niveau | ... | Y1 | Y2 | ...
    const matHeader = [
      'Essai',
      ...factors.map(f => `${f.id}_niveau`),
      ...responses.map(r => r.id),
    ];
    const matData = [
      matHeader,
      ...(matrix || []).map((row, i) => [
        i + 1,
        ...factors.map(f => toNum(row.coded[f.id])),     // −1 / 0 / +1 en nombre
        ...responses.map(r => toNum(row.responses[r.id])),
      ]),
    ];
    const wsMat = XLSX.utils.aoa_to_sheet(matData);
    const matColWidths = [{ wch: 7 }, ...factors.map(() => ({ wch: 10 })), ...responses.map(() => ({ wch: 10 }))];
    wsMat['!cols'] = matColWidths;

    // ── Assembler et télécharger ──────────────────────────────────────────────
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, wsMeta, 'Métadonnées');
    XLSX.utils.book_append_sheet(wb, wsFact, 'Facteurs');
    XLSX.utils.book_append_sheet(wb, wsMat, 'Matrice');
    XLSX.writeFile(wb, `${editMeta.title || editMeta.id || 'plan'}.xlsx`);
  };

  const goTo = (n) => {
    if (n === 2 && !matrix) setMatrix(genMatrix(factors, responses, centerPoint));
    setPart(n);
  };

  const buildMatrix = () => {
    const m = matrix || genMatrix(factors, responses, centerPoint);
    const def = computeDefaultModel(factors);
    setMatrix(m);
    setModelDefault(def);
    setModels([{ id: 1, name: "Modèle 1", terms: [...def], preset: "default" }]);
    setActiveModelId(1);
    setPart(2);
  };

  const recompModel = (f) => {
    const def = computeDefaultModel(f);
    setModelDefault(def);
    setModels([{ id: 1, name: "Modèle 1", terms: [...def], preset: "default" }]);
    setActiveModelId(1);
    setMatrix(null);
  };

  const updateFactor = (i, key, val) => {
    const f = [...factors];
    f[i] = { ...f[i], [key]: val };
    if (key === "continuous") {
      if (val) f[i].low = { real: 0, coded: -1 }, f[i].high = { real: 1, coded: 1 };
      else f[i].low = { label: "", coded: -1 }, f[i].high = { label: "", coded: 1 };
    }
    setFactors(f); recompModel(f);
  };
  const updateFactorLevel = (i, side, val) => {
    const f = [...factors];
    f[i] = { ...f[i], [side]: { ...f[i][side], real: +val } };
    setFactors(f);
  };
  const updateFactorLabel = (i, side, val) => {
    const f = [...factors];
    f[i] = { ...f[i], [side]: { ...f[i][side], label: val } };
    setFactors(f);
  };
  const addFactor = () => {
    const n = factors.length + 1;
    const f = [...factors, { id: "X" + n, name: "Facteur " + n, unit: "", continuous: true, low: { real: 0, coded: -1 }, high: { real: 1, coded: 1 } }];
    setFactors(f); recompModel(f);
  };
  const removeFactor = (i) => {
    const f = factors.filter((_, j) => j !== i).map((fac, j) => ({ ...fac, id: "X" + (j + 1) }));
    setFactors(f); recompModel(f);
  };

  const updateResponse = (i, key, val) => {
    const r = [...responses]; r[i] = { ...r[i], [key]: val }; setResponses(r);
  };
  const addResponse = () => {
    const n = responses.length + 1;
    setResponses([...responses, { id: "Y" + n, name: "Réponse " + n, unit: "" }]);
  };
  const removeResponse = (i) => setResponses(responses.filter((_, j) => j !== i));

  const updateCell = (ri, fid, val) => {
    const m = [...matrix];
    m[ri] = { ...m[ri], real: { ...m[ri].real, [fid]: +val } };
    setMatrix(m);
  };
  const updateResp = (ri, rid, val) => {
    const m = [...matrix];
    m[ri] = { ...m[ri], responses: { ...m[ri].responses, [rid]: val === "" ? "" : +val } };
    setMatrix(m);
  };
  const removeRun = (i) => setMatrix(matrix.filter((_, j) => j !== i));

  const openAddRow = () => {
    const lvls = {};
    factors.forEach(f => { lvls[f.id] = -1; });
    setAddRowLevels(lvls);
  };
  const confirmAddRow = () => {
    const lvls = addRowLevels;
    const coded = {}, real = {};
    factors.forEach(f => {
      const c = lvls[f.id];
      coded[f.id] = c;
      if (f.continuous) real[f.id] = c === -1 ? f.low.real : c === 1 ? f.high.real : +((f.low.real + f.high.real) / 2).toFixed(3);
      else real[f.id] = c === -1 ? (f.low.label || "−1") : (f.high.label || "+1");
    });
    const rv = {};
    responses.forEach(r => { rv[r.id] = ""; });
    setMatrix([...matrix, { id: matrix.length + 1, coded, real, center: false, responses: rv }]);
    setAddRowLevels(null);
  };

  const fillRandom = () => {
    const m = matrix.map(row => {
      const r = { ...row, responses: { ...row.responses } };
      responses.forEach(resp => {
        if (r.responses[resp.id] === "" || r.responses[resp.id] === null || r.responses[resp.id] === undefined)
          r.responses[resp.id] = +(Math.random() * 80 + 20).toFixed(2);
      });
      return r;
    });
    setMatrix(m);
    setShowRandomDialog(false);
    setShowRandomDone(true);
  };

  const toggleTerm = (t) => {
    const idx = modelActive.indexOf(t);
    if (idx >= 0) setModelActive(modelActive.filter(x => x !== t));
    else setModelActive([...modelActive, t]);
    setModelPreset("custom");
  };
  const applyPreset = (p) => {
    if (p === "cubic" && factors.length < 3) { setShowCubicDialog(true); return; }
    setModelPreset(p);
    setModelActive(computePresetModel(p, factors, modelDefault));
  };
  const resetModel = () => { setModelActive([...modelDefault]); setModelPreset("default"); };

  const missingRows = matrix ? getMissingRows(matrix, responses) : [];
  const hasMissing = missingRows.length > 0;
  const isDefaultModel = JSON.stringify([...modelActive].sort()) === JSON.stringify([...modelDefault].sort());

  const allTerms = getAllPossibleTerms(factors);
  const byOrder = {};
  allTerms.forEach(t => {
    let key;
    if (termOrder(t, factors) === 1) key = "1";
    else if (isQuadPure(t, factors)) key = "quad";
    else key = String(termOrder(t, factors));
    if (!byOrder[key]) byOrder[key] = [];
    byOrder[key].push(t);
  });
  const orderLabels = {
    "1": "Effets principaux",
    "quad": "Termes quadratiques purs (X²)",
    "2": "Interactions ordre 2",
    "3": "Interactions ordre 3",
    "4": "Interactions ordre 4",
  };
  const orderedKeys = ["1", "quad", "2", "3", "4"].filter(k => byOrder[k]);

  const diffBadgeCls = {
    "débutant": "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
    "intermédiaire": "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
    "avancé": "bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300",
  };

  return (
    <HelpProvider>
    <div className="max-w-4xl mx-auto px-4 py-6">

      {/* ══════════════════════════════════════════════════════ ÉCRAN D'ACCUEIL */}
      {part === 0 && (
        <div className="min-h-[80vh] flex flex-col">
          {/* En-tête */}
          <div className="text-center mb-8 mt-4">
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">Plans d'expériences</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">BTS Métiers de la Chimie — Choisissez comment démarrer</p>
          </div>

          {/* Grille de cartes */}
          <div className="flex flex-col gap-6">

            {/* Actions principales */}
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-3">Créer ou importer</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Nouveau plan */}
                <button onClick={() => setWelcomeModal('new')}
                  className="flex flex-col items-center gap-3 rounded-xl border-2 border-dashed border-indigo-300 dark:border-indigo-700 bg-indigo-50 dark:bg-indigo-900/20 p-6 hover:border-indigo-500 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-all text-center group">
                  <div className="size-12 rounded-xl bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center group-hover:bg-indigo-200 dark:group-hover:bg-indigo-900/70 transition-colors">
                    <PlusIcon className="size-6 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-indigo-700 dark:text-indigo-300">Nouveau plan</p>
                    <p className="text-xs text-indigo-500 dark:text-indigo-400 mt-0.5">Définir les facteurs</p>
                  </div>
                </button>

                {/* Charger JSON */}
                <button onClick={() => { setJsonPasteText(''); setJsonImportError(null); setWelcomeModal('json'); }}
                  className="flex flex-col items-center gap-3 rounded-xl border-2 border-dashed border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-900/20 p-6 hover:border-emerald-500 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-all text-center group">
                  <div className="size-12 rounded-xl bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center group-hover:bg-emerald-200 dark:group-hover:bg-emerald-900/70 transition-colors">
                    <BookOpenIcon className="size-6 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">Importer JSON</p>
                    <p className="text-xs text-emerald-500 dark:text-emerald-400 mt-0.5">Fichier ou coller le texte</p>
                  </div>
                </button>

                {/* Excel/CSV */}
                <button onClick={() => setWelcomeModal('excel')}
                  className="flex flex-col items-center gap-3 rounded-xl border-2 border-dashed border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20 p-6 hover:border-amber-500 hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-all text-center group">
                  <div className="size-12 rounded-xl bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center group-hover:bg-amber-200 dark:group-hover:bg-amber-900/70 transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="size-6 text-amber-600 dark:text-amber-400">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-amber-700 dark:text-amber-300">Importer Excel / CSV</p>
                    <p className="text-xs text-amber-500 dark:text-amber-400 mt-0.5">Excel, CSV ou modèle</p>
                  </div>
                </button>
              </div>
            </div>

            {/* Exemples par difficulté */}
            {["débutant", "intermédiaire", "avancé"].map(diff => {
              const diffExs = [...EXAMPLE_FILES, ...importedExamples].filter(e => e.difficulty === diff);
              if (diffExs.length === 0) return null;
              const diffColors = {
                "débutant": "text-emerald-600 dark:text-emerald-400",
                "intermédiaire": "text-amber-600 dark:text-amber-400",
                "avancé": "text-rose-600 dark:text-rose-400",
              };
              const diffBg = {
                "débutant": "border-emerald-200 dark:border-emerald-800 hover:border-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20",
                "intermédiaire": "border-amber-200 dark:border-amber-800 hover:border-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20",
                "avancé": "border-rose-200 dark:border-rose-800 hover:border-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/20",
              };
              return (
                <div key={diff}>
                  <p className={`text-[11px] font-semibold uppercase tracking-widest mb-3 ${diffColors[diff]}`}>
                    {diff === "débutant" ? "● " : diff === "intermédiaire" ? "●● " : "●●● "}{diff}
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {diffExs.map(ex => (
                      <button key={ex.file} onClick={async () => {
                        try {
                          const data = ex._data ? ex._data : await fetch(ex.url).then(r => r.json());
                          setExampleEditData({ ex, data,
                            title: data.meta?.title || ex.title,
                            context: data.meta?.context || ex.context,
                            difficulty: data.meta?.difficulty || ex.difficulty,
                          });
                          setWelcomeModal('example');
                        } catch(e) { console.error(e); }
                      }}
                        className={`flex flex-col items-start gap-2 rounded-xl border bg-white dark:bg-gray-900 p-4 transition-all text-left ${diffBg[diff]}`}>
                        <div className="flex items-start justify-between w-full gap-2">
                          <p className="text-xs font-semibold text-gray-900 dark:text-white leading-tight">{ex.title}</p>
                          {ex.real_data && (
                            <span className="shrink-0 text-[9px] font-semibold bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 rounded-full px-1.5 py-0.5">réel</span>
                          )}
                          {ex.imported && (
                            <span className="shrink-0 text-[9px] font-semibold bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300 rounded-full px-1.5 py-0.5">importé</span>
                          )}
                        </div>
                        <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-relaxed">{ex.context}</p>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* ── MODALS ── */}

          {/* Modal Nouveau plan */}
          {welcomeModal === 'new' && (
            <div className="fixed inset-0 z-50 bg-black/30 dark:bg-black/50 flex items-center justify-center p-4" onClick={() => setWelcomeModal(null)}>
              <div className="bg-white dark:bg-gray-950 rounded-2xl shadow-2xl w-full max-w-sm p-6" onClick={e => e.stopPropagation()}>
                <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-4">Nouveau plan d'expériences</h2>
                <div className="space-y-4 mb-6">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1.5">Nombre de facteurs</label>
                    <div className="flex items-center gap-3">
                      <input type="range" min="2" max="6" value={newNbFactors} onChange={e => setNewNbFactors(+e.target.value)} className="flex-1" />
                      <span className="w-8 text-center font-semibold font-mono text-indigo-600 dark:text-indigo-400 text-lg">{newNbFactors}</span>
                    </div>
                    <p className="text-[10px] text-gray-400 mt-1">→ {Math.pow(2, newNbFactors)} essais minimum (plan 2<sup>{newNbFactors}</sup>)</p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1.5">Nombre de réponses mesurées</label>
                    <div className="flex items-center gap-3">
                      <input type="range" min="1" max="4" value={newNbResponses} onChange={e => setNewNbResponses(+e.target.value)} className="flex-1" />
                      <span className="w-8 text-center font-semibold font-mono text-indigo-600 dark:text-indigo-400 text-lg">{newNbResponses}</span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setWelcomeModal(null)} className="flex-1 rounded-lg border border-gray-200 dark:border-gray-700 px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">Annuler</button>
                  <button onClick={() => createNewPlan(newNbFactors, newNbResponses)} className="flex-1 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 transition-colors">Créer →</button>
                </div>
              </div>
            </div>
          )}

          {/* Modal JSON */}
          {welcomeModal === 'json' && (
            <div className="fixed inset-0 z-50 bg-black/30 dark:bg-black/50 flex items-center justify-center p-4" onClick={() => setWelcomeModal(null)}>
              <div className="bg-white dark:bg-gray-950 rounded-2xl shadow-2xl w-full max-w-lg p-6" onClick={e => e.stopPropagation()}>
                <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-4">Importer un fichier JSON</h2>
                {/* Zone drag & drop */}
                <div
                  onDragOver={e => { e.preventDefault(); setJsonDragOver(true); }}
                  onDragLeave={() => setJsonDragOver(false)}
                  onDrop={e => {
                    e.preventDefault(); setJsonDragOver(false);
                    const file = e.dataTransfer.files[0];
                    if (file) { const reader = new FileReader(); reader.onload = ev => setJsonPasteText(ev.target.result); reader.readAsText(file); }
                  }}
                  className={`rounded-xl border-2 border-dashed p-4 text-center mb-3 transition-colors ${jsonDragOver ? "border-indigo-400 bg-indigo-50 dark:bg-indigo-900/20" : "border-gray-200 dark:border-gray-700"}`}>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Glissez un fichier .json ici</p>
                  <p className="text-[10px] text-gray-400 mt-1">— ou —</p>
                  <label className="mt-2 inline-block cursor-pointer text-xs text-indigo-600 dark:text-indigo-400 hover:underline">
                    Parcourir
                    <input type="file" accept=".json" className="hidden" onChange={e => {
                      const file = e.target.files[0];
                      if (file) { const reader = new FileReader(); reader.onload = ev => setJsonPasteText(ev.target.result); reader.readAsText(file); }
                    }} />
                  </label>
                </div>
                <p className="text-[11px] text-gray-400 mb-1.5 text-center">— ou coller le contenu JSON —</p>
                <textarea
                  value={jsonPasteText}
                  onChange={e => { setJsonPasteText(e.target.value); setJsonImportError(null); }}
                  placeholder='{"meta": {...}, "factors": [...], "responses": [...], "runs": [...]}'
                  rows={5}
                  className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-transparent px-3 py-2 text-xs font-mono text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                />
                {jsonImportError && (
                  <p className="mt-2 text-xs text-red-500 dark:text-red-400">{jsonImportError}</p>
                )}
                <div className="flex gap-2 mt-4">
                  <button onClick={() => setWelcomeModal(null)} className="flex-1 rounded-lg border border-gray-200 dark:border-gray-700 px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">Annuler</button>
                  <button onClick={() => importFromJsonText(jsonPasteText)} disabled={!jsonPasteText.trim()} className="flex-1 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">Valider →</button>
                </div>
              </div>
            </div>
          )}

          {/* Modal Excel/CSV — rendu via sous-composant pour éviter useState dans IIFE */}
          {welcomeModal === 'excel' && (
            <ExcelImportModal
              onClose={() => { setWelcomeModal(null); setExcelImportError(null); }}
              excelDragOver={excelDragOver}
              setExcelDragOver={setExcelDragOver}
              importFromExcel={importFromExcel}
              excelImportError={excelImportError}
              setExcelImportError={setExcelImportError}
            />
          )}

                    {/* Modal Exemple */}
          {welcomeModal === 'example' && exampleEditData && (
            <div className="fixed inset-0 z-50 bg-black/30 dark:bg-black/50 flex items-center justify-center p-4" onClick={() => setWelcomeModal(null)}>
              <div className="bg-white dark:bg-gray-950 rounded-2xl shadow-2xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-1">{exampleEditData.difficulty}</p>
                    <h2 className="text-base font-semibold text-gray-900 dark:text-white">{exampleEditData.title}</h2>
                  </div>
                  {exampleEditData.ex?.real_data && <span className="shrink-0 text-[10px] font-semibold bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 rounded-full px-2 py-0.5">données réelles</span>}
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">{exampleEditData.context}</p>

                {/* Infos facteurs et réponses */}
                <div className="rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 p-3 mb-4 space-y-2">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 mb-1.5">Facteurs ({exampleEditData.data.factors?.length})</p>
                    <div className="space-y-1">
                      {exampleEditData.data.factors?.map(f => (
                        <div key={f.id} className="flex items-center gap-2 text-xs">
                          <span className="font-mono text-gray-400 w-6">{f.id}</span>
                          <span className="font-medium text-gray-700 dark:text-gray-200">{f.name}</span>
                          {f.continuous && <span className="text-gray-400">[{f.low.real}→{f.high.real}{f.unit?' '+f.unit:''}]</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 mb-1.5">Réponses ({exampleEditData.data.responses?.length})</p>
                    <div className="space-y-1">
                      {exampleEditData.data.responses?.map(r => (
                        <div key={r.id} className="flex items-center gap-2 text-xs">
                          <span className="font-mono text-gray-400 w-6">{r.id}</span>
                          <span className="font-medium text-gray-700 dark:text-gray-200">{r.name}{r.unit?' ('+r.unit+')':''}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <p className="text-[10px] text-gray-400">{exampleEditData.data.runs?.length} essais</p>
                </div>

                <div className="flex gap-2">
                  <button onClick={() => setWelcomeModal(null)} className="flex-1 rounded-lg border border-gray-200 dark:border-gray-700 px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">Annuler</button>
                  <button onClick={() => {
                    loadExample(exampleEditData.ex);
                    setWelcomeModal(null);
                  }} className="flex-1 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 transition-colors">Charger →</button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── BARRE LATÉRALE ── */}
      {part === 1 && (
        <Dialog open={sidebarOpen} onClose={setSidebarOpen} className="relative z-50">
          <DialogBackdrop
            transition
            className="fixed inset-0 bg-gray-900/50 transition-opacity duration-300 ease-in-out data-closed:opacity-0"
          />
          <div className="fixed inset-0 overflow-hidden">
            <div className="absolute inset-0 overflow-hidden">
              <div className="pointer-events-none fixed inset-y-0 left-0 flex max-w-full pr-10">
                <DialogPanel
                  transition
                  className="pointer-events-auto w-72 transform transition duration-300 ease-in-out data-closed:-translate-x-full"
                >
                  <div className="flex h-full flex-col bg-white dark:bg-gray-900 shadow-xl overflow-y-auto">
                    <div className="flex items-center justify-between px-4 py-4 border-b border-gray-200 dark:border-gray-700">
                      <DialogTitle className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
                        <BookOpenIcon className="size-4" />
                        Exemples &amp; nouveau plan
                      </DialogTitle>
                      <button onClick={() => setSidebarOpen(false)} className="rounded-md p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors">
                        <XMarkIcon className="size-5" />
                      </button>
                    </div>

                    {/* Import JSON */}
                    <div className="px-4 pt-4 pb-0">
                      <label className="w-full flex items-center justify-center gap-2 rounded-lg border border-gray-200 dark:border-gray-700 px-4 py-2.5 text-sm font-medium text-gray-600 dark:text-gray-300 hover:border-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors cursor-pointer">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="size-4 rotate-180">
                          <path fillRule="evenodd" d="M10 3a1 1 0 01.707.293l3 3a1 1 0 01-1.414 1.414L11 6.414V12a1 1 0 11-2 0V6.414L7.707 7.707a1 1 0 01-1.414-1.414l3-3A1 1 0 0110 3zm-3.707 9.293a1 1 0 011.414 1.414L10 16.414l2.293-2.293a1 1 0 011.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                        Importer un JSON
                        <input
                          type="file"
                          accept=".json"
                          className="sr-only"
                          onChange={e => { validateAndImport(e.target.files[0]); e.target.value = ""; }}
                        />
                      </label>
                      {importError && (
                        <div className="mt-2 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 px-3 py-2">
                          <p className="text-xs font-medium text-red-600 dark:text-red-400 mb-0.5">Format invalide</p>
                          <p className="text-[11px] text-red-500 dark:text-red-400 leading-relaxed">{importError}</p>
                        </div>
                      )}
                    </div>

                    <div className="px-4 pt-4 pb-2">
                      <button onClick={resetToNew}
                        className="w-full flex items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 px-4 py-3 text-sm font-medium text-gray-600 dark:text-gray-300 hover:border-gray-400 hover:text-gray-800 dark:hover:text-white transition-colors">
                        <PlusIcon className="size-4" />
                        Nouveau plan vide
                      </button>
                    </div>

                    <div className="px-4 py-3">
                      <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-3">Exemples</p>
                      <div className="flex flex-col gap-2">
                        {EXAMPLE_FILES.map((ex) => (
                          <div key={ex.file} className={`rounded-lg border transition-all ${
                              loadedExampleId === ex.file
                                ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 dark:border-indigo-400"
                                : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-500"
                            }`}>
                            <button onClick={() => loadExample(ex)} className="w-full text-left px-3 pt-2.5 pb-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-t-lg transition-colors">
                              <div className="flex items-start justify-between gap-2 mb-1">
                                <span className="text-xs font-medium text-gray-900 dark:text-white leading-tight">{ex.title}</span>
                                {ex.real_data && (
                                  <span className="shrink-0 text-[10px] font-semibold bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 rounded-full px-1.5 py-0.5">réel</span>
                                )}
                              </div>
                              <p className="text-[11px] text-gray-500 dark:text-gray-400 mb-1.5">{ex.context}</p>
                              <span className={`inline-block text-[10px] font-semibold rounded-full px-1.5 py-0.5 ${diffBadgeCls[ex.difficulty] || diffBadgeCls["débutant"]}`}>
                                {ex.difficulty}
                              </span>
                            </button>
                            <div className="border-t border-gray-100 dark:border-gray-700 px-3 py-1.5 flex justify-end">
                              <button onClick={() => loadForEdit(ex)}
                                className="flex items-center gap-1 text-[11px] text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                                title="Éditer cet exemple">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="size-3.5">
                                  <path d="M2.695 14.763l-1.262 3.154a.5.5 0 00.65.65l3.155-1.262a4 4 0 001.343-.885L17.5 5.5a2.121 2.121 0 00-3-3L3.58 13.42a4 4 0 00-.885 1.343z" />
                                </svg>
                                Éditer
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    {loadError && (
                      <div className="mx-4 mt-2 mb-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 px-3 py-2">
                        <p className="text-xs text-red-600 dark:text-red-400 font-medium mb-0.5">Erreur de chargement</p>
                        <p className="text-[11px] text-red-500 dark:text-red-400 break-all">{loadError}</p>
                      </div>
                    )}
                    </div>

                    {/* Exemples importés */}
                    {importedExamples.length > 0 && (
                      <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-800">
                        <div className="flex items-center justify-between mb-3">
                          <p className="text-[10px] font-semibold uppercase tracking-widest text-indigo-400 dark:text-indigo-500">Importés</p>
                          <button onClick={() => setImportedExamples([])}
                            className="text-[10px] text-gray-400 hover:text-red-500 transition-colors">
                            Tout supprimer
                          </button>
                        </div>
                        <div className="flex flex-col gap-2">
                          {importedExamples.map((ex) => (
                            <div key={ex.file} className={`rounded-lg border transition-all ${
                              loadedExampleId === ex.file
                                ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 dark:border-indigo-400"
                                : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-500"
                            }`}>
                              <button onClick={() => loadExample(ex)} className="w-full text-left px-3 pt-2.5 pb-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-t-lg transition-colors">
                                <div className="flex items-start justify-between gap-2 mb-1">
                                  <span className="text-xs font-medium text-gray-900 dark:text-white leading-tight">{ex.title}</span>
                                  <span className="shrink-0 text-[10px] font-semibold bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300 rounded-full px-1.5 py-0.5">importé</span>
                                </div>
                                <p className="text-[11px] text-gray-500 dark:text-gray-400 mb-1.5">{ex.context}</p>
                                <span className={`inline-block text-[10px] font-semibold rounded-full px-1.5 py-0.5 ${diffBadgeCls[ex.difficulty] || diffBadgeCls["débutant"]}`}>
                                  {ex.difficulty}
                                </span>
                              </button>
                              <div className="border-t border-gray-100 dark:border-gray-700 px-3 py-1.5 flex justify-between items-center">
                                <button onClick={() => setImportedExamples(prev => prev.filter(e => e.file !== ex.file))}
                                  className="text-[11px] text-red-400 hover:text-red-600 transition-colors">
                                  Supprimer
                                </button>
                                <button onClick={() => loadForEdit(ex)}
                                  className="flex items-center gap-1 text-[11px] text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="size-3.5">
                                    <path d="M2.695 14.763l-1.262 3.154a.5.5 0 00.65.65l3.155-1.262a4 4 0 001.343-.885L17.5 5.5a2.121 2.121 0 00-3-3L3.58 13.42a4 4 0 00-.885 1.343z" />
                                  </svg>
                                  Éditer
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </DialogPanel>
              </div>
            </div>
          </div>
        </Dialog>
      )}

      {/* ── STEPPER ── */}
      {part > 0 && <nav aria-label="Progression" className="mb-6">
        <ol role="list" className="divide-y divide-gray-300 rounded-md border border-gray-300 md:flex md:divide-y-0 dark:divide-white/15 dark:border-white/15">
          {[
            { n: 1, id: "01", l: "Facteurs & réponses" },
            { n: 2, id: "02", l: "Matrice" },
            { n: 3, id: "03", l: "Modèle" },
            { n: 4, id: "04", l: "Modélisation" },
          ].map((s, i, arr) => {
            const status = part > s.n ? "complete" : part === s.n ? "current" : "upcoming";
            return (
              <li key={s.n} className="relative md:flex md:flex-1">
                {status === "complete" ? (
                  <button onClick={() => goTo(s.n)} className="group flex w-full items-center">
                    <span className="flex items-center px-6 py-4 text-sm font-medium">
                      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-indigo-600 group-hover:bg-indigo-800 dark:bg-indigo-500 dark:group-hover:bg-indigo-400">
                        <CheckIcon aria-hidden="true" className="size-6 text-white" />
                      </span>
                      <span className="ml-4 text-sm font-medium text-gray-900 dark:text-white">{s.l}</span>
                    </span>
                  </button>
                ) : status === "current" ? (
                  <button onClick={() => goTo(s.n)} aria-current="step" className="flex items-center px-6 py-4 text-sm font-medium">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-full border-2 border-indigo-600 dark:border-indigo-400">
                      <span className="text-indigo-600 dark:text-indigo-400">{s.id}</span>
                    </span>
                    <span className="ml-4 text-sm font-medium text-indigo-600 dark:text-indigo-400">{s.l}</span>
                  </button>
                ) : (
                  <button onClick={() => goTo(s.n)} className="group flex items-center">
                    <span className="flex items-center px-6 py-4 text-sm font-medium">
                      <span className="flex size-10 shrink-0 items-center justify-center rounded-full border-2 border-gray-300 group-hover:border-gray-400 dark:border-white/15 dark:group-hover:border-white/25">
                        <span className="text-gray-500 group-hover:text-gray-900 dark:text-gray-400 dark:group-hover:text-white">{s.id}</span>
                      </span>
                      <span className="ml-4 text-sm font-medium text-gray-500 group-hover:text-gray-900 dark:text-gray-400 dark:group-hover:text-white">{s.l}</span>
                    </span>
                  </button>
                )}
                {i !== arr.length - 1 && (
                  <div aria-hidden="true" className="absolute top-0 right-0 hidden h-full w-5 md:block">
                    <svg fill="none" viewBox="0 0 22 80" preserveAspectRatio="none" className="size-full text-gray-300 dark:text-white/15">
                      <path d="M0 -2L20 40L0 82" stroke="currentcolor" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
                    </svg>
                  </div>
                )}
              </li>
            );
          })}
        </ol>
      </nav>}


      {/* ══════════════════════════════════════════════════════ PARTIE 1 */}
      {part === 1 && (
        <>
          {/* bandeau mode édition + bouton export */}
          {editMode && (
            <div className="flex items-center justify-between bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-700 rounded-xl px-4 py-3 mb-4 gap-3">
              <div className="flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="size-4 text-indigo-500">
                  <path d="M2.695 14.763l-1.262 3.154a.5.5 0 00.65.65l3.155-1.262a4 4 0 001.343-.885L17.5 5.5a2.121 2.121 0 00-3-3L3.58 13.42a4 4 0 00-.885 1.343z" />
                </svg>
                <span className="text-sm font-medium text-indigo-700 dark:text-indigo-300">Mode édition — {editMeta.title || loadedExampleId}</span>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => { setEditMode(false); }}
                  className="rounded-md border border-indigo-200 dark:border-indigo-700 px-2.5 py-1 text-xs text-indigo-600 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-colors">
                  Annuler
                </button>
                <button onClick={exportJSON}
                  className="flex items-center gap-1.5 rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500 transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="size-3.5">
                    <path fillRule="evenodd" d="M10 3a1 1 0 01.707.293l3 3a1 1 0 01-1.414 1.414L11 6.414V12a1 1 0 11-2 0V6.414L7.707 7.707a1 1 0 01-1.414-1.414l3-3A1 1 0 0110 3zm-3.707 9.293a1 1 0 011.414 1.414L10 16.414l2.293-2.293a1 1 0 011.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                  Exporter JSON
                </button>
              </div>
            </div>
          )}

          {/* ── Barre d'actions : Exemple chargé + Nouveau ── */}
          <div className="flex items-center gap-2 mb-4">
            {/* Bouton "Exemple chargé" → popup export */}
            <button onClick={() => setShowExportPopup(true)}
              className="flex items-center gap-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors shadow-sm">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="size-4 text-gray-400">
                <path fillRule="evenodd" d="M10 3a1 1 0 01.707.293l3 3a1 1 0 01-1.414 1.414L11 6.414V12a1 1 0 11-2 0V6.414L7.707 7.707a1 1 0 01-1.414-1.414l3-3A1 1 0 0110 3zm-3.707 9.293a1 1 0 011.414 1.414L10 16.414l2.293-2.293a1 1 0 011.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd"/>
              </svg>
              <span className="truncate max-w-xs">
                {loadedExampleId
                  ? <><span className="text-gray-400 text-xs mr-1">Chargé :</span><span className="font-medium">{[...EXAMPLE_FILES, ...importedExamples].find(e => e.file === loadedExampleId)?.title || loadedExampleId}</span></>
                  : <span className="text-gray-400">Aucun exemple chargé</span>}
              </span>
            </button>

            {/* Bouton "Nouveau" → quitter avec confirmation si données modifiées */}
            <button
              onClick={() => {
                // Détecter si des données ont été saisies (matrice non vide ou facteurs modifiés)
                const hasData = matrix && matrix.some(r => responses.some(resp => r.responses[resp.id] !== ''));
                if (hasData || loadedExampleId) {
                  setShowQuitConfirm(true);
                } else {
                  setPart(0);
                }
              }}
              className="flex items-center gap-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-500 dark:text-gray-400 hover:bg-gray-50 hover:text-gray-700 dark:hover:bg-gray-700 transition-colors shadow-sm"
              title="Revenir à l'écran d'accueil"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="size-4">
                <path fillRule="evenodd" d="M9.293 2.293a1 1 0 011.414 0l7 7A1 1 0 0117 11h-1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-3a1 1 0 00-1-1H9a1 1 0 00-1 1v3a1 1 0 01-1 1H5a1 1 0 01-1-1v-6H3a1 1 0 01-.707-1.707l7-7z" clipRule="evenodd"/>
              </svg>
              Nouveau
            </button>
          </div>

          {/* ── Popup export (depuis "Exemple chargé") ── */}
          {showExportPopup && (
            <div className="fixed inset-0 z-50 bg-black/30 dark:bg-black/50 flex items-center justify-center p-4" onClick={() => setShowExportPopup(false)}>
              <div className="bg-white dark:bg-gray-950 rounded-2xl shadow-2xl w-full max-w-sm p-6" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-4">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">Sauvegarder le plan</p>
                  <button onClick={() => setShowExportPopup(false)} className="size-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800">
                    <XMarkIcon className="size-5" />
                  </button>
                </div>
                {loadedExampleId && (
                  <p className="text-xs text-gray-400 mb-4 truncate">
                    Plan : <span className="text-gray-600 dark:text-gray-300 font-medium">{[...EXAMPLE_FILES, ...importedExamples].find(e => e.file === loadedExampleId)?.title || loadedExampleId}</span>
                  </p>
                )}
                <div className="flex flex-col gap-2">
                  <button onClick={() => { exportJSON(); setShowExportPopup(false); }}
                    className="flex items-center gap-3 rounded-xl border border-gray-200 dark:border-gray-700 px-4 py-3 text-sm text-gray-700 dark:text-gray-200 hover:border-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-all">
                    <div className="size-8 rounded-lg bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center">
                      <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400">JSON</span>
                    </div>
                    <div>
                      <p className="font-medium">Format JSON</p>
                      <p className="text-xs text-gray-400">Rechargeable dans l'application</p>
                    </div>
                  </button>
                  <button onClick={() => { exportCSV(); setShowExportPopup(false); }}
                    className="flex items-center gap-3 rounded-xl border border-gray-200 dark:border-gray-700 px-4 py-3 text-sm text-gray-700 dark:text-gray-200 hover:border-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-all">
                    <div className="size-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center">
                      <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">CSV</span>
                    </div>
                    <div>
                      <p className="font-medium">Format CSV</p>
                      <p className="text-xs text-gray-400">Compatible tableurs</p>
                    </div>
                  </button>
                  <button onClick={() => { exportXLSX(); setShowExportPopup(false); }}
                    className="flex items-center gap-3 rounded-xl border border-gray-200 dark:border-gray-700 px-4 py-3 text-sm text-gray-700 dark:text-gray-200 hover:border-amber-300 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-all">
                    <div className="size-8 rounded-lg bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center">
                      <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400">XLS</span>
                    </div>
                    <div>
                      <p className="font-medium">Format Excel</p>
                      <p className="text-xs text-gray-400">Vrai format .xlsx (Excel)</p>
                    </div>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── Popup confirmation quitter (depuis "Nouveau") ── */}
          {showQuitConfirm && (
            <div className="fixed inset-0 z-50 bg-black/30 dark:bg-black/50 flex items-center justify-center p-4" onClick={() => setShowQuitConfirm(false)}>
              <div className="bg-white dark:bg-gray-950 rounded-2xl shadow-2xl w-full max-w-sm p-6" onClick={e => e.stopPropagation()}>
                <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="size-6 text-amber-500">
                    <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd"/>
                  </svg>
                </div>
                <p className="text-base font-semibold text-gray-900 dark:text-white text-center mb-1">Sauvegarder avant de quitter ?</p>
                <p className="text-xs text-gray-400 text-center mb-5">Vos données seront perdues si vous ne sauvegardez pas.</p>
                <div className="flex flex-col gap-2 mb-3">
                  <button onClick={() => { exportJSON(); setShowQuitConfirm(false); setPart(0); }}
                    className="flex items-center gap-3 rounded-xl border border-gray-200 dark:border-gray-700 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:border-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-all">
                    <span className="size-7 rounded-lg bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center text-[9px] font-bold text-indigo-600 dark:text-indigo-400">JSON</span>
                    Sauvegarder en JSON et quitter
                  </button>
                  <button onClick={() => { exportCSV(); setShowQuitConfirm(false); setPart(0); }}
                    className="flex items-center gap-3 rounded-xl border border-gray-200 dark:border-gray-700 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:border-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-all">
                    <span className="size-7 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center text-[9px] font-bold text-emerald-600 dark:text-emerald-400">CSV</span>
                    Sauvegarder en CSV et quitter
                  </button>
                  <button onClick={() => { exportXLSX(); setShowQuitConfirm(false); setPart(0); }}
                    className="flex items-center gap-3 rounded-xl border border-gray-200 dark:border-gray-700 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:border-amber-300 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-all">
                    <span className="size-7 rounded-lg bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center text-[9px] font-bold text-amber-600 dark:text-amber-400">XLS</span>
                    Sauvegarder en Excel et quitter
                  </button>
                </div>
                <button onClick={() => { setShowQuitConfirm(false); setPart(0); }}
                  className="w-full rounded-xl border border-gray-200 dark:border-gray-700 px-4 py-2.5 text-sm text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                  Quitter sans sauvegarder
                </button>
              </div>
            </div>
          )}

                    {/* Section métadonnées — visible uniquement en mode édition */}
          {editMode && (
            <div className="bg-white dark:bg-gray-900 border border-indigo-200 dark:border-indigo-700 rounded-xl p-5 mb-4">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-indigo-400 dark:text-indigo-500 mb-3">Métadonnées de l'exemple</p>
              <div className="grid grid-cols-1 gap-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">ID fichier</label>
                    <input value={editMeta.id} onChange={e => setEditMeta({ ...editMeta, id: e.target.value })}
                      className="w-full rounded-md border border-gray-200 dark:border-gray-700 bg-transparent px-2 py-1.5 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Difficulté</label>
                    <select value={editMeta.difficulty} onChange={e => setEditMeta({ ...editMeta, difficulty: e.target.value })}
                      className="w-full rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-2 py-1.5 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
                      <option value="débutant">Débutant</option>
                      <option value="intermédiaire">Intermédiaire</option>
                      <option value="avancé">Avancé</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Titre</label>
                  <input value={editMeta.title} onChange={e => setEditMeta({ ...editMeta, title: e.target.value })}
                    className="w-full rounded-md border border-gray-200 dark:border-gray-700 bg-transparent px-2 py-1.5 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Contexte</label>
                  <input value={editMeta.context} onChange={e => setEditMeta({ ...editMeta, context: e.target.value })}
                    className="w-full rounded-md border border-gray-200 dark:border-gray-700 bg-transparent px-2 py-1.5 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Source</label>
                  <input value={editMeta.source} onChange={e => setEditMeta({ ...editMeta, source: e.target.value })}
                    placeholder="Auteur, publication, année…"
                    className="w-full rounded-md border border-gray-200 dark:border-gray-700 bg-transparent px-2 py-1.5 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={editMeta.real_data} onChange={e => setEditMeta({ ...editMeta, real_data: e.target.checked })}
                      className="size-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
                    <span className="text-sm text-gray-700 dark:text-gray-200">Données réelles (badge "réel")</span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* Facteurs */}
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-5 mb-4">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-3 flex items-center gap-2">Facteurs <HelpButton topic="facteurs" size="xs" /></p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-gray-800">
                    {["ID", "Nom", "Unité", "Type", "Niveau bas", "Niveau haut", ""].map((h, i) => (
                      <th key={i} className="text-left text-[11px] font-medium text-gray-400 dark:text-gray-500 pb-2 px-2 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {factors.map((f, i) => (
                    <tr key={f.id} className="border-b border-gray-50 dark:border-gray-800/50 last:border-0">
                      <td className="px-2 py-1.5">
                        <span className="font-mono text-xs font-semibold text-gray-400 dark:text-gray-500">{f.id}</span>
                      </td>
                      <td className="px-2 py-1.5">
                        <input value={f.name} onChange={e => updateFactor(i, "name", e.target.value)}
                          className="w-28 rounded-md border border-gray-200 dark:border-gray-700 bg-transparent px-2 py-1 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400" />
                      </td>
                      <td className="px-2 py-1.5">
                        <input value={f.unit || ""} placeholder="°C, g…" onChange={e => updateFactor(i, "unit", e.target.value)}
                          className="w-16 rounded-md border border-gray-200 dark:border-gray-700 bg-transparent px-2 py-1 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                      </td>
                      <td className="px-2 py-1.5">
                        <select value={String(f.continuous)} onChange={e => updateFactor(i, "continuous", e.target.value === "true")}
                          className="rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-2 py-1 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
                          <option value="true">Continu</option>
                          <option value="false">Discret</option>
                        </select>
                      </td>
                      <td className="px-2 py-1.5">
                        {f.continuous
                          ? <input type="number" value={f.low.real} onChange={e => updateFactorLevel(i, "low", e.target.value)}
                              className="w-20 rounded-md border border-gray-200 dark:border-gray-700 bg-transparent px-2 py-1 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                          : <input value={f.low.label || ""} placeholder="Label −1" onChange={e => updateFactorLabel(i, "low", e.target.value)}
                              className="w-24 rounded-md border border-gray-200 dark:border-gray-700 bg-transparent px-2 py-1 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                        }
                      </td>
                      <td className="px-2 py-1.5">
                        {f.continuous
                          ? <input type="number" value={f.high.real} onChange={e => updateFactorLevel(i, "high", e.target.value)}
                              className="w-20 rounded-md border border-gray-200 dark:border-gray-700 bg-transparent px-2 py-1 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                          : <input value={f.high.label || ""} placeholder="Label +1" onChange={e => updateFactorLabel(i, "high", e.target.value)}
                              className="w-24 rounded-md border border-gray-200 dark:border-gray-700 bg-transparent px-2 py-1 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                        }
                      </td>
                      <td className="px-2 py-1.5">
                        {factors.length > 2 && (
                          <button onClick={() => removeFactor(i)}
                            className="p-1 rounded text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                            <TrashIcon className="size-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {factors.length < 6
              ? <button onClick={addFactor}
                  className="mt-3 flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 border border-dashed border-gray-300 dark:border-gray-600 rounded-lg px-3 py-1.5 transition-colors">
                  <PlusIcon className="size-3.5" /> Ajouter un facteur
                </button>
              : <p className="mt-3 text-xs text-gray-400">Maximum 6 facteurs atteint.</p>
            }
          </div>

          {/* Réponses */}
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-5 mb-4">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-3">Réponses</p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-gray-800">
                    {["ID", "Nom", "Unité", ""].map((h, i) => (
                      <th key={i} className="text-left text-[11px] font-medium text-gray-400 dark:text-gray-500 pb-2 px-2">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {responses.map((r, i) => (
                    <tr key={r.id} className="border-b border-gray-50 dark:border-gray-800/50 last:border-0">
                      <td className="px-2 py-1.5">
                        <span className="font-mono text-xs font-semibold text-gray-400 dark:text-gray-500">{r.id}</span>
                      </td>
                      <td className="px-2 py-1.5">
                        <input value={r.name} onChange={e => updateResponse(i, "name", e.target.value)}
                          className="w-36 rounded-md border border-gray-200 dark:border-gray-700 bg-transparent px-2 py-1 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                      </td>
                      <td className="px-2 py-1.5">
                        <input value={r.unit || ""} placeholder="%, nm…" onChange={e => updateResponse(i, "unit", e.target.value)}
                          className="w-20 rounded-md border border-gray-200 dark:border-gray-700 bg-transparent px-2 py-1 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                      </td>
                      <td className="px-2 py-1.5">
                        {responses.length > 1 && (
                          <button onClick={() => removeResponse(i)}
                            className="p-1 rounded text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                            <TrashIcon className="size-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button onClick={addResponse}
              className="mt-3 flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 border border-dashed border-gray-300 dark:border-gray-600 rounded-lg px-3 py-1.5 transition-colors">
              <PlusIcon className="size-3.5" /> Ajouter une réponse
            </button>
          </div>

          {/* Point central */}
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-5 mb-4">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-3">Point central</p>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={centerPoint.present}
                  onChange={e => setCenterPoint({ ...centerPoint, present: e.target.checked })}
                  className="size-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
                <span className="text-sm text-gray-700 dark:text-gray-200">Inclure un point central</span>
              </label>
              {centerPoint.present && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400">Répétitions :</span>
                  <input type="number" min={1} max={10} value={centerPoint.replicates}
                    onChange={e => setCenterPoint({ ...centerPoint, replicates: Math.max(1, +e.target.value) })}
                    className="w-16 rounded-md border border-gray-200 dark:border-gray-700 bg-transparent px-2 py-1 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between mt-5">
            <p className="text-xs text-gray-400 dark:text-gray-500">
              Plan 2<sup>{factors.length}</sup> = <strong className="text-gray-600 dark:text-gray-300">{1 << factors.length}</strong> essai(s)
              {centerPoint.present ? ` + ${centerPoint.replicates} point(s) central` : ""}
            </p>
            <button onClick={buildMatrix}
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-600 transition-colors shadow-sm">
              Construire la table de données →
            </button>
          </div>
        </>
      )}

      {/* ══════════════════════════════════════════════════════ PARTIE 2 */}
      {part === 2 && matrix && (
        <>
          {/* Dialog ajout ligne */}
          <Dialog open={addRowLevels !== null} onClose={() => setAddRowLevels(null)} className="relative z-50">
            <DialogBackdrop transition className="fixed inset-0 bg-gray-900/50 transition-opacity data-closed:opacity-0" />
            <div className="fixed inset-0 z-10 flex items-center justify-center p-4">
              <DialogPanel transition className="w-full max-w-sm rounded-xl bg-white dark:bg-gray-900 p-6 shadow-xl transition-all data-closed:opacity-0 data-closed:scale-95">
                <DialogTitle className="text-sm font-semibold text-gray-900 dark:text-white mb-4">
                  Nouvelle ligne — choisir les niveaux
                </DialogTitle>
                {addRowLevels && factors.map(f => {
                  const sel = addRowLevels[f.id];
                  return (
                    <div key={f.id} className="mb-3">
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1.5">{f.id} — {f.name}</p>
                      <div className="flex gap-2">
                        <button onClick={() => setAddRowLevels({ ...addRowLevels, [f.id]: -1 })}
                          className={`flex-1 rounded-lg border px-2 py-1.5 text-xs font-mono font-medium transition-colors ${sel === -1 ? "bg-red-50 border-red-300 text-red-700 dark:bg-red-900/30 dark:border-red-500 dark:text-red-300" : "border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300"}`}>
                          −1{f.continuous ? ` (${f.low.real}${f.unit ? " " + f.unit : ""})` : (f.low.label ? " " + f.low.label : "")}
                        </button>
                        {f.continuous && (
                          <button onClick={() => setAddRowLevels({ ...addRowLevels, [f.id]: 0 })}
                            className={`flex-1 rounded-lg border px-2 py-1.5 text-xs font-mono font-medium transition-colors ${sel === 0 ? "bg-amber-50 border-amber-300 text-amber-700 dark:bg-amber-900/30 dark:border-amber-500 dark:text-amber-300" : "border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300"}`}>
                            0 ({+((f.low.real + f.high.real) / 2).toFixed(2)}{f.unit ? " " + f.unit : ""})
                          </button>
                        )}
                        <button onClick={() => setAddRowLevels({ ...addRowLevels, [f.id]: 1 })}
                          className={`flex-1 rounded-lg border px-2 py-1.5 text-xs font-mono font-medium transition-colors ${sel === 1 ? "bg-emerald-50 border-emerald-300 text-emerald-700 dark:bg-emerald-900/30 dark:border-emerald-500 dark:text-emerald-300" : "border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300"}`}>
                          +1{f.continuous ? ` (${f.high.real}${f.unit ? " " + f.unit : ""})` : (f.high.label ? " " + f.high.label : "")}
                        </button>
                      </div>
                    </div>
                  );
                })}
                <div className="flex justify-end gap-2 mt-5">
                  <button onClick={() => setAddRowLevels(null)}
                    className="rounded-md bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 px-3 py-1.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                    Annuler
                  </button>
                  <button onClick={confirmAddRow}
                    className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-indigo-500 transition-colors">
                    Ajouter
                  </button>
                </div>
              </DialogPanel>
            </div>
          </Dialog>

          {/* Dialog confirmation remplissage aléatoire */}
          <Dialog open={showRandomDialog} onClose={setShowRandomDialog} className="relative z-50">
            <DialogBackdrop transition className="fixed inset-0 bg-gray-900/50 transition-opacity data-closed:opacity-0" />
            <div className="fixed inset-0 z-10 flex items-center justify-center p-4">
              <DialogPanel transition className="w-full max-w-md rounded-xl bg-white dark:bg-gray-900 p-6 shadow-xl transition-all data-closed:opacity-0 data-closed:scale-95">
                <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30">
                  <ExclamationTriangleIcon className="size-6 text-amber-600 dark:text-amber-400" />
                </div>
                <DialogTitle className="text-center text-base font-semibold text-gray-900 dark:text-white mb-2">
                  Remplir avec des valeurs aléatoires ?
                </DialogTitle>
                <p className="text-center text-sm text-gray-500 dark:text-gray-400 mb-6">
                  Des valeurs fictives (entre 20 et 100) seront générées pour toutes les réponses manquantes.
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <button onClick={() => setShowRandomDialog(false)}
                    className="rounded-md bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                    Annuler
                  </button>
                  <button onClick={fillRandom}
                    className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-500 transition-colors">
                    Confirmer
                  </button>
                </div>
              </DialogPanel>
            </div>
          </Dialog>

          {/* Dialog remplissage effectué */}
          <Dialog open={showRandomDone} onClose={setShowRandomDone} className="relative z-50">
            <DialogBackdrop transition className="fixed inset-0 bg-gray-900/50 transition-opacity data-closed:opacity-0" />
            <div className="fixed inset-0 z-10 flex items-center justify-center p-4">
              <DialogPanel transition className="w-full max-w-sm rounded-xl bg-white dark:bg-gray-900 p-6 shadow-xl text-center transition-all data-closed:opacity-0 data-closed:scale-95">
                <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30">
                  <CheckIcon className="size-6 text-emerald-600 dark:text-emerald-400" />
                </div>
                <DialogTitle className="text-base font-semibold text-gray-900 dark:text-white mb-2">Valeurs générées</DialogTitle>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                  Les réponses manquantes ont été remplies avec des valeurs aléatoires fictives.
                </p>
                <button onClick={() => setShowRandomDone(false)}
                  className="w-full rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-500 transition-colors">
                  OK
                </button>
              </DialogPanel>
            </div>
          </Dialog>

          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-5 mb-4">
            <div className="flex items-center justify-between mb-4">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">Matrice d'expériences</p>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400">{matrix.length} essai(s)</span>
                <button onClick={openAddRow}
                  className="flex items-center gap-1 rounded-md border border-gray-200 dark:border-gray-700 px-2.5 py-1 text-xs text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                  <PlusIcon className="size-3.5" /> Ligne
                </button>
              </div>
            </div>

            {hasMissing && (
              <div className="flex items-center justify-between bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg px-3 py-2 mb-4 gap-3">
                <span className="text-xs text-amber-700 dark:text-amber-300">{missingRows.length} ligne(s) sans réponse complète.</span>
                <button onClick={() => setShowRandomDialog(true)}
                  className="shrink-0 rounded-md bg-amber-100 dark:bg-amber-900/40 border border-amber-300 dark:border-amber-600 px-2.5 py-1 text-xs font-medium text-amber-700 dark:text-amber-300 hover:bg-amber-200 transition-colors">
                  Remplir valeurs aléatoires…
                </button>
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-gray-800">
                    <th className="text-[11px] font-medium text-gray-400 pb-2 px-2 w-8 text-center">#</th>
                    {factors.map(f => (
                      <th key={f.id} className="text-left text-[11px] font-medium text-gray-400 pb-2 px-2 whitespace-nowrap">
                        {f.id}<br />
                        <span className="text-[10px] font-normal text-gray-300 dark:text-gray-600">{f.name}{f.unit ? ` (${f.unit})` : ""}</span>
                      </th>
                    ))}
                    <th className="w-px bg-gray-100 dark:bg-gray-800 p-0" />
                    {responses.map(r => (
                      <th key={r.id} className="text-left text-[11px] font-medium text-emerald-600 dark:text-emerald-400 pb-2 px-2 whitespace-nowrap">
                        {r.id}<br />
                        <span className="text-[10px] font-normal text-emerald-400 dark:text-emerald-600">{r.name}{r.unit ? ` (${r.unit})` : ""}</span>
                      </th>
                    ))}
                    <th className="w-8" />
                  </tr>
                </thead>
                <tbody>
                  {matrix.map((row, ri) => {
                    const isMissing = missingRows.includes(ri);
                    return (
                      <tr key={ri} className={`border-b border-gray-50 dark:border-gray-800/50 last:border-0 ${row.center ? "bg-amber-50/40 dark:bg-amber-900/10" : isMissing ? "bg-red-50/40 dark:bg-red-900/10" : ""}`}>
                        <td className="px-2 py-1.5 text-center text-[11px] text-gray-400">{row.center ? "PC" : ri + 1}</td>
                        {factors.map(f => {
                          const c = row.coded[f.id];
                          const rv = row.real[f.id];
                          const cLabel = c === 0 ? "0" : c === -1 ? "−1" : "+1";
                          const cCls = c === -1 ? "text-red-500 dark:text-red-400" : c === 1 ? "text-emerald-600 dark:text-emerald-400" : "text-amber-500";
                          if (row.center && !f.continuous) return (
                            <td key={f.id} className="px-2 py-1.5 text-center text-xs text-gray-300 dark:text-gray-600">—</td>
                          );
                          return (
                            <td key={f.id} className="px-2 py-1.5">
                              <div className="flex items-center gap-1">
                                <span className={`font-mono text-[10px] w-6 shrink-0 ${cCls}`}>({cLabel})</span>
                                {f.continuous
                                  ? <input type="number" value={rv} onChange={e => updateCell(ri, f.id, e.target.value)}
                                      className="w-14 rounded border border-transparent bg-transparent px-1 py-0.5 text-xs text-gray-700 dark:text-gray-200 hover:border-gray-200 dark:hover:border-gray-700 focus:outline-none focus:border-indigo-400 transition-colors" />
                                  : <span className="text-xs text-gray-500 dark:text-gray-400">{rv ?? "—"}</span>
                                }
                              </div>
                            </td>
                          );
                        })}
                        <td className="w-px bg-gray-100 dark:bg-gray-800 p-0" />
                        {responses.map(r => {
                          const v = row.responses[r.id];
                          const isEmpty = v === "" || v === null || v === undefined;
                          return (
                            <td key={r.id} className="px-2 py-1.5">
                              <input type="number" value={isEmpty ? "" : v} placeholder="—"
                                onChange={e => updateResp(ri, r.id, e.target.value)}
                                className={`w-16 rounded border bg-transparent px-1 py-0.5 text-xs text-emerald-700 dark:text-emerald-300 hover:border-gray-200 dark:hover:border-gray-700 focus:outline-none focus:border-indigo-400 transition-colors ${isEmpty ? "border-red-300 dark:border-red-700" : "border-transparent"}`} />
                            </td>
                          );
                        })}
                        <td className="px-2 py-1.5">
                          <button onClick={() => removeRun(ri)}
                            className="p-1 rounded text-red-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                            <TrashIcon className="size-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex items-center justify-between mt-4">
            <button onClick={() => goTo(1)}
              className="rounded-lg border border-gray-200 dark:border-gray-700 px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
              ← Retour
            </button>
            <div className="flex items-center gap-3">
              {editMode && (
                <button onClick={exportJSON}
                  className="flex items-center gap-1.5 rounded-md border border-indigo-300 dark:border-indigo-700 bg-indigo-50 dark:bg-indigo-900/20 px-3 py-1.5 text-xs font-medium text-indigo-600 dark:text-indigo-300 hover:bg-indigo-100 transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="size-3.5">
                    <path fillRule="evenodd" d="M10 3a1 1 0 01.707.293l3 3a1 1 0 01-1.414 1.414L11 6.414V12a1 1 0 11-2 0V6.414L7.707 7.707a1 1 0 01-1.414-1.414l3-3A1 1 0 0110 3zm-3.707 9.293a1 1 0 011.414 1.414L10 16.414l2.293-2.293a1 1 0 011.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                  Exporter JSON
                </button>
              )}
              {hasMissing && <span className="text-xs text-red-500 dark:text-red-400">Compléter les réponses pour continuer</span>}
              <button onClick={() => { if (!hasMissing) goTo(3); }} disabled={hasMissing}
                className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                Choisir le modèle →
              </button>
            </div>
          </div>
        </>
      )}

      {/* ══════════════════════════════════════════════════════ PARTIE 3 */}
      {part === 3 && (() => {
        const nRuns = matrix ? matrix.length : 0;
        const maxTerms = nRuns - 1; // constante comprise = nRuns, donc termes hors constante = nRuns-1
        const activeModel = models.find(m => m.id === activeModelId);

        const addModel = () => {
          if (models.length >= 3) return;
          const newId = Math.max(...models.map(m => m.id)) + 1;
          setModels([...models, { id: newId, name: `Modèle ${newId}`, terms: [...modelDefault], preset: "default" }]);
          setActiveModelId(newId);
        };

        const deleteModel = (id) => {
          if (models.length <= 1) return;
          const remaining = models.filter(m => m.id !== id);
          setModels(remaining);
          if (activeModelId === id) setActiveModelId(remaining[0].id);
        };

        const renameModel = (id, name) => setModels(ms => ms.map(m => m.id === id ? { ...m, name } : m));

        const applyPresetTo = (id, p) => {
          if (p === "cubic" && factors.length < 3) { setShowCubicDialog(true); return; }
          const terms = computePresetModel(p, factors, modelDefault);
          setModels(ms => ms.map(m => m.id === id ? { ...m, terms, preset: p } : m));
        };

        const toggleTermFor = (id, t) => {
          const m = models.find(x => x.id === id);
          if (!m) return;
          const has = m.terms.includes(t);
          // Si on ajoute : vérifier contrainte
          if (!has && m.terms.length >= maxTerms) return;
          const terms = has ? m.terms.filter(x => x !== t) : [...m.terms, t];
          setModels(ms => ms.map(x => x.id === id ? { ...x, terms, preset: "custom" } : x));
        };

        const resetModelTo = (id) => setModels(ms => ms.map(m => m.id === id ? { ...m, terms: [...modelDefault], preset: "default" } : m));

        const modelColors = [
          { border: "border-indigo-500", bg: "bg-indigo-50 dark:bg-indigo-900/20", text: "text-indigo-700 dark:text-indigo-300", tab: "bg-indigo-600", dot: "bg-indigo-500" },
          { border: "border-emerald-500", bg: "bg-emerald-50 dark:bg-emerald-900/20", text: "text-emerald-700 dark:text-emerald-300", tab: "bg-emerald-600", dot: "bg-emerald-500" },
          { border: "border-amber-500", bg: "bg-amber-50 dark:bg-amber-900/20", text: "text-amber-700 dark:text-amber-300", tab: "bg-amber-500", dot: "bg-amber-500" },
        ];

        return (
          <>
            {/* Dialog cubique impossible */}
            <Dialog open={showCubicDialog} onClose={setShowCubicDialog} className="relative z-50">
              <DialogBackdrop transition className="fixed inset-0 bg-gray-900/50 transition-opacity data-closed:opacity-0" />
              <div className="fixed inset-0 z-10 flex items-center justify-center p-4">
                <DialogPanel transition className="w-full max-w-sm rounded-xl bg-white dark:bg-gray-900 p-6 shadow-xl text-center transition-all data-closed:opacity-0 data-closed:scale-95">
                  <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
                    <ExclamationTriangleIcon className="size-6 text-red-600 dark:text-red-400" />
                  </div>
                  <DialogTitle className="text-base font-semibold text-gray-900 dark:text-white mb-2">Modèle impossible</DialogTitle>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Le modèle cubique (ordre 3) nécessite au moins 3 facteurs.</p>
                  <button onClick={() => setShowCubicDialog(false)} className="w-full rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-500 transition-colors">Fermer</button>
                </DialogPanel>
              </div>
            </Dialog>

            {/* En-tête : onglets modèles + bouton ajouter */}
            <div className="flex items-center gap-2 mb-4 flex-wrap">
              {models.map((m, mi) => {
                const col = modelColors[mi % modelColors.length];
                const isActive = m.id === activeModelId;
                return (
                  <button key={m.id} onClick={() => setActiveModelId(m.id)}
                    className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-all ${isActive ? `${col.border} ${col.bg} ${col.text}` : "border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-600"}`}>
                    <span className={`size-2 rounded-full ${col.dot}`} />
                    {m.name}
                    <span className="text-[11px] opacity-60">({m.terms.length + 1} termes)</span>
                  </button>
                );
              })}
              {models.length < 3 && (
                <button onClick={addModel}
                  className="flex items-center gap-1.5 rounded-lg border border-dashed border-gray-300 dark:border-gray-600 px-3 py-2 text-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:border-gray-400 transition-colors">
                  <PlusIcon className="size-4" /> Ajouter un modèle
                </button>
              )}
            </div>

            {/* Carte du modèle actif */}
            {activeModel && (() => {
              const mi = models.findIndex(m => m.id === activeModelId);
              const col = modelColors[mi % modelColors.length];
              const isDefault = JSON.stringify([...activeModel.terms].sort()) === JSON.stringify([...modelDefault].sort());
              const atLimit = activeModel.terms.length >= maxTerms;

              return (
                <div className={`bg-white dark:bg-gray-900 ${cardCls} ${col.border} mb-4`}>
                  {/* Header modèle */}
                  <div className="flex items-center justify-between mb-4 gap-3">
                    <input value={activeModel.name} onChange={e => renameModel(activeModel.id, e.target.value)}
                      className="text-sm font-semibold bg-transparent border-b border-transparent hover:border-gray-300 dark:hover:border-gray-600 focus:outline-none focus:border-indigo-400 text-gray-900 dark:text-white w-40 transition-colors" />
                    <div className="flex items-center gap-2">
                      {!isDefault && (
                        <button onClick={() => resetModelTo(activeModel.id)}
                          className="flex items-center gap-1 rounded-md border border-gray-200 dark:border-gray-700 px-2 py-1 text-xs text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                          <ArrowPathIcon className="size-3" /> Défaut
                        </button>
                      )}
                      <button onClick={() => deleteModel(activeModel.id)} disabled={models.length <= 1}
                        className="p-1.5 rounded-md text-red-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        title={models.length <= 1 ? "Au moins un modèle requis" : "Supprimer ce modèle"}>
                        <TrashIcon className="size-4" />
                      </button>
                    </div>
                  </div>

                  {/* Presets */}
                  <div className="flex flex-wrap items-center gap-2 mb-4">
                    <HelpButton topic="modele" size="xs" />
                    {[
                      { id: "linear", label: "Linéaire" },
                      { id: "synergie", label: "Synergie" },
                      { id: "quadratic", label: "Quadratique" },
                      { id: "cubic", label: "Cubique" },
                    ].map(p => (
                      <button key={p.id} onClick={() => applyPresetTo(activeModel.id, p.id)}
                        className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                          activeModel.preset === p.id
                            ? `${col.tab} border-transparent text-white`
                            : "border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800"
                        }`}>
                        {p.label}
                      </button>
                    ))}
                  </div>

                  {/* Contrainte */}
                  {atLimit && (
                    <div className="flex items-center gap-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg px-3 py-2 mb-3">
                      <ExclamationTriangleIcon className="size-4 text-amber-500 shrink-0" />
                      <span className="text-xs text-amber-700 dark:text-amber-300">
                        Maximum atteint : {nRuns} essais → max {maxTerms} termes + constante.
                      </span>
                    </div>
                  )}

                  <div className="h-px bg-gray-100 dark:bg-gray-800 mb-3" />

                  {/* Constante */}
                  <div className="mb-3">
                    <span className="inline-flex items-center rounded-full bg-purple-100 dark:bg-purple-900/30 border border-purple-200 dark:border-purple-700 px-3 py-1 text-xs font-mono font-semibold text-purple-700 dark:text-purple-300 mr-2">α₀</span>
                    <span className="text-xs text-gray-400">constante — toujours incluse</span>
                  </div>

                  {/* Termes par groupe */}
                  {orderedKeys.map(order => (
                    <div key={order} className="mb-3">
                      <p className="text-xs text-gray-400 dark:text-gray-500 mb-2">{orderLabels[order]}</p>
                      <div className="flex flex-wrap gap-1.5">
                        {byOrder[order].map(t => {
                          const isOn = activeModel.terms.includes(t);
                          const wouldExceed = !isOn && atLimit;
                          return (
                            <button key={t} onClick={() => !wouldExceed && toggleTermFor(activeModel.id, t)}
                              title={wouldExceed ? "Limite atteinte" : modelDefault.includes(t) ? "Dans le modèle par défaut" : ""}
                              className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-mono font-medium transition-all ${
                                isOn
                                  ? `bg-emerald-50 dark:bg-emerald-900/30 border-emerald-300 dark:border-emerald-600 text-emerald-700 dark:text-emerald-300`
                                  : wouldExceed
                                    ? "bg-gray-50 dark:bg-gray-800 border-gray-100 dark:border-gray-800 text-gray-300 dark:text-gray-700 cursor-not-allowed"
                                    : "bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-400 dark:text-gray-500 opacity-50 line-through hover:opacity-70"
                              }`}>
                              {formatTermDisplay(t, factors)}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}

                  <div className="h-px bg-gray-100 dark:bg-gray-800 mt-4 mb-3" />
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs text-gray-400">Termes actifs :</span>
                    <strong className="text-sm text-gray-700 dark:text-gray-200">{activeModel.terms.length + 1}</strong>
                    <span className="text-xs text-gray-400">/ {nRuns} essais</span>
                    {!isDefault
                      ? <span className="rounded-full bg-amber-100 dark:bg-amber-900/30 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:text-amber-300">Modifié</span>
                      : <span className="rounded-full bg-emerald-100 dark:bg-emerald-900/30 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-300">Défaut JSON</span>
                    }
                  </div>
                </div>
              );
            })()}

            {/* Équations de tous les modèles */}
            <div className="grid gap-3 mb-4" style={{ gridTemplateColumns: `repeat(${models.length}, minmax(0, 1fr))` }}>
              {models.map((m, mi) => {
                const col = modelColors[mi % modelColors.length];
                return (
                  <div key={m.id} className={`bg-gray-50 dark:bg-gray-800/50 border ${col.border} rounded-xl p-4`}>
                    <p className={`text-[11px] font-semibold uppercase tracking-widest mb-2 ${col.text}`}>{m.name}</p>
                    <div className="font-mono text-xs text-gray-700 dark:text-gray-200 leading-loose">
                      <span>Ŷ = α₀</span>
                      {m.terms.map(t => (
                        <span key={t}> + α<sub>{termSubScript(t, factors)}</sub>·<span dangerouslySetInnerHTML={{ __html: formatTermHTML(t, factors) }} /></span>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-between mt-4">
              <button onClick={() => goTo(2)}
                className="rounded-lg border border-gray-200 dark:border-gray-700 px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                ← Retour
              </button>
              <div className="flex items-center gap-3">
                {editMode && (
                  <button onClick={exportJSON}
                    className="flex items-center gap-1.5 rounded-md border border-indigo-300 dark:border-indigo-700 bg-indigo-50 dark:bg-indigo-900/20 px-3 py-1.5 text-xs font-medium text-indigo-600 dark:text-indigo-300 hover:bg-indigo-100 transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="size-3.5">
                      <path fillRule="evenodd" d="M10 3a1 1 0 01.707.293l3 3a1 1 0 01-1.414 1.414L11 6.414V12a1 1 0 11-2 0V6.414L7.707 7.707a1 1 0 01-1.414-1.414l3-3A1 1 0 0110 3zm-3.707 9.293a1 1 0 011.414 1.414L10 16.414l2.293-2.293a1 1 0 011.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                    Exporter JSON
                  </button>
                )}
                <button onClick={() => setPart(4)} className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 transition-colors">
                  Continuer → ({models.length} modèle{models.length > 1 ? "s" : ""})
                </button>
              </div>
            </div>
          </>
        );
      })()}

      {/* ══════════════════════════════════════════════════════ PARTIE 4 */}
      {part === 4 && (() => {
        const contFactors = factors.filter(f => f.continuous);
        const has3D = contFactors.length >= 2;
        // Mode compact : raccourcis pour les classes (isCompact vient du composant parent)
        const TABS = [
          { id: "effets_calcul", label: "Calcul des effets" },
          { id: "coefficients", label: "Coefficients" },
          { id: "residus", label: "Résidus" },
          { id: "anova", label: "ANOVA & Validation" },
          { id: "effets", label: "Effets (Pareto)" },
          { id: "isoresponse", label: "Isoréponses" },
          ...(has3D ? [{ id: "iso3d", label: "Surface 3D" }] : []),
        ];

        const modelColors = [
          { border: "border-indigo-500", bg: "bg-indigo-50 dark:bg-indigo-900/20", text: "text-indigo-600 dark:text-indigo-300", badge: "bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300", dot: "bg-indigo-500" },
          { border: "border-emerald-500", bg: "bg-emerald-50 dark:bg-emerald-900/20", text: "text-emerald-600 dark:text-emerald-300", badge: "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300", dot: "bg-emerald-500" },
          { border: "border-amber-500", bg: "bg-amber-50 dark:bg-amber-900/20", text: "text-amber-600 dark:text-amber-300", badge: "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300", dot: "bg-amber-500" },
        ];

        const activeResp = responses[part4Response] || responses[0];
        const yValues = (matrix || []).map(row => {
          const v = row.responses[activeResp.id];
          return v === "" || v === null || v === undefined ? null : +v;
        });
        // Tous les points valides (réponse renseignée), avant exclusion
        const allValidRows = (matrix || []).map((row, i) => ({ row, i, y: yValues[i] })).filter(x => x.y !== null);
        // Points valides ET non exclus → utilisés pour le calcul
        const activeRows = allValidRows.filter(x => !excludedPoints.has(x.i));
        const validRows = activeRows.map(x => x.row);
        const validY = activeRows.map(x => x.y);

        // Toggle exclusion d'un point (avec contrainte min)
        const toggleExclude = (globalIdx, modelTermsCount) => {
          const minRequired = modelTermsCount + 2; // p+1 degrés de liberté résidus
          setExcludedPoints(prev => {
            const next = new Set(prev);
            if (next.has(globalIdx)) {
              next.delete(globalIdx);
            } else {
              // Vérifier que le nombre de points restants sera suffisant pour le modèle le plus grand
              const maxTerms = Math.max(...models.map(m => m.terms.length));
              const wouldRemain = allValidRows.length - next.size - 1;
              if (wouldRemain < maxTerms + 2) return prev; // refus
              next.add(globalIdx);
            }
            return next;
          });
        };

        // Calcul OLS pour chaque modèle (sur points actifs)
        const fits = models.map(m => {
          if (validRows.length < m.terms.length + 2) return null;
          return fitOLS(m.terms, validRows, validY, factors);
        });

        // Noms des termes (constante + termes du modèle)
        const termLabel = (t) => formatTermDisplay(t, factors);
        const allTermLabels = (terms) => ["α₀ (constante)", ...terms.map(t => `α${termSubScript(t, factors)} · ${termLabel(t)}`)];

        return (
          <>
            {/* Sélecteur réponse si plusieurs */}
            {responses.length > 1 && (
              <div className="flex items-center gap-3 mb-4">
                <span className="text-xs text-gray-500 dark:text-gray-400">Réponse :</span>
                <div className="flex gap-2">
                  {responses.map((r, i) => (
                    <button key={r.id} onClick={() => setPart4Response(i)}
                      className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${i === part4Response ? "bg-indigo-600 border-indigo-600 text-white" : "border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"}`}>
                      {r.id} — {r.name}{r.unit ? ` (${r.unit})` : ""}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Tabs */}
            <div className="mb-4">
              <div className="grid grid-cols-1 sm:hidden">
                <select value={part4Tab} onChange={e => setPart4Tab(e.target.value)}
                  className="col-start-1 row-start-1 w-full appearance-none rounded-md bg-white py-2 pr-8 pl-3 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 dark:bg-gray-800/50 dark:text-gray-100 dark:outline-white/10 dark:focus:outline-indigo-500">
                  {TABS.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                </select>
                <ChevronDownIcon aria-hidden="true" className="pointer-events-none col-start-1 row-start-1 mr-2 size-5 self-center justify-self-end fill-gray-500 dark:fill-gray-400" />
              </div>
              <div className="hidden sm:block">
                <nav aria-label="Tabs" className="flex items-center space-x-1">
                  {TABS.map(t => (
                    <button key={t.id} onClick={() => setPart4Tab(t.id)}
                      className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                        t.id === part4Tab
                          ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300"
                          : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800"
                      }`}>
                      {t.label}
                    </button>
                  ))}

                </nav>
              </div>
            </div>

            {/* ── TAB : CALCUL DES EFFETS ── */}
            {part4Tab === "effets_calcul" && (
              <div className={cardSpace}>
                {/* ── Tabs par modèle ── */}
                {models.length > 1 && (
                  <div className="flex gap-1 flex-wrap mb-3">
                    {models.map((m, mi) => {
                      const col = modelColors[mi % modelColors.length];
                      return (
                        <button key={m.id} onClick={() => setActiveModelId(m.id)}
                          className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-all ${
                            m.id === activeModelId
                              ? `${col.border} ${col.bg} ${col.text}`
                              : "border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-gray-300"
                          }`}>
                          <span className={`size-2 rounded-full ${col.dot}`} />
                          {m.name}
                        </button>
                      );
                    })}
                  </div>
                )}
                {models.map((m, mi) => {
                  if (m.id !== activeModelId) return null;
                  const fit = fits[mi];
                  const col = modelColors[mi % modelColors.length];
                  return (
                    <div key={m.id} className={`bg-white dark:bg-gray-900 ${cardCls} ${col.border}`}>
                      <div className="flex items-center gap-2 mb-4">
                        <span className={`size-2.5 rounded-full ${col.dot}`} />
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                          {m.name} — Calcul des effets et interactions
                        </h3>
                        <HelpButton topic="effets_calcul" size="xs" className="ml-auto" />
                      </div>
                      <EffetsPanel
                        model={m}
                        fit={fit}
                        matrix={matrix}
                        factors={factors}
                        responses={responses}
                        activeResp={activeResp}
                        col={col}
                        compact={isCompact}
                      />
                    </div>
                  );
                })}
              </div>
            )}

            {/* ── TAB : COEFFICIENTS ── */}
            {part4Tab === "coefficients" && (
              <div className={cardSpace}>
                <div className="flex items-center gap-2 mb-3">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Coefficients estimés</h3>
                  <HelpButton topic="coefficients" size="xs" />
                </div>

                {/* ── Tabs par modèle ── */}
                {models.length > 1 && (
                  <div className="flex gap-1 flex-wrap mb-3">
                    {models.map((m, mi) => {
                      const col = modelColors[mi % modelColors.length];
                      return (
                        <button key={m.id} onClick={() => setActiveModelId(m.id)}
                          className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-all ${
                            m.id === activeModelId
                              ? `${col.border} ${col.bg} ${col.text}`
                              : "border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-gray-300"
                          }`}>
                          <span className={`size-2 rounded-full ${col.dot}`} />
                          {m.name}
                        </button>
                      );
                    })}
                  </div>
                )}
                {models.map((m, mi) => {
                  if (m.id !== activeModelId) return null;
                  const fit = fits[mi];
                  const col = modelColors[mi % modelColors.length];
                  const labels = allTermLabels(m.terms);
                  return (
                    <div key={m.id} className={`bg-white dark:bg-gray-900 ${cardCls} ${col.border}`}>
                      <div className="flex items-center gap-2 mb-4">
                        <span className={`size-2.5 rounded-full ${col.dot}`} />
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{m.name}</h3>
                        {fit && (
                          <span className={`ml-auto rounded-full px-2 py-0.5 text-[11px] font-semibold ${col.badge}`}>
                            R² = {fmt(fit.R2, 4)} · R²adj = {fmt(fit.R2adj, 4)}
                          </span>
                        )}
                      </div>
                      {!fit ? (
                        <p className="text-sm text-red-500">Impossible de calculer — vérifiez que toutes les réponses sont renseignées et que le nombre d'essais est suffisant.</p>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="border-b border-gray-100 dark:border-gray-800">
                                <th className="text-left text-[11px] font-medium text-gray-400 pb-2 px-2">Terme</th>
                                <th className="text-right text-[11px] font-medium text-gray-400 pb-2 px-2">Estimation</th>
                                <th className="text-right text-[11px] font-medium text-gray-400 pb-2 px-2">Écart-type</th>
                                <th className="text-right text-[11px] font-medium text-gray-400 pb-2 px-2">t ratio</th>
                                <th className="text-right text-[11px] font-medium text-gray-400 pb-2 px-2">Prob &gt; |t|</th>
                                <th className="text-center text-[11px] font-medium text-gray-400 pb-2 px-2">Sig.</th>
                              </tr>
                            </thead>
                            <tbody>
                              {fit.coeffs.map((c, ci) => {
                                const p = fit.pCoeffs[ci];
                                const sig = sigStars(p);
                                const isSignif = p !== null && p < 0.05;
                                return (
                                  <tr key={ci} className={`border-b border-gray-50 dark:border-gray-800/50 last:border-0 ${isSignif ? "bg-indigo-50/30 dark:bg-indigo-900/10" : ""}`}>
                                    <td className="px-2 py-1.5 font-mono text-gray-700 dark:text-gray-200">{labels[ci]}</td>
                                    <td className="px-2 py-1.5 text-right font-mono font-semibold text-gray-900 dark:text-white">{fmt(c)}</td>
                                    <td className="px-2 py-1.5 text-right font-mono text-gray-500">{fmt(fit.seCoeffs[ci])}</td>
                                    <td className="px-2 py-1.5 text-right font-mono text-gray-500">{fmt(fit.tStats[ci], 3)}</td>
                                    <td className={`px-2 py-1.5 text-right font-mono ${isSignif ? "text-indigo-600 dark:text-indigo-300 font-semibold" : "text-gray-400"}`}>{fmtP(p)}</td>
                                    <td className="px-2 py-1.5 text-center text-amber-500 font-bold">{sig}</td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                          <p className="mt-2 text-[10px] text-gray-400">Significativité : *** p&lt;0.001 · ** p&lt;0.01 · * p&lt;0.05 · · p&lt;0.1</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* ── TAB : RÉSIDUS ── */}
                        {part4Tab === "residus" && (
              <div className={cardSpace}>
                <div className="flex items-center gap-2 mb-3">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Analyse des résidus</h3>
                  <HelpButton topic="residus" size="xs" />
                </div>
                {/* Info points exclus */}
                {excludedPoints.size > 0 && (
                  <div className="flex items-center justify-between bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg px-3 py-2">
                    <span className="text-xs text-amber-700 dark:text-amber-300">
                      {excludedPoints.size} point(s) exclu(s) du calcul.
                    </span>
                    <button onClick={() => setExcludedPoints(new Set())}
                      className="text-xs text-amber-600 dark:text-amber-400 hover:underline">
                      Réinclure tous
                    </button>
                  </div>
                )}

                {/* ── Tabs par modèle ── */}
                {models.length > 1 && (
                  <div className="flex gap-1 flex-wrap mb-2">
                    {models.map((m, mi) => {
                      const col = modelColors[mi % modelColors.length];
                      return (
                        <button key={m.id} onClick={() => setActiveModelId(m.id)}
                          className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-all ${
                            m.id === activeModelId
                              ? `${col.border} ${col.bg} ${col.text}`
                              : "border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-gray-300"
                          }`}>
                          <span className={`size-2 rounded-full ${col.dot}`} />
                          {m.name}
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Contenu pour le modèle actif */}
                {(() => {
                  const mi = models.findIndex(m => m.id === activeModelId);
                  const m = models[mi];
                  const fit = fits[mi];
                  const col = modelColors[mi % modelColors.length];
                  if (!fit) return (
                    <div className={`bg-white dark:bg-gray-900 ${cardCls} ${col.border}`}>
                      <p className="text-sm text-red-500">Calcul impossible — pas assez de points actifs ({validRows.length}) pour {m.terms.length + 1} paramètres.</p>
                    </div>
                  );
                  const minRequired = Math.max(...models.map(x => x.terms.length)) + 2;
                  return (
                    <div className={`bg-white dark:bg-gray-900 ${cardCls} ${col.border}`}>
                      <div className="flex items-center gap-2 mb-4">
                        <span className={`size-2.5 rounded-full ${col.dot}`} />
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{m.name}</h3>
                        <span className="ml-auto text-xs text-gray-400">{activeRows.length} points actifs</span>
                      </div>

                      {/* Graphe résidus vs Ŷ agrandi */}
                      <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-3">Résidus vs Ŷ — cliquer sur un point pour le détail</p>
                      <ResidualPlot
                        yHat={fit.yHat}
                        residuals={fit.residuals}
                        MSE={fit.MSE}
                        globalIndices={activeRows.map(x => x.i)}
                        allValidRows={activeRows}
                        onExclude={(gIdx) => toggleExclude(gIdx, Math.max(...models.map(x => x.terms.length)))}
                        onReinclude={(gIdx) => toggleExclude(gIdx, Math.max(...models.map(x => x.terms.length)))}
                        excludedGlobalIndices={excludedPoints}
                        minRequired={minRequired}
                        color={col.dot}
                      />

                      {/* Q-Q Plot */}
                      {fit.residuals.length >= 3 && (
                        <div className="mt-5 border-t border-gray-100 dark:border-gray-800 pt-4">
                          <div className="flex items-center gap-2 mb-3">
                            <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">Q-Q Plot — Normalité des résidus</p>
                            <HelpButton topic="qqplot" size="xs" />
                          </div>
                          <div className="flex flex-col sm:flex-row gap-4 items-start">
                            <div className="shrink-0"><QQPlotSVG residuals={fit.residuals} MSE={fit.MSE} col={col} /></div>
                            <div className="flex-1 space-y-2">
                              {(() => {
                                const s = fit.MSE > 0 ? Math.sqrt(fit.MSE) : 1;
                                const normed = fit.residuals.map(r => r / s).sort((a,b) => a - b);
                                const n = normed.length;
                                const theoretical = normed.map((_, i) => normalQuantile((i + 1 - 0.375) / (n + 0.25)));
                                const maxDev = Math.max(...normed.map((v, i) => Math.abs(v - theoretical[i])));
                                const nAnom = normed.filter((v, i) => Math.abs(v - theoretical[i]) > 0.65).length;
                                const isNormal = maxDev < 0.65;
                                return (
                                  <>
                                    <div className={`rounded-lg px-3 py-2 text-xs ${isNormal ? "bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-700" : "bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700"}`}>
                                      <p className={`font-semibold mb-1 ${isNormal ? "text-emerald-700 dark:text-emerald-300" : "text-amber-700 dark:text-amber-300"}`}>
                                        {isNormal ? "✓ Normalité probable" : "△ Normalité questionnable"}
                                      </p>
                                      <p className={isNormal ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"}>
                                        {isNormal
                                          ? "Les points s'alignent sur la droite rouge — hypothèse de normalité respectée."
                                          : `${nAnom} point(s) s'écarte(nt) de la droite. Distribution peut-être non normale.`}
                                      </p>
                                    </div>
                                    <div className="rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700 px-3 py-2 text-xs text-gray-500 dark:text-gray-400 space-y-1">
                                      <p className="font-medium text-gray-600 dark:text-gray-300">Comment lire :</p>
                                      <p>• Points sur la droite rouge → résidus normaux ✓</p>
                                      <p>• Forme en S → queues épaisses · Courbe → asymétrie</p>
                                      <p className="text-[10px] text-gray-400 italic">Avec peu d'essais (&lt; 15), indicatif seulement.</p>
                                    </div>
                                  </>
                                );
                              })()}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            )}

            {part4Tab === "anova" && (
              <div className={cardSpace}>
                <div className="flex items-center gap-2 mb-3">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Analyse de la variance (ANOVA)</h3>
                  <HelpButton topic="anova" size="xs" />
                </div>

                {/* ── Tabs par modèle ── */}
                {models.length > 1 && (
                  <div className="flex gap-1 flex-wrap mb-3">
                    {models.map((m, mi) => {
                      const col = modelColors[mi % modelColors.length];
                      return (
                        <button key={m.id} onClick={() => setActiveModelId(m.id)}
                          className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-all ${
                            m.id === activeModelId
                              ? `${col.border} ${col.bg} ${col.text}`
                              : "border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-gray-300"
                          }`}>
                          <span className={`size-2 rounded-full ${col.dot}`} />
                          {m.name}
                        </button>
                      );
                    })}
                  </div>
                )}
                {models.map((m, mi) => {
                  if (m.id !== activeModelId) return null;
                  const fit = fits[mi];
                  const col = modelColors[mi % modelColors.length];
                  if (!fit) return <div key={m.id} className={`bg-white dark:bg-gray-900 ${cardCls} ${col.border}`}><p className="text-sm text-red-500">Calcul impossible.</p></div>;
                  const modelOK = fit.pF !== null && fit.pF < 0.05;
                  const R2ok = fit.R2adj > 0.8;
                  const verdict = modelOK && R2ok ? "acceptable" : !modelOK ? "à rejeter" : "insuffisant";
                  const verdictCls = verdict === "acceptable" ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300" : verdict === "à rejeter" ? "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300" : "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300";
                  return (
                    <div key={m.id} className={`bg-white dark:bg-gray-900 ${cardCls} ${col.border}`}>
                      <div className="flex items-center gap-2 mb-4">
                        <span className={`size-2.5 rounded-full ${col.dot}`} />
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{m.name}</h3>
                        <span className={`ml-auto rounded-full px-3 py-1 text-xs font-semibold ${verdictCls}`}>
                          Modèle {verdict}
                        </span>
                      </div>
                      {/* Indicateurs */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                        {[
                          { label: "R²", value: fmt(fit.R2, 4) },
                          { label: "R² ajusté", value: fmt(fit.R2adj, 4) },
                          { label: "F", value: fmt(fit.Fstat, 3) },
                          { label: "Prob &gt; F", value: fmtP(fit.pF) },
                        ].map(stat => (
                          <div key={stat.label} className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 text-center">
                            <p className="text-[11px] text-gray-400 mb-1">{stat.label}</p>
                            <p className="text-sm font-semibold font-mono text-gray-900 dark:text-white">{stat.value}</p>
                          </div>
                        ))}
                      </div>
                      {/* Tableau ANOVA */}
                      <div className="overflow-x-auto mb-4">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="border-b border-gray-100 dark:border-gray-800">
                              {[
                                { label: "Source", help: null },
                                { label: "SC", help: "Somme des Carrés — mesure la dispersion de chaque source" },
                                { label: "dl", help: "Degrés de Liberté — nombre de valeurs indépendantes" },
                                { label: "CM", help: "Carré Moyen = SC/dl — variance estimée" },
                                { label: "F", help: "Statistique de Fisher = CM_R/CM_E — grand F = bon modèle" },
                                { label: "Prob > F", help: "p-valeur : < 0.05 → modèle significatif ✓" },
                              ].map(({ label, help }) => (
                                <th key={label} className="text-left text-[11px] font-medium text-gray-400 pb-2 px-2">
                                  <span className="flex items-center gap-1">
                                    {label}
                                    {help && (
                                      <span title={help} className="cursor-help text-gray-300 hover:text-indigo-400 transition-colors">
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="size-3">
                                          <path fillRule="evenodd" d="M15 8A7 7 0 1 1 1 8a7 7 0 0 1 14 0ZM9 5a1 1 0 1 1-2 0 1 1 0 0 1 2 0ZM6.75 8a.75.75 0 0 0 0 1.5h.75v1.75a.75.75 0 0 0 1.5 0v-2.5A.75.75 0 0 0 8.25 8h-1.5Z" clipRule="evenodd" />
                                        </svg>
                                      </span>
                                    )}
                                  </span>
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {[
                              { label: "Régression", sc: fit.SSR, df: fit.dfR, cm: fit.MSR, f: fit.Fstat, p: fit.pF },
                              { label: "Résidus", sc: fit.SSE, df: fit.dfE, cm: fit.MSE, f: null, p: null },
                              { label: "Total", sc: fit.SST, df: fit.n - 1, cm: null, f: null, p: null },
                            ].map(row => (
                              <tr key={row.label} className="border-b border-gray-50 dark:border-gray-800/50 last:border-0">
                                <td className="px-2 py-1.5 font-medium text-gray-700 dark:text-gray-200">{row.label}</td>
                                <td className="px-2 py-1.5 text-right font-mono text-gray-600 dark:text-gray-300">{fmt(row.sc, 4)}</td>
                                <td className="px-2 py-1.5 text-right font-mono text-gray-600 dark:text-gray-300">{row.df}</td>
                                <td className="px-2 py-1.5 text-right font-mono text-gray-600 dark:text-gray-300">{row.cm !== null ? fmt(row.cm, 4) : "—"}</td>
                                <td className="px-2 py-1.5 text-right font-mono text-gray-600 dark:text-gray-300">{row.f !== null ? fmt(row.f, 3) : "—"}</td>
                                <td className={`px-2 py-1.5 text-right font-mono ${row.p !== null && row.p < 0.05 ? "text-indigo-600 dark:text-indigo-300 font-semibold" : "text-gray-400"}`}>{row.p !== null ? fmtP(row.p) : "—"}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      {/* Verdict détaillé */}
                      <div className={`rounded-lg p-3 ${verdict === "acceptable" ? "bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-700" : verdict === "à rejeter" ? "bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700" : "bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700"}`}>
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-xs font-medium text-gray-700 dark:text-gray-200">Analyse de validation</p>
                          <button
                            type="button"
                            onClick={() => setValidationHelpFit({ fit, modelName: m.name })}
                            className="inline-flex items-center gap-1 text-[10px] text-indigo-500 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 transition-colors"
                            title="Aide : comprendre ces calculs avec vos valeurs"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="size-3.5">
                              <path fillRule="evenodd" d="M15 8A7 7 0 1 1 1 8a7 7 0 0 1 14 0ZM9 5a1 1 0 1 1-2 0 1 1 0 0 1 2 0ZM6.75 8a.75.75 0 0 0 0 1.5h.75v1.75a.75.75 0 0 0 1.5 0v-2.5A.75.75 0 0 0 8.25 8h-1.5Z" clipRule="evenodd"/>
                            </svg>
                            Comment sont calculés ces indicateurs ?
                          </button>
                        </div>
                        <ul className="text-xs space-y-1">
                          <li className={`flex items-start gap-1.5 ${R2ok ? "text-emerald-700 dark:text-emerald-300" : "text-amber-700 dark:text-amber-300"}`}>
                            <span>{R2ok ? "✓" : "△"}</span>
                            <span>R² ajusté = {fmt(fit.R2adj, 4)} {R2ok ? "(bon ajustement ≥ 0.8)" : "(ajustement insuffisant < 0.8)"}</span>
                          </li>
                          <li className={`flex items-start gap-1.5 ${modelOK ? "text-emerald-700 dark:text-emerald-300" : "text-red-700 dark:text-red-300"}`}>
                            <span>{modelOK ? "✓" : "✗"}</span>
                            <span>ANOVA modèle : Prob &gt; F = {fmtP(fit.pF)} {modelOK ? "(modèle significatif)" : "(modèle non significatif — à rejeter)"}</span>
                          </li>
                          <li className="flex items-start gap-1.5 text-gray-500">
                            <span>·</span>
                            <span>Degrés de liberté résidus : {fit.dfE} {fit.dfE < 2 ? "⚠ trop peu pour une analyse fiable" : ""}</span>
                          </li>
                        </ul>

                        {verdict !== "acceptable" && (
                          <div className="mt-2 pt-2 border-t border-red-200 dark:border-red-800/50 flex items-center justify-between">
                            <span className="text-[10px] text-red-600 dark:text-red-400 font-medium">
                              Ce modèle ne peut pas être utilisé en l'état.
                            </span>
                            <button
                              type="button"
                              onClick={() => setImprovementHelpFit({ fit, verdict, modelName: m.name, modelTerms: m.terms })}
                              className="inline-flex items-center gap-1.5 text-[10px] font-medium text-white bg-red-500 hover:bg-red-600 dark:bg-red-700 dark:hover:bg-red-600 px-2.5 py-1 rounded-md transition-colors"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="size-3">
                                <path d="M8 1a.75.75 0 0 1 .75.75V6h4.5a.75.75 0 0 1 0 1.5h-4.5v4.25a.75.75 0 0 1-1.5 0V7.5H2.75a.75.75 0 0 1 0-1.5h4.5V1.75A.75.75 0 0 1 8 1Z"/>
                              </svg>
                              Comment améliorer ce modèle ?
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Prédiction interactive */}
                      <PredictionPanel model={m} fit={fit} factors={factors} col={col} />
                    </div>
                  );
                })}
              </div>
            )}

            {/* ── TAB : EFFETS (PARETO) ── */}
            {part4Tab === "effets" && (
              <div className={cardSpace}>
                <div className="flex items-center gap-2 mb-4">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Diagramme de Pareto des effets</h3>
                  <HelpButton topic="pareto" size="xs" />
                </div>

                {/* ── Tabs par modèle ── */}
                {models.length > 1 && (
                  <div className="flex gap-1 flex-wrap mb-3">
                    {models.map((m, mi) => {
                      const col = modelColors[mi % modelColors.length];
                      return (
                        <button key={m.id} onClick={() => setActiveModelId(m.id)}
                          className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-all ${
                            m.id === activeModelId
                              ? `${col.border} ${col.bg} ${col.text}`
                              : "border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-gray-300"
                          }`}>
                          <span className={`size-2 rounded-full ${col.dot}`} />
                          {m.name}
                        </button>
                      );
                    })}
                  </div>
                )}
                {models.map((m, mi) => {
                  if (m.id !== activeModelId) return null;
                  const fit = fits[mi];
                  const col = modelColors[mi % modelColors.length];
                  if (!fit) return <div key={m.id} className={`bg-white dark:bg-gray-900 ${cardCls} ${col.border}`}><p className="text-sm text-red-500">Calcul impossible.</p></div>;
                  // Effets = |coefficients| sauf constante, triés
                  const effects = m.terms.map((t, i) => ({
                    term: t,
                    label: termLabel(t),
                    coeff: fit.coeffs[i + 1],
                    absCoeff: Math.abs(fit.coeffs[i + 1]),
                    p: fit.pCoeffs[i + 1],
                  })).sort((a, b) => b.absCoeff - a.absCoeff);
                  const maxAbs = effects[0]?.absCoeff || 1;
                  return (
                    <div key={m.id} className={`bg-white dark:bg-gray-900 ${cardCls} ${col.border}`}>
                      <div className="flex items-center gap-2 mb-4">
                        <span className={`size-2.5 rounded-full ${col.dot}`} />
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{m.name} — Diagramme de Pareto des effets</h3>
                      </div>
                      {/* ── Diagramme de Pareto ── */}
                      {(() => {
                        const seMean = fit.seCoeffs?.slice(1).length > 0
                          ? fit.seCoeffs.slice(1).reduce((s,v)=>s+v,0) / fit.seCoeffs.slice(1).length
                          : null;
                        const tCrit = fit.dfE >= 1 ? tCritical(fit.dfE) : null;
                        const threshold = tCrit && seMean ? tCrit * seMean : null;
                        const thresholdPct = threshold && maxAbs > 0 ? (threshold / maxAbs) * 100 : null;
                        const thresholdVisible = thresholdPct !== null && thresholdPct <= 100;

                        const allNS = effects.every(ef => ef.p === null || ef.p >= 0.05);

                        return (
                          <div className="space-y-1">
                            {/* Bandeau "tout gris" */}
                            {allNS && (
                              <div className="flex items-start gap-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-300 dark:border-amber-700 px-4 py-3 mb-3">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="size-5 text-amber-500 shrink-0 mt-0.5">
                                  <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd"/>
                                </svg>
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-semibold text-amber-800 dark:text-amber-300 mb-1">
                                    Aucun terme significatif — toutes les barres sont grises
                                  </p>
                                  <p className="text-[11px] text-amber-700 dark:text-amber-400 leading-relaxed">
                                    {fit.dfE < 2
                                      ? `Le modèle a trop de termes (dfE = ${fit.dfE}). Le test de Student ne peut pas détecter de significativité. → Réduire le nombre de termes dans la Partie 3.`
                                      : `Aucun facteur ni interaction n'a d'effet statistiquement significatif sur la réponse (tous p ≥ 0.05). Le phénomène mesuré n'est peut-être pas bien capturé par les facteurs choisis, ou la variabilité expérimentale est trop grande.`}
                                  </p>
                                  <div className="flex flex-wrap gap-2 mt-2">
                                    {fit.dfE < 2 && (
                                      <span className="inline-flex items-center gap-1 text-[10px] bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 px-2 py-0.5 rounded-full">
                                        → Partie 3 : choisir Linéaire ou Synergie
                                      </span>
                                    )}
                                    {fit.dfE >= 2 && (
                                      <>
                                        <span className="inline-flex items-center gap-1 text-[10px] bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 px-2 py-0.5 rounded-full">
                                          → Vérifier la saisie des réponses
                                        </span>
                                        <span className="inline-flex items-center gap-1 text-[10px] bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 px-2 py-0.5 rounded-full">
                                          → Vérifier le choix des facteurs
                                        </span>
                                        <span className="inline-flex items-center gap-1 text-[10px] bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 px-2 py-0.5 rounded-full">
                                          → Voir onglet Résidus
                                        </span>
                                      </>
                                    )}
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* Barres */}
                            {effects.map((ef) => {
                              const barPct  = maxAbs > 0 ? (ef.absCoeff / maxAbs) * 100 : 0;
                              const isSignif = ef.p !== null && ef.p < 0.05;
                              const isNS     = !isSignif;
                              const isInteractionTerm = factors.filter(f => ef.term.includes(f.id)).length > 1;
                              const pFmt = ef.p !== null ? (ef.p < 0.001 ? "<0.001" : ef.p.toFixed(3)) : "—";
                              const helpMsg = isInteractionTerm
                                ? `L'interaction ${ef.label} n'est pas significative (p = ${pFmt} ≥ 0.05). L'effet combiné de ces facteurs n'est pas démontrable avec les données actuelles. Elle peut être retirée du modèle.`
                                : `${ef.label} n'est pas significatif (p = ${pFmt} ≥ 0.05). Ce facteur n'a pas d'influence statistiquement démontrable sur la réponse dans les conditions étudiées. Il peut être retiré du modèle pour gagner des degrés de liberté.`;

                              return (
                                <div key={ef.term} className="flex items-center gap-2">
                                  <span className={`text-[11px] font-mono w-20 truncate text-right shrink-0 ${
                                    isSignif ? "text-gray-600 dark:text-gray-300" : "text-gray-400 dark:text-gray-500"
                                  }`}>
                                    {ef.label}
                                  </span>
                                  <div className="flex-1 relative h-5 bg-gray-100 dark:bg-gray-800 rounded overflow-visible">
                                    <div
                                      className={`absolute left-0 top-0 h-full rounded transition-all ${
                                        isSignif
                                          ? (ef.coeff >= 0 ? "bg-indigo-500" : "bg-indigo-400")
                                          : "bg-gray-300 dark:bg-gray-600"
                                      }`}
                                      style={{ width: `${barPct}%` }}
                                    />
                                    {thresholdVisible && (
                                      <div
                                        className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-10"
                                        style={{ left: `${thresholdPct}%` }}
                                        title={`Seuil p=0.05 : |b| = ${threshold.toFixed(3)}`}
                                      />
                                    )}
                                  </div>
                                  <span className={`text-[10px] font-mono w-14 text-right shrink-0 ${
                                    isSignif ? "text-gray-500" : "text-gray-300 dark:text-gray-600"
                                  }`}>
                                    {ef.absCoeff.toFixed(3)}
                                  </span>
                                  {ef.p !== null && (
                                    <span className={`text-[10px] font-mono w-12 text-right shrink-0 ${
                                      isSignif ? "text-indigo-600 dark:text-indigo-300 font-semibold" : "text-gray-400"
                                    }`}>
                                      {pFmt}
                                    </span>
                                  )}
                                  {isNS && (
                                    <button
                                      type="button"
                                      title={helpMsg}
                                      className="shrink-0 size-4 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-gray-500 dark:text-gray-400 hover:bg-amber-100 dark:hover:bg-amber-900/40 hover:text-amber-700 dark:hover:text-amber-300 transition-colors"
                                      onClick={() => setNsTermHelp({ term: ef.term, label: ef.label, p: ef.p, coeff: ef.coeff, isInteraction: isInteractionTerm, dfE: fit.dfE, se: fit.seCoeffs?.[m.terms.indexOf(ef.term)+1] })}
                                    >
                                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="size-3">
                                        <path fillRule="evenodd" d="M15 8A7 7 0 1 1 1 8a7 7 0 0 1 14 0ZM9 5a1 1 0 1 1-2 0 1 1 0 0 1 2 0ZM6.75 8a.75.75 0 0 0 0 1.5h.75v1.75a.75.75 0 0 0 1.5 0v-2.5A.75.75 0 0 0 8.25 8h-1.5Z" clipRule="evenodd"/>
                                      </svg>
                                    </button>
                                  )}
                                  {/* Bouton supprimer ce terme du modèle */}
                                  <button
                                    type="button"
                                    title={`Retirer ${ef.label} du modèle`}
                                    className="shrink-0 size-4 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-400 hover:bg-red-100 dark:hover:bg-red-900/30 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                                    onClick={() => {
                                      const terms = m.terms.filter(t => t !== ef.term);
                                      setModels(ms => ms.map(mx => mx.id === m.id ? { ...mx, terms, preset: "custom" } : mx));
                                    }}
                                  >
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="size-3">
                                      <path d="M3.72 3.72a.75.75 0 0 1 1.06 0L8 6.94l3.22-3.22a.75.75 0 1 1 1.06 1.06L9.06 8l3.22 3.22a.75.75 0 1 1-1.06 1.06L8 9.06l-3.22 3.22a.75.75 0 0 1-1.06-1.06L6.94 8 3.72 4.78a.75.75 0 0 1 0-1.06Z"/>
                                    </svg>
                                  </button>
                                </div>
                              );
                            })}

                            {/* Zone d'ajout de termes au modèle */}
                            {(() => {
                              const nRunsLocal = matrix ? matrix.length : 0;
                              const maxTermsLocal = nRunsLocal - 1;
                              // Proposer uniquement les termes pertinents pour un plan factoriel :
                              // effets principaux (ordre 1) + interactions 2 à 2 (ordre 2, sans quadratiques purs)
                              const allPossible = getAllPossibleTerms(factors).filter(t => {
                                if (isQuadPure(t, factors)) return false; // pas de X²
                                const order = factors.filter(f => t.includes(f.id)).length;
                                return order <= 2; // linéaires + interactions 2à2 seulement
                              });
                              const available = allPossible.filter(t => !m.terms.includes(t));
                              const atLimit = m.terms.length >= maxTermsLocal;
                              if (available.length === 0) return null;
                              return (
                                <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800">
                                  <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-2">
                                    Ajouter un terme au modèle
                                    {atLimit && <span className="ml-2 text-amber-500 normal-case font-normal">(limite atteinte : {nRunsLocal} essais → max {maxTermsLocal} termes)</span>}
                                  </p>
                                  <div className="flex flex-wrap gap-1.5">
                                    {available.map(t => {
                                      const tLabel = termLabel(t);
                                      const disabled = atLimit;
                                      return (
                                        <button
                                          key={t}
                                          type="button"
                                          disabled={disabled}
                                          title={disabled ? "Limite atteinte" : `Ajouter ${tLabel} au modèle`}
                                          onClick={() => {
                                            if (disabled) return;
                                            setModels(ms => ms.map(mx => mx.id === m.id ? { ...mx, terms: [...mx.terms, t], preset: "custom" } : mx));
                                          }}
                                          className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-mono transition-colors ${
                                            disabled
                                              ? "border-gray-100 dark:border-gray-800 text-gray-300 dark:text-gray-700 cursor-not-allowed"
                                              : "border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer"
                                          }`}
                                        >
                                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="size-3">
                                            <path d="M8.75 3.75a.75.75 0 0 0-1.5 0v3.5h-3.5a.75.75 0 0 0 0 1.5h3.5v3.5a.75.75 0 0 0 1.5 0v-3.5h3.5a.75.75 0 0 0 0-1.5h-3.5v-3.5Z"/>
                                          </svg>
                                          {tLabel}
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>
                              );
                            })()}

                            {/* Légende */}
                            <div className="mt-3 pt-2 border-t border-gray-100 dark:border-gray-800 space-y-1">
                              {thresholdVisible ? (
                                <p className="text-[10px] text-gray-500 flex items-center gap-1">
                                  <span className="inline-block w-3 border-t-2 border-red-500"/>
                                  Seuil p = 0.05 : |b| = {threshold.toFixed(3)} (t = {tCrit?.toFixed(2)}, dfE = {fit.dfE})
                                </p>
                              ) : threshold ? (
                                <p className="text-[10px] text-amber-600 dark:text-amber-400">
                                  ⚠ Seuil p = 0.05 hors graphe ({threshold.toFixed(3)}) — dfE = {fit.dfE}, modèle sur-paramétré
                                </p>
                              ) : null}
                              <p className="text-[10px] text-gray-400">
                                Barres <span className="text-indigo-500">bleues</span> = significatifs (p &lt; 0.05) ·
                                Barres <span className="text-gray-400">grises</span> = non significatifs · Le bouton ? donne des explications
                              </p>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  );
                })}
              </div>
            )}

            {/* ── TAB : ISORÉPONSES ── */}
            {part4Tab === "isoresponse" && (
              <div className={cardSpace}>
                <div className="flex items-center gap-2 mb-4">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Courbes isoréponses</h3>
                  <HelpButton topic="isoreponse" size="xs" />
                </div>

                {/* ── Tabs par modèle ── */}
                {models.length > 1 && (
                  <div className="flex gap-1 flex-wrap mb-3">
                    {models.map((m, mi) => {
                      const col = modelColors[mi % modelColors.length];
                      return (
                        <button key={m.id} onClick={() => setActiveModelId(m.id)}
                          className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-all ${
                            m.id === activeModelId
                              ? `${col.border} ${col.bg} ${col.text}`
                              : "border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-gray-300"
                          }`}>
                          <span className={`size-2 rounded-full ${col.dot}`} />
                          {m.name}
                        </button>
                      );
                    })}
                  </div>
                )}
                {models.map((m, mi) => {
                  if (m.id !== activeModelId) return null;
                  const fit = fits[mi];
                  const col = modelColors[mi % modelColors.length];
                  if (!fit) return <div key={m.id} className={`bg-white dark:bg-gray-900 ${cardCls} ${col.border}`}><p className="text-sm text-red-500">Calcul impossible.</p></div>;
                  const contFactors = factors.filter(f => f.continuous);
                  if (contFactors.length < 2) return (
                    <div key={m.id} className={`bg-white dark:bg-gray-900 ${cardCls} ${col.border}`}>
                      <p className="text-sm text-gray-500">Les courbes isoréponses nécessitent au moins 2 facteurs continus.</p>
                    </div>
                  );
                  return (
                    <IsoResponsePanel key={m.id} model={m} fit={fit} factors={factors} modelColors={col} allTerms={getAllPossibleTerms(factors)} modelDefault={modelDefault} />
                  );
                })}
              </div>
            )}

            {/* ── TAB : SURFACE 3D ── */}
            {part4Tab === "iso3d" && has3D && (
              <div className={cardSpace}>
                {/* ── Tabs par modèle ── */}
                {models.length > 1 && (
                  <div className="flex gap-1 flex-wrap mb-3">
                    {models.map((m, mi) => {
                      const col = modelColors[mi % modelColors.length];
                      return (
                        <button key={m.id} onClick={() => setActiveModelId(m.id)}
                          className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-all ${
                            m.id === activeModelId
                              ? `${col.border} ${col.bg} ${col.text}`
                              : "border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-gray-300"
                          }`}>
                          <span className={`size-2 rounded-full ${col.dot}`} />
                          {m.name}
                        </button>
                      );
                    })}
                  </div>
                )}
                {models.map((m, mi) => {
                  if (m.id !== activeModelId) return null;
                  const fit = fits[mi];
                  const col = modelColors[mi % modelColors.length];
                  return (
                    <div key={m.id} className={`bg-white dark:bg-gray-900 ${cardCls} ${col.border}`}>
                      <div className="flex items-center gap-2 mb-4">
                        <span className={`size-2.5 rounded-full ${col.dot}`} />
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                          {m.name} — Surface de réponse 3D
                        </h3>
                        <HelpButton topic="isoreponse" size="xs" className="ml-auto" />
                      </div>
                      <Surface3D model={m} fit={fit} factors={factors} col={col} response={activeResp} />
                    </div>
                  );
                })}
              </div>
            )}

            {/* Navigation */}
            <div className="flex items-center justify-between mt-6">
              <button onClick={() => goTo(3)}
                className="rounded-lg border border-gray-200 dark:border-gray-700 px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                ← Retour
              </button>
              <div className="flex items-center gap-3">
                {editMode && (
                  <button onClick={exportJSON}
                    className="flex items-center gap-1.5 rounded-md border border-indigo-300 dark:border-indigo-700 bg-indigo-50 dark:bg-indigo-900/20 px-3 py-1.5 text-xs font-medium text-indigo-600 dark:text-indigo-300 hover:bg-indigo-100 transition-colors">
                    Exporter JSON
                  </button>
                )}
                <button onClick={() => exportPDF({ models, fits, factors, responses, activeResp, allValidRows, activeRows, excludedPoints, validY, modelDefault, matrix })}
                  className="flex items-center gap-2 rounded-lg bg-gray-900 dark:bg-white px-4 py-2 text-sm font-semibold text-white dark:text-gray-900 hover:bg-gray-700 dark:hover:bg-gray-100 transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="size-4">
                    <path fillRule="evenodd" d="M4.5 2A1.5 1.5 0 003 3.5v13A1.5 1.5 0 004.5 18h11a1.5 1.5 0 001.5-1.5V7.621a1.5 1.5 0 00-.44-1.06l-4.12-4.122A1.5 1.5 0 0011.378 2H4.5zm4 9.75a.75.75 0 011.5 0v2.546l.943-1.048a.75.75 0 111.114 1.004l-2.25 2.5a.75.75 0 01-1.114 0l-2.25-2.5a.75.75 0 111.114-1.004l.943 1.048V11.75z" clipRule="evenodd" />
                  </svg>
                  Exporter rapport PDF
                </button>
              </div>
            </div>
          </>
        );
      })()}

      {/* ── Panneau d'aide ANOVA avec valeurs calculées ── */}
      {validationHelpFit && (() => {
        const { fit, modelName } = validationHelpFit;
        const f4 = v => v != null ? (+v).toFixed(4) : "—";
        const f2 = v => v != null ? (+v).toFixed(2) : "—";
        const fp = v => v == null ? "—" : v < 0.001 ? "<0.001" : (+v).toFixed(3);
        return (
          <div className="fixed inset-0 z-50 bg-black/30 dark:bg-black/50 flex items-end sm:items-center justify-center p-4"
               onClick={() => setValidationHelpFit(null)}>
            <div className="bg-white dark:bg-gray-950 rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto"
                 onClick={e => e.stopPropagation()}>
              <div className="sticky top-0 bg-indigo-50 dark:bg-indigo-950/60 border-b border-indigo-100 dark:border-indigo-900 px-5 py-4 flex items-center gap-3">
                <div className="size-9 rounded-lg bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="size-5 text-indigo-600 dark:text-indigo-400">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 15.75V18m-7.5-6.75h.008v.008H8.25v-.008zm0 2.25h.008v.008H8.25V13.5zm0 2.25h.008v.008H8.25v-.008zm0 2.25h.008v.008H8.25V18zm2.498-6.75h.007v.008h-.007v-.008zm0 2.25h.007v.008h-.007V13.5zm0 2.25h.007v.008h-.007v-.008zm0 2.25h.007v.008h-.007V18z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-indigo-400 mb-0.5">Aide pédagogique — {modelName}</p>
                  <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Comment sont calculés ces indicateurs ?</h2>
                </div>
                <button onClick={() => setValidationHelpFit(null)}
                  className="size-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="size-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="px-5 py-4 space-y-4 text-xs">
                <div className="rounded-xl border border-blue-200 dark:border-blue-900 overflow-hidden">
                  <div className="bg-blue-50 dark:bg-blue-900/30 px-4 py-2 font-semibold text-blue-800 dark:text-blue-300 text-sm">
                    R² — Coefficient de détermination
                  </div>
                  <div className="px-4 py-3 space-y-2">
                    <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 font-mono text-indigo-700 dark:text-indigo-300">
                      R² = SC_R / SC_T = {f4(fit.SSR)} / {f4(fit.SST)} = <span className="font-bold">{f4(fit.R2)}</span>
                    </div>
                    <p className="text-gray-500 dark:text-gray-400">
                      Fraction de la variabilité totale expliquée par le modèle.
                      Un R² de {f4(fit.R2)} signifie que le modèle explique {(fit.R2*100).toFixed(1)} % de la variabilité observée.
                    </p>
                  </div>
                </div>

                <div className="rounded-xl border border-blue-200 dark:border-blue-900 overflow-hidden">
                  <div className="bg-blue-50 dark:bg-blue-900/30 px-4 py-2 font-semibold text-blue-800 dark:text-blue-300 text-sm">
                    R² ajusté — Ajustement pénalisé
                  </div>
                  <div className="px-4 py-3 space-y-2">
                    <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 font-mono text-indigo-700 dark:text-indigo-300 text-[11px]">
                      R²_adj = 1 − (SC_E/dl_E) / (SC_T/dl_T)<br/>
                      = 1 − ({f4(fit.SSE)}/{fit.dfE}) / ({f4(fit.SST)}/{fit.n-1})<br/>
                      = 1 − {f4(fit.MSE)} / {f4(fit.SST/(fit.n-1))}<br/>
                      = <span className="font-bold">{f4(fit.R2adj)}</span>
                      {fit.R2adj < 0.8 ? " ← insuffisant (< 0.8)" : " ← bon (≥ 0.8)"}
                    </div>
                    <p className="text-gray-500 dark:text-gray-400">
                      Contrairement à R², il pénalise les termes inutiles. Préférer R² ajusté pour comparer des modèles.
                    </p>
                  </div>
                </div>

                <div className="rounded-xl border border-blue-200 dark:border-blue-900 overflow-hidden">
                  <div className="bg-blue-50 dark:bg-blue-900/30 px-4 py-2 font-semibold text-blue-800 dark:text-blue-300 text-sm">
                    F — Statistique de Fisher
                  </div>
                  <div className="px-4 py-3 space-y-2">
                    <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 font-mono text-indigo-700 dark:text-indigo-300 text-[11px]">
                      CM_R = SC_R / dl_R = {f4(fit.SSR)} / {fit.dfR} = {f4(fit.MSR)}<br/>
                      CM_E = SC_E / dl_E = {f4(fit.SSE)} / {fit.dfE} = {f4(fit.MSE)}<br/>
                      F = CM_R / CM_E = {f4(fit.MSR)} / {f4(fit.MSE)} = <span className="font-bold">{f2(fit.Fstat)}</span>
                      {fit.Fstat < 1 ? " ← résidus > régression !" : fit.Fstat < 4 ? " ← faible" : " ← bon (> 4)"}
                    </div>
                    <p className="text-gray-500 dark:text-gray-400">
                      F compare la variance expliquée et la variance résiduelle.
                      Un F {fit.Fstat >= 4 ? "élevé (" + f2(fit.Fstat) + " > 4) → bon modèle." : "faible (" + f2(fit.Fstat) + " < 4) → le modèle n'explique pas mieux que le hasard."}
                    </p>
                  </div>
                </div>

                <div className="rounded-xl border border-blue-200 dark:border-blue-900 overflow-hidden">
                  <div className="bg-blue-50 dark:bg-blue-900/30 px-4 py-2 font-semibold text-blue-800 dark:text-blue-300 text-sm">
                    Prob &gt; F — p-valeur du modèle
                  </div>
                  <div className="px-4 py-3 space-y-2">
                    <div className={`rounded-lg p-3 font-mono text-[11px] ${
                      fit.pF < 0.05
                        ? "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300"
                        : "bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300"
                    }`}>
                      Prob &gt; F = {fp(fit.pF)}
                      {fit.pF < 0.05
                        ? " ← modèle significatif ✓ (< 0.05)"
                        : " ← modèle non significatif ✗ (≥ 0.05)"}
                    </div>
                    <p className="text-gray-500 dark:text-gray-400">
                      Probabilité d'observer un F aussi grand par hasard si le modèle n'avait aucun effet.
                      {fit.pF < 0.05
                        ? ` Ici ${fp(fit.pF)} < 0.05 → moins de 5 % de chance que ce soit dû au hasard.`
                        : ` Ici ${fp(fit.pF)} ≥ 0.05 → probabilité trop élevée, le modèle n'est pas fiable.`}
                    </p>
                  </div>
                </div>

                {fit.dfE < 3 && (
                  <div className="rounded-xl border border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-900/20 px-4 py-3">
                    <p className="font-semibold text-amber-700 dark:text-amber-300 mb-1">
                      ⚠ Degrés de liberté résidus = {fit.dfE}
                    </p>
                    <p className="text-amber-600 dark:text-amber-400">
                      dl_E = n − p − 1 = {fit.n} − {fit.p-1} − 1 = {fit.dfE}.
                      Avec aussi peu de degrés de liberté, tous les tests statistiques sont peu fiables.
                      Il faut au minimum 3–5 degrés de liberté résiduels.
                    </p>
                  </div>
                )}
              </div>

              <div className="px-5 py-3 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 text-center text-[10px] text-gray-400">
                Basé sur le référentiel BTS Métiers de la Chimie — Plans d'expériences
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── Panneau "Comment améliorer ce modèle ?" ── */}
      {improvementHelpFit && (() => {
        const { fit, modelName, modelTerms } = improvementHelpFit;
        const nsTerms = modelTerms.filter((_, i) => {
          const p = fit.pCoeffs?.[i + 1];
          return p != null && p >= 0.05;
        });
        const dfTooLow   = fit.dfE < 3;
        const probTooHigh = fit.pF == null || fit.pF >= 0.05;
        const r2TooLow   = fit.R2adj < 0.8;
        const fTooLow    = fit.Fstat < 1;
        const fp = v => v == null ? "—" : v < 0.001 ? "<0.001" : (+v).toFixed(3);

        return (
          <div className="fixed inset-0 z-50 bg-black/30 dark:bg-black/50 flex items-end sm:items-center justify-center p-4"
               onClick={() => setImprovementHelpFit(null)}>
            <div className="bg-white dark:bg-gray-950 rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto"
                 onClick={e => e.stopPropagation()}>
              <div className="sticky top-0 bg-red-50 dark:bg-red-950/60 border-b border-red-100 dark:border-red-900 px-5 py-4 flex items-center gap-3">
                <div className="size-9 rounded-lg bg-red-100 dark:bg-red-900/50 flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="size-5 text-red-600 dark:text-red-400">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 004.486-6.336l-3.276 3.277a3.004 3.004 0 01-2.25-2.25l3.276-3.276a4.5 4.5 0 00-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085" />
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-red-400 mb-0.5">Diagnostic — {modelName}</p>
                  <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Comment améliorer ce modèle ?</h2>
                </div>
                <button onClick={() => setImprovementHelpFit(null)}
                  className="size-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="size-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="px-5 py-4 space-y-3 text-xs">
                <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-4 py-3">
                  <p className="font-semibold text-red-700 dark:text-red-300 mb-2">Problèmes détectés :</p>
                  <ul className="space-y-1 text-red-600 dark:text-red-400">
                    {dfTooLow    && <li>✗ dl résidus = {fit.dfE} (trop faible — minimum recommandé : 3)</li>}
                    {probTooHigh && <li>✗ Prob &gt; F = {fp(fit.pF)} (≥ 0.05 → modèle non significatif)</li>}
                    {r2TooLow    && <li>✗ R² ajusté = {(+fit.R2adj).toFixed(3)} (&lt; 0.8 → ajustement insuffisant)</li>}
                    {fTooLow     && <li>✗ F = {(+fit.Fstat).toFixed(2)} (&lt; 1 → résidus &gt; régression)</li>}
                    {nsTerms.length > 0 && <li>△ {nsTerms.length} terme(s) non significatif(s) : {nsTerms.join(", ")}</li>}
                  </ul>
                </div>

                <p className="font-semibold text-gray-700 dark:text-gray-200">Pistes d'amélioration :</p>

                {dfTooLow && (
                  <div className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 px-4 py-3">
                    <p className="font-semibold text-amber-700 dark:text-amber-300 mb-1">1. Réduire le nombre de termes</p>
                    <p className="text-amber-600 dark:text-amber-400 mb-2">
                      Avec {fit.n} essais et {fit.p - 1} termes, dl_E = {fit.dfE} seulement.
                      En retirant {Math.max(0, 3 - fit.dfE)} terme(s), dl_E atteindrait {fit.dfE + Math.max(0, 3 - fit.dfE)} → tests fiables.
                    </p>
                    <p className="text-amber-600 dark:text-amber-400">
                      → Aller dans <strong>Partie 3</strong> → choisir un modèle avec moins de termes
                      (ex: passer de Quadratique à Synergie, ou supprimer les termes les moins significatifs du Pareto).
                    </p>
                  </div>
                )}

                {nsTerms.length > 0 && (
                  <div className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 px-4 py-3">
                    <p className="font-semibold text-amber-700 dark:text-amber-300 mb-1">
                      2. Supprimer les termes non significatifs
                    </p>
                    <p className="text-amber-600 dark:text-amber-400 mb-1">
                      Termes dont Prob &gt; |t| ≥ 0.05 : <span className="font-mono">{nsTerms.join(", ")}</span>
                    </p>
                    <p className="text-amber-600 dark:text-amber-400">
                      → Ces termes n'apportent pas d'information significative. Les retirer libère des dl pour les résidus
                      et améliore F et R² ajusté.
                    </p>
                  </div>
                )}

                {r2TooLow && !dfTooLow && (
                  <div className="rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 px-4 py-3">
                    <p className="font-semibold text-blue-700 dark:text-blue-300 mb-1">3. Ajouter des termes de courbure</p>
                    <p className="text-blue-600 dark:text-blue-400">
                      R² ajusté faible ({(+fit.R2adj).toFixed(3)}) avec des degrés de liberté suffisants suggère que
                      le modèle est trop simple. Essayer un modèle avec des termes quadratiques (X²) si des points
                      centraux sont disponibles.
                    </p>
                  </div>
                )}

                {!dfTooLow && !r2TooLow && probTooHigh && (
                  <div className="rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 px-4 py-3">
                    <p className="font-semibold text-blue-700 dark:text-blue-300 mb-1">3. Vérifier les données</p>
                    <p className="text-blue-600 dark:text-blue-400">
                      Avec R² ajusté = {(+fit.R2adj).toFixed(3)} et Prob &gt; F = {fp(fit.pF)}, la variabilité
                      expérimentale est peut-être trop grande. Vérifier :
                    </p>
                    <ul className="mt-1 space-y-0.5 text-blue-600 dark:text-blue-400 ml-3">
                      <li>• Saisie correcte des valeurs de réponse</li>
                      <li>• Absence de valeurs aberrantes (voir onglet Résidus)</li>
                      <li>• Répétabilité des essais (points centraux)</li>
                    </ul>
                  </div>
                )}

                <div className="rounded-lg border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-900/20 px-4 py-3">
                  <p className="font-semibold text-indigo-700 dark:text-indigo-300 mb-1">Rappel : règle de décision</p>
                  <ul className="space-y-0.5 text-indigo-600 dark:text-indigo-400">
                    <li>✓ Prob &gt; F &lt; 0.05 → modèle significatif</li>
                    <li>✓ R² ajusté ≥ 0.80 → bon ajustement</li>
                    <li>✓ dl résidus ≥ 3 → tests fiables</li>
                    <li>✓ Résidus bien répartis (voir onglet Résidus)</li>
                  </ul>
                </div>
              </div>

              <div className="px-5 py-3 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 text-center text-[10px] text-gray-400">
                Basé sur le référentiel BTS Métiers de la Chimie — Plans d'expériences
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── Aide sur terme non significatif ── */}
      {nsTermHelp && (() => {
        const { label, p, coeff, isInteraction, dfE, se } = nsTermHelp;
        const pFmt = p !== null ? (p < 0.001 ? "<0.001" : p.toFixed(3)) : "—";
        const tStat = se > 0 ? (coeff / se).toFixed(3) : "—";

        return (
          <div className="fixed inset-0 z-50 bg-black/30 dark:bg-black/50 flex items-end sm:items-center justify-center p-4"
               onClick={() => setNsTermHelp(null)}>
            <div className="bg-white dark:bg-gray-950 rounded-2xl shadow-2xl w-full max-w-md max-h-[80vh] overflow-y-auto"
                 onClick={e => e.stopPropagation()}>
              <div className="sticky top-0 bg-gray-50 dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 px-5 py-4 flex items-center gap-3">
                <div className="size-9 rounded-lg bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="size-5 text-gray-500 dark:text-gray-300">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 5.25h.008v.008H12v-.008Z"/>
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-0.5">Terme non significatif</p>
                  <h2 className="text-sm font-semibold text-gray-900 dark:text-white font-mono">{label}</h2>
                </div>
                <button onClick={() => setNsTermHelp(null)}
                  className="size-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="size-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
                  </svg>
                </button>
              </div>

              <div className="px-5 py-4 space-y-3 text-xs">
                <div className="rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-4 py-3">
                  <p className="font-semibold text-gray-700 dark:text-gray-200 mb-2">Résultat du test de Student</p>
                  <div className="space-y-1 font-mono text-gray-600 dark:text-gray-300">
                    <p>b = {coeff.toFixed(4)} · s(b) = {se?.toFixed(4) || "—"}</p>
                    <p>t = b / s(b) = {tStat}</p>
                    <p>Prob &gt; |t| = <span className="text-amber-600 dark:text-amber-400 font-semibold">{pFmt}</span> ≥ 0.05 → <span className="text-gray-500">non significatif</span></p>
                  </div>
                </div>

                <div className="rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 px-4 py-3">
                  <p className="font-semibold text-amber-800 dark:text-amber-300 mb-1">Qu'est-ce que ça signifie ?</p>
                  <p className="text-amber-700 dark:text-amber-400 leading-relaxed">
                    {isInteraction
                      ? `L'interaction ${label} a une probabilité de ${pFmt} d'être due au hasard. On ne peut pas affirmer que l'effet combiné de ces facteurs est réel avec un niveau de confiance de 95 %.`
                      : `${label} a une probabilité de ${pFmt} d'être dû au hasard. On ne peut pas affirmer que ce facteur a un effet réel sur la réponse avec un niveau de confiance de 95 %.`}
                  </p>
                </div>

                {dfE < 3 && (
                  <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 px-4 py-3">
                    <p className="font-semibold text-red-700 dark:text-red-300 mb-1">
                      Cause probable : dfE = {dfE} (trop faible)
                    </p>
                    <p className="text-red-600 dark:text-red-400 leading-relaxed">
                      Avec seulement {dfE} degré(s) de liberté résiduel(s), le test de Student
                      manque de puissance pour détecter des effets significatifs, même réels.
                      Le seuil critique est très élevé (t critique ≈ {dfE === 1 ? "12.71" : dfE === 2 ? "4.30" : "3.18"}).
                    </p>
                  </div>
                )}

                <div className="rounded-lg bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-700 px-4 py-3">
                  <p className="font-semibold text-indigo-700 dark:text-indigo-300 mb-1">Que faire ?</p>
                  <ul className="space-y-1 text-indigo-600 dark:text-indigo-400 leading-relaxed">
                    {dfE < 3 ? (
                      <li>→ Retirer d'autres termes non significatifs du modèle (Partie 3) pour augmenter dfE</li>
                    ) : (
                      <>
                        <li>→ Retirer ce terme du modèle pour simplifier et gagner 1 degré de liberté</li>
                        <li>→ Après retrait, recalculer : les autres termes peuvent devenir plus significatifs</li>
                        {isInteraction && (
                          <li>→ Une interaction non significative peut souvent être ignorée en première approximation</li>
                        )}
                      </>
                    )}
                  </ul>
                </div>
              </div>

              <div className="px-5 py-3 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 text-center text-[10px] text-gray-400">
                Basé sur le référentiel BTS Métiers de la Chimie — Plans d'expériences
              </div>
            </div>
          </div>
        );
      })()}
    </div>
    </HelpProvider>
  );
}
// ── Wrapper qui fournit le contexte compact ──────────────────────────────────
export default function PlanFactoriel() {
  return (
    <CompactProvider>
      <PlanFactorielInner />
    </CompactProvider>
  );
}
