// ─── SolventMixtureApp.jsx ──────────────────────────────────────────────────
// Mélange binaire ou ternaire de solvants : l'utilisateur choisit 2 ou 3
// solvants, et l'app calcule la combinaison volumique qui approche le mieux
// un point Hansen cible. Visualisations 2D (3 projections) et 3D.

import React, { Suspense, lazy, useEffect, useMemo, useRef, useState } from "react";
import { useLang } from "../../i18n";
import { SolventLibraryProvider, useSolventLibrary } from "./SolventLibraryContext";
import { bestMixOnSegment, bestMixOnTriangle, findBestMixtures } from "./math/mixture";
import SolventCard from "./components/SolventCard";

const ACCENT = "#ea580c";
const MIN_ZOOM = 0.25;
const MAX_ZOOM = 8;

const Plot3D = lazy(() => import("./components/SolventMixturePlot3D.jsx"));

// ─── Helpers ────────────────────────────────────────────────────────────────

function fmt(n, d = 2) {
  return Number.isFinite(n) ? n.toFixed(d) : "—";
}

// ─── Composant principal ────────────────────────────────────────────────────

export default function SolventMixtureApp() {
  return (
    <SolventLibraryProvider>
      <SolventMixtureAppInner />
    </SolventLibraryProvider>
  );
}

function SolventMixtureAppInner() {
  useLang();
  const { library, source, loading } = useSolventLibrary();
  const [target, setTarget] = useState({ D: 17.0, P: 8.0, H: 9.0 });
  const [R0, setR0] = useState(8.0);
  const [mode, setMode] = useState(2); // 2 ou 3
  const [picks, setPicks] = useState([
    "Dimethylformamide",
    "Tetrahydrofuran",
    "Ethanol",
  ]);
  const [nextSlot, setNextSlot] = useState(0);
  const [view, setView] = useState("2D"); // "2D" | "3D"
  const [showLib, setShowLib] = useState(true);
  const [showDistCalc, setShowDistCalc] = useState(false);
  const [showDistModal, setShowDistModal] = useState(false);
  const [manualFractionB, setManualFractionB] = useState(null); // null = optimal

  const handlePickFromGraph = (name) => {
    if (!name) return;
    setPicks((prev) => {
      const next = [...prev];
      next[nextSlot] = name;
      return next;
    });
    setNextSlot((s) => (s + 1) % mode);
  };

  const findSolventByName = (name) => library.find((s) => s.name === name) || null;

  // When the library changes (Supabase loaded), reset picks that no longer match
  useEffect(() => {
    if (library.length === 0) return;
    setPicks((prev) => {
      const next = [...prev];
      let changed = false;
      for (let i = 0; i < 3; i++) {
        if (!library.find((s) => s.name === next[i])) {
          next[i] = library[i]?.name ?? next[i];
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [library]);

  // Reset slider override when solvents or mode change
  useEffect(() => { setManualFractionB(null); }, [picks[0], picks[1], picks[2], mode]);

  const solvA = findSolventByName(picks[0]);
  const solvB = findSolventByName(picks[1]);
  const solvC = mode === 3 ? findSolventByName(picks[2]) : null;

  const T = [target.D, target.P, target.H];

  const result = useMemo(() => {
    if (!solvA || !solvB) return null;
    if (mode === 2) {
      const A = [solvA.D, solvA.P, solvA.H];
      const B = [solvB.D, solvB.P, solvB.H];
      const r = bestMixOnSegment(A, B, T);
      return {
        fractionA: 1 - r.t,
        fractionB: r.t,
        fractionC: 0,
        point: r.point,
        distance: r.distance,
        interior: r.interior,
      };
    }
    if (!solvC) return null;
    const A = [solvA.D, solvA.P, solvA.H];
    const B = [solvB.D, solvB.P, solvB.H];
    const C = [solvC.D, solvC.P, solvC.H];
    return bestMixOnTriangle(A, B, C, T);
  }, [solvA, solvB, solvC, mode, target]);

  // Résultat à afficher : optimal ou fraction manuelle (slider)
  const displayResult = useMemo(() => {
    if (mode !== 2 || manualFractionB === null || !solvA || !solvB) return result;
    const fB = manualFractionB, fA = 1 - fB;
    const point = [
      solvA.D * fA + solvB.D * fB,
      solvA.P * fA + solvB.P * fB,
      solvA.H * fA + solvB.H * fB,
    ];
    const distance = Math.sqrt(
      4*(point[0]-target.D)**2 + (point[1]-target.P)**2 + (point[2]-target.H)**2
    );
    return { fractionA: fA, fractionB: fB, fractionC: 0, point, distance, interior: true };
  }, [mode, manualFractionB, solvA, solvB, target, result]);

  // Suggestions auto (paires triées par distance) — utile pour cliquer-charger
  const suggestions = useMemo(() => {
    return findBestMixtures(target, R0, library, { maxResults: 12, requireInterior: true });
  }, [target, R0, library]);

  const setField = (k) => (e) => {
    const v = parseFloat(e.target.value);
    setTarget((t) => ({ ...t, [k]: isNaN(v) ? 0 : v }));
  };

  const setPick = (i) => (e) => {
    const next = [...picks];
    next[i] = e.target.value;
    setPicks(next);
  };

  return (
    <div style={{ padding: "0 4px" }}>

      {/* ── Panneau de contrôle (Cible + Solvants fusionnés) ── */}
      <Panel>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", marginBottom: 8 }}>
          <span style={labelCls}>Cible Hansen</span>
          {[["δD", "D"], ["δP", "P"], ["δH", "H"]].map(([lbl, key]) => (
            <label key={key} style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{lbl}</span>
              <input type="number" step="0.1" value={target[key]} onChange={setField(key)}
                style={inputSm} />
            </label>
          ))}
          <label style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <span style={{ fontSize: 11, color: "var(--text-muted)" }}>R₀</span>
            <input type="number" step="0.1" min="0.1" value={R0}
              onChange={(e) => setR0(Math.max(0.1, parseFloat(e.target.value) || 0.1))}
              style={inputSm} />
          </label>
          <div style={{ marginLeft: "auto", display: "flex", gap: 4 }}>
            {[2, 3].map((n) => (
              <button key={n} onClick={() => setMode(n)} style={tabBtn(mode === n, true)}>
                {n} solv.
              </button>
            ))}
          </div>
        </div>
        <div style={{ display: "grid", gap: 6, gridTemplateColumns: `repeat(${mode}, minmax(0, 1fr))` }}>
          {Array.from({ length: mode }).map((_, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{
                background: ["#3b82f6", "#10b981", "#f59e0b"][i], color: "#fff",
                fontWeight: 700, fontSize: 11, padding: "1px 8px", borderRadius: 999, flexShrink: 0,
              }}>{String.fromCharCode(65 + i)}</span>
              <SolventSelect value={picks[i]} onChange={setPick(i)} library={library} />
            </div>
          ))}
        </div>
      </Panel>

      {/* ── Fiches solvants ── */}
      {(solvA || solvB) && (
        <Panel>
          <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))" }}>
            {solvA && <SolventCard solvent={solvA} color="#3b82f6" label="A" />}
            {solvB && <SolventCard solvent={solvB} color="#10b981" label="B" />}
            {mode === 3 && solvC && <SolventCard solvent={solvC} color="#f59e0b" label="C" />}
          </div>
        </Panel>
      )}

      {/* ── Résultat compact ── */}
      <Panel accent>
        {!displayResult ? (
          <p style={{ fontSize: 12, color: "var(--text-muted)", margin: 0 }}>Sélectionne tous les solvants.</p>
        ) : mode === 2 ? (
          /* ── Slider binaire interactif ── */
          <div>
            <MixSlider
              solvA={solvA} solvB={solvB}
              fractionB={manualFractionB ?? displayResult.fractionB}
              optimalFractionB={result?.fractionB ?? 0.5}
              onChange={setManualFractionB}
              onReset={() => setManualFractionB(null)}
              isManual={manualFractionB !== null}
            />
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", marginTop: 8 }}>
              {[["δD", 0], ["δP", 1], ["δH", 2]].map(([lbl, idx]) => (
                <span key={lbl} style={{ fontSize: 12 }}>
                  <span style={{ color: "var(--text-muted)" }}>{lbl} </span>
                  <strong style={{ color: "var(--text)", fontVariantNumeric: "tabular-nums" }}>
                    {fmt(displayResult.point[idx])}
                  </strong>
                </span>
              ))}
              <span style={{
                padding: "3px 10px", borderRadius: 999, fontSize: 12, fontWeight: 700,
                background: displayResult.distance <= R0 ? "#dcfce7" : "#fee2e2",
                color: displayResult.distance <= R0 ? "#166534" : "#991b1b",
              }}>
                d={fmt(displayResult.distance, 3)} {displayResult.distance <= R0 ? `≤ R₀=${fmt(R0, 1)} ✓` : `> R₀=${fmt(R0, 1)} ✗`}
              </span>
            </div>
          </div>
        ) : (
          /* ── Mini-barres ternaires ── */
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "center" }}>
            <div style={{ flex: "1 1 180px" }}>
              <MiniBar label={solvA?.name} value={displayResult.fractionA} color="#3b82f6" />
              <MiniBar label={solvB?.name} value={displayResult.fractionB} color="#10b981" />
              <MiniBar label={solvC?.name} value={displayResult.fractionC} color="#f59e0b" />
            </div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
              {[["δD", 0], ["δP", 1], ["δH", 2]].map(([lbl, idx]) => (
                <span key={lbl} style={{ fontSize: 12 }}>
                  <span style={{ color: "var(--text-muted)" }}>{lbl} </span>
                  <strong style={{ color: "var(--text)", fontVariantNumeric: "tabular-nums" }}>
                    {fmt(displayResult.point[idx])}
                  </strong>
                </span>
              ))}
              <span style={{
                padding: "3px 10px", borderRadius: 999, fontSize: 12, fontWeight: 700,
                background: displayResult.distance <= R0 ? "#dcfce7" : "#fee2e2",
                color: displayResult.distance <= R0 ? "#166534" : "#991b1b",
              }}>
                d={fmt(displayResult.distance, 3)} {displayResult.distance <= R0 ? `≤ R₀=${fmt(R0, 1)} ✓` : `> R₀=${fmt(R0, 1)} ✗`}
              </span>
            </div>
          </div>
        )}
      </Panel>

      {/* ── Visualisation ── */}
      <Panel>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
          <div style={{ display: "flex", gap: 4 }}>
            {["2D", "3D"].map((v) => (
              <button key={v} onClick={() => setView(v)} style={tabBtn(view === v, true)}>{v}</button>
            ))}
          </div>
          <button onClick={() => setShowLib((v) => !v)} style={tabBtn(!showLib, true)}>
            {showLib ? "Masquer fond" : "Afficher fond"}
          </button>
          {view === "2D" && (
            <button onClick={() => setShowDistCalc((v) => !v)} style={tabBtn(showDistCalc, true)}>
              d⊥
            </button>
          )}
          {view === "3D" && solvA && solvB && (
            <button onClick={() => setShowDistModal(true)} style={tabBtn(false, true)}>
              Calcul d⊥
            </button>
          )}
          <span style={{ fontSize: 11, color: "var(--text-muted)", marginLeft: "auto" }}>
            Clic solvant → emplacement <strong>{String.fromCharCode(65 + nextSlot)}</strong>
          </span>
        </div>
        {view === "2D" ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 12 }}>
            {[["PH", "δP × δH"], ["DP", "2δD × δP"], ["DH", "2δD × δH"]].map(([id, label]) => (
              <div key={id} style={{ background: "var(--bg-subtle, #fafafa)", border: "1px solid var(--border)", borderRadius: 8, padding: 8 }}>
                <Plot2D
                  title={label}
                  target={target} R0={R0} proj={id}
                  solvA={solvA} solvB={solvB} solvC={solvC}
                  mode={mode} mixture={displayResult} library={library}
                  showLib={showLib} showDistCalc={showDistCalc}
                  onPickSolvent={handlePickFromGraph}
                />
              </div>
            ))}
          </div>
        ) : (
          <Suspense fallback={<div style={{ padding: 32, textAlign: "center", color: "var(--text-muted)" }}>Chargement 3D…</div>}>
            <Plot3D target={target} R0={R0} solvA={solvA} solvB={solvB} solvC={solvC} mode={mode} mixture={displayResult} showLib={showLib} onPickSolvent={handlePickFromGraph} />
          </Suspense>
        )}
      </Panel>

      {/* ── Suggestions ── */}
      <Panel>
        <p style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 0.5, margin: "0 0 6px" }}>
          Suggestions binaires — cliquer pour charger
        </p>
        {suggestions.length === 0 ? (
          <p style={{ fontSize: 12, color: "var(--text-muted)", margin: 0 }}>Aucune paire ne traverse la sphère cible.</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11, fontVariantNumeric: "tabular-nums" }}>
              <thead>
                <tr>
                  <th style={thCls}>Solvant A</th><th style={thCls}>Solvant B</th>
                  <th style={thCls}>% A</th><th style={thCls}>% B</th>
                  <th style={{ ...thCls, color: ACCENT }}>Distance</th>
                </tr>
              </thead>
              <tbody>
                {suggestions.map((r) => (
                  <tr key={`${r.a.name}|${r.b.name}`}
                    onClick={() => { setMode(2); setPicks([r.a.name, r.b.name, picks[2]]); }}
                    style={{ cursor: "pointer", borderBottom: "1px solid var(--border)" }}
                    onMouseEnter={(e) => e.currentTarget.style.background = "var(--bg-subtle, #f9fafb)"}
                    onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}>
                    <td style={tdCls}>{r.a.name}</td>
                    <td style={tdCls}>{r.b.name}</td>
                    <td style={tdCls}>{(r.fractionA * 100).toFixed(1)}</td>
                    <td style={tdCls}>{(r.fractionB * 100).toFixed(1)}</td>
                    <td style={{ ...tdCls, color: ACCENT, fontWeight: 700 }}>{r.distance.toFixed(3)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
      {showDistModal && solvA && solvB && (
        <DistCalcModal solvA={solvA} solvB={solvB} target={target} R0={R0} result={result} onClose={() => setShowDistModal(false)} />
      )}
    </div>
  );
}

// ─── Sub-components ─────────────────────────────────────────────────────────

function Panel({ accent, children }) {
  return (
    <div style={{
      padding: "10px 12px", marginBottom: 8,
      background: "var(--bg-card)",
      border: `1px solid ${accent ? ACCENT + "55" : "var(--border)"}`,
      borderRadius: 10,
    }}>
      {children}
    </div>
  );
}

function MixSlider({ solvA, solvB, fractionB, optimalFractionB, onChange, onReset, isManual }) {
  const barRef = useRef(null);
  const dragging = useRef(false);

  const updateFromX = (clientX) => {
    if (!barRef.current) return;
    const rect = barRef.current.getBoundingClientRect();
    if (rect.width === 0) return;
    const raw = (clientX - rect.left) / rect.width;
    if (!isFinite(raw)) return;
    onChange(Math.max(0, Math.min(1, raw)));
  };

  const onMouseDown = (e) => {
    dragging.current = true;
    updateFromX(e.clientX);
    e.preventDefault();
  };
  const onTouchStart = (e) => {
    dragging.current = true;
    updateFromX(e.touches[0].clientX);
  };

  useEffect(() => {
    const onMove  = (e) => { if (dragging.current) updateFromX(e.clientX); };
    const onTMove = (e) => { if (dragging.current) updateFromX(e.touches[0].clientX); };
    const onUp    = () => { dragging.current = false; };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup",   onUp);
    document.addEventListener("touchmove", onTMove, { passive: true });
    document.addEventListener("touchend",  onUp);
    return () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup",   onUp);
      document.removeEventListener("touchmove", onTMove);
      document.removeEventListener("touchend",  onUp);
    };
  }, []);

  const pctA = ((1 - fractionB) * 100).toFixed(1);
  const pctB = (fractionB * 100).toFixed(1);
  const optPct = optimalFractionB * 100;

  return (
    <div style={{ userSelect: "none" }}>
      {/* Barre */}
      <div ref={barRef} onMouseDown={onMouseDown} onTouchStart={onTouchStart}
        style={{ position: "relative", height: 14, borderRadius: 7, cursor: "ew-resize",
          background: `linear-gradient(to right, #3b82f6, #10b981)` }}>
        {/* Marqueur position optimale */}
        <div style={{
          position: "absolute", top: 0, bottom: 0, left: `${optPct}%`,
          width: 2, background: "rgba(255,255,255,0.55)", transform: "translateX(-50%)",
          pointerEvents: "none",
        }} title="Position optimale" />
        {/* Thumb */}
        <div style={{
          position: "absolute", top: "50%", left: `${fractionB * 100}%`,
          transform: "translate(-50%, -50%)",
          width: 22, height: 22, borderRadius: "50%",
          background: "#fff",
          border: `2.5px solid ${isManual ? ACCENT : "#475569"}`,
          boxShadow: "0 1px 5px rgba(0,0,0,0.22)",
          cursor: "ew-resize", zIndex: 1,
        }} />
      </div>
      {/* Labels dessous */}
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, gap: 8 }}>
        <div style={{ textAlign: "left", minWidth: 0 }}>
          <div style={{ fontSize: 11, color: "#3b82f6", fontWeight: 700,
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {solvA.name}
          </div>
          <div style={{ fontSize: 14, fontWeight: 800, fontVariantNumeric: "tabular-nums", color: "#3b82f6" }}>
            {pctA} %
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
          {isManual && (
            <button onClick={onReset} title="Revenir au mélange optimal"
              style={{ fontSize: 10, padding: "2px 8px", borderRadius: 5, border: `1px solid ${ACCENT}`,
                background: "transparent", color: ACCENT, cursor: "pointer", fontWeight: 700, whiteSpace: "nowrap" }}>
              ↩ optimal
            </button>
          )}
        </div>
        <div style={{ textAlign: "right", minWidth: 0 }}>
          <div style={{ fontSize: 11, color: "#10b981", fontWeight: 700,
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {solvB.name}
          </div>
          <div style={{ fontSize: 14, fontWeight: 800, fontVariantNumeric: "tabular-nums", color: "#10b981" }}>
            {pctB} %
          </div>
        </div>
      </div>
    </div>
  );
}

function MiniBar({ label, value, color }) {
  const pct = Math.max(0, Math.min(1, value)) * 100;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
      <span style={{ fontSize: 11, color: "var(--text)", minWidth: 120, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{label}</span>
      <div style={{ flex: 1, height: 6, background: "var(--bg-subtle, #f3f4f6)", borderRadius: 3, overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: 3 }} />
      </div>
      <span style={{ fontSize: 11, fontVariantNumeric: "tabular-nums", color: "var(--text-muted)", minWidth: 36, textAlign: "right" }}>{pct.toFixed(1)}%</span>
    </div>
  );
}

function SolventSelect({ value, onChange, library }) {
  return (
    <select value={value} onChange={onChange} style={{
      flex: 1, minWidth: 0, padding: "4px 6px", fontSize: 12, borderRadius: 5,
      border: "1px solid var(--border)", background: "var(--bg-card)",
      color: "var(--text)", cursor: "pointer",
    }}>
      {library.map((s) => (
        <option key={s.name} value={s.name}>
          {s.name} — δD={s.D}, δP={s.P}, δH={s.H}
        </option>
      ))}
    </select>
  );
}

// ─── Popup calcul distance perpendiculaire ───────────────────────────────────

function DistCalcModal({ solvA, solvB, target, R0, result, onClose }) {
  // Espace normalisé Hansen : (2δD, δP, δH) → distance euclidienne = distance Hansen
  const a = [2 * solvA.D, solvA.P, solvA.H];
  const b = [2 * solvB.D, solvB.P, solvB.H];
  const t = [2 * target.D, target.P, target.H];

  // Vecteur directeur u = B' - A'
  const u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  const u2 = u[0] ** 2 + u[1] ** 2 + u[2] ** 2; // |u|²

  // Vecteur AT' = T' - A'
  const at = [t[0] - a[0], t[1] - a[1], t[2] - a[2]];

  // Produit scalaire AT' · u
  const dot = at[0] * u[0] + at[1] * u[1] + at[2] * u[2];

  // Paramètre t (non clampé → droite infinie)
  const tLine = u2 > 0 ? dot / u2 : 0;

  // Pied de la perpendiculaire sur la droite (non clampé)
  const mLine = [a[0] + tLine * u[0], a[1] + tLine * u[1], a[2] + tLine * u[2]];

  // Distance T' → M'_droite = distance perpendiculaire (droite infinie)
  const dPerp = Math.sqrt((t[0]-mLine[0])**2 + (t[1]-mLine[1])**2 + (t[2]-mLine[2])**2);

  // Pied clampé sur le segment [0,1] → résultat optimal
  const tSeg = Math.max(0, Math.min(1, tLine));
  const mSeg = [a[0] + tSeg * u[0], a[1] + tSeg * u[1], a[2] + tSeg * u[2]];
  const dSeg = Math.sqrt((t[0]-mSeg[0])**2 + (t[1]-mSeg[1])**2 + (t[2]-mSeg[2])**2);

  // M sur la droite en coordonnées originales (MPa½)
  const mLineOrig = [mLine[0] / 2, mLine[1], mLine[2]];
  const mSegOrig  = [mSeg[0] / 2, mSeg[1], mSeg[2]];

  const f = (v, d = 3) => Number(v).toFixed(d);
  const vec = ([x, y, z], d = 3) => `(${f(x,d)}, ${f(y,d)}, ${f(z,d)})`;

  const Row = ({ label, value, accent }) => (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "3px 0",
      borderBottom: "1px solid var(--border)", fontSize: 12 }}>
      <span style={{ color: "var(--text-muted)", fontWeight: 600 }}>{label}</span>
      <span style={{ fontFamily: "monospace", color: accent ? "#6366f1" : "var(--text)", fontWeight: accent ? 700 : 400 }}>{value}</span>
    </div>
  );

  const Sec = ({ title }) => (
    <p style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase",
      letterSpacing: 0.5, margin: "14px 0 4px" }}>{title}</p>
  );

  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)",
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000,
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        background: "var(--bg-card)", borderRadius: 14, padding: "20px 24px",
        maxWidth: 480, width: "90vw", maxHeight: "85vh", overflowY: "auto",
        boxShadow: "0 20px 60px rgba(0,0,0,0.25)",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <span style={{ fontWeight: 700, fontSize: 15, color: "var(--text)" }}>
            Calcul de la distance perpendiculaire
          </span>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 18,
            cursor: "pointer", color: "var(--text-muted)", lineHeight: 1, padding: "0 4px" }}>✕</button>
        </div>

        <Sec title="Points Hansen (MPa½)" />
        <Row label={`A — ${solvA.name}`} value={`δD=${f(solvA.D,2)}, δP=${f(solvA.P,2)}, δH=${f(solvA.H,2)}`} />
        <Row label={`B — ${solvB.name}`} value={`δD=${f(solvB.D,2)}, δP=${f(solvB.P,2)}, δH=${f(solvB.H,2)}`} />
        <Row label="T (cible)"           value={`δD=${f(target.D,2)}, δP=${f(target.P,2)}, δH=${f(target.H,2)}`} />

        <Sec title="Espace normalisé (2δD, δP, δH)" />
        <p style={{ fontSize: 11, color: "var(--text-muted)", margin: "0 0 6px" }}>
          La distance de Hansen {"{"}d² = 4ΔδD² + ΔδP² + ΔδH²{"}"} est la distance euclidienne dans cet espace.
        </p>
        <Row label="A'" value={vec(a)} />
        <Row label="B'" value={vec(b)} />
        <Row label="T'" value={vec(t)} />

        <Sec title="Projection sur la droite AB" />
        <Row label="u = B' − A'"           value={vec(u)} />
        <Row label="|u|²"                  value={f(u2)} />
        <Row label="AT' = T' − A'"         value={vec(at)} />
        <Row label="AT' · u"               value={f(dot)} />
        <Row label="t = (AT'·u) / |u|²"   value={f(tLine)} accent={false} />
        <Row label="M'_droite = A' + t·u"  value={vec(mLine)} />
        <Row label="M_droite (MPa½)"       value={`δD=${f(mLineOrig[0],2)}, δP=${f(mLineOrig[1],2)}, δH=${f(mLineOrig[2],2)}`} />

        <Sec title="Résultat" />
        <Row label="d⊥ (droite infinie)"   value={`${f(dPerp)} MPa½`} accent />
        <Row label={`t ∈ [0,1] ?`}         value={tLine >= 0 && tLine <= 1 ? `✓ t = ${f(tLine, 3)} (segment)` : `✗ t = ${f(tLine, 3)} → clampé à ${f(tSeg, 3)}`} />
        <Row label="M_optimal (MPa½)"      value={`δD=${f(mSegOrig[0],2)}, δP=${f(mSegOrig[1],2)}, δH=${f(mSegOrig[2],2)}`} />
        <Row label="d_segment (optimal)"   value={`${f(dSeg)} MPa½`} accent />
        <div style={{ marginTop: 10, padding: "8px 12px", borderRadius: 8,
          background: dSeg <= R0 ? "#dcfce7" : "#fee2e2",
          color: dSeg <= R0 ? "#166534" : "#991b1b",
          fontSize: 12, fontWeight: 700, textAlign: "center" }}>
          {dSeg <= R0
            ? `✓ Le mélange optimal est dans la sphère (d = ${f(dSeg)} ≤ R₀ = ${f(R0,1)})`
            : `✗ Le mélange optimal est hors sphère (d = ${f(dSeg)} > R₀ = ${f(R0,1)})`}
        </div>
      </div>
    </div>
  );
}

// ─── Visualisation 2D (SVG) ─────────────────────────────────────────────────

function Plot2D({ title, target, R0, proj, solvA, solvB, solvC, mode, mixture, library, showLib, showDistCalc, onPickSolvent }) {
  const [zoom, setZoom] = useState(1);
  const setZoomClamped = (z) => setZoom(Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z)));

  const axes = {
    PH: { x: { key: "H", scale: 1, label: "δH" }, y: { key: "P", scale: 1, label: "δP" } },
    DP: { x: { key: "D", scale: 2, label: "2·δD" }, y: { key: "P", scale: 1, label: "δP" } },
    DH: { x: { key: "D", scale: 2, label: "2·δD" }, y: { key: "H", scale: 1, label: "δH" } },
  }[proj];

  const project = (s) => ({
    x: s[axes.x.key] * axes.x.scale,
    y: s[axes.y.key] * axes.y.scale,
    s,
  });

  const hansen = (s) => Math.sqrt(
    4 * (s.D - target.D) ** 2 + (s.P - target.P) ** 2 + (s.H - target.H) ** 2
  );
  const allPts = library.map((s) => ({ ...project(s), inside: hansen(s) <= R0 }));
  const cx = target[axes.x.key] * axes.x.scale;
  const cy = target[axes.y.key] * axes.y.scale;

  // Equal-span domain (mirrors HSPPlot2D) so the Hansen circle appears circular
  let dataXMax = cx + R0, dataYMax = cy + R0;
  for (const p of allPts) {
    if (p.x > dataXMax) dataXMax = p.x;
    if (p.y > dataYMax) dataYMax = p.y;
  }
  const spanDefault = Math.max(cx + 1.2 * R0, cy + 1.2 * R0, dataXMax + 0.5, dataYMax + 0.5, 5);
  const visibleSpan = spanDefault / zoom;

  let lx = 0, ly = 0;
  if (zoom > 1) {
    lx = Math.max(0, cx - visibleSpan / 2);
    ly = Math.max(0, cy - visibleSpan / 2);
  }
  const ux = lx + visibleSpan;
  const uy = ly + visibleSpan;

  // Square SVG with equal margins → pw == ph → 1 px/unit on both axes
  const W = 420, H = 420;
  const ML = 42, MR = 10, MT = 10, MB = 42;
  const pw = W - ML - MR; // 368
  const ph = H - MT - MB; // 368

  const sx = (x) => ML + ((x - lx) / visibleSpan) * pw;
  const sy = (y) => MT + ph - ((y - ly) / visibleSpan) * ph;

  // Circle drawn as data-space path (guarantees perfect circle when pw==ph)
  const circlePath = (n = 64) => {
    const d = [];
    for (let i = 0; i <= n; i++) {
      const t = (i / n) * 2 * Math.PI;
      const px = sx(cx + R0 * Math.cos(t));
      const py = sy(cy + R0 * Math.sin(t));
      d.push(i === 0 ? `M ${px} ${py}` : `L ${px} ${py}`);
    }
    return d.join(" ") + " Z";
  };

  const A = solvA ? project(solvA) : null;
  const B = solvB ? project(solvB) : null;
  const C = mode === 3 && solvC ? project(solvC) : null;
  const M = mixture ? {
    x: mixture.point[axes.x.key === "D" ? 0 : axes.x.key === "P" ? 1 : 2] * axes.x.scale,
    y: mixture.point[axes.y.key === "D" ? 0 : axes.y.key === "P" ? 1 : 2] * axes.y.scale,
  } : null;

  const xTickVals = ticks([lx, ux], 5);
  const yTickVals = ticks([ly, uy], 5);
  const clipId = `clip-mix-${proj}`;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 0.5 }}>
          {title}
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
          <button
            onClick={() => setZoomClamped(zoom / 1.3)} disabled={zoom <= MIN_ZOOM}
            style={{ padding: "1px 7px", border: "1px solid var(--border)", borderRadius: 4, background: "transparent", cursor: zoom <= MIN_ZOOM ? "default" : "pointer", fontSize: 14, color: "var(--text-muted)" }}>
            −
          </button>
          <button
            onClick={() => setZoom(1)}
            style={{ padding: "1px 5px", border: "1px solid var(--border)", borderRadius: 4, background: "transparent", cursor: "pointer", fontSize: 10, color: "var(--text-muted)" }}>
            ⟳
          </button>
          <button
            onClick={() => setZoomClamped(zoom * 1.3)} disabled={zoom >= MAX_ZOOM}
            style={{ padding: "1px 7px", border: "1px solid var(--border)", borderRadius: 4, background: "transparent", cursor: zoom >= MAX_ZOOM ? "default" : "pointer", fontSize: 14, color: "var(--text-muted)" }}>
            +
          </button>
          <span style={{ fontFamily: "monospace", fontSize: 10, color: "var(--text-muted)", marginLeft: 2 }}>
            ×{zoom.toFixed(2)}
          </span>
        </div>
      </div>
      <div
        onWheel={(e) => { e.preventDefault(); setZoomClamped(zoom * (e.deltaY < 0 ? 1.15 : 1 / 1.15)); }}
        style={{ touchAction: "none" }}
      >
        <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", display: "block" }}>
          <defs>
            <clipPath id={clipId}>
              <rect x={ML} y={MT} width={pw} height={ph} />
            </clipPath>
          </defs>

          {/* Grid */}
          {xTickVals.map((tk) => (
            <line key={`vx${tk}`} x1={sx(tk)} y1={MT} x2={sx(tk)} y2={MT + ph} stroke="#e5e7eb" strokeWidth="1" />
          ))}
          {yTickVals.map((tk) => (
            <line key={`hy${tk}`} x1={ML} y1={sy(tk)} x2={ML + pw} y2={sy(tk)} stroke="#e5e7eb" strokeWidth="1" />
          ))}

          {/* Axes */}
          <line x1={ML} y1={MT + ph} x2={ML + pw} y2={MT + ph} stroke="#9ca3af" />
          <line x1={ML} y1={MT} x2={ML} y2={MT + ph} stroke="#9ca3af" />

          {/* Tick labels */}
          {xTickVals.map((tk) => (
            <text key={`xt${tk}`} x={sx(tk)} y={MT + ph + 14} textAnchor="middle" style={{ fontSize: 10, fill: "#6b7280" }}>{tk}</text>
          ))}
          {yTickVals.map((tk) => (
            <text key={`yt${tk}`} x={ML - 6} y={sy(tk) + 3} textAnchor="end" style={{ fontSize: 10, fill: "#6b7280" }}>{tk}</text>
          ))}

          {/* Axis labels */}
          <text x={ML + pw / 2} y={H - 4} textAnchor="middle" style={{ fontSize: 11, fill: "#374151" }}>{axes.x.label}</text>
          <text x={14} y={MT + ph / 2} textAnchor="middle" transform={`rotate(-90 14 ${MT + ph / 2})`} style={{ fontSize: 11, fill: "#374151" }}>{axes.y.label}</text>

          {/* Clipped plot content */}
          <g clipPath={`url(#${clipId})`}>
            {/* Hansen circle (data-space path → true circle when pw==ph) */}
            <path d={circlePath()} fill={ACCENT + "22"} stroke={ACCENT} strokeWidth="1.5" strokeDasharray="3 3" />

            {/* Library solvents (masquables) */}
            {showLib && allPts.map((p, i) => (
              <g key={i} onClick={() => onPickSolvent && onPickSolvent(p.s.name)}
                 style={{ cursor: onPickSolvent ? "pointer" : "default" }}>
                <circle cx={sx(p.x)} cy={sy(p.y)} r={8} fill="transparent" />
                <circle cx={sx(p.x)} cy={sy(p.y)} r={3.5}
                  fill={p.inside ? "#10b981" : "#ef4444"} opacity={p.inside ? 0.9 : 0.55} />
                <title>{p.s.name} (δD={p.s.D}, δP={p.s.P}, δH={p.s.H})</title>
              </g>
            ))}

            {/* Segment / triangle */}
            {A && B && (
              mode === 3 && C ? (
                <polygon
                  points={`${sx(A.x)},${sy(A.y)} ${sx(B.x)},${sy(B.y)} ${sx(C.x)},${sy(C.y)}`}
                  fill={ACCENT + "11"} stroke="#94a3b8" strokeWidth="1" strokeDasharray="2 4"
                />
              ) : (
                <line x1={sx(A.x)} y1={sy(A.y)} x2={sx(B.x)} y2={sy(B.y)}
                  stroke="#94a3b8" strokeWidth="1.5" strokeDasharray="2 4" />
              )
            )}

            {/* Distance perpendiculaire T → M */}
            {showDistCalc && A && B && M && (() => {
              const tx = sx(cx), ty = sy(cy);
              const mx2 = sx(M.x), my2 = sy(M.y);
              const midX = (tx + mx2) / 2, midY = (ty + my2) / 2;
              // vecteur AB en SVG coords pour le marqueur d'angle droit
              const abx = sx(B.x) - sx(A.x), aby = sy(B.y) - sy(A.y);
              const abLen = Math.sqrt(abx * abx + aby * aby) || 1;
              const uabx = abx / abLen, uaby = aby / abLen;
              const sz = 6; // taille du carré angle droit
              const qx = mx2 + uabx * sz, qy = my2 + uaby * sz;
              const qpx = qx - uaby * sz, qpy = qy + uabx * sz;
              const pp = mx2 - uaby * sz, ppy = my2 + uabx * sz;
              return (
                <g style={{ pointerEvents: "none" }}>
                  {/* Ligne T → M */}
                  <line x1={tx} y1={ty} x2={mx2} y2={my2}
                    stroke="#6366f1" strokeWidth="1.5" strokeDasharray="5 3" />
                  {/* Carré angle droit à M (si point intérieur) */}
                  {mixture?.interior && (
                    <polyline
                      points={`${qx},${qy} ${qpx},${qpy} ${pp},${ppy}`}
                      fill="none" stroke="#6366f1" strokeWidth="1" />
                  )}
                  {/* Label distance */}
                  <text x={midX + 5} y={midY - 4}
                    style={{ fontSize: 10, fontWeight: 700, fill: "white", paintOrder: "stroke", stroke: "white", strokeWidth: 3 }}>
                    d={mixture?.distance.toFixed(3)}
                  </text>
                  <text x={midX + 5} y={midY - 4}
                    style={{ fontSize: 10, fontWeight: 700, fill: "#6366f1" }}>
                    d={mixture?.distance.toFixed(3)}
                  </text>
                </g>
              );
            })()}

            {/* Mixture optimal point */}
            {M && (
              <g>
                <circle cx={sx(M.x)} cy={sy(M.y)} r={6} fill="#fff" stroke="#111827" strokeWidth="1.5" />
                <circle cx={sx(M.x)} cy={sy(M.y)} r={2.5} fill="#111827" />
              </g>
            )}

            {/* Selected solvents */}
            {A && <PointMark cx={sx(A.x)} cy={sy(A.y)} fill="#3b82f6" label="A" name={solvA.name} />}
            {B && <PointMark cx={sx(B.x)} cy={sy(B.y)} fill="#10b981" label="B" name={solvB.name} />}
            {mode === 3 && C && <PointMark cx={sx(C.x)} cy={sy(C.y)} fill="#f59e0b" label="C" name={solvC.name} />}

            {/* Target */}
            <PointMark cx={sx(cx)} cy={sy(cy)} fill={ACCENT} label="T" />
          </g>
        </svg>
      </div>
    </div>
  );
}

function PointMark({ cx, cy, fill, label, name }) {
  return (
    <g style={{ pointerEvents: "none" }}>
      <circle cx={cx} cy={cy} r={7} fill={fill} stroke="#fff" strokeWidth="1.5" />
      <text x={cx} y={cy + 3} textAnchor="middle" style={{ fontSize: 9, fill: "#fff", fontWeight: 700 }}>{label}</text>
      {name && (
        <g>
          <text x={cx + 10} y={cy - 4} textAnchor="start"
            style={{ fontSize: 11, fill: "#fff", fontWeight: 700, paintOrder: "stroke", stroke: "#fff", strokeWidth: 4 }}>
            {name}
          </text>
          <text x={cx + 10} y={cy - 4} textAnchor="start"
            style={{ fontSize: 11, fill: fill, fontWeight: 700 }}>
            {name}
          </text>
        </g>
      )}
    </g>
  );
}

function ticks(domain, step) {
  const out = [];
  const a = Math.ceil(domain[0] / step) * step;
  for (let v = a; v <= domain[1]; v += step) out.push(+v.toFixed(6));
  return out;
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const labelCls = {
  fontSize: 10, fontWeight: 700, color: "var(--text-muted)",
  textTransform: "uppercase", letterSpacing: 0.5, whiteSpace: "nowrap",
};

const inputSm = {
  width: 54, padding: "3px 5px", fontSize: 12, borderRadius: 5,
  border: "1px solid var(--border)", background: "var(--bg-card)",
  color: "var(--text)", fontVariantNumeric: "tabular-nums",
};

const gridCls = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))",
  gap: 12,
};

const subtitleCls = {
  fontSize: 11, fontWeight: 700, color: "var(--text-muted)",
  textTransform: "uppercase", letterSpacing: 0.5, marginTop: 0, marginBottom: 8,
};

const thCls = {
  textAlign: "left", fontSize: 11, fontWeight: 700, color: "var(--text-muted)",
  textTransform: "uppercase", letterSpacing: 0.4, padding: "10px 12px", whiteSpace: "nowrap",
};

const tdCls = {
  padding: "8px 12px", color: "var(--text)", whiteSpace: "nowrap",
};

function tabBtn(active, small) {
  return {
    padding: small ? "5px 10px" : "7px 14px",
    fontSize: small ? 11 : 12,
    fontWeight: 600,
    borderRadius: 6,
    border: `1px solid ${active ? ACCENT : "var(--border)"}`,
    background: active ? ACCENT : "transparent",
    color: active ? "#fff" : "var(--text)",
    cursor: "pointer",
  };
}
