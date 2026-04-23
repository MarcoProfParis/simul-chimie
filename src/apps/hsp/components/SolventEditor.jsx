import { useCallback } from "react"
import { PlusIcon, TrashIcon, XMarkIcon } from "@heroicons/react/24/outline"
import { SOLVENT_LIBRARY } from "../data/solventLibrary"
import SolventCombobox from "./SolventCombobox"

const ACCENT = "#ea580c"

const EMPTY_ROW = () => ({ solvent: "", D: null, P: null, H: null, score: null })

export default function SolventEditor({ data, fileName, onChange, onReset }) {
  const update = useCallback((i, patch) => {
    const next = data.slice()
    next[i] = { ...next[i], ...patch }
    onChange(next)
  }, [data, onChange])

  const onSolventPick = (i, pick) => {
    if (pick.custom) {
      update(i, { solvent: pick.name })
    } else {
      update(i, { solvent: pick.name, D: pick.D, P: pick.P, H: pick.H })
    }
  }

  const addRow = () => onChange([...data, EMPTY_ROW()])
  const removeRow = (i) => onChange(data.filter((_, j) => j !== i))
  const addTenEmpty = () => onChange([...data, ...Array.from({ length: 10 }, EMPTY_ROW)])

  const numberField = (i, key) => (
    <input
      type="number"
      step="0.1"
      value={data[i][key] ?? ""}
      onChange={e => update(i, { [key]: e.target.value === "" ? null : parseFloat(e.target.value) })}
      style={{
        width: "100%", padding: "4px 6px", fontSize: 12, fontFamily: "monospace",
        border: "1px solid var(--border)", borderRadius: 4,
        background: "var(--bg-card)", color: "var(--text)", textAlign: "right",
      }}
    />
  )

  const completeRows = data.filter(r => r.D !== null && r.P !== null && r.H !== null && !isNaN(r.D) && !isNaN(r.P) && !isNaN(r.H))
  const labeledRows = completeRows.filter(r => r.score !== null && !isNaN(r.score))

  // th style with letter-spacing / bold — NO textTransform uppercase so δ stays lowercase.
  const thBase = { padding: "8px 10px", fontSize: 10, fontWeight: 700, color: "var(--text-muted)", letterSpacing: ".06em" }

  return (
    <div style={{
      background: "var(--bg-card)",
      border: "1px solid var(--border)",
      borderRadius: 12,
      overflow: "hidden",
      boxShadow: "var(--shadow)",
    }}>
      <div style={{ padding: "12px 14px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
        <div>
          <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "var(--text)" }}>
            Édition des solvants
          </p>
          <p style={{ margin: "2px 0 0", fontSize: 11, color: "var(--text-muted)" }}>
            {fileName ? `Source : ${fileName} · ` : ""}
            {completeRows.length} solvants complets, {labeledRows.length} étiquetés.
          </p>
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          <button
            onClick={addRow}
            style={{
              display: "inline-flex", alignItems: "center", gap: 4,
              padding: "6px 10px", fontSize: 11, fontWeight: 600, borderRadius: 6,
              background: `${ACCENT}15`, border: `1px solid ${ACCENT}40`, color: ACCENT, cursor: "pointer",
            }}
          >
            <PlusIcon style={{ width: 12, height: 12 }} /> Solvant
          </button>
          <button
            onClick={addTenEmpty}
            style={{
              padding: "6px 10px", fontSize: 11, fontWeight: 600, borderRadius: 6,
              background: "var(--bg-card)", border: "1px solid var(--border)", color: "var(--text-muted)", cursor: "pointer",
            }}
          >
            +10 lignes
          </button>
          <button
            onClick={onReset}
            title="Vider et retourner au choix de source"
            style={{
              display: "inline-flex", alignItems: "center", gap: 4,
              padding: "6px 10px", fontSize: 11, fontWeight: 600, borderRadius: 6,
              background: "var(--bg-card)", border: "1px solid var(--border)", color: "#dc2626", cursor: "pointer",
            }}
          >
            <XMarkIcon style={{ width: 12, height: 12 }} /> Effacer
          </button>
        </div>
      </div>
      <div style={{ overflow: "auto", maxHeight: 380 }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <thead style={{ position: "sticky", top: 0, background: "var(--bg-card)", zIndex: 1 }}>
            <tr style={{ borderBottom: "1px solid var(--border)" }}>
              <th style={{ ...thBase, textAlign: "left" }}>SOLVANT</th>
              <th style={{ ...thBase, textAlign: "right", width: 80 }}>δD</th>
              <th style={{ ...thBase, textAlign: "right", width: 80 }}>δP</th>
              <th style={{ ...thBase, textAlign: "right", width: 80 }}>δH</th>
              <th style={{ ...thBase, textAlign: "right", width: 80 }}>SCORE</th>
              <th style={{ width: 36 }} />
            </tr>
          </thead>
          <tbody>
            {data.length === 0 && (
              <tr>
                <td colSpan={6} style={{ padding: "24px 14px", textAlign: "center", color: "var(--text-muted)", fontSize: 12 }}>
                  Aucun solvant. Clique sur <b>+ Solvant</b> pour commencer.
                </td>
              </tr>
            )}
            {data.map((r, i) => (
              <tr key={i} style={{ borderBottom: "1px solid var(--border)" }}>
                <td style={{ padding: "4px 8px", overflow: "visible" }}>
                  <SolventCombobox
                    value={r.solvent ?? ""}
                    placeholder={`Solvant ${i + 1}`}
                    onPick={(pick) => onSolventPick(i, pick)}
                  />
                </td>
                <td style={{ padding: "4px 8px" }}>{numberField(i, "D")}</td>
                <td style={{ padding: "4px 8px" }}>{numberField(i, "P")}</td>
                <td style={{ padding: "4px 8px" }}>{numberField(i, "H")}</td>
                <td style={{ padding: "4px 8px" }}>{numberField(i, "score")}</td>
                <td style={{ padding: "4px 8px", textAlign: "center" }}>
                  <button
                    onClick={() => removeRow(i)}
                    title="Supprimer la ligne"
                    style={{ background: "none", border: "none", cursor: "pointer", color: "#dc2626", padding: 4, display: "inline-flex" }}
                  >
                    <TrashIcon style={{ width: 13, height: 13 }} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div style={{ padding: "10px 14px", borderTop: "1px solid var(--border)", fontSize: 11, color: "var(--text-muted)", background: "var(--bg)" }}>
        Score : 1 = bon solvant, &gt; seuil = mauvais, vide = non classé (ignoré à l'ajustement). {SOLVENT_LIBRARY.length} solvants dans la base — tape un nom non listé pour saisie libre.
      </div>
    </div>
  )
}

SolventEditor.newBlank = () => [EMPTY_ROW(), EMPTY_ROW(), EMPTY_ROW()]
