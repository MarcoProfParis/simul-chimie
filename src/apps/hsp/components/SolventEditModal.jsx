import { useState } from "react"

const ACCENT = "#ea580c"

// ─── Champ de formulaire ────────────────────────────────────────────────────
function Field({ label, unit, value, onChange, type = "number", step }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <label style={{ fontSize: 11, fontWeight: 600, letterSpacing: ".04em", color: "var(--text-muted)" }}>
        {label}{unit && <span style={{ fontWeight: 400, marginLeft: 4 }}>({unit})</span>}
      </label>
      <input
        type={type}
        step={step ?? (type === "number" ? "0.01" : undefined)}
        value={value ?? ""}
        onChange={e => onChange(type === "number" ? e.target.value : e.target.value)}
        style={{
          padding: "9px 10px", fontSize: 13, borderRadius: 8,
          border: "1px solid var(--border)", background: "var(--bg-card)",
          color: "var(--text)", width: "100%", boxSizing: "border-box",
        }}
      />
    </div>
  )
}

// ─── Modal bottom-sheet ──────────────────────────────────────────────────────
// Déclenché par double-clic / double-tap sur un point du graphe.
// Affiche toutes les infos du solvant et permet de les modifier.
// onSave(originalName, updatedFields) → appelé par le parent pour mettre à
// jour le tableau de données (et invalider le résultat de l'ajustement).
export default function SolventEditModal({ solvent, onClose, onSave }) {
  const [form, setForm] = useState({
    solvent: solvent.solvent ?? "",
    D:       solvent.D     ?? "",
    P:       solvent.P     ?? "",
    H:       solvent.H     ?? "",
    score:   solvent.score != null ? solvent.score : "",
  })
  const [error, setError] = useState("")

  const set = (key) => (val) => setForm(f => ({ ...f, [key]: val }))

  const handleSave = () => {
    const D = parseFloat(form.D), P = parseFloat(form.P), H = parseFloat(form.H)
    if (isNaN(D) || isNaN(P) || isNaN(H)) {
      setError("δD, δP et δH doivent être des nombres valides.")
      return
    }
    const score = form.score === "" || form.score == null ? null : parseFloat(form.score)
    onSave(solvent.solvent, { solvent: form.solvent.trim() || solvent.solvent, D, P, H, score })
  }

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 200 }}
      />

      {/* Bottom sheet – centré sur desktop, pleine largeur sur mobile */}
      <div style={{
        position: "fixed",
        bottom: 0,
        left: "50%",
        transform: "translateX(-50%)",
        width: "min(520px, 100vw)",
        zIndex: 201,
        background: "var(--bg-card)",
        borderRadius: "20px 20px 0 0",
        padding: "12px 20px calc(env(safe-area-inset-bottom, 0px) + 28px)",
        boxShadow: "0 -8px 40px rgba(0,0,0,0.18)",
      }}>

        {/* Drag handle */}
        <div style={{ width: 40, height: 4, borderRadius: 2, background: "var(--border)", margin: "0 auto 14px" }} />

        {/* En-tête */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "var(--text)" }}>
            Modifier le solvant
          </p>
          <button
            onClick={onClose}
            style={{ background: "none", border: "none", cursor: "pointer", fontSize: 22, color: "var(--text-muted)", lineHeight: 1, padding: "0 4px" }}
            aria-label="Fermer"
          >×</button>
        </div>

        {/* Champs */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <Field label="Nom du solvant" type="text" value={form.solvent} onChange={set("solvent")} />

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
            <Field label="δD" unit="MPa½" value={form.D} onChange={set("D")} />
            <Field label="δP" unit="MPa½" value={form.P} onChange={set("P")} />
            <Field label="δH" unit="MPa½" value={form.H} onChange={set("H")} />
          </div>

          <Field
            label="Score"
            unit="0 = incompatible · 1 = compatible"
            value={form.score}
            onChange={set("score")}
            step="1"
          />
        </div>

        {error && (
          <p style={{ margin: "10px 0 0", fontSize: 11, color: "#dc2626" }}>{error}</p>
        )}

        {/* Boutons */}
        <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
          <button
            onClick={handleSave}
            style={{
              flex: 1, padding: "11px 0", fontSize: 13, fontWeight: 700, borderRadius: 10,
              background: ACCENT, color: "#fff", border: "none", cursor: "pointer",
              boxShadow: `0 2px 8px ${ACCENT}40`,
            }}
          >
            Enregistrer
          </button>
          <button
            onClick={onClose}
            style={{
              flex: 1, padding: "11px 0", fontSize: 13, fontWeight: 600, borderRadius: 10,
              background: "transparent", color: "var(--text)",
              border: "1px solid var(--border)", cursor: "pointer",
            }}
          >
            Annuler
          </button>
        </div>
      </div>
    </>
  )
}
