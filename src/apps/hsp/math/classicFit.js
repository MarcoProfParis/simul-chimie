import { hansenDistances } from "./distance.js"
import { computeDatafit } from "./datafit.js"

// Port of hspipy's _classic_fit: cube coordinate descent on the center with
// a radius search inside each step. Edge schedule 1.0 → 0.3 → 0.1.

const SIGNS = []
for (const sx of [-1, 1]) for (const sy of [-1, 1]) for (const sz of [-1, 1]) SIGNS.push([sx, sy, sz])

function bestRadius(distances, yBin) {
  const sorted = [...new Set(distances)].sort((a, b) => a - b)
  const candidates = [Math.max(sorted[0] - 1e-6, 0)]
  for (const d of sorted) candidates.push(d)
  for (const d of sorted) candidates.push(d + 1e-6)
  candidates.push(sorted[sorted.length - 1] + 1)

  let bestDf = -Infinity
  let bestR = null
  for (const R of candidates) {
    const df = computeDatafit(distances, R, yBin)
    if (df > bestDf || (almostEqual(df, bestDf) && (bestR === null || R < bestR))) {
      bestDf = df
      bestR = R
    }
  }
  return { R: bestR, df: bestDf }
}

// Matches numpy.isclose defaults: atol=1e-8, rtol=1e-5
function almostEqual(a, b) {
  return Math.abs(a - b) <= 1e-8 + 1e-5 * Math.abs(b)
}

function mean3(points) {
  let sD = 0, sP = 0, sH = 0
  for (const p of points) { sD += p[0]; sP += p[1]; sH += p[2] }
  const n = points.length
  return [sD / n, sP / n, sH / n]
}

export function classicFitSingleSphere(X, yBin) {
  const goodPoints = X.filter((_, i) => yBin[i] === 1)
  if (goodPoints.length === 0) throw new Error("No good solvents found for classic fit.")

  let center = mean3(goodPoints)
  let distances = hansenDistances(X, center)
  let { R: bestR, df: bestDf } = bestRadius(distances, yBin)
  let nfev = 1
  let nit = 0

  for (const edge of [1.0, 0.3, 0.1]) {
    const h = 0.5 * edge
    let improved = true
    while (improved) {
      improved = false
      nit++
      for (const s of SIGNS) {
        const cand = [center[0] + h * s[0], center[1] + h * s[1], center[2] + h * s[2]]
        const dc = hansenDistances(X, cand)
        const { R: Rc, df: dfc } = bestRadius(dc, yBin)
        nfev++
        if (dfc > bestDf || (almostEqual(dfc, bestDf) && Rc < bestR)) {
          bestDf = dfc
          bestR = Rc
          center = cand
          distances = dc
          improved = true
        }
      }
    }
  }

  return {
    center,
    radius: bestR,
    datafit: bestDf,
    error: 1 - bestDf,
    nit,
    nfev,
  }
}
