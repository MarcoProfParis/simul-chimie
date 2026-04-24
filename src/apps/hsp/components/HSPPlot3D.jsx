import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import SolventEditModal from "./SolventEditModal"

const ACCENT = "#ea580c"

// Hansen ellipsoïde en espace (δD, δP, δH) brut :
//   demi-axes R/2 sur δD, R sur δP, R sur δH
// C'est la forme physiquement correcte (reflète le facteur 4 sur δD dans
// la distance Hansen). Pas une sphère parfaite, mais la référence hspipy
// visuellement acceptée.
function hansenEllipsoidWireframe(cx, cy, cz, R, nU = 32, nV = 16) {
  const x = [], y = [], z = []

  // Parallèles
  for (let i = 1; i < nV; i++) {
    const v = (i / nV) * Math.PI
    for (let j = 0; j <= nU; j++) {
      const u = (j / nU) * 2 * Math.PI
      x.push(cx + (R / 2) * Math.sin(v) * Math.cos(u))
      y.push(cy + R * Math.sin(v) * Math.sin(u))
      z.push(cz + R * Math.cos(v))
    }
    x.push(null); y.push(null); z.push(null)
  }

  // Méridiens
  for (let j = 0; j < nU; j++) {
    const u = (j / nU) * 2 * Math.PI
    for (let i = 0; i <= nV; i++) {
      const v = (i / nV) * Math.PI
      x.push(cx + (R / 2) * Math.sin(v) * Math.cos(u))
      y.push(cy + R * Math.sin(v) * Math.sin(u))
      z.push(cz + R * Math.cos(v))
    }
    x.push(null); y.push(null); z.push(null)
  }

  return { x, y, z }
}

// Calcule des valeurs de graduation régulières dans [lo, hi], max maxN ticks.
// Choisit le pas le plus petit parmi {1, 2, 5} × 10^n tel que le nombre de
// ticks ≤ maxN. Exclut les valeurs trop proches des extremités (évite le
// chevauchement avec les labels de bout d'axe).
function niceTicks(lo, hi, maxN = 9) {
  const span = hi - lo
  if (!isFinite(span) || span <= 0) return []
  const raw = span / maxN
  const mag = Math.pow(10, Math.floor(Math.log10(raw)))
  let step = 10 * mag
  for (const f of [1, 2, 5]) {
    if (span / (f * mag) <= maxN) { step = f * mag; break }
  }
  const n0 = Math.ceil(lo / step - 1e-9)
  const n1 = Math.floor(hi / step + 1e-9)
  const out = []
  for (let i = n0; i <= n1; i++) {
    const v = Math.round(i * step * 1e10) / 1e10
    if (v > lo + step * 0.1 && v < hi - step * 0.1) out.push(v)
  }
  return out.slice(0, maxN)
}

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

export default function HSPPlot3D({ data, result, insideLimit = 1, onEditSolvent }) {
  const [Plot, setPlot] = useState(null)
  const [err, setErr] = useState("")
  const [editingSolvent, setEditingSolvent] = useState(null)

  // Double-clic détecté manuellement : deux clics sur le même point en < 400 ms.
  // Plotly 3D intercepte le double-clic natif (reset caméra), on bypasse via timing.
  const lastClick = useRef({ name: null, time: 0 })

  const handleClick = useCallback((event) => {
    if (!event?.points?.length) return
    const pt = event.points[0]
    const raw = Array.isArray(pt.text) ? pt.text[0] : pt.text
    if (!raw || !String(raw).includes("<br>")) return
    const name = String(raw).split("<br>")[0].trim()
    if (!name || name === "Centre") return

    const now = Date.now()
    if (lastClick.current.name === name && now - lastClick.current.time < 400) {
      // Double-clic confirmé → ouvrir la popup
      const row = data.find(r => r.solvent === name)
      if (row) setEditingSolvent(row)
      lastClick.current = { name: null, time: 0 }
    } else {
      lastClick.current = { name, time: now }
    }
  }, [data])

  useEffect(() => {
    let cancelled = false
    loadPlot().then(p => { if (!cancelled) setPlot(() => p) }).catch(e => { if (!cancelled) setErr(e.message) })
    return () => { cancelled = true }
  }, [])

  const { traces, layout } = useMemo(() => {
    const { D, P, H, R } = result.hsp
    // Axes bruts δD, δP, δH. L'ellipsoïde Hansen est tracé en (R/2, R, R).
    const cx = D, cy = P, cz = H

    // ── 1. Plages en rapport 1:2:2 (δD:δP:δH) ─────────────────────────────
    // Avec aspectmode:"cube", Plotly alloue la même longueur physique à chaque
    // axe. Le rapport 1:2:2 sur les plages fait que l'ellipsoïde (R/2, R, R)
    // occupe le même rayon visuel sur les trois axes → sphère parfaite.
    // PAD_FACTOR : marge minimale autour de l'ellipsoïde (35 %).
    // MAX_K      : plafond — évite que des solvants outliers très éloignés
    //              ne réduisent la sphère à un point dans le coin.
    //              Avec k=2.5 la sphère occupe au moins 1/2.5 = 40 % du demi-span.
    //              Les points au-delà de cette plage sont clippés par Plotly
    //              (dézoom ou rotation pour les retrouver).
    const PAD_FACTOR = 1.35
    const MAX_K = 2.5
    let k = PAD_FACTOR
    for (const r of data) {
      if (r.D != null && !isNaN(r.D)) {
        const kD = Math.abs(r.D - cx) / (R / 2)
        if (kD > k) k = kD
      }
      if (r.P != null && !isNaN(r.P)) {
        const kP = Math.abs(r.P - cy) / R
        if (kP > k) k = kP
      }
      if (r.H != null && !isNaN(r.H)) {
        const kH = Math.abs(r.H - cz) / R
        if (kH > k) k = kH
      }
    }
    k = Math.min(k * 1.08, MAX_K)

    const xMin = cx - (R / 2) * k, xMax = cx + (R / 2) * k   // span = R·k
    const yMin = cy - R * k,       yMax = cy + R * k           // span = 2R·k
    const zMin = cz - R * k,       zMax = cz + R * k           // span = 2R·k

    // ── 2. Points de données ───────────────────────────────────────────────
    const good = { x: [], y: [], z: [], text: [] }
    const bad  = { x: [], y: [], z: [], text: [] }
    for (const r of data) {
      const isGood = r.score !== null && !isNaN(r.score) && r.score > 0 && r.score <= insideLimit
      const b = isGood ? good : bad
      b.x.push(r.D); b.y.push(r.P); b.z.push(r.H)
      b.text.push(`${r.solvent}<br>δD=${r.D.toFixed(2)} δP=${r.P.toFixed(2)} δH=${r.H.toFixed(2)}${r.score !== null ? `<br>score=${r.score}` : ""}`)
    }

    // ── 3. Ellipsoïde filaire ──────────────────────────────────────────────
    const wire = hansenEllipsoidWireframe(cx, cy, cz, R)

    // ── 4. Axes permanents (traces scatter3d) ──────────────────────────────
    // Centrés sur (cx, cy, cz) — le centre de la sphère — et non sur le coin
    // de la boîte. Raison : au zoom, les coins sortent du champ et les labels
    // disparaissent. En partant du centre, les axes restent toujours visibles
    // dès que la sphère est dans le champ.
    //
    // Longueurs visuelles égales avec aspectmode:"cube" + plages 1:2:2 :
    //   δD : ± R   (span_D = R·k → 1 unité δD pèse 2× plus qu'une unité δP)
    //   δP : ± 2R  (span_P = 2R·k)
    //   δH : ± 2R  (span_H = 2R·k)
    // → longueur physique identique pour les trois bras.
    // Convention couleur standard 3D : X=rouge, Y=vert, Z=bleu
    const AX_COLORS = { D: "#e11d48", P: "#16a34a", H: "#2563eb" }
    const axisLine = (x, y, z, color) => ({
      type: "scatter3d", mode: "lines",
      showlegend: false, hoverinfo: "skip",
      x, y, z,
      line: { color, width: 6 },
    })
    const axisTraces = [
      axisLine([cx - R, cx + R], [cy,       cy      ], [cz,       cz      ], AX_COLORS.D),
      axisLine([cx,     cx    ], [cy - 2*R, cy + 2*R], [cz,       cz      ], AX_COLORS.P),
      axisLine([cx,     cx    ], [cy,       cy      ], [cz - 2*R, cz + 2*R], AX_COLORS.H),
    ]

    // Labels δD/δP/δH via layout.scene.annotations — seul moyen fiable
    // de placer du texte en 3D dans Plotly.
    // Positionnés à 55 % du bras positif de chaque axe → clairement à
    // l'intérieur du cube, bien lisibles quelle que soit la rotation.
    const axisAnnotations = [
      { x: cx + R * 0.55,    y: cy,            z: cz,            text: "<b>δD</b>", font: { color: AX_COLORS.D, size: 14 } },
      { x: cx,               y: cy + 2*R * 0.55, z: cz,          text: "<b>δP</b>", font: { color: AX_COLORS.P, size: 14 } },
      { x: cx,               y: cy,            z: cz + 2*R * 0.55, text: "<b>δH</b>", font: { color: AX_COLORS.H, size: 14 } },
    ].map(a => ({
      ...a,
      showarrow: false,
      bgcolor: "rgba(0,0,0,0)",
      bordercolor: "rgba(0,0,0,0)",
      xanchor: "center", yanchor: "bottom",
    }))

    // ── 4b. Graduations sur les axes centrés ───────────────────────────────
    // Tirets perpendiculaires à chaque axe + labels numériques.
    // Taille des tirets choisie pour un rendu visuel cohérent avec le rapport
    // 1:2:2 des plages et aspectmode:"cube" :
    //   • δD et δP axes → tiret ⊥ en direction δH (z), demi-longueur th
    //   • δH axe        → tiret ⊥ en direction δP (y), demi-longueur th
    //   Visual size = th / (2R·k) × cube identique pour les trois axes.
    const th = R * 0.18           // demi-longueur des tirets en unités δP ou δH
    const TW   = 1.5              // épaisseur des tirets
    const TFS  = 10               // taille de fonte des labels de graduation

    // Helper : construit les coordonnées de N tirets null-séparés.
    // axV = valeurs sur l'axe mobile ; ax/p/q = directions 'x'|'y'|'z'
    function tickLines(axVals, ax, px, py, pz, halfLen, perpIdx) {
      // perpIdx : 0=x,1=y,2=z — axe perpendiculaire
      const cx3 = [px, py, pz]
      const xs = [], ys = [], zs = []
      for (const v of axVals) {
        const a = [...cx3]; a[{x:0,y:1,z:2}[ax]] = v
        const b = [...a];   b[perpIdx] -= halfLen
        const c = [...a];   c[perpIdx] += halfLen
        xs.push(b[0], c[0], null)
        ys.push(b[1], c[1], null)
        zs.push(b[2], c[2], null)
      }
      return { x: xs, y: ys, z: zs }
    }

    const dVals = niceTicks(cx - R,    cx + R)        // δD
    const pVals = niceTicks(cy - 2*R, cy + 2*R)       // δP
    const hVals = niceTicks(cz - 2*R, cz + 2*R)       // δH

    // Tirets
    const dTL = tickLines(dVals, 'x', cx, cy, cz, th, 2)   // ⊥ z
    const pTL = tickLines(pVals, 'y', cx, cy, cz, th, 2)   // ⊥ z
    const hTL = tickLines(hVals, 'z', cx, cy, cz, th, 1)   // ⊥ y

    // Labels : décalage du côté négatif du tiret pour ne pas chevaucher l'axe
    // δD et δP labels : décalés en -z (en dessous du tiret)
    // δH labels       : décalés en +x (à droite du tiret)
    //   Offset visuel cohérent : th*1.8 en unités δH → 0.09/k ; en δD → th*0.9
    const lbTrace = (xs, ys, zs, texts, color) => ({
      type: "scatter3d", mode: "text",
      showlegend: false, hoverinfo: "skip",
      x: xs, y: ys, z: zs, text: texts,
      textposition: "middle center",
      textfont: { color, size: TFS, family: "system-ui, sans-serif" },
    })

    const tickTraces = [
      // δD tirets + labels (rouge)
      { type:"scatter3d", mode:"lines", showlegend:false, hoverinfo:"skip",
        x:dTL.x, y:dTL.y, z:dTL.z, line:{color:AX_COLORS.D, width:TW} },
      lbTrace(dVals, dVals.map(()=>cy), dVals.map(()=>cz - th*2.2),
              dVals.map(v=>String(Math.round(v))), AX_COLORS.D),
      // δP tirets + labels (vert)
      { type:"scatter3d", mode:"lines", showlegend:false, hoverinfo:"skip",
        x:pTL.x, y:pTL.y, z:pTL.z, line:{color:AX_COLORS.P, width:TW} },
      lbTrace(pVals.map(()=>cx), pVals, pVals.map(()=>cz - th*2.2),
              pVals.map(v=>String(Math.round(v))), AX_COLORS.P),
      // δH tirets + labels (bleu)
      { type:"scatter3d", mode:"lines", showlegend:false, hoverinfo:"skip",
        x:hTL.x, y:hTL.y, z:hTL.z, line:{color:AX_COLORS.H, width:TW} },
      lbTrace(hVals.map(()=>cx + th*0.9), hVals.map(()=>cy), hVals,
              hVals.map(v=>String(Math.round(v))), AX_COLORS.H),
    ]

    // ── 5. Tableau de traces ───────────────────────────────────────────────
    const traces = [
      ...axisTraces,
      ...tickTraces,
      {
        type: "scatter3d", mode: "lines",
        name: "Sphère HSP",
        x: wire.x, y: wire.y, z: wire.z,
        line: { color: ACCENT, width: 2 },
        hoverinfo: "skip",
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
        marker: { size: 7, color: ACCENT, symbol: "diamond", line: { color: "#fff", width: 1 } },
      },
    ]

    // ── 6. Layout ──────────────────────────────────────────────────────────
    const axisBase = {
      showbackground: true,
      backgroundcolor: "rgba(203,213,225,0.10)",
      showgrid: true,
      gridcolor: "#cbd5e1",
      gridwidth: 2,
      showline: true,
      linecolor: "#334155",   // bord du cube bien visible
      linewidth: 5,
      showticklabels: true,
      tickcolor: "#334155",
      tickwidth: 2,
      ticklen: 6,
      tickfont: { size: 11, color: "#334155" },
      color: "#334155",
      zeroline: false,
    }

    const layout = {
      autosize: true, margin: { l: 0, r: 0, t: 0, b: 0 },
      scene: {
        xaxis: { ...axisBase, title: { text: "δD (MPa½)", font: { size: 13, color: "#1e293b" } }, range: [xMin, xMax] },
        yaxis: { ...axisBase, title: { text: "δP (MPa½)", font: { size: 13, color: "#1e293b" } }, range: [yMin, yMax] },
        zaxis: { ...axisBase, title: { text: "δH (MPa½)", font: { size: 13, color: "#1e293b" } }, range: [zMin, zMax] },
        aspectmode: "cube",
        camera: { eye: { x: 1.6, y: 1.6, z: 0.9 } },
        annotations: axisAnnotations,
      },
      legend: { font: { size: 11 }, x: 0, y: 1 },
      paper_bgcolor: "transparent",
    }
    return { traces, layout }
  }, [data, result, insideLimit])

  return (
    <>
      {editingSolvent && (
        <SolventEditModal
          solvent={editingSolvent}
          onClose={() => setEditingSolvent(null)}
          onSave={(originalName, updated) => {
            if (onEditSolvent) onEditSolvent(originalName, updated)
            setEditingSolvent(null)
          }}
        />
      )}
    <div style={{
      background: "var(--bg-card)",
      border: "1px solid var(--border)",
      borderRadius: 12,
      padding: "clamp(12px, 3vw, 18px)",
      boxShadow: "var(--shadow)",
    }}>
      <p style={{ margin: "0 0 10px", fontSize: 13, fontWeight: 700, color: "var(--text)" }}>
        Sphère HSP 3D
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
            onClick={handleClick}
          />
        )}
      </div>
      <p style={{ margin: "8px 0 0", fontSize: 11, color: "var(--text-muted)" }}>
        Boîte cubique (aspectmode cube) · plages δD:δP:δH en rapport 1:2:2 → l'ellipsoïde Hansen (demi-axes R/2, R, R) apparaît comme une sphère.
      </p>
    </div>
    </>
  )
}
