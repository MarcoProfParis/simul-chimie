// Parity test vs Python.
// Run: node src/apps/hsp/math/__test__.mjs

import { readFileSync } from "node:fs"
import Papa from "papaparse"
import { HSPEstimator } from "../HSPEstimator.js"

const csvPath = process.argv[2] || "/Users/macbookair2025marco/Github/hspipy/examples/hsp_example.csv"
const text = readFileSync(csvPath, "utf8")
const { data } = Papa.parse(text, { header: true, dynamicTyping: true, skipEmptyLines: true })

const X = data.map(r => [r.D, r.P, r.H])
const scores = data.map(r => r.Score)

const est = new HSPEstimator({ insideLimit: 1 }).fit(X, scores)
const r = est.result()
console.log("JS      :", { D: r.hsp.D.toFixed(6), P: r.hsp.P.toFixed(6), H: r.hsp.H.toFixed(6), R: r.hsp.R.toFixed(6) })
console.log("datafit :", r.datafit.toFixed(10))
console.log("acc     :", r.accuracy.toFixed(10))
console.log("n_in    :", r.nSolventsIn, "n_out", r.nSolventsOut, "wrong_in", r.nWrongIn, "wrong_out", r.nWrongOut)
console.log("nfev    :", r.nfev, "nit", r.nit)

// Python ref: D=16.578077  P=13.951154  H=11.466538  R=11.584424  datafit=0.9736  acc=0.9459  in=26 out=11 wrong_in=1 wrong_out=1
