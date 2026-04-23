// Hansen distance: sqrt(4·ΔD² + ΔP² + ΔH²).
// The factor of 4 on D reflects its empirically larger contribution.

export function hansenDistance(point, center) {
  const dD = point[0] - center[0]
  const dP = point[1] - center[1]
  const dH = point[2] - center[2]
  return Math.sqrt(4 * dD * dD + dP * dP + dH * dH)
}

export function hansenDistances(X, center) {
  const out = new Float64Array(X.length)
  for (let i = 0; i < X.length; i++) out[i] = hansenDistance(X[i], center)
  return out
}

export function hansenCenterDistance(c1, c2) {
  return hansenDistance(c1, c2)
}
