import { useState } from "react"
import { useAuth } from "../AuthContext"

const GOOGLE_ICON = (
  <svg width="18" height="18" viewBox="0 0 48 48">
    <path fill="#EA4335" d="M24 9.5c3.14 0 5.95 1.08 8.17 2.86l6.08-6.08C34.46 3.19 29.53 1 24 1 14.82 1 7.07 6.48 3.69 14.22l7.08 5.5C12.43 13.55 17.73 9.5 24 9.5z"/>
    <path fill="#4285F4" d="M46.1 24.55c0-1.64-.15-3.22-.42-4.75H24v9h12.42c-.54 2.9-2.18 5.36-4.65 7.01l7.18 5.57C43.15 37.28 46.1 31.36 46.1 24.55z"/>
    <path fill="#FBBC05" d="M10.77 28.28A14.5 14.5 0 0 1 9.5 24c0-1.49.26-2.93.72-4.28l-7.08-5.5A23.94 23.94 0 0 0 0 24c0 3.86.92 7.5 2.55 10.72l8.22-6.44z"/>
    <path fill="#34A853" d="M24 47c5.53 0 10.17-1.83 13.55-4.97l-7.18-5.57C28.6 37.9 26.42 38.5 24 38.5c-6.27 0-11.57-4.05-13.23-9.72l-8.22 6.44C6.07 43.52 14.48 47 24 47z"/>
  </svg>
)

export default function AuthModal({ onClose }) {
  const { signInWithPassword, signUp, signInWithMagicLink, signInWithGoogle } = useAuth()
  const [tab, setTab]         = useState("login") // login | register | magic
  const [email, setEmail]     = useState("")
  const [password, setPassword] = useState("")
  const [message, setMessage] = useState(null) // { type: 'success'|'error', text }
  const [loading, setLoading] = useState(false)

  const msg = (type, text) => setMessage({ type, text })

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true); setMessage(null)
    const { error } = await signInWithPassword(email, password)
    setLoading(false)
    if (error) msg("error", error.message)
    else onClose()
  }

  const handleRegister = async (e) => {
    e.preventDefault()
    setLoading(true); setMessage(null)
    const { error } = await signUp(email, password)
    setLoading(false)
    if (error) msg("error", error.message)
    else msg("success", "Compte créé ! Vérifiez votre email pour confirmer.")
  }

  const handleMagic = async (e) => {
    e.preventDefault()
    setLoading(true); setMessage(null)
    const { error } = await signInWithMagicLink(email)
    setLoading(false)
    if (error) msg("error", error.message)
    else msg("success", "Lien envoyé ! Vérifiez votre boîte mail.")
  }

  const handleGoogle = async () => {
    setMessage(null)
    const { error } = await signInWithGoogle()
    if (error) msg("error", error.message)
  }

  const tabs = [
    { id: "login",    label: "Connexion" },
    { id: "register", label: "Inscription" },
    { id: "magic",    label: "Magic Link" },
  ]

  return (
    <div
      style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.45)", zIndex:9999, display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background:"var(--bg-card, #fff)", borderRadius:16, padding:28, width:"100%", maxWidth:400,
          boxShadow:"0 24px 64px rgba(0,0,0,0.18)", border:"1px solid var(--border)",
        }}
      >
        {/* Header */}
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
          <div style={{ fontSize:16, fontWeight:800, color:"var(--text-h, #111)" }}>Compte Simulations MDC</div>
          <button onClick={onClose} style={{ border:"none", background:"none", fontSize:22, cursor:"pointer", color:"var(--text-muted, #888)", lineHeight:1 }}>×</button>
        </div>

        {/* Google */}
        <button
          onClick={handleGoogle}
          style={{
            width:"100%", display:"flex", alignItems:"center", justifyContent:"center", gap:10,
            padding:"10px 16px", borderRadius:10, border:"1px solid var(--border)", background:"var(--bg, #f8f8f8)",
            fontSize:13, fontWeight:600, cursor:"pointer", color:"var(--text-h, #111)", marginBottom:16,
          }}
        >
          {GOOGLE_ICON} Continuer avec Google
        </button>

        <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:16 }}>
          <div style={{ flex:1, height:1, background:"var(--border)" }} />
          <span style={{ fontSize:11, color:"var(--text-muted, #999)" }}>ou par email</span>
          <div style={{ flex:1, height:1, background:"var(--border)" }} />
        </div>

        {/* Tabs */}
        <div style={{ display:"flex", gap:4, marginBottom:18, background:"var(--bg, #f4f4f5)", borderRadius:8, padding:3 }}>
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => { setTab(t.id); setMessage(null) }}
              style={{
                flex:1, padding:"6px 4px", borderRadius:6, border:"none", cursor:"pointer",
                fontSize:12, fontWeight:700,
                background: tab === t.id ? "var(--bg-card, #fff)" : "transparent",
                color: tab === t.id ? "var(--text-h, #111)" : "var(--text-muted, #888)",
                boxShadow: tab === t.id ? "0 1px 4px rgba(0,0,0,0.1)" : "none",
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Forms */}
        {(tab === "login" || tab === "register") && (
          <form onSubmit={tab === "login" ? handleLogin : handleRegister} style={{ display:"flex", flexDirection:"column", gap:10 }}>
            <input
              type="email" required placeholder="Email" value={email}
              onChange={e => setEmail(e.target.value)}
              style={inputStyle}
            />
            <input
              type="password" required placeholder="Mot de passe" value={password}
              onChange={e => setPassword(e.target.value)}
              style={inputStyle}
            />
            <button type="submit" disabled={loading} style={btnStyle("#10b981")}>
              {loading ? "…" : tab === "login" ? "Se connecter" : "Créer mon compte"}
            </button>
          </form>
        )}

        {tab === "magic" && (
          <form onSubmit={handleMagic} style={{ display:"flex", flexDirection:"column", gap:10 }}>
            <p style={{ fontSize:12, color:"var(--text-muted, #888)", margin:0 }}>
              Recevez un lien de connexion par email — sans mot de passe.
            </p>
            <input
              type="email" required placeholder="Email" value={email}
              onChange={e => setEmail(e.target.value)}
              style={inputStyle}
            />
            <button type="submit" disabled={loading} style={btnStyle("#6366f1")}>
              {loading ? "…" : "Envoyer le lien"}
            </button>
          </form>
        )}

        {/* Message */}
        {message && (
          <div style={{
            marginTop:12, padding:"10px 14px", borderRadius:8, fontSize:12,
            background: message.type === "success" ? "rgba(16,185,129,0.12)" : "rgba(239,68,68,0.12)",
            color: message.type === "success" ? "#059669" : "#dc2626",
            border: `1px solid ${message.type === "success" ? "rgba(16,185,129,0.3)" : "rgba(239,68,68,0.3)"}`,
          }}>
            {message.text}
          </div>
        )}
      </div>
    </div>
  )
}

const inputStyle = {
  padding:"10px 12px", borderRadius:8, border:"1px solid var(--border)",
  background:"var(--bg, #f9f9f9)", color:"var(--text-h, #111)",
  fontSize:13, outline:"none", width:"100%", boxSizing:"border-box",
}

const btnStyle = (color) => ({
  padding:"10px 16px", borderRadius:8, border:"none", cursor:"pointer",
  background: color, color:"#fff", fontSize:13, fontWeight:700, marginTop:2,
})
