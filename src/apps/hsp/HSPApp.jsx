import { useCallback, useEffect, useState } from "react"
import { ArrowLeftIcon, PlayIcon, BookmarkIcon, ClockIcon, TrashIcon, ArrowPathIcon } from "@heroicons/react/24/outline"
import { useAuth } from "../../AuthContext"
import { useLang } from "../../i18n"
import { HSPEstimator } from "./HSPEstimator.js"
import CSVUpload from "./components/CSVUpload"
import ResultsCard from "./components/ResultsCard"
import SolventTable from "./components/SolventTable"
import SolventEditor from "./components/SolventEditor"
import HSPPlot2D from "./components/HSPPlot2D"
import HSPPlot3D from "./components/HSPPlot3D"
import { listFits, saveFit, deleteFit } from "./lib/hspStore"
import { SolventLibraryProvider, useSolventLibrary } from "./SolventLibraryContext"

const ACCENT = "#ea580c"

function PrimaryButton({ children, onClick, disabled, icon: Icon }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        display: "inline-flex", alignItems: "center", gap: 8,
        padding: "9px 18px", fontSize: 13, fontWeight: 700, borderRadius: 8,
        background: disabled ? "#e5e7eb" : ACCENT,
        color: disabled ? "#9ca3af" : "#fff",
        border: "none", cursor: disabled ? "not-allowed" : "pointer",
        boxShadow: disabled ? "none" : `0 2px 8px ${ACCENT}40`,
      }}
    >
      {Icon && <Icon style={{ width: 16, height: 16 }} />}
      {children}
    </button>
  )
}

function GhostButton({ children, onClick, icon: Icon }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "inline-flex", alignItems: "center", gap: 6,
        padding: "7px 12px", fontSize: 12, fontWeight: 600, borderRadius: 8,
        background: "transparent", color: "var(--text)",
        border: "1px solid var(--border)", cursor: "pointer",
      }}
    >
      {Icon && <Icon style={{ width: 14, height: 14 }} />}
      {children}
    </button>
  )
}

function SavedFitsDrawer({ open, onClose, onLoad }) {
  const [items, setItems] = useState(null)
  const [error, setError] = useState("")
  const { t } = useLang()

  const refresh = useCallback(async () => {
    setError("")
    try { setItems(await listFits()) } catch (e) { setError(e.message) }
  }, [])

  useEffect(() => { if (open) refresh() }, [open, refresh])

  if (!open) return null
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.35)", zIndex: 60, display: "flex", justifyContent: "flex-end" }}>
      <div onClick={e => e.stopPropagation()} style={{
        width: "min(420px, 92vw)", height: "100%",
        background: "var(--bg-card)", borderLeft: "1px solid var(--border)",
        padding: 20, overflowY: "auto",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "var(--text)" }}>{t("hsp.savedFits")}</p>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", fontSize: 18 }}>×</button>
        </div>
        {error && <p style={{ fontSize: 12, color: "#dc2626" }}>{error}</p>}
        {items === null && !error && <p style={{ fontSize: 12, color: "var(--text-muted)" }}>{t("hsp.loading")}</p>}
        {items && items.length === 0 && <p style={{ fontSize: 12, color: "var(--text-muted)" }}>{t("hsp.noSavedFits")}</p>}
        {items && items.map(it => (
          <div key={it.id} style={{ border: "1px solid var(--border)", borderRadius: 8, padding: 12, marginBottom: 10, display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{it.name}</p>
              <p style={{ margin: "2px 0 0", fontSize: 11, color: "var(--text-muted)" }}>{new Date(it.created_at).toLocaleString()}</p>
            </div>
            <button
              onClick={() => { onLoad(it); onClose() }}
              style={{ fontSize: 11, fontWeight: 600, padding: "4px 10px", borderRadius: 6, background: `${ACCENT}15`, color: ACCENT, border: `1px solid ${ACCENT}40`, cursor: "pointer" }}
            >{t("hsp.load")}</button>
            <button
              onClick={async () => { if (confirm(t("hsp.deleteConfirm", { name: it.name }))) { await deleteFit(it.id); refresh() } }}
              style={{ background: "none", border: "none", cursor: "pointer", color: "#dc2626", padding: 4 }}
              aria-label={t("editor.delete")}
            ><TrashIcon style={{ width: 14, height: 14 }} /></button>
          </div>
        ))}
      </div>
    </div>
  )
}

function LibrarySourceBadge() {
  const { library, source, loading, refresh } = useSolventLibrary()
  const { t } = useLang()
  const tone =
    source === "supabase" ? "#7c3aed" :
    source === "api"      ? "#16a34a" :
    source === "cache"    ? "#0891b2" :
    "#64748b"
  const label =
    source === "supabase" ? t("hsp.source.db") :
    source === "api"      ? t("hsp.source.api") :
    source === "cache"    ? t("hsp.source.cache") :
    t("hsp.source.local")
  return (
    <div
      title={`${library.length} ${t("hsp.solvents", { n: "" }).trim()} (${source})`}
      style={{
        display: "inline-flex", alignItems: "center", gap: 6,
        padding: "4px 8px", fontSize: 11, fontWeight: 600, borderRadius: 6,
        background: `${tone}18`, border: `1px solid ${tone}40`, color: tone,
      }}
    >
      <span>{t("hsp.solvents", { n: library.length })} · {label}</span>
      <button
        onClick={refresh}
        disabled={loading}
        style={{
          display: "inline-flex", alignItems: "center",
          background: "transparent", border: "none", cursor: loading ? "default" : "pointer",
          color: tone, padding: 0,
        }}
      >
        <ArrowPathIcon style={{ width: 12, height: 12, animation: loading ? "spin 1s linear infinite" : "none" }} />
      </button>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}

function HSPAppInner({ onBack }) {
  const { user } = useAuth()
  const { t } = useLang()
  const [data, setData] = useState(null)
  const [fileName, setFileName] = useState("")
  const [result, setResult] = useState(null)
  const [error, setError] = useState("")
  const [running, setRunning] = useState(false)
  const [insideLimit, setInsideLimit] = useState(1)
  const [view, setView] = useState("2d")
  const [savedOpen, setSavedOpen] = useState(false)
  const [saveName, setSaveName] = useState("")
  const [saveStatus, setSaveStatus] = useState("")

  const handleLoaded = ({ data, fileName }) => {
    setData(data); setFileName(fileName || ""); setResult(null); setError(""); setSaveStatus("")
  }

  const handleBlank = () => {
    setData(SolventEditor.newBlank())
    setFileName(t("csv.blank")); setResult(null); setError(""); setSaveStatus("")
  }

  const handleReset = () => {
    setData(null); setFileName(""); setResult(null); setError(""); setSaveStatus("")
  }

  const handleDataEdit = (next) => {
    setData(next)
    if (result) setResult(null)
  }

  const handleSolventEdit = useCallback((originalName, form) => {
    setData(prev => prev.map(r =>
      r.solvent === originalName
        ? {
            ...r,
            solvent: form.solvent,
            D: parseFloat(form.D),
            P: parseFloat(form.P),
            H: parseFloat(form.H),
            score: form.score !== "" && form.score != null ? parseFloat(form.score) : null,
          }
        : r
    ))
    if (result) setResult(null)
  }, [result])

  const handleFit = async () => {
    if (!data) return
    const usable = data.filter(r => r.D !== null && r.P !== null && r.H !== null && !isNaN(r.D) && !isNaN(r.P) && !isNaN(r.H))
    if (usable.length === 0) { setError(t("hsp.noCompleteRows")); return }
    setRunning(true); setError(""); setResult(null)
    try {
      await new Promise(r => setTimeout(r, 0))
      const X = usable.map(r => [r.D, r.P, r.H])
      const scores = usable.map(r => r.score)
      const est = new HSPEstimator({ insideLimit }).fit(X, scores)
      setResult(est.result())
    } catch (e) { setError(e.message) }
    finally { setRunning(false) }
  }

  const handleSave = async () => {
    setSaveStatus("")
    try {
      await saveFit({ name: saveName || fileName || t("hsp.fit"), solvents: data, insideLimit, result })
      setSaveStatus(t("hsp.saved")); setSaveName("")
    } catch (e) { setSaveStatus(t("hsp.saveError", { msg: e.message })) }
  }

  const loadSaved = (item) => {
    const { solvents, insideLimit: il, result: r } = item.data
    setData(solvents); setFileName(item.name); setResult(r); setInsideLimit(il ?? 1); setError("")
  }

  const labeledCount = data ? data.filter(r => r.score !== null && !isNaN(r.score)).length : 0

  const viewTabs = [
    { id: "2d", label: t("hsp.view2d") },
    { id: "3d", label: t("hsp.view3d") },
  ]

  return (
    <div style={{ background: "var(--bg)", minHeight: "calc(100vh - 56px)", padding: "clamp(16px, 3vw, 28px)" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto", display: "flex", flexDirection: "column", gap: 16 }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <button
            onClick={onBack}
            style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 10px", background: "transparent", border: "1px solid var(--border)", borderRadius: 8, cursor: "pointer", color: "var(--text)", fontSize: 12 }}
          >
            <ArrowLeftIcon style={{ width: 14, height: 14 }} /> {t("hsp.back")}
          </button>
          <div style={{ flex: 1 }}>
            <h1 style={{ margin: 0, fontSize: "clamp(18px, 3vw, 22px)", fontWeight: 800, color: "var(--text)" }}>
              {t("hsp.title")}
            </h1>
            <p style={{ margin: "2px 0 0", fontSize: 12, color: "var(--text-muted)" }}>
              {t("hsp.subtitle")}
            </p>
          </div>
          <LibrarySourceBadge />
          {user && (
            <GhostButton onClick={() => setSavedOpen(true)} icon={ClockIcon}>{t("hsp.myfits")}</GhostButton>
          )}
        </div>

        {/* Upload + controls */}
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,260px)", gap: 14 }}>
          {data ? (
            <SolventEditor data={data} fileName={fileName} onChange={handleDataEdit} onReset={handleReset} />
          ) : (
            <CSVUpload onLoaded={handleLoaded} onError={setError} onBlank={handleBlank} />
          )}
          <div style={{
            background: "var(--bg-card)", border: "1px solid var(--border)",
            borderRadius: 12, padding: 14, display: "flex", flexDirection: "column", gap: 10,
          }}>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, letterSpacing: ".05em", color: "var(--text-muted)" }}>
                {t("hsp.threshold")}
              </label>
              <input
                type="number" step="0.1" min="0"
                value={insideLimit}
                onChange={e => setInsideLimit(parseFloat(e.target.value) || 0)}
                style={{ width: "100%", marginTop: 4, padding: "6px 8px", fontSize: 13, border: "1px solid var(--border)", borderRadius: 6, background: "var(--bg-card)", color: "var(--text)" }}
              />
            </div>
            <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
              {data
                ? t("hsp.solventsLoaded", { n: data.length, labeled: labeledCount })
                : t("hsp.loadCsv")}
            </div>
            <PrimaryButton onClick={handleFit} disabled={!data || running} icon={PlayIcon}>
              {running ? t("hsp.fitting") : t("hsp.fit")}
            </PrimaryButton>
          </div>
        </div>

        {error && (
          <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, padding: "10px 14px", color: "#991b1b", fontSize: 12 }}>
            {error}
          </div>
        )}

        {/* Results */}
        {result && (
          <>
            <ResultsCard result={result} />

            {user && (
              <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 12, padding: 12, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                <input
                  type="text"
                  placeholder={t("hsp.saveName")}
                  value={saveName}
                  onChange={e => setSaveName(e.target.value)}
                  style={{ flex: "1 1 200px", padding: "7px 10px", fontSize: 12, border: "1px solid var(--border)", borderRadius: 6, background: "var(--bg-card)", color: "var(--text)" }}
                />
                <PrimaryButton onClick={handleSave} icon={BookmarkIcon}>{t("hsp.save")}</PrimaryButton>
                {saveStatus && <span style={{ fontSize: 11, color: saveStatus.includes("Erreur") || saveStatus.includes("Error") ? "#dc2626" : "#16a34a" }}>{saveStatus}</span>}
              </div>
            )}

            {/* Plot view switcher */}
            <div style={{ display: "flex", gap: 4, background: "#f4f4f5", padding: 3, borderRadius: 8, alignSelf: "flex-start" }}>
              {viewTabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setView(tab.id)}
                  style={{
                    fontSize: 11, fontWeight: 700, padding: "5px 14px", borderRadius: 6,
                    background: view === tab.id ? "#fff" : "transparent",
                    color: view === tab.id ? "#18181b" : "#737373",
                    border: "none", cursor: "pointer",
                    boxShadow: view === tab.id ? "0 1px 3px rgba(0,0,0,0.10)" : "none",
                  }}
                >{tab.label}</button>
              ))}
            </div>

            {view === "2d"
              ? <HSPPlot2D data={data} result={result} insideLimit={insideLimit} onEditSolvent={handleSolventEdit} />
              : <HSPPlot3D data={data} result={result} insideLimit={insideLimit} onEditSolvent={handleSolventEdit} />}

            <SolventTable data={data} result={result} insideLimit={insideLimit} />
          </>
        )}
      </div>

      {user && <SavedFitsDrawer open={savedOpen} onClose={() => setSavedOpen(false)} onLoad={loadSaved} />}
    </div>
  )
}

export default function HSPApp(props) {
  return (
    <SolventLibraryProvider>
      <HSPAppInner {...props} />
    </SolventLibraryProvider>
  )
}
