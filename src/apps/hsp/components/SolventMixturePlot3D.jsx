// ─── SolventMixturePlot3D.jsx ───────────────────────────────────────────────
// Vue 3D Plotly. Reprend les dimensions de HSPPlot3D :
//   aspectmode "cube" + ranges 1:2:2 sur (δD, δP, δH) → l'ellipsoïde Hansen
//   (R/2, R, R) apparaît comme une sphère parfaite à l'écran.
//
// Cliquer sur un solvant (gris) l'assigne au prochain slot (A → B → [C] → A …).

import { useEffect, useMemo, useRef, useState } from "react";
import { SOLVENT_LIBRARY } from "../data/solventLibrary";

const ACCENT = "#ea580c";
const PAD_FACTOR = 1.35;
const MAX_K = 2.5;

function hansenEllipsoidWireframe(cx, cy, cz, R, nU = 32, nV = 16) {
  const x = [], y = [], z = [];
  for (let i = 1; i < nV; i++) {
    const v = (i / nV) * Math.PI;
    for (let j = 0; j <= nU; j++) {
      const u = (j / nU) * 2 * Math.PI;
      x.push(cx + (R / 2) * Math.sin(v) * Math.cos(u));
      y.push(cy + R * Math.sin(v) * Math.sin(u));
      z.push(cz + R * Math.cos(v));
    }
    x.push(null); y.push(null); z.push(null);
  }
  for (let j = 0; j < nU; j++) {
    const u = (j / nU) * 2 * Math.PI;
    for (let i = 0; i <= nV; i++) {
      const v = (i / nV) * Math.PI;
      x.push(cx + (R / 2) * Math.sin(v) * Math.cos(u));
      y.push(cy + R * Math.sin(v) * Math.sin(u));
      z.push(cz + R * Math.cos(v));
    }
    x.push(null); y.push(null); z.push(null);
  }
  return { x, y, z };
}

async function loadPlotly() {
  const [plotlyMod, factoryMod] = await Promise.all([
    import("plotly.js-dist-min"),
    import("react-plotly.js/factory"),
  ]);
  const Plotly = plotlyMod.default ?? plotlyMod;
  const factoryDefault = factoryMod.default ?? factoryMod;
  const create = factoryDefault?.default ?? factoryDefault;
  return create(Plotly);
}

// Plotly default eye position is (1.25, 1.25, 1.25) → |eye| ≈ 2.165.
// Zoom = default / current : >1 = zoomé, <1 = dézoomé.
const DEFAULT_EYE_DIST = Math.sqrt(3) * 1.25;

export default function SolventMixturePlot3D({ target, R0, solvA, solvB, solvC, mode, mixture, showLib, onPickSolvent }) {
  const [Plot, setPlot] = useState(null);
  const [zoom, setZoom] = useState(1);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    loadPlotly().then((P) => mounted.current && setPlot(() => P));
    return () => { mounted.current = false; };
  }, []);

  const { traces, layout } = useMemo(() => {
    const cx = target.D, cy = target.P, cz = target.H;
    const R = R0;

    // Calcul de k pour que tous les solvants tiennent dans la boîte 1:2:2.
    let k = PAD_FACTOR;
    for (const s of SOLVENT_LIBRARY) {
      const kD = Math.abs(s.D - cx) / (R / 2);
      const kP = Math.abs(s.P - cy) / R;
      const kH = Math.abs(s.H - cz) / R;
      if (kD > k) k = kD;
      if (kP > k) k = kP;
      if (kH > k) k = kH;
    }
    k = Math.min(k * 1.08, MAX_K);

    const xMin = cx - (R / 2) * k, xMax = cx + (R / 2) * k;
    const yMin = cy - R * k,       yMax = cy + R * k;
    const zMin = cz - R * k,       zMax = cz + R * k;

    const out = [];

    // Bibliothèque : vert = dans la sphère, rouge = en dehors (Hansen distance)
    if (showLib) {
      const isInside = (s) =>
        Math.sqrt(4 * (s.D - cx) ** 2 + (s.P - cy) ** 2 + (s.H - cz) ** 2) <= R;
      const colors = SOLVENT_LIBRARY.map((s) => (isInside(s) ? "#10b981" : "#ef4444"));
      out.push({
        type: "scatter3d", mode: "markers",
        x: SOLVENT_LIBRARY.map((s) => s.D),
        y: SOLVENT_LIBRARY.map((s) => s.P),
        z: SOLVENT_LIBRARY.map((s) => s.H),
        text: SOLVENT_LIBRARY.map((s) => s.name),
        customdata: SOLVENT_LIBRARY.map((s) => s.name),
        hovertemplate: "%{text}<br>δD=%{x:.2f}, δP=%{y:.2f}, δH=%{z:.2f}<extra></extra>",
        marker: { size: 5, color: colors, opacity: 0.85 },
        name: "Bibliothèque",
        showlegend: false,
      });
    }

    // Ellipsoïde cible
    const ell = hansenEllipsoidWireframe(cx, cy, cz, R);
    out.push({
      type: "scatter3d", mode: "lines",
      x: ell.x, y: ell.y, z: ell.z,
      line: { color: ACCENT, width: 1.5 },
      opacity: 0.45,
      hoverinfo: "skip",
      showlegend: false,
    });

    // Cible
    out.push({
      type: "scatter3d", mode: "markers+text",
      x: [cx], y: [cy], z: [cz],
      text: ["T"], textposition: "top center",
      textfont: { color: ACCENT, size: 13, family: "system-ui" },
      marker: { size: 7, color: ACCENT, line: { color: "#fff", width: 1 } },
      hovertext: [`Cible (${cx}, ${cy}, ${cz})`],
      hoverinfo: "text",
      showlegend: false,
    });

    // Solvants sélectionnés
    const picks = [
      { s: solvA, color: "#3b82f6", label: "A" },
      { s: solvB, color: "#10b981", label: "B" },
      ...(mode === 3 ? [{ s: solvC, color: "#f59e0b", label: "C" }] : []),
    ].filter((p) => p.s);

    picks.forEach((p) => {
      out.push({
        type: "scatter3d", mode: "markers+text",
        x: [p.s.D], y: [p.s.P], z: [p.s.H],
        text: [`<b>${p.label}</b> · ${p.s.name}`],
        textposition: "top center",
        textfont: { color: p.color, size: 12, family: "system-ui" },
        marker: { size: 9, color: p.color, line: { color: "#fff", width: 2 } },
        hovertext: [p.s.name],
        hoverinfo: "text",
        showlegend: false,
      });
    });

    // Segment ou triangle
    if (picks.length === 2) {
      const pA = picks[0].s, pB = picks[1].s;
      const dD = pB.D - pA.D, dP = pB.P - pA.P, dH = pB.H - pA.H;
      const aD = pA.D - cx,   aP = pA.P - cy,   aH = pA.H - cz;
      // Intersection droite AB avec ellipsoïde Hansen : 4ΔD²+ΔP²+ΔH² = R²
      const Aq = 4*dD*dD + dP*dP + dH*dH;
      const Bq = 2*(4*aD*dD + aP*dP + aH*dH);
      const Cq = 4*aD*aD + aP*aP + aH*aH;
      const disc = Bq*Bq - 4*Aq*(Cq - R*R);
      const interp = (t) => [pA.D + t*dD, pA.P + t*dP, pA.H + t*dH];

      let te = null, tx = null;
      if (disc >= 0 && Aq > 0) {
        const sq = Math.sqrt(disc);
        te = Math.max(0, (-Bq - sq) / (2*Aq));
        tx = Math.min(1, (-Bq + sq) / (2*Aq));
      }

      const hasInside = te !== null && te < tx;

      if (hasInside) {
        const enter = interp(te), exit = interp(tx);
        // Portions extérieures (tirets)
        const ox = [], oy = [], oz = [];
        if (te > 0.001) { ox.push(pA.D, enter[0], null); oy.push(pA.P, enter[1], null); oz.push(pA.H, enter[2], null); }
        if (tx < 0.999) { ox.push(exit[0], pB.D, null);  oy.push(exit[1], pB.P, null);  oz.push(exit[2], pB.H, null);  }
        if (ox.length) out.push({
          type: "scatter3d", mode: "lines",
          x: ox, y: oy, z: oz,
          line: { color: "#94a3b8", width: 2, dash: "dash" },
          hoverinfo: "skip", showlegend: false,
        });
        // Portion intérieure (trait plein)
        out.push({
          type: "scatter3d", mode: "lines",
          x: [enter[0], exit[0]], y: [enter[1], exit[1]], z: [enter[2], exit[2]],
          line: { color: ACCENT, width: 5 },
          hoverinfo: "skip", showlegend: false,
        });
      } else {
        // Aucune intersection → tirets complets
        out.push({
          type: "scatter3d", mode: "lines",
          x: [pA.D, pB.D], y: [pA.P, pB.P], z: [pA.H, pB.H],
          line: { color: "#94a3b8", width: 2, dash: "dash" },
          hoverinfo: "skip", showlegend: false,
        });
      }
    } else if (picks.length === 3) {
      const closed = [...picks, picks[0]];
      out.push({
        type: "scatter3d", mode: "lines",
        x: closed.map((p) => p.s.D),
        y: closed.map((p) => p.s.P),
        z: closed.map((p) => p.s.H),
        line: { color: "#475569", width: 3, dash: "dash" },
        hoverinfo: "skip", showlegend: false,
      });
      out.push({
        type: "mesh3d",
        x: picks.map((p) => p.s.D),
        y: picks.map((p) => p.s.P),
        z: picks.map((p) => p.s.H),
        i: [0], j: [1], k: [2],
        color: ACCENT, opacity: 0.13,
        hoverinfo: "skip", showlegend: false,
      });
    }

    // Mélange optimal
    if (mixture) {
      out.push({
        type: "scatter3d", mode: "markers",
        x: [mixture.point[0]], y: [mixture.point[1]], z: [mixture.point[2]],
        marker: { size: 9, color: "#0f172a", line: { color: "#fff", width: 2 } },
        hovertext: [`Mélange : (${mixture.point[0].toFixed(2)}, ${mixture.point[1].toFixed(2)}, ${mixture.point[2].toFixed(2)})<br>Distance : ${mixture.distance.toFixed(3)}`],
        hoverinfo: "text",
        showlegend: false,
      });
    }

    const axisBase = {
      backgroundcolor: "rgba(0,0,0,0)",
      gridcolor: "#e5e7eb",
      zerolinecolor: "#cbd5e1",
      showbackground: true,
      tickfont: { size: 10, color: "#475569" },
    };

    const layout = {
      autosize: true,
      margin: { l: 0, r: 0, t: 0, b: 0 },
      scene: {
        xaxis: { ...axisBase, title: { text: "δD (MPa^½)", font: { size: 12, color: "#1e293b" } }, range: [xMin, xMax] },
        yaxis: { ...axisBase, title: { text: "δP (MPa^½)", font: { size: 12, color: "#1e293b" } }, range: [yMin, yMax] },
        zaxis: { ...axisBase, title: { text: "δH (MPa^½)", font: { size: 12, color: "#1e293b" } }, range: [zMin, zMax] },
        aspectmode: "cube",
      },
      showlegend: false,
    };

    return { traces: out, layout };
  }, [target, R0, solvA, solvB, solvC, mode, mixture, showLib]);

  const handleClick = (e) => {
    if (!onPickSolvent) return;
    const p = e?.points?.[0];
    if (!p) return;
    const name = p.customdata;
    if (typeof name === "string") onPickSolvent(name);
  };

  const handleRelayout = (ev) => {
    const eye = ev?.["scene.camera.eye"] || ev?.scene?.camera?.eye;
    if (!eye || typeof eye.x !== "number") return;
    const dist = Math.sqrt(eye.x * eye.x + eye.y * eye.y + eye.z * eye.z);
    if (dist > 0) setZoom(DEFAULT_EYE_DIST / dist);
  };

  if (!Plot) {
    return <div style={{ padding: 32, textAlign: "center", color: "var(--text-muted)" }}>Chargement Plotly…</div>;
  }

  return (
    <div style={{ width: "100%", height: 500, position: "relative" }}>
      <div style={{
        position: "absolute", top: 8, right: 8, zIndex: 2,
        padding: "4px 10px", borderRadius: 6,
        background: "rgba(255,255,255,0.92)", border: "1px solid var(--border)",
        fontSize: 11, fontWeight: 600, color: "var(--text)",
        fontVariantNumeric: "tabular-nums", pointerEvents: "none",
      }}>
        Zoom : <span style={{ color: ACCENT }}>×{zoom.toFixed(2)}</span>
      </div>
      <Plot
        data={traces}
        layout={layout}
        config={{ displayModeBar: true, displaylogo: false, responsive: true,
          modeBarButtonsToRemove: ["pan3d", "resetCameraLastSave3d"] }}
        useResizeHandler
        style={{ width: "100%", height: "100%" }}
        onClick={handleClick}
        onRelayout={handleRelayout}
        onUpdate={(figure) => {
          const eye = figure?.layout?.scene?.camera?.eye;
          if (eye && typeof eye.x === "number") {
            const d = Math.sqrt(eye.x ** 2 + eye.y ** 2 + eye.z ** 2);
            if (d > 0) {
              const z = DEFAULT_EYE_DIST / d;
              if (Math.abs(z - zoom) > 0.005) setZoom(z);
            }
          }
        }}
      />
    </div>
  );
}
