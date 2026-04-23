import { Fragment, useCallback, useMemo, useState } from "react"
import { MagnifyingGlassPlusIcon, MagnifyingGlassMinusIcon, ArrowPathIcon, QuestionMarkCircleIcon } from "@heroicons/react/24/outline"
import { Popover, PopoverButton, PopoverPanel, Transition } from "@headlessui/react"
import {
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ZAxis, ReferenceDot, ReferenceLine,
} from "recharts"

const ACCENT = "#ea580c"
const MIN_ZOOM = 0.25
const MAX_ZOOM = 8
const PAD_FACTOR = 1.2

// ─── Projections (Hansen convention: 2·δD on x when D is involved) ─────────
const PROJECTIONS = {
  "δP-δH":  { xKey: "P", yKey: "H", xScale: 1, xRaw: "δP", yRaw: "δH", xLabel: "δP (MPa^½)",    yLabel: "δH (MPa^½)", needsHelp: false },
  "2δD-δP": { xKey: "D", yKey: "P", xScale: 2, xRaw: "δD", yRaw: "δP", xLabel: "2·δD (MPa^½)", yLabel: "δP (MPa^½)", needsHelp: true  },
  "2δD-δH": { xKey: "D", yKey: "H", xScale: 2, xRaw: "δD", yRaw: "δH", xLabel: "2·δD (MPa^½)", yLabel: "δH (MPa^½)", needsHelp: true  },
}
const PROJ_ORDER = ["δP-δH", "2δD-δP", "2δD-δH"]

// ─── Tick generators ────────────────────────────────────────────────────────
// Majors = all multiples of 5 within domain. Minors = integers between, skipping
// multiples of 5. Negative values are not generated (we clip to 0 anyway).
function majorsInDomain([min, max]) {
  const out = []
  const first = Math.max(0, Math.ceil(min / 5) * 5)
  for (let v = first; v <= max + 1e-9; v += 5) out.push(v)
  return out
}
function minorsInDomain([min, max]) {
  const out = []
  const first = Math.max(0, Math.ceil(min))
  for (let v = first; v <= max + 1e-9; v++) {
    if (v % 5 !== 0) out.push(v)
  }
  return out
}

// ─── Custom tick renderers ──────────────────────────────────────────────────
function XTick({ x, y, payload, majorSet }) {
  const isMajor = majorSet.has(payload.value)
  return (
    <g>
      <line x1={x} y1={y} x2={x} y2={y + (isMajor ? 6 : 3)} stroke={isMajor ? "#64748b" : "#cbd5e1"} strokeWidth={isMajor ? 1.2 : 1} />
      {isMajor && (
        <text x={x} y={y + 16} textAnchor="middle" fontSize={10} fill="#64748b">{payload.value}</text>
      )}
    </g>
  )
}
function YTick({ x, y, payload, majorSet }) {
  const isMajor = majorSet.has(payload.value)
  return (
    <g>
      <line x1={x} y1={y} x2={x - (isMajor ? 6 : 3)} y2={y} stroke={isMajor ? "#64748b" : "#cbd5e1"} strokeWidth={isMajor ? 1.2 : 1} />
      {isMajor && (
        <text x={x - 8} y={y + 3} textAnchor="end" fontSize={10} fill="#64748b">{payload.value}</text>
      )}
    </g>
  )
}

// ─── Default span (axes start at 0, equal spans → circle is circular) ──────
function spanDefaultFor(result, data, P) {
  const cx = result.hsp[P.xKey] * P.xScale
  const cy = result.hsp[P.yKey]
  const R = result.hsp.R
  let dataXMax = cx + R, dataYMax = cy + R
  for (const r of data) {
    const px = r[P.xKey] * P.xScale, py = r[P.yKey]
    if (px > dataXMax) dataXMax = px
    if (py > dataYMax) dataYMax = py
  }
  return Math.max(
    cx + PAD_FACTOR * R,
    cy + PAD_FACTOR * R,
    dataXMax + 0.5,
    dataYMax + 0.5,
    5,
  )
}

// ─── Geometry helper ────────────────────────────────────────────────────────
function circlePoints(cx, cy, r, n = 96) {
  const pts = []
  for (let i = 0; i <= n; i++) {
    const t = (i / n) * 2 * Math.PI
    pts.push({ x: cx + r * Math.cos(t), y: cy + r * Math.sin(t) })
  }
  return pts
}

// ─── Help popover for 2·δD projections ──────────────────────────────────────
function HelpPopover() {
  return (
    <Popover className="relative">
      <PopoverButton
        title="Pourquoi 2·δD ?"
        style={{
          display: "inline-flex", alignItems: "center", justifyContent: "center",
          width: 22, height: 22, borderRadius: "50%",
          background: `${ACCENT}18`, border: `1px solid ${ACCENT}40`,
          color: ACCENT, cursor: "pointer",
        }}
      >
        <QuestionMarkCircleIcon style={{ width: 14, height: 14 }} />
      </PopoverButton>
      <Transition
        as={Fragment}
        enter="transition ease-out duration-120"
        enterFrom="opacity-0 translate-y-[-4px]"
        enterTo="opacity-100 translate-y-0"
        leave="transition ease-in duration-80"
        leaveFrom="opacity-100" leaveTo="opacity-0"
      >
        <PopoverPanel
          anchor="bottom end"
          className="z-50 w-[min(360px,92vw)] rounded-lg p-4 text-[12px] leading-relaxed [--anchor-gap:6px]"
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border)",
            color: "var(--text)",
            boxShadow: "0 8px 24px rgba(0,0,0,0.12), 0 2px 6px rgba(0,0,0,0.06)",
          }}
        >
          <p style={{ margin: 0, fontWeight: 700, fontSize: 13 }}>Pourquoi 2·δD en abscisse ?</p>
          <p style={{ margin: "8px 0" }}>
            Dans le modèle de Hansen, la distance entre deux solvants dans l'espace (δD, δP, δH) est définie par :
          </p>
          <p style={{ margin: "6px 0", textAlign: "center", fontFamily: "monospace", background: "var(--bg)", padding: "6px 8px", borderRadius: 4 }}>
            d² = <b style={{ color: ACCENT }}>4</b>·(ΔδD)² + (ΔδP)² + (ΔδH)²
          </p>
          <p style={{ margin: "8px 0" }}>
            Le coefficient <b>4</b> sur δD traduit l'importance empiriquement plus grande de la composante dispersive dans les interactions de solubilité.
          </p>
          <p style={{ margin: "8px 0" }}>
            Si on trace δD tel quel, la « sphère » de Hansen apparaît comme un ellipsoïde aplati selon l'axe δD. Pour obtenir un <b>vrai cercle</b> (visuellement parlant), on trace <b style={{ color: ACCENT }}>2·δD</b> : puisque <code>(2·ΔδD)² = 4·(ΔδD)²</code>, le facteur 4 est « absorbé » dans l'axe.
          </p>
          <p style={{ margin: 0, color: "var(--text-muted)", fontStyle: "italic" }}>
            C'est la convention historique utilisée par Charles M. Hansen dans ses ouvrages de référence.
          </p>
        </PopoverPanel>
      </Transition>
    </Popover>
  )
}

// ─── One chart per projection (independent zoom) ────────────────────────────
function ProjectionChart({ proj, data, result, insideLimit }) {
  const P = PROJECTIONS[proj]
  const [zoom, setZoom] = useState(1)

  const setZoomClamped = useCallback(z => setZoom(Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z))), [])
  const onWheel = useCallback(e => {
    e.preventDefault()
    setZoomClamped(zoom * (e.deltaY < 0 ? 1.15 : 1 / 1.15))
  }, [zoom, setZoomClamped])

  const { good, bad, circle, center, domain, xTicks, yTicks, xMajorSet, yMajorSet, xMajors, yMajors } =
    useMemo(() => {
      const cx = result.hsp[P.xKey] * P.xScale
      const cy = result.hsp[P.yKey]
      const R = result.hsp.R

      const spanDefault = spanDefaultFor(result, data, P)
      const visibleSpan = spanDefault / zoom

      // Zoom behaviour:
      //  zoom ≤ 1 → start at (0, 0) — default view
      //  zoom > 1 → centred on the fit, clamped ≥ 0
      let lx, ly
      if (zoom <= 1) { lx = 0; ly = 0 }
      else {
        lx = Math.max(0, cx - visibleSpan / 2)
        ly = Math.max(0, cy - visibleSpan / 2)
      }
      const ux = lx + visibleSpan
      const uy = ly + visibleSpan
      const domain = { x: [lx, ux], y: [ly, uy] }

      const xMajors = majorsInDomain(domain.x)
      const yMajors = majorsInDomain(domain.y)
      const xTicks = [...xMajors, ...minorsInDomain(domain.x)].sort((a, b) => a - b)
      const yTicks = [...yMajors, ...minorsInDomain(domain.y)].sort((a, b) => a - b)

      const good = [], bad = []
      for (const r of data) {
        const isGood = r.score !== null && !isNaN(r.score) && r.score > 0 && r.score <= insideLimit
        const pt = {
          x: r[P.xKey] * P.xScale, y: r[P.yKey],
          rawX: r[P.xKey], rawY: r[P.yKey],
          name: r.solvent, score: r.score,
        }
        ;(isGood ? good : bad).push(pt)
      }
      return {
        good, bad,
        circle: circlePoints(cx, cy, R),
        center: { x: cx, y: cy },
        domain, xTicks, yTicks,
        xMajorSet: new Set(xMajors),
        yMajorSet: new Set(yMajors),
        xMajors, yMajors,
      }
    }, [data, result, P, insideLimit, zoom])

  return (
    <div style={{
      background: "var(--bg-card)",
      border: "1px solid var(--border)",
      borderRadius: 10,
      padding: 10,
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6, gap: 6, flexWrap: "wrap" }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: "var(--text)", letterSpacing: ".04em" }}>
            {proj}
          </p>
          {P.needsHelp && <HelpPopover />}
        </div>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 10, color: "var(--text-muted)" }}>
          <button onClick={() => setZoomClamped(zoom / 1.3)} disabled={zoom <= MIN_ZOOM} title="Zoom arrière"
            style={{ display: "inline-flex", padding: 4, background: "transparent", border: "1px solid var(--border)", borderRadius: 4, cursor: zoom <= MIN_ZOOM ? "default" : "pointer", color: "var(--text-muted)" }}>
            <MagnifyingGlassMinusIcon style={{ width: 12, height: 12 }} />
          </button>
          <button onClick={() => setZoom(1)} title="Réinitialiser"
            style={{ display: "inline-flex", padding: 4, background: "transparent", border: "1px solid var(--border)", borderRadius: 4, cursor: "pointer", color: "var(--text-muted)" }}>
            <ArrowPathIcon style={{ width: 12, height: 12 }} />
          </button>
          <button onClick={() => setZoomClamped(zoom * 1.3)} disabled={zoom >= MAX_ZOOM} title="Zoom avant"
            style={{ display: "inline-flex", padding: 4, background: "transparent", border: "1px solid var(--border)", borderRadius: 4, cursor: zoom >= MAX_ZOOM ? "default" : "pointer", color: "var(--text-muted)" }}>
            <MagnifyingGlassPlusIcon style={{ width: 12, height: 12 }} />
          </button>
          <span style={{ fontFamily: "monospace", marginLeft: 2 }}>×{zoom.toFixed(2)}</span>
        </div>
      </div>
      <div onWheel={onWheel} style={{ width: "100%", aspectRatio: "1 / 1", touchAction: "none" }}>
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 6, right: 16, bottom: 30, left: 8 }}>
            <CartesianGrid strokeDasharray="2 3" stroke="#eef1f5" />
            {xMajors.map(v => <ReferenceLine key={`xm-${v}`} x={v} stroke="#cbd5e1" strokeWidth={1} />)}
            {yMajors.map(v => <ReferenceLine key={`ym-${v}`} y={v} stroke="#cbd5e1" strokeWidth={1} />)}

            <XAxis
              type="number" dataKey="x" domain={domain.x} ticks={xTicks} allowDataOverflow
              tick={(props) => <XTick {...props} majorSet={xMajorSet} />}
              interval={0} axisLine={{ stroke: "var(--border)" }} tickLine={false}
              label={{ value: P.xLabel, position: "insideBottom", offset: -14, fontSize: 10, fill: "var(--text-muted)" }}
            />
            <YAxis
              type="number" dataKey="y" domain={domain.y} ticks={yTicks} allowDataOverflow
              tick={(props) => <YTick {...props} majorSet={yMajorSet} />}
              interval={0} axisLine={{ stroke: "var(--border)" }} tickLine={false}
              label={{ value: P.yLabel, angle: -90, position: "insideLeft", fontSize: 10, fill: "var(--text-muted)" }}
            />
            <ZAxis range={[40, 40]} />
            <Tooltip
              cursor={{ strokeDasharray: "3 3" }}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null
                const p = payload[0].payload
                if (!p.name) return null
                return (
                  <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 6, padding: "6px 10px", fontSize: 11 }}>
                    <p style={{ margin: 0, fontWeight: 700, color: "var(--text)" }}>{p.name}</p>
                    <p style={{ margin: "2px 0 0", color: "var(--text-muted)" }}>
                      {P.xRaw}={p.rawX?.toFixed(2)} · {P.yRaw}={p.rawY?.toFixed(2)}
                      {p.score !== null && p.score !== undefined ? ` · score=${p.score}` : ""}
                    </p>
                  </div>
                )
              }}
            />
            <Scatter name="Sphère HSP" data={circle} fill="none" line={{ stroke: ACCENT, strokeWidth: 2 }} shape={() => null} />
            <Scatter name="Compatibles"   data={good} fill="#16a34a" />
            <Scatter name="Incompatibles" data={bad}  fill="#94a3b8" />
            <ReferenceDot x={center.x} y={center.y} r={5} fill={ACCENT} stroke="#fff" strokeWidth={2} />
          </ScatterChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

function LegendItem({ color, label, line }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
      {line
        ? <span style={{ width: 14, height: 2, background: color }} />
        : <span style={{ width: 10, height: 10, borderRadius: "50%", background: color }} />}
      {label}
    </span>
  )
}

// ─── Main component ─────────────────────────────────────────────────────────
export default function HSPPlot2D({ data, result, insideLimit = 1 }) {
  const [active, setActive] = useState(() => new Set(PROJ_ORDER))

  const toggle = (proj) => {
    const next = new Set(active)
    if (next.has(proj)) {
      if (next.size <= 1) return
      next.delete(proj)
    } else next.add(proj)
    setActive(next)
  }
  const activeList = PROJ_ORDER.filter(p => active.has(p))

  return (
    <div style={{
      background: "var(--bg-card)",
      border: "1px solid var(--border)",
      borderRadius: 12,
      padding: "clamp(12px, 3vw, 18px)",
      boxShadow: "var(--shadow)",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, flexWrap: "wrap", gap: 10 }}>
        <div>
          <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "var(--text)" }}>Projections 2D</p>
          <p style={{ margin: "2px 0 0", fontSize: 11, color: "var(--text-muted)" }}>
            Convention Hansen (2·δD) · chaque graphe a son propre zoom (molette / pinch).
          </p>
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {PROJ_ORDER.map(proj => {
            const isOn = active.has(proj)
            const lastOne = isOn && active.size === 1
            return (
              <button
                key={proj}
                onClick={() => toggle(proj)}
                disabled={lastOne}
                title={lastOne ? "Au moins une projection doit rester active" : undefined}
                style={{
                  padding: "5px 12px", fontSize: 11, fontWeight: 700, borderRadius: 999,
                  background: isOn ? ACCENT : "transparent",
                  color: isOn ? "#fff" : "var(--text-muted)",
                  border: `1px solid ${isOn ? ACCENT : "var(--border)"}`,
                  cursor: lastOne ? "default" : "pointer",
                  opacity: lastOne ? 0.75 : 1,
                  transition: "all .12s",
                }}
              >
                {proj}
              </button>
            )
          })}
        </div>
      </div>

      <div style={{
        display: "grid",
        gridTemplateColumns: `repeat(${Math.min(activeList.length, 3)}, minmax(0, 1fr))`,
        gap: 12,
      }}>
        {activeList.map(proj => (
          <ProjectionChart
            key={proj} proj={proj}
            data={data} result={result} insideLimit={insideLimit}
          />
        ))}
      </div>

      <div style={{ marginTop: 12, display: "flex", gap: 14, flexWrap: "wrap", fontSize: 11, color: "var(--text-muted)" }}>
        <LegendItem color="#16a34a" label="Compatibles" />
        <LegendItem color="#94a3b8" label="Incompatibles" />
        <LegendItem color={ACCENT} label="Sphère HSP" line />
      </div>
    </div>
  )
}
