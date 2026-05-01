// ─── mixture.js ─────────────────────────────────────────────────────────────
// Recherche de mélanges binaires de solvants approchant un point Hansen cible.
// Distance Hansen : d² = 4·(ΔD)² + (ΔP)² + (ΔH)²
//
// Pour deux solvants A et B, le mélange à fraction volumique t de B s'écrit
//     M(t) = (1−t)·A + t·B,  t ∈ [0,1]
// La distance d(M(t), T)² est quadratique en t, on a un minimum analytique :
//     t* = −(w·m) / |m|²    avec w = (2vD, vP, vH), m = (2uD, uP, uH),
//                           u = B−A, v = A−T.
// On clampe t ∈ [0,1] (le segment, pas la droite infinie).

export function bestMixOnSegment(A, B, T) {
  const uD = B[0] - A[0], uP = B[1] - A[1], uH = B[2] - A[2];
  const vD = A[0] - T[0], vP = A[1] - T[1], vH = A[2] - T[2];
  const wm = 4 * vD * uD + vP * uP + vH * uH;
  const mm = 4 * uD * uD + uP * uP + uH * uH;
  let t;
  if (mm === 0) {
    t = 0;
  } else {
    t = Math.max(0, Math.min(1, -wm / mm));
  }
  const point = [A[0] + t * uD, A[1] + t * uP, A[2] + t * uH];
  const dx = point[0] - T[0], dy = point[1] - T[1], dz = point[2] - T[2];
  const distance = Math.sqrt(4 * dx * dx + dy * dy + dz * dz);
  // Indique si l'optimum est strictement à l'intérieur (la droite croise la sphère)
  // ou si le segment touche la sphère par un de ses bouts.
  const tUnclamped = mm === 0 ? 0 : -wm / mm;
  const interior = tUnclamped > 0 && tUnclamped < 1;
  return { t, point, distance, interior };
}

// Mélange ternaire : trouve les fractions barycentriques (α, β, γ) avec
// α+β+γ=1, α,β,γ ∈ [0,1], qui minimisent la distance Hansen entre
// M = α·A + β·B + γ·C et T.
// Approche : minimisation 2D non contrainte, puis projection sur le triangle
// si la solution sort du domaine (en testant les 3 arêtes).
export function bestMixOnTriangle(A, B, C, T) {
  // Paramétrisation : M = C + α·(A−C) + β·(B−C), avec α=fracA, β=fracB, γ=1−α−β.
  const uD = A[0] - C[0], uP = A[1] - C[1], uH = A[2] - C[2];
  const wD = B[0] - C[0], wP = B[1] - C[1], wH = B[2] - C[2];
  const vD = T[0] - C[0], vP = T[1] - C[1], vH = T[2] - C[2];
  const dot = (a, b) => 4 * a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const u = [uD, uP, uH], w = [wD, wP, wH], v = [vD, vP, vH];
  const Quu = dot(u, u), Qww = dot(w, w), Quw = dot(u, w);
  const bu = dot(v, u), bw = dot(v, w);
  const det = Quu * Qww - Quw * Quw;
  let alpha = 0, beta = 0;
  if (Math.abs(det) > 1e-12) {
    alpha = (Qww * bu - Quw * bw) / det;
    beta  = (Quu * bw - Quw * bu) / det;
  }
  let interior = alpha >= 0 && beta >= 0 && alpha + beta <= 1;
  if (interior) {
    const point = [C[0] + alpha * uD + beta * wD,
                   C[1] + alpha * uP + beta * wP,
                   C[2] + alpha * uH + beta * wH];
    const dx = point[0] - T[0], dy = point[1] - T[1], dz = point[2] - T[2];
    return {
      fractionA: alpha, fractionB: beta, fractionC: 1 - alpha - beta,
      point,
      distance: Math.sqrt(4 * dx * dx + dy * dy + dz * dz),
      interior: true,
    };
  }
  // Projection sur le triangle : tester les 3 arêtes.
  const edges = [
    { a: A, b: B, mapAlphaBeta: (t) => ({ A: 1 - t, B: t, C: 0 }) }, // arête AB (γ=0)
    { a: A, b: C, mapAlphaBeta: (t) => ({ A: 1 - t, B: 0, C: t }) }, // arête AC (β=0)
    { a: B, b: C, mapAlphaBeta: (t) => ({ A: 0, B: 1 - t, C: t }) }, // arête BC (α=0)
  ];
  let best = null;
  for (const e of edges) {
    const r = bestMixOnSegment(e.a, e.b, T);
    if (!best || r.distance < best.distance) {
      const f = e.mapAlphaBeta(r.t);
      best = { ...r, fractionA: f.A, fractionB: f.B, fractionC: f.C };
    }
  }
  return { ...best, interior: false };
}

// Pour toutes les paires (i<j) de solvants, calcule le meilleur mélange et filtre
// celles dont la distance optimale est ≤ R0 (la droite traverse la sphère).
export function findBestMixtures(target, R0, solvents, options = {}) {
  const { maxResults = 100, requireInterior = true, minSeparation = 1.0 } = options;
  const T = [target.D, target.P, target.H];
  const results = [];
  for (let i = 0; i < solvents.length; i++) {
    const A = [solvents[i].D, solvents[i].P, solvents[i].H];
    for (let j = i + 1; j < solvents.length; j++) {
      const B = [solvents[j].D, solvents[j].P, solvents[j].H];
      // Distance Hansen entre A et B
      const dAB = Math.sqrt(
        4 * (B[0] - A[0]) ** 2 + (B[1] - A[1]) ** 2 + (B[2] - A[2]) ** 2
      );
      if (dAB < minSeparation) continue; // ignore solvants quasi-identiques
      const r = bestMixOnSegment(A, B, T);
      if (r.distance > R0) continue;
      if (requireInterior && !r.interior) continue;
      results.push({
        a: solvents[i],
        b: solvents[j],
        t: r.t,
        fractionA: 1 - r.t,
        fractionB: r.t,
        point: r.point,
        distance: r.distance,
        interior: r.interior,
      });
    }
  }
  results.sort((x, y) => x.distance - y.distance);
  return results.slice(0, maxResults);
}
