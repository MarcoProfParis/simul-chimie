const ACCENT = "#ea580c"

function Stat({ label, value, color = "var(--text)" }) {
  return (
    <div style={{ flex: "1 1 120px", minWidth: 110 }}>
      <p style={{ margin: 0, fontSize: 10, fontWeight: 600, letterSpacing: ".06em", color: "var(--text-muted)" }}>
        {label}
      </p>
      <p style={{ margin: "4px 0 0", fontSize: 20, fontWeight: 700, color, fontFamily: "'JetBrains Mono','Fira Code',monospace" }}>
        {value}
      </p>
    </div>
  )
}

export default function ResultsCard({ result }) {
  if (!result) return null
  const { hsp, datafit, accuracy, nSolventsIn, nSolventsOut, nWrongIn, nWrongOut } = result
  const datafitColor = datafit > 0.95 ? "#16a34a" : datafit > 0.85 ? "#ea580c" : "#dc2626"
  return (
    <div style={{
      background: "var(--bg-card)",
      border: "1px solid var(--border)",
      borderRadius: 12,
      padding: "clamp(14px, 3vw, 20px)",
      boxShadow: "var(--shadow)",
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "var(--text)" }}>
          Paramètres de Hansen ajustés
        </p>
        <span style={{ fontSize: 10, fontWeight: 600, color: ACCENT, background: `${ACCENT}15`, padding: "3px 8px", borderRadius: 6 }}>
          Méthode classique
        </span>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 16 }}>
        <Stat label="δD" value={hsp.D.toFixed(2)} color={ACCENT} />
        <Stat label="δP" value={hsp.P.toFixed(2)} color={ACCENT} />
        <Stat label="δH" value={hsp.H.toFixed(2)} color={ACCENT} />
        <Stat label="RAYON R₀" value={hsp.R.toFixed(2)} color={ACCENT} />
        <Stat label="DATAFIT" value={datafit.toFixed(4)} color={datafitColor} />
        <Stat label="PRÉCISION" value={`${(accuracy * 100).toFixed(1)} %`} color={datafitColor} />
      </div>
      <div style={{
        marginTop: 14, paddingTop: 12,
        borderTop: "1px solid var(--border)",
        display: "flex", gap: 16, flexWrap: "wrap", fontSize: 12, color: "var(--text-muted)",
      }}>
        <span><b style={{ color: "#16a34a" }}>{nSolventsIn}</b> bons solvants</span>
        <span><b style={{ color: "#64748b" }}>{nSolventsOut}</b> mauvais solvants</span>
        {nWrongIn > 0 && <span><b style={{ color: "#dc2626" }}>{nWrongIn}</b> faux positifs</span>}
        {nWrongOut > 0 && <span><b style={{ color: "#dc2626" }}>{nWrongOut}</b> faux négatifs</span>}
      </div>
      <p style={{ margin: "12px 0 0", fontSize: 11, color: "var(--text-muted)", lineHeight: 1.5 }}>
        Unités : MPa<sup>½</sup>. Un solvant est compatible si RED = dist / R₀ ≤ 1.
      </p>
    </div>
  )
}
