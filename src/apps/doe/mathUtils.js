// ─── Algèbre linéaire ─────────────────────────────────────────────────────────

export function matMul(A, B) {
  const n = A.length, m = B[0].length, k = B.length;
  return Array.from({ length: n }, (_, i) =>
    Array.from({ length: m }, (_, j) =>
      Array.from({ length: k }, (_, l) => A[i][l] * B[l][j]).reduce((a, b) => a + b, 0)
    )
  );
}

export function matT(A) {
  return A[0].map((_, j) => A.map(row => row[j]));
}

export function luSolve(A, b) {
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

export function invertMatrix(A) {
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

// ─── Statistiques ─────────────────────────────────────────────────────────────

export function fPvalue(F, d1, d2) {
  if (!isFinite(F) || F < 0) return 1;
  const x = d2 / (d2 + d1 * F);
  return incompleteBeta(x, d2 / 2, d1 / 2);
}

export function tPvalue(t, df) {
  if (!isFinite(t)) return 1;
  const x = df / (df + t * t);
  return incompleteBeta(x, df / 2, 0.5);
}

export function tCritical(df) {
  const table = {
    1: 12.706, 2: 4.303, 3: 3.182, 4: 2.776, 5: 2.571,
    6: 2.447,  7: 2.365, 8: 2.306, 9: 2.262, 10: 2.228,
    15: 2.131, 20: 2.086, 30: 2.042, 60: 2.000,
  };
  if (table[df]) return table[df];
  if (df > 60)   return 1.96 + 0.5 / Math.sqrt(df);
  const keys = Object.keys(table).map(Number).sort((a, b) => a - b);
  for (let i = 0; i < keys.length - 1; i++) {
    if (df >= keys[i] && df <= keys[i + 1]) {
      const frac = (df - keys[i]) / (keys[i + 1] - keys[i]);
      return table[keys[i]] + frac * (table[keys[i + 1]] - table[keys[i]]);
    }
  }
  return 1.96;
}

export function normalQuantile(p) {
  if (p <= 0) return -4;
  if (p >= 1) return  4;
  if (p === 0.5) return 0;
  const a = [2.515517, 0.802853, 0.010328];
  const b = [1.432788, 0.189269, 0.001308];
  const t = p < 0.5
    ? Math.sqrt(-2 * Math.log(p))
    : Math.sqrt(-2 * Math.log(1 - p));
  const num   = a[0] + a[1] * t + a[2] * t * t;
  const denom = 1 + b[0] * t + b[1] * t * t + b[2] * t * t * t;
  const z = t - num / denom;
  return p < 0.5 ? -z : z;
}

export function incompleteBeta(x, a, b) {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  const lbeta = lgamma(a) + lgamma(b) - lgamma(a + b);
  const front = Math.exp(Math.log(x) * a + Math.log(1 - x) * b - lbeta) / a;
  return front * betaCF(x, a, b);
}

export function lgamma(x) {
  const c = [76.18009172947146, -86.50532032941677, 24.01409824083091, -1.231739572450155, 1.208650973866179e-3, -5.395239384953e-6];
  let y = x, tmp = x + 5.5;
  tmp -= (x + 0.5) * Math.log(tmp);
  let ser = 1.000000000190015;
  for (let j = 0; j < 6; j++) { y++; ser += c[j] / y; }
  return -tmp + Math.log(2.5066282746310005 * ser / x);
}

export function betaCF(x, a, b) {
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
