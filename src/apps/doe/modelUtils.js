import { matMul, matT, luSolve, invertMatrix, fPvalue, tPvalue } from "./mathUtils.js";

// ─── Constantes ───────────────────────────────────────────────────────────────

export const DEFAULT_FACTORS = [
  { id: "X1", name: "Facteur 1", unit: "", continuous: true, low: { real: 0, coded: -1 }, high: { real: 1, coded: 1 } },
  { id: "X2", name: "Facteur 2", unit: "", continuous: true, low: { real: 0, coded: -1 }, high: { real: 1, coded: 1 } },
];
export const DEFAULT_CENTER = { present: false, replicates: 1 };

// ─── Génération de matrice ────────────────────────────────────────────────────

export function genMatrix(factors, responses, centerPoint) {
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

export function computeDefaultModel(factors) {
  const n = factors.length;
  const ids = factors.map(f => f.id);
  const terms = [...ids];
  for (let i = 0; i < n; i++)
    for (let j = i + 1; j < n; j++)
      terms.push(ids[i] + ids[j]);
  if (n > 2) terms.pop();
  return terms;
}

export function quadPureTerm(id) { return id + "2"; }
export function isQuadPure(t, factors) { return factors.some(f => t === quadPureTerm(f.id)); }
export function isInteraction(t, factors) {
  return factors.filter(f => t.includes(f.id)).length >= 2 && !isQuadPure(t, factors);
}

export function getAllPossibleTerms(factors) {
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

export function computePresetModel(preset, factors, modelDefault) {
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

// ─── Formatage des termes ─────────────────────────────────────────────────────

export function termOrder(t, factors) {
  if (isQuadPure(t, factors)) return 2;
  return factors.filter(f => t.includes(f.id)).length;
}

export function formatTermDisplay(t, factors) {
  for (let i = 0; i < factors.length; i++)
    if (t === quadPureTerm(factors[i].id)) return "X" + (i + 1) + "²";
  let s = t;
  factors.forEach((f, i) => { s = s.split(f.id).join("X" + (i + 1)); });
  return s;
}

export function termSubScript(t, factors) {
  for (let i = 0; i < factors.length; i++)
    if (t === quadPureTerm(factors[i].id)) return (i + 1) + "" + (i + 1);
  let s = t;
  factors.forEach((f, i) => { s = s.replaceAll(f.id, (i + 1).toString()); });
  return s;
}

export function formatTermHTML(t, factors) {
  for (let i = 0; i < factors.length; i++)
    if (t === quadPureTerm(factors[i].id))
      return "X<sub>" + (i + 1) + "</sub><sup>2</sup>";
  let s = t;
  factors.forEach((f, i) => { s = s.split(f.id).join("X<sub>" + (i + 1) + "</sub>"); });
  return s;
}

// ─── Formatage avec noms de facteurs ─────────────────────────────────────────
// Variantes qui ajoutent "(Nom du facteur)" après la notation Xi

export function formatTermDisplayNamed(t, factors) {
  for (let i = 0; i < factors.length; i++) {
    if (t === quadPureTerm(factors[i].id)) {
      const name = factors[i].name || factors[i].id;
      return `X${i + 1}² (${name})`;
    }
  }
  const xi = formatTermDisplay(t, factors);
  const involved = factors.filter(f => t.includes(f.id));
  if (involved.length === 0) return xi;
  if (involved.length === 1) return `${xi} (${involved[0].name || involved[0].id})`;
  const names = involved.map(f => f.name || f.id).join(" × ");
  return `${xi} (${names})`;
}

export function formatTermHTMLNamed(t, factors) {
  for (let i = 0; i < factors.length; i++) {
    if (t === quadPureTerm(factors[i].id)) {
      const name = factors[i].name || factors[i].id;
      return `X<sub>${i + 1}</sub><sup>2</sup> (${name})`;
    }
  }
  const html = formatTermHTML(t, factors);
  const involved = factors.filter(f => t.includes(f.id));
  if (involved.length === 0) return html;
  if (involved.length === 1) return `${html} (${involved[0].name || involved[0].id})`;
  const names = involved.map(f => f.name || f.id).join(" × ");
  return `${html} (${names})`;
}

// ─── Données manquantes et exemples ──────────────────────────────────────────

export function getMissingRows(matrix, responses) {
  const missing = [];
  matrix.forEach((row, ri) => {
    responses.forEach(resp => {
      const v = row.responses[resp.id];
      if (v === "" || v === null || v === undefined) missing.push(ri);
    });
  });
  return [...new Set(missing)];
}

export function loadExampleData(exFile) {
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

// ─── Calculs statistiques ─────────────────────────────────────────────────────

export function buildDesignMatrix(terms, matrixRows, factors) {
  return matrixRows.map(row => {
    const x = [1];
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

export function fitOLS(terms, matrixRows, yValues, factors) {
  const X = buildDesignMatrix(terms, matrixRows, factors);
  const Xt = matT(X);
  const XtX = matMul(Xt, X);
  const Xty = matMul(Xt, yValues.map(y => [y])).map(r => r[0]);

  let coeffs;
  try { coeffs = luSolve(XtX, Xty); }
  catch (e) { return null; }

  const n = matrixRows.length;
  const p = terms.length + 1;
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

  const pF = dfE > 0 ? fPvalue(Fstat, dfR, dfE) : null;

  const seCoeffs = [];
  try {
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

// ─── Formatage des valeurs ────────────────────────────────────────────────────

export function sigStars(p) {
  if (p === null || p === undefined) return "";
  if (p < 0.001) return "***";
  if (p < 0.01) return "**";
  if (p < 0.05) return "*";
  if (p < 0.1) return "·";
  return "";
}

export function fmt(v, d = 4) {
  if (v === null || v === undefined || !isFinite(v)) return "—";
  return v.toFixed(d);
}

export function fmtP(p) {
  if (p === null || p === undefined) return "—";
  if (p < 0.001) return "< 0.001";
  return p.toFixed(3);
}
