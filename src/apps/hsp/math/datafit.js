// DATAFIT: geometric mean of per-sample fitness (0, 1].
// - Correctly classified: fitness = 1
// - Good solvent outside: exp(R - dist) < 1
// - Bad solvent inside:   exp(dist - R) < 1

const EPS = 1e-12

export function computeDatafit(distances, R, yBin) {
  const n = distances.length
  let logSum = 0
  for (let i = 0; i < n; i++) {
    const d = distances[i]
    const good = yBin[i] === 1
    let f = 1
    if (good && d > R) f = Math.exp(R - d)
    else if (!good && d < R) f = Math.exp(d - R)
    if (f < EPS) f = EPS
    logSum += Math.log(f)
  }
  return Math.exp(logSum / n)
}
