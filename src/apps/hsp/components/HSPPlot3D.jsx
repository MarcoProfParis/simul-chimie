import { useEffect, useMemo, useState } from "react"

const ACCENT = "#ea580c"

// Hansen convention: plot 2·δD (not δD) so the ellipsoid becomes a true sphere
// of radius R. Solvent points are plotted at (2·D, P, H) too.
function sphereSurface(cx, cy, cz, R, nU = 40, nV = 20) {
  const x = [], y = [], z = []
  for (let i = 0; i <= nV; i++) {
    const v = (i / nV) * Math.PI
    const rowX = [], rowY = [], rowZ = []
    for (let j = 0; j <= nU; j++) {
      const u = (j / nU) * 2 * Math.PI
      rowX.push(cx + R * Math.sin(v) * Math.cos(u))
      rowY.push(cy + R * Math.sin(v) * Math.sin(u))
      rowZ.push(cz + R * Math.cos(v))
    }
    x.push(rowX); y.push(rowY); z.push(rowZ)
  }
  return { x, y, z }
}

// Build the Plot component via the factory so we force the "-dist-min" bundle
// and avoid react-plotly.js's default full-plotly import.
// Vite's CJS interop wraps react-plotly.js/factory an extra layer — the real
// factory fn lives at either .default or .default.default depending on version.
async function loadPlot() {
  const [plotlyMod, factoryMod] = await Promise.all([
    import("plotly.js-dist-min"),
    import("react-plotly.js/factory"),
  ])
  const Plotly = plotlyMod.default ?? plotlyMod
  const createPlotlyComponent =
    (typeof factoryMod.default === "function" && factoryMod.default) ||
    (typeof factoryMod.default?.default === "function" && factoryMod.default.default) ||
    (typeof factoryMod === "function" && factoryMod) ||
    null
  if (!createPlotlyComponent) throw new Error("react-plotly.js factory export introuvable")
  return createPlotlyComponent(Plotly)
}

export default function HSPPlot3D({ data, result, insideLimit = 1 }) {
  const [Plot, setPlot] = useState(null)
  const [err, setErr] = useState("")

  useEffect(() => {
    let cancelled = false
    loadPlot().then(p => { if (!cancelled) setPlot(() => p) }).catch(e => { if (!cancelled) setErr(e.message) })
    return () => { cancelled = true }
  }, [])

  const { traces, layout } = useMemo(() => {
    const { D, P, H, R } = result.hsp
    const cx = 2 * D, cy = P, cz = H  // Hansen display convention: x-axis = 2·δD
    const good = { x: [], y: [], z: [], text: [] }
    const bad = { x: [], y: [], z: [], text: [] }
    for (const r of data) {
      const isGood = r.score !== null && !isNaN(r.score) && r.score > 0 && r.score <= insideLimit
      const b = isGood ? good : bad
      b.x.push(2 * r.D); b.y.push(r.P); b.z.push(r.H)
      b.text.push(`${r.solvent}<br>δD=${r.D.toFixed(2)} δP=${r.P.toFixed(2)} δH=${r.H.toFixed(2)}${r.score !== null ? `<br>score=${r.score}` : ""}`)
    }
    const surf = sphereSurface(cx, cy, cz, R)
    const traces = [
      {
        type: "surface", ...surf,
        showscale: false, opacity: 0.25,
        colorscale: [[0, ACCENT], [1, ACCENT]],
        hoverinfo: "skip", name: "Sphère HSP",
        contours: { x: { show: false }, y: { show: false }, z: { show: false } },
      },
      {
        type: "scatter3d", mode: "markers", name: "Compatibles",
        x: good.x, y: good.y, z: good.z, text: good.text, hoverinfo: "text",
        marker: { size: 5, color: "#16a34a", line: { color: "#fff", width: 0.5 } },
      },
      {
        type: "scatter3d", mode: "markers", name: "Incompatibles",
        x: bad.x, y: bad.y, z: bad.z, text: bad.text, hoverinfo: "text",
        marker: { size: 4, color: "#94a3b8", line: { color: "#fff", width: 0.5 } },
      },
      {
        type: "scatter3d", mode: "markers", name: "Centre",
        x: [cx], y: [cy], z: [cz], hoverinfo: "text",
        text: [`Centre<br>δD=${D.toFixed(2)} δP=${P.toFixed(2)} δH=${H.toFixed(2)}<br>R₀=${R.toFixed(2)}`],
        marker: { size: 8, color: ACCENT, symbol: "diamond", line: { color: "#fff", width: 1 } },
      },
    ]
    const layout = {
      autosize: true, margin: { l: 0, r: 0, t: 0, b: 0 },
      scene: {
        xaxis: { title: "2·δD", gridcolor: "#cbd5e1", color: "#64748b" },
        yaxis: { title: "δP", gridcolor: "#cbd5e1", color: "#64748b" },
        zaxis: { title: "δH", gridcolor: "#cbd5e1", color: "#64748b" },
        aspectmode: "data",
      },
      legend: { font: { size: 11 }, x: 0, y: 1 },
      paper_bgcolor: "transparent",
    }
    return { traces, layout }
  }, [data, result, insideLimit])

  return (
    <div style={{
      background: "var(--bg-card)",
      border: "1px solid var(--border)",
      borderRadius: 12,
      padding: "clamp(12px, 3vw, 18px)",
      boxShadow: "var(--shadow)",
    }}>
      <p style={{ margin: "0 0 10px", fontSize: 13, fontWeight: 700, color: "var(--text)" }}>
        Ellipsoïde HSP 3D
      </p>
      <div style={{ width: "100%", height: 460 }}>
        {err && <p style={{ fontSize: 12, color: "#dc2626" }}>Erreur de chargement Plotly : {err}</p>}
        {!err && !Plot && <p style={{ fontSize: 12, color: "var(--text-muted)" }}>Chargement du graphe 3D…</p>}
        {!err && Plot && (
          <Plot
            data={traces}
            layout={layout}
            useResizeHandler
            style={{ width: "100%", height: "100%" }}
            config={{ displaylogo: false, responsive: true, modeBarButtonsToRemove: ["sendDataToCloud"] }}
          />
        )}
      </div>
      <p style={{ margin: "8px 0 0", fontSize: 11, color: "var(--text-muted)" }}>
        Axe δD multiplié par 2 (convention Hansen) → la sphère de rayon R₀ apparaît circulaire.
      </p>
    </div>
  )
}
