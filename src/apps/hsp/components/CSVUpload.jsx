import { useCallback, useRef, useState } from "react"
import Papa from "papaparse"
import { EXAMPLES } from "../examples"

const ACCENT = "#ea580c"

// Accept both the hspipy convention (D,P,H,Score) and the HSPiP library (dD,dP,dH,Score optional).
const COL_ALIASES = {
  solvent: ["solvent", "name", "nom"],
  D: ["d", "dd", "δd"],
  P: ["p", "dp", "δp"],
  H: ["h", "dh", "δh"],
  score: ["score", "note"],
}

function pickColumn(fields, aliases) {
  const lower = fields.map(f => (f ?? "").toString().trim().toLowerCase())
  for (const a of aliases) {
    const i = lower.indexOf(a)
    if (i !== -1) return fields[i]
  }
  return null
}

function normalize(rows, fields) {
  const solventCol = pickColumn(fields, COL_ALIASES.solvent)
  const dCol = pickColumn(fields, COL_ALIASES.D)
  const pCol = pickColumn(fields, COL_ALIASES.P)
  const hCol = pickColumn(fields, COL_ALIASES.H)
  const scoreCol = pickColumn(fields, COL_ALIASES.score)
  if (!dCol || !pCol || !hCol) {
    throw new Error("CSV doit contenir les colonnes D, P, H (ou dD, dP, dH).")
  }
  return rows
    .filter(r => r[dCol] !== null && r[dCol] !== undefined && r[dCol] !== "")
    .map((r, i) => ({
      solvent: (r[solventCol] ?? `Solvant ${i + 1}`).toString(),
      D: Number(r[dCol]),
      P: Number(r[pCol]),
      H: Number(r[hCol]),
      score: scoreCol && r[scoreCol] !== "" && r[scoreCol] !== null ? Number(r[scoreCol]) : null,
    }))
}

export default function CSVUpload({ onLoaded, onError, onBlank }) {
  const inputRef = useRef(null)
  const [dragOver, setDragOver] = useState(false)
  const [fileName, setFileName] = useState("")

  const parseText = useCallback((text, name) => {
    Papa.parse(text, {
      header: true,
      dynamicTyping: true,
      skipEmptyLines: true,
      complete: (res) => {
        try {
          const data = normalize(res.data, res.meta.fields || [])
          if (data.length === 0) throw new Error("Aucune donnée valide dans le CSV.")
          setFileName(name || "")
          onLoaded({ data, fileName: name })
        } catch (e) { onError(e.message) }
      },
      error: (err) => onError(err.message),
    })
  }, [onLoaded, onError])

  const handleFile = useCallback((file) => {
    const reader = new FileReader()
    reader.onload = e => parseText(e.target.result, file.name)
    reader.onerror = () => onError("Erreur de lecture du fichier.")
    reader.readAsText(file)
  }, [parseText, onError])

  const onDrop = (e) => {
    e.preventDefault(); setDragOver(false)
    const f = e.dataTransfer.files?.[0]
    if (f) handleFile(f)
  }

  const loadExample = (ex) => parseText(ex.csv, ex.fileName)

  return (
    <div
      onDragOver={e => { e.preventDefault(); setDragOver(true) }}
      onDragLeave={() => setDragOver(false)}
      onDrop={onDrop}
      onClick={() => inputRef.current?.click()}
      style={{
        border: `2px dashed ${dragOver ? ACCENT : "var(--border)"}`,
        borderRadius: 12,
        padding: "clamp(20px, 4vw, 32px)",
        background: dragOver ? `${ACCENT}10` : "var(--bg-card)",
        textAlign: "center",
        cursor: "pointer",
        transition: "all .15s",
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".csv,text/csv"
        style={{ display: "none" }}
        onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
      />
      <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: "var(--text)" }}>
        {fileName ? `✓ ${fileName}` : "Déposer un fichier CSV ou cliquer pour choisir"}
      </p>
      <p style={{ margin: "6px 0 12px", fontSize: 11, color: "var(--text-muted)" }}>
        Colonnes attendues : Solvent, D, P, H, Score (ou dD, dP, dH)
      </p>
      <div style={{ display: "flex", gap: 6, justifyContent: "center", flexWrap: "wrap" }} onClick={e => e.stopPropagation()}>
        <button
          type="button"
          onClick={onBlank}
          title="Commencer avec un tableau vierge"
          style={{
            fontSize: 12, fontWeight: 700, padding: "6px 12px", borderRadius: 8,
            background: ACCENT, border: `1px solid ${ACCENT}`, color: "#fff", cursor: "pointer",
          }}
        >
          Saisie vierge
        </button>
        <span style={{ fontSize: 11, color: "var(--text-muted)", alignSelf: "center" }}>ou un exemple :</span>
        {EXAMPLES.map(ex => (
          <button
            key={ex.id}
            type="button"
            title={ex.description}
            onClick={() => loadExample(ex)}
            style={{
              fontSize: 12, fontWeight: 600, padding: "6px 12px", borderRadius: 8,
              background: `${ACCENT}15`, border: `1px solid ${ACCENT}40`, color: ACCENT, cursor: "pointer",
            }}
          >
            {ex.label}
          </button>
        ))}
      </div>
    </div>
  )
}
