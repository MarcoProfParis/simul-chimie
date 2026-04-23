import { useMemo, useState } from "react"
import { hansenDistance } from "../HSPEstimator.js"

const ACCENT = "#ea580c"

export default function SolventTable({ data, result, insideLimit = 1 }) {
  const [filter, setFilter] = useState("all") // all | misclassified | good | bad

  const rows = useMemo(() => {
    if (!result) return []
    const center = [result.hsp.D, result.hsp.P, result.hsp.H]
    const R = result.hsp.R
    return data.map((r, i) => {
      const dist = hansenDistance([r.D, r.P, r.H], center)
      const red = dist / R
      const predicted = red <= 1 ? "good" : "bad"
      const hasLabel = r.score !== null && !isNaN(r.score)
      const actual = hasLabel ? (r.score > 0 && r.score <= insideLimit ? "good" : "bad") : null
      const misclassified = actual !== null && actual !== predicted
      return { i, ...r, dist, red, predicted, actual, misclassified }
    })
  }, [data, result, insideLimit])

  const filtered = useMemo(() => {
    if (filter === "misclassified") return rows.filter(r => r.misclassified)
    if (filter === "good") return rows.filter(r => r.predicted === "good")
    if (filter === "bad") return rows.filter(r => r.predicted === "bad")
    return rows
  }, [rows, filter])

  return (
    <div style={{
      background: "var(--bg-card)",
      border: "1px solid var(--border)",
      borderRadius: 12,
      overflow: "hidden",
      boxShadow: "var(--shadow)",
    }}>
      <div style={{ padding: "12px 14px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
        <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "var(--text)" }}>
          Solvants ({filtered.length})
        </p>
        <div style={{ display: "flex", gap: 4 }}>
          {[
            { id: "all", label: "Tous" },
            { id: "good", label: "Compatibles" },
            { id: "bad", label: "Incompatibles" },
            { id: "misclassified", label: "Erreurs" },
          ].map(b => (
            <button
              key={b.id}
              onClick={() => setFilter(b.id)}
              style={{
                fontSize: 11, fontWeight: 600, padding: "4px 10px", borderRadius: 6,
                background: filter === b.id ? ACCENT : "transparent",
                color: filter === b.id ? "#fff" : "var(--text-muted)",
                border: filter === b.id ? `1px solid ${ACCENT}` : "1px solid var(--border)",
                cursor: "pointer",
              }}
            >
              {b.label}
            </button>
          ))}
        </div>
      </div>
      <div style={{ overflow: "auto", maxHeight: 360 }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <thead style={{ position: "sticky", top: 0, background: "var(--bg-card)" }}>
            <tr style={{ borderBottom: "1px solid var(--border)" }}>
              {["Solvant", "δD", "δP", "δH", "Score", "Distance", "RED", "Prédit"].map(h => (
                <th key={h} style={{ padding: "8px 10px", textAlign: h === "Solvant" ? "left" : "right", fontSize: 10, fontWeight: 700, color: "var(--text-muted)", letterSpacing: ".05em" }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(r => {
              const bg = r.misclassified ? "rgba(220,38,38,0.08)" : "transparent"
              const pillColor = r.predicted === "good" ? "#16a34a" : "#64748b"
              const pillBg = r.predicted === "good" ? "#dcfce7" : "#f1f5f9"
              return (
                <tr key={r.i} style={{ background: bg, borderBottom: "1px solid var(--border)" }}>
                  <td style={{ padding: "7px 10px", color: "var(--text)", fontWeight: 500 }}>{r.solvent}</td>
                  <td style={{ padding: "7px 10px", textAlign: "right", fontFamily: "monospace", color: "var(--text)" }}>{r.D.toFixed(2)}</td>
                  <td style={{ padding: "7px 10px", textAlign: "right", fontFamily: "monospace", color: "var(--text)" }}>{r.P.toFixed(2)}</td>
                  <td style={{ padding: "7px 10px", textAlign: "right", fontFamily: "monospace", color: "var(--text)" }}>{r.H.toFixed(2)}</td>
                  <td style={{ padding: "7px 10px", textAlign: "right", fontFamily: "monospace", color: r.actual === "good" ? "#16a34a" : r.actual === "bad" ? "#64748b" : "var(--text-muted)" }}>
                    {r.score ?? "—"}
                  </td>
                  <td style={{ padding: "7px 10px", textAlign: "right", fontFamily: "monospace", color: "var(--text)" }}>{r.dist.toFixed(2)}</td>
                  <td style={{ padding: "7px 10px", textAlign: "right", fontFamily: "monospace", color: r.red <= 1 ? "#16a34a" : "#dc2626" }}>{r.red.toFixed(2)}</td>
                  <td style={{ padding: "7px 10px", textAlign: "right" }}>
                    <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 4, background: pillBg, color: pillColor }}>
                      {r.predicted === "good" ? "COMPATIBLE" : "—"}
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
