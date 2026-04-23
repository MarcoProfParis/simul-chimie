import { classicFitSingleSphere } from "./math/classicFit.js"
import { hansenDistance, hansenDistances } from "./math/distance.js"

// JS port of hspipy.HSPEstimator (v1: single sphere, classic method).

export class HSPEstimator {
  constructor({ insideLimit = 1 } = {}) {
    this.insideLimit = insideLimit
  }

  binarize(scores) {
    return scores.map(s => (s !== null && s !== undefined && !isNaN(s) && s > 0 && s <= this.insideLimit ? 1 : 0))
  }

  fit(X, scores) {
    const valid = []
    const yBin = []
    for (let i = 0; i < X.length; i++) {
      const s = scores[i]
      if (s === null || s === undefined || isNaN(s)) continue
      valid.push(X[i])
      yBin.push(s > 0 && s <= this.insideLimit ? 1 : 0)
    }
    if (!yBin.some(v => v === 1)) throw new Error("No good solvents (score in (0, insideLimit]) in the dataset.")

    const fit = classicFitSingleSphere(valid, yBin)
    this.hsp_ = { D: fit.center[0], P: fit.center[1], H: fit.center[2], R: fit.radius }
    this.datafit_ = fit.datafit
    this.error_ = fit.error
    this.nit_ = fit.nit
    this.nfev_ = fit.nfev
    this.X_ = valid
    this.yBin_ = yBin

    this._computeStats()
    return this
  }

  predict(X) {
    const { D, P, H, R } = this.hsp_
    const dists = hansenDistances(X, [D, P, H])
    return Array.from(dists, d => (d <= R ? 1 : 0))
  }

  distancesFromCenter(X) {
    const { D, P, H } = this.hsp_
    return hansenDistances(X, [D, P, H])
  }

  _computeStats() {
    const yPred = this.predict(this.X_)
    let correct = 0, nIn = 0, nOut = 0, wrongIn = 0, wrongOut = 0
    for (let i = 0; i < this.yBin_.length; i++) {
      const y = this.yBin_[i], p = yPred[i]
      if (y === p) correct++
      if (y === 1) nIn++; else nOut++
      if (y === 0 && p === 1) wrongIn++      // bad solvent predicted inside
      if (y === 1 && p === 0) wrongOut++     // good solvent predicted outside
    }
    this.accuracy_ = correct / this.yBin_.length
    this.nSolventsIn_ = nIn
    this.nSolventsOut_ = nOut
    this.nWrongIn_ = wrongIn
    this.nWrongOut_ = wrongOut
  }

  result() {
    return {
      hsp: this.hsp_,
      datafit: this.datafit_,
      error: this.error_,
      accuracy: this.accuracy_,
      nSolventsIn: this.nSolventsIn_,
      nSolventsOut: this.nSolventsOut_,
      nWrongIn: this.nWrongIn_,
      nWrongOut: this.nWrongOut_,
      nit: this.nit_,
      nfev: this.nfev_,
    }
  }
}

export { hansenDistance, hansenDistances }
