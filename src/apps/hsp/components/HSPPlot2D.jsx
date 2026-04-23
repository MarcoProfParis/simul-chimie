import { useCallback, useMemo, useState } from "react"
import { MagnifyingGlassPlusIcon, MagnifyingGlassMinusIcon, ArrowPathIcon } from "@heroicons/react/24/outline"
import {
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ZAxis, Legend, ReferenceDot,
} from "recharts"

const ACCENT = "#ea580c"

// Hansen convention: plot 2·δD (not δD) so the "sphere" is a true circle of
// radius R. The P-H plane is naturally a circle (no weighting on either axis).
function circlePoints(cx, cy, r, n = 96) {
  const pts = []
  for (let i = 0; i <= n; i++) {
    const t = (i / n) * 2 * Math.PI
    pts.push({ x: cx + r * Math.cos(t), y: cy + r * Math.sin(t) })
  }
  return pts
}

const PROJECTIONS = {
  "2δD-δP": { xKey: "D",  yKey: "P", xScale: 2, xLabel: "2·δD (MPa^½)", yLabel: "δP (MPa^½)" },
  "2δD-δH": { xKey: "D",  yKey: "H", xScale: 2, xLabel: "2·δD (MPa^½)", yLabel: "δH (MPa^½)" },
  "δP-δH":  { xKey: "P",  yKey: "H", xScale: 1, xLabel: "δP (MPa^½)",   yLabel: "δH (MPa^½)"  },
}

function Tab({ active, children, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        fontSize: 11, fontWeight: 700, padding: "5px 14px", borderRadius: 6,
        background: active ? "#fff" : "transparent",
        color: active ? "#18181b" : "#737373",
        border: "none", cursor: "pointer",
        boxShadow: active ? "0 1px 3px rgba(0,0,0,0.10)" : "none",
      }}
    >{children}</button>
  )
}

const MIN_ZOOM = 0.25
const MAX_ZOOM = 8

export default function HSPPlot2D({ data, result, insideLimit = 1 }) {
  const [proj, setProj] = useState("2δD-δP")
  const [zoom, setZoom] = useState(1)
  const P = PROJECTIONS[proj]

  const setZoomClamped = useCallback(z => setZoom(Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z))), [])
  const onWheel = useCallback(e => {
    e.preventDefault()
    setZoomClamped(zoom * (e.deltaY < 0 ? 1.15 : 1 / 1.15))
  }, [zoom, setZoomClamped])

  const { good, bad, circle, center, domain } = useMemo(() => {
    const cx = result.hsp[P.xKey] * P.xScale
    const cy = result.hsp[P.yKey]
    const center = { x: cx, y: cy }
    const circle = circlePoints(cx, cy, result.hsp.R)
    const good = [], bad = []
    for (const r of data) {
      const isGood = r.score !== null && !isNaN(r.score) && r.score > 0 && r.score <= insideLimit
      const pt = { x: r[P.xKey] * P.xScale, y: r[P.yKey], name: r.solvent, score: r.score }
      ;(isGood ? good : bad).push(pt)
    }
    // Equal-span domains around the center so the circle renders circular.
    const allX = [...good, ...bad, ...circle].map(p => p.x)
    const allY = [...good, ...bad, ...circle].map(p => p.y)
    const pad = 1
    const baseHalfSpan = Math.max(
      Math.max(...allX) - cx, cx - Math.min(...allX),
      Math.max(...allY) - cy, cy - Math.min(...allY),
    ) + pad
    const halfSpan = baseHalfSpan / zoom
    const domain = {
      x: [cx - halfSpan, cx + halfSpan],
      y: [cy - halfSpan, cy + halfSpan],
    }
    return { good, bad, circle, center, domain }
  }, [data, result, proj, insideLimit, P, zoom])

  return (
    <div style={{
      background: "var(--bg-card)",
      border: "1px solid var(--border)",
      borderRadius: 12,
      padding: "clamp(12px, 3vw, 18px)",
      boxShadow: "var(--shadow)",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
        <div>
          <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "var(--text)" }}>Projections 2D</p>
          <p style={{ margin: "2px 0 0", fontSize: 11, color: "var(--text-muted)" }}>
            Axe δD multiplié par 2 (convention Hansen) → la sphère devient un cercle
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ display: "flex", background: "#f4f4f5", borderRadius: 8, padding: 3, gap: 2 }}>
            {Object.keys(PROJECTIONS).map(k => <Tab key={k} active={proj === k} onClick={() => setProj(k)}>{k}</Tab>)}
          </div>
          <div style={{ display: "flex", border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden" }}>
            <button
              onClick={() => setZoomClamped(zoom * 1.3)}
              disabled={zoom >= MAX_ZOOM}
              title="Zoom avant"
              style={{ padding: "6px 8px", background: "var(--bg-card)", border: "none", borderRight: "1px solid var(--border)", cursor: zoom >= MAX_ZOOM ? "default" : "pointer", color: "var(--text)", display: "flex", alignItems: "center" }}
            ><MagnifyingGlassPlusIcon style={{ width: 14, height: 14 }} /></button>
            <button
              onClick={() => setZoomClamped(zoom / 1.3)}
              disabled={zoom <= MIN_ZOOM}
              title="Zoom arrière"
              style={{ padding: "6px 8px", background: "var(--bg-card)", border: "none", borderRight: "1px solid var(--border)", cursor: zoom <= MIN_ZOOM ? "default" : "pointer", color: "var(--text)", display: "flex", alignItems: "center" }}
            ><MagnifyingGlassMinusIcon style={{ width: 14, height: 14 }} /></button>
            <button
              onClick={() => setZoom(1)}
              title="Réinitialiser le zoom"
              style={{ padding: "6px 8px", background: "var(--bg-card)", border: "none", cursor: "pointer", color: "var(--text)", display: "flex", alignItems: "center" }}
            ><ArrowPathIcon style={{ width: 14, height: 14 }} /></button>
          </div>
          <span style={{ fontSize: 10, color: "var(--text-muted)", fontFamily: "monospace" }}>
            ×{zoom.toFixed(2)}
          </span>
        </div>
      </div>
      <div onWheel={onWheel} style={{ width: "100%", maxWidth: 480, aspectRatio: "1 / 1", marginInline: "auto", touchAction: "none" }}>
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 10, right: 20, bottom: 40, left: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis
              type="number" dataKey="x" domain={domain.x} allowDecimals
              label={{ value: P.xLabel, position: "insideBottom", offset: -12, fontSize: 11, fill: "var(--text-muted)" }}
              tick={{ fontSize: 10, fill: "var(--text-muted)" }}
            />
            <YAxis
              type="number" dataKey="y" domain={domain.y} allowDecimals
              label={{ value: P.yLabel, angle: -90, position: "insideLeft", fontSize: 11, fill: "var(--text-muted)" }}
              tick={{ fontSize: 10, fill: "var(--text-muted)" }}
            />
            <ZAxis range={[50, 50]} />
            <Tooltip
              cursor={{ strokeDasharray: "3 3" }}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null
                const p = payload[0].payload
                return (
                  <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 6, padding: "6px 10px", fontSize: 11 }}>
                    <p style={{ margin: 0, fontWeight: 700, color: "var(--text)" }}>{p.name}</p>
                    <p style={{ margin: "2px 0 0", color: "var(--text-muted)" }}>
                      x={p.x?.toFixed(2)}, y={p.y?.toFixed(2)}
                      {p.score !== null && p.score !== undefined ? ` · score=${p.score}` : ""}
                    </p>
                  </div>
                )
              }}
            />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Scatter name="Sphère HSP" data={circle} fill="none" line={{ stroke: ACCENT, strokeWidth: 2 }} shape={() => null} legendType="line" />
            <Scatter name="Compatibles" data={good} fill="#16a34a" />
            <Scatter name="Incompatibles" data={bad} fill="#94a3b8" />
            <ReferenceDot x={center.x} y={center.y} r={6} fill={ACCENT} stroke="#fff" strokeWidth={2} />
          </ScatterChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
