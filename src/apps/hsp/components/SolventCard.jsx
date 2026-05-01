import { useEffect, useRef } from "react";

// ── SMILES renderer ───────────────────────────────────────────────────────────

const SD_OPTIONS = {
  width: 260,
  height: 200,
  bondThickness: 1.4,
  bondLength: 18,
  shortBondLength: 0.85,
  bondSpacing: 5.6,
  atomVisualization: "default",
  fontSizeLarge: 7,
  fontSizeSmall: 5.5,
  padding: 18,
  compactDrawing: false,
  explicitHydrogens: false,
  terminalCarbons: false,
  themes: {
    light: {
      C: "#1e293b",
      O: "#dc2626",
      N: "#2563eb",
      F: "#16a34a",
      CL: "#16a34a",
      BR: "#b45309",
      I: "#7c3aed",
      P: "#ea580c",
      S: "#ca8a04",
      B: "#dc2626",
      SI: "#475569",
      H: "#64748b",
      BACKGROUND: "#ffffff",
    },
  },
};

function MoleculeCanvas({ smiles, width = 260, height = 200 }) {
  const ref = useRef(null);

  useEffect(() => {
    if (!smiles || !ref.current) return;
    let cancelled = false;
    const canvas = ref.current;
    const dpr = window.devicePixelRatio || 1;

    // High-DPI canvas
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    const ctx = canvas.getContext("2d");
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, width, height);

    import("smiles-drawer").then(({ default: SmilesDrawer }) => {
      if (cancelled || !ref.current) return;
      const drawer = new SmilesDrawer.Drawer({ ...SD_OPTIONS, width, height });
      SmilesDrawer.parse(
        smiles,
        (tree) => { if (!cancelled && ref.current) drawer.draw(tree, canvas, "light"); },
        (err) => console.warn("SmilesDrawer:", err),
      );
    });

    return () => { cancelled = true; };
  }, [smiles, width, height]);

  if (!smiles) {
    return (
      <div style={{
        width, height, display: "flex", alignItems: "center", justifyContent: "center",
        background: "var(--bg-subtle, #f8fafc)", borderRadius: 8,
        border: "1px dashed var(--border)", color: "var(--text-muted)", fontSize: 12,
        flexShrink: 0,
      }}>
        Pas de SMILES
      </div>
    );
  }

  return (
    <canvas
      ref={ref}
      style={{
        width, height, borderRadius: 8, background: "#fff",
        border: "1px solid var(--border)", display: "block", flexShrink: 0,
      }}
    />
  );
}

// ── Property rows ─────────────────────────────────────────────────────────────

function Section({ label }) {
  return (
    <p style={{
      fontSize: 10, fontWeight: 700, color: "var(--text-muted)",
      textTransform: "uppercase", letterSpacing: 0.5, margin: "10px 0 4px",
    }}>
      {label}
    </p>
  );
}

function PropRow({ label, value, unit }) {
  if (value == null) return null;
  return (
    <div style={{
      display: "flex", justifyContent: "space-between", gap: 8,
      padding: "3px 0", fontSize: 12, borderBottom: "1px solid var(--border)",
    }}>
      <span style={{ color: "var(--text-muted)", fontWeight: 600, whiteSpace: "nowrap" }}>{label}</span>
      <span style={{ color: "var(--text)", fontVariantNumeric: "tabular-nums", textAlign: "right", whiteSpace: "nowrap" }}>
        {value}
        {unit && <span style={{ color: "var(--text-muted)", marginLeft: 3, fontSize: 11 }}>{unit}</span>}
      </span>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function SolventCard({ solvent, color, label }) {
  if (!solvent) return null;

  const f = (v, d = 1) => (v != null && isFinite(Number(v)) ? Number(v).toFixed(d) : null);

  return (
    <div style={{
      border: `1.5px solid ${color}44`,
      borderRadius: 12,
      padding: 16,
      background: "var(--bg-card)",
      display: "flex",
      flexDirection: "column",
      gap: 12,
    }}>
      {/* ── Header ── */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <span style={{
          background: color, color: "#fff", fontWeight: 700, fontSize: 12,
          padding: "2px 10px", borderRadius: 999, flexShrink: 0,
        }}>{label}</span>
        <span style={{ fontWeight: 700, fontSize: 15, color: "var(--text)" }}>{solvent.name}</span>
        {solvent.cas && (
          <span style={{ fontSize: 11, color: "var(--text-muted)", marginLeft: "auto", whiteSpace: "nowrap" }}>
            CAS {solvent.cas}
          </span>
        )}
      </div>

      {/* ── Body: molecule + props ── */}
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "flex-start" }}>
        {/* Molecule */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
          <MoleculeCanvas smiles={solvent.smiles} width={220} height={180} />
          {solvent.smiles && (
            <p style={{
              fontSize: 10, fontFamily: "monospace", color: "var(--text-muted)",
              wordBreak: "break-all", margin: 0, textAlign: "center", maxWidth: 220,
            }}>
              {solvent.smiles}
            </p>
          )}
        </div>

        {/* Properties */}
        <div style={{ flex: 1, minWidth: 160 }}>
          <Section label="Paramètres Hansen" />
          <PropRow label="δD" value={f(solvent.D)} unit="MPa½" />
          <PropRow label="δP" value={f(solvent.P)} unit="MPa½" />
          <PropRow label="δH" value={f(solvent.H)} unit="MPa½" />

          <Section label="Propriétés physiques" />
          <PropRow label="Masse mol." value={f(solvent.mw, 2)} unit="g/mol" />
          <PropRow label="Éb." value={f(solvent.bp, 0)} unit="°C" />
          <PropRow label="Viscosité" value={f(solvent.viscosity, 2)} unit="mPa·s" />
          <PropRow label="Vol. mol." value={f(solvent.moleVol, 1)} unit="cm³/mol" />
          <PropRow label="ΔHvap" value={f(solvent.heatOfVap, 1)} unit="kJ/mol" />
        </div>
      </div>

      {/* ── Synonyms ── */}
      {solvent.synonyms?.length > 0 && (
        <div style={{ paddingTop: 8, borderTop: "1px solid var(--border)" }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 0.5 }}>
            Synonymes :{" "}
          </span>
          <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
            {solvent.synonyms.join(", ")}
          </span>
        </div>
      )}
    </div>
  );
}
