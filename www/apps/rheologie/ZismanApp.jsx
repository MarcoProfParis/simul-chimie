import { useState, useRef, useCallback, useEffect } from "react";

// ── Webhooks ──────────────────────────────────────────────────────────────────
const WEBHOOK_URL        = "https://n8n.srv757556.hstgr.cloud/webhook/zisman_results";
const WEBHOOK_EMAIL_URL  = "https://n8n.srv757556.hstgr.cloud/webhook/zisman-email";
const WEBHOOK_VERIFY_URL = "https://n8n.srv757556.hstgr.cloud/webhook/zisman-verify";

async function sendWebhook(url, payload) {
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) console.error("Webhook HTTP error:", res.status);
  } catch (err) {
    console.error("Webhook unreachable:", err);
  }
}

// ── Solvants ──────────────────────────────────────────────────────────────────
const SOLVANTS = [
  { name: "n-pentane",      gamma: 15.5 },
  { name: "n-hexane",       gamma: 18.4 },
  { name: "n-heptane",      gamma: 20.3 },
  { name: "n-octane",       gamma: 21.7 },
  { name: "n-décane",       gamma: 23.8 },
  { name: "n-dodécane",     gamma: 25.2 },
  { name: "n-tétradécane",  gamma: 26.4 },
  { name: "n-hexadécane",   gamma: 27.5 },
  { name: "paraffine",      gamma: 32.0 },
  { name: "paraffine liq.", gamma: 32.0 },
  { name: "vaseline",       gamma: 35.0 },
  { name: "formamide",      gamma: 36.0 },
  { name: "huile min.",     gamma: 38.0 },
  { name: "éth. glycol",    gamma: 40.0 },
  { name: "huile lourde",   gamma: 42.0 },
  { name: "glycérol",       gamma: 44.0 },
  { name: "diiodométhane",  gamma: 50.8 },
  { name: "eau dist.",      gamma: 52.0 },
  { name: "eau+glycérol",   gamma: 58.0 },
  { name: "eau",            gamma: 72.8 },
  { name: "eau+NaCl",       gamma: 78.0 },
  { name: "eau+KOH",        gamma: 83.0 },
];

// ── Materials ─────────────────────────────────────────────────────────────────
const MATERIALS_PROF = [
  { name: "PTFE (Téflon)",       gc: 19, color: "#0e7490", desc: "Très hydrophobe — revêtements anti-adhésifs",
    liquids: [
      { name: "n-pentane",  gamma: 15.5, theta: 0.0  }, { name: "n-hexane",   gamma: 18.4, theta: 0.0  },
      { name: "n-heptane",  gamma: 20.3, theta: 18.3 }, { name: "n-octane",   gamma: 21.7, theta: 25.1 },
      { name: "n-décane",   gamma: 23.8, theta: 35.3 }, { name: "n-dodécane", gamma: 25.2, theta: 41.7 },
    ] },
  { name: "Polypropylène (PP)",   gc: 30, color: "#1d4ed8", desc: "Films, emballages — traitement corona avant impression",
    liquids: [
      { name: "n-dodécane",   gamma: 25.2, theta: 0.0  }, { name: "n-hexadécane", gamma: 27.5, theta: 0.0  },
      { name: "paraffine",    gamma: 32.0, theta: 22.3 }, { name: "vaseline",     gamma: 35.0, theta: 34.8 },
      { name: "huile min.",   gamma: 38.0, theta: 44.4 }, { name: "huile lourde", gamma: 42.0, theta: 54.4 },
    ] },
  { name: "Polyéthylène (PE)",    gc: 32, color: "#6d28d9", desc: "Flacons, sachets — traitement obligatoire pour encres",
    liquids: [
      { name: "n-hexadécane", gamma: 27.5, theta: 0.0  }, { name: "paraffine",   gamma: 32.0, theta: 0.0  },
      { name: "vaseline",     gamma: 35.0, theta: 28.0 }, { name: "paraffine+",  gamma: 38.0, theta: 39.5 },
      { name: "huile min.",   gamma: 42.0, theta: 50.0 }, { name: "huile lourde",gamma: 46.0, theta: 59.2 },
    ] },
  { name: "PVC",                  gc: 39, color: "#b45309", desc: "Profilés, tuyaux — γc proche des encres aqueuses",
    liquids: [
      { name: "n-hexadécane",   gamma: 27.5, theta: 0.0  }, { name: "paraffine liq.", gamma: 32.0, theta: 0.0  },
      { name: "formamide",      gamma: 36.0, theta: 0.0  }, { name: "éth. glycol",    gamma: 40.0, theta: 18.5 },
      { name: "glycérol",       gamma: 44.0, theta: 34.3 }, { name: "eau dist.",       gamma: 52.0, theta: 55.7 },
    ] },
  { name: "PET",                  gc: 43, color: "#b91c1c", desc: "Bouteilles, fibres — bon mouillage peintures",
    liquids: [
      { name: "paraffine liq.", gamma: 32.0, theta: 0.0  }, { name: "formamide",    gamma: 36.0, theta: 0.0  },
      { name: "éth. glycol",    gamma: 40.0, theta: 0.0  }, { name: "glycérol",     gamma: 44.0, theta: 14.1 },
      { name: "eau dist.",      gamma: 52.0, theta: 44.6 }, { name: "eau+glycérol", gamma: 58.0, theta: 60.6 },
    ] },
  { name: "Nylon 6,6",            gc: 46, color: "#be185d", desc: "Textile technique — γc élevé, bonne adhérence",
    liquids: [
      { name: "formamide",    gamma: 36.0, theta: 0.0  }, { name: "éth. glycol",  gamma: 40.0, theta: 0.0  },
      { name: "glycérol",     gamma: 44.0, theta: 0.0  }, { name: "eau dist.",    gamma: 52.0, theta: 36.8 },
      { name: "eau+glycérol", gamma: 58.0, theta: 52.8 }, { name: "eau",          gamma: 63.0, theta: 62.2 },
    ] },
  { name: "Verre / métal",        gc: 72, color: "#166534", desc: "γc > 70 — mouillage total par quasi tous les liquides",
    liquids: [
      { name: "glycérol",      gamma: 44.0, theta: 0.0  }, { name: "diiodométhane", gamma: 50.8, theta: 0.0  },
      { name: "formamide",     gamma: 58.0, theta: 0.0  }, { name: "eau",           gamma: 72.8, theta: 14.5 },
      { name: "eau+NaCl",      gamma: 78.0, theta: 31.9 }, { name: "eau+KOH",       gamma: 83.0, theta: 43.8 },
    ] },
];
const MATERIALS_ELEVE = MATERIALS_PROF.map((m, i) => ({ ...m, liquids: i < 2 ? m.liquids : [] }));

// ── CSV helpers ───────────────────────────────────────────────────────────────
function materialsToCSV(materials) {
  const rows = ["substrat,gc,couleur,description,liquide,gamma_LV,theta"];
  for (const m of materials)
    for (const l of m.liquids)
      rows.push(`"${m.name}",${m.gc},"${m.color}","${m.desc}","${l.name}",${l.gamma},${l.theta}`);
  return rows.join("\n");
}
function parseCSV(text) {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return null;
  const map = {};
  for (const line of lines.slice(1)) {
    const fields = []; let cur = "", inQ = false;
    for (const c of line) {
      if (c === '"') inQ = !inQ;
      else if (c === ',' && !inQ) { fields.push(cur); cur = ""; }
      else cur += c;
    }
    fields.push(cur);
    if (fields.length < 7) continue;
    const [substrat, gc, color, desc, liquide, gamma, theta] = fields;
    if (!map[substrat]) map[substrat] = { name: substrat, gc: parseFloat(gc), color: color || "#1d4ed8", desc: desc || "", liquids: [] };
    map[substrat].liquids.push({ name: liquide, gamma: parseFloat(gamma), theta: parseFloat(theta) });
  }
  const r = Object.values(map); return r.length > 0 ? r : null;
}
function resultsToCSV(results, email) {
  const rows = [
    `# Email: ${email} | Date: ${new Date().toLocaleString("fr-FR")}`,
    "substrat,gc_theorique,gc_eleve,ecart_pct,nb_points,statut",
  ];
  for (const r of results)
    rows.push(`"${r.matName}",${r.gcTheo},${r.gcEleve},${r.errPct},${r.nbPts},"${r.statut}"`);
  return rows.join("\n");
}
function downloadFile(content, filename) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob); const a = document.createElement("a");
  a.href = url; a.download = filename; a.click(); URL.revokeObjectURL(url);
}

// ── Design ────────────────────────────────────────────────────────────────────
const C = { bg:"#eef0f4", surface:"#ffffff", surface2:"#e2e5eb", border:"#b0b8c4", text:"#0d1117", muted:"#3a4250", accent:"#1d4ed8", green:"#166534", amber:"#7d4e00", red:"#991b1b" };
const F = "'Helvetica Neue', Arial, sans-serif";

// ── Chart ─────────────────────────────────────────────────────────────────────
const W = 560, H = 340;
const PAD = { l: 62, r: 24, t: 30, b: 54 };
const CW = W - PAD.l - PAD.r, CH = H - PAD.t - PAD.b;

function getBounds(data) {
  if (!data.length) return { xMin: 15, xMax: 50, yMin: 0.60, yMax: 1.03 };
  const xs = data.map(d => d.x), ys = data.map(d => d.y);
  return {
    xMin: Math.floor(Math.min(...xs)) - 1, xMax: Math.ceil(Math.max(...xs)) + 2,
    yMin: Math.max(0.40, Math.floor(Math.min(...ys) / 0.05) * 0.05 - 0.05), yMax: 1.03,
  };
}
function makeConv({ xMin, xMax, yMin, yMax }) {
  const toS = (gx, gy) => ({ x: PAD.l + ((gx-xMin)/(xMax-xMin))*CW, y: PAD.t+CH-((gy-yMin)/(yMax-yMin))*CH });
  const fromS = (sx, sy) => ({ x: xMin+((sx-PAD.l)/CW)*(xMax-xMin), y: yMin+(1-(sy-PAD.t)/CH)*(yMax-yMin) });
  return { toS, fromS };
}
function xTicksFor(a, b) { const t=[]; for(let x=Math.ceil(a);x<=Math.floor(b);x++) if(x%2===0) t.push(x); return t; }
function yTicksFor(a, b) { const t=[]; for(let y=0.40;y<=1.02;y=Math.round((y+0.05)*100)/100) if(y>=a-0.01&&y<=b) t.push(Math.round(y*100)/100); return t; }
function cosD(deg) { return Math.cos(deg*Math.PI/180); }
function lineFrom2(p1, p2) {
  if (!p1||!p2||Math.abs(p2.x-p1.x)<0.01) return null;
  const m=(p2.y-p1.y)/(p2.x-p1.x), b=p1.y-m*p1.x;
  return { m, b, gc: (1-b)/m };
}

// ── Role Popup (email OTP) ────────────────────────────────────────────────────
function RolePopup({ onSelect }) {
  const [step, setStep]       = useState("choose"); // choose|password|email|otp
  const [pwd, setPwd]         = useState("");
  const [pwdErr, setPwdErr]   = useState(false);
  const [email, setEmail]     = useState("");
  const [otp, setOtp]         = useState("");
  const [otpErr, setOtpErr]   = useState("");
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);
  const emailRef = useRef(null);
  const otpRef   = useRef(null);

  useEffect(() => {
    if (step==="password") setTimeout(()=>inputRef.current?.focus(), 50);
    if (step==="email")    setTimeout(()=>emailRef.current?.focus(), 50);
    if (step==="otp")      setTimeout(()=>otpRef.current?.focus(), 50);
  }, [step]);

  const tryPwd = () => {
    if (pwd==="Admin2026!") onSelect("prof", {});
    else { setPwdErr(true); setPwd(""); setTimeout(()=>setPwdErr(false), 2000); }
  };

  const sendCode = async () => {
    if (!email.includes("@") || !email.includes(".")) { setOtpErr("Adresse email invalide."); return; }
    setLoading(true); setOtpErr("");
    await sendWebhook(WEBHOOK_EMAIL_URL, {
      email,
      timestamp: new Date().toLocaleString("fr-FR"),
    });
    setLoading(false);
    setStep("otp");
  };

  const verifyOtp = async () => {
    if (!/^\d{4}$/.test(otp)) { setOtpErr("Le code doit contenir exactement 4 chiffres."); return; }
    setLoading(true); setOtpErr("");
    try {
      const res = await fetch(WEBHOOK_VERIFY_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code: otp }),
      });
      const data = await res.json();
      if (data.valid) {
        sendWebhook(WEBHOOK_URL, {
          type: "debut", email,
          timestamp: new Date().toLocaleString("fr-FR"),
          message: "Début de la séance Zisman",
        });
        onSelect("eleve", { email });
      } else {
        setOtpErr(data.reason ?? "Code invalide — réessayez.");
      }
    } catch (_) {
      setOtpErr("Impossible de vérifier le code. Vérifiez votre connexion.");
    }
    setLoading(false);
  };

  const iStyle = (err) => ({
    width:"100%", padding:"12px 14px", borderRadius:8,
    border:`2px solid ${err?"#dc2626":C.border}`,
    fontFamily:F, fontSize:14, fontWeight:600, color:C.text,
    background:err?"#fee2e2":C.bg, outline:"none",
    marginBottom:10, boxSizing:"border-box",
  });

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(13,17,23,0.6)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000}}>
      <div style={{background:C.surface,borderRadius:16,padding:"36px 40px",width:400,fontFamily:F}}>

        {step==="choose" && <>
          <div style={{fontSize:11,fontWeight:700,color:C.muted,letterSpacing:1.5,textTransform:"uppercase",marginBottom:6}}>BTS Métiers de la Chimie · Mouillage</div>
          <div style={{fontSize:22,fontWeight:900,color:C.text,marginBottom:6}}>Droite de Zisman</div>
          <div style={{fontSize:14,fontWeight:600,color:C.muted,marginBottom:28,lineHeight:1.5}}>Choisissez votre profil pour accéder à l'application.</div>
          <div style={{display:"flex",gap:12}}>
            <button onClick={()=>setStep("password")} style={{flex:1,padding:"16px 0",borderRadius:10,border:`2px solid ${C.accent}`,background:C.accent,color:"#fff",fontFamily:F,fontSize:15,fontWeight:900,cursor:"pointer"}}>Je suis Prof</button>
            <button onClick={()=>setStep("email")} style={{flex:1,padding:"16px 0",borderRadius:10,border:`2px solid ${C.green}`,background:C.green,color:"#fff",fontFamily:F,fontSize:15,fontWeight:900,cursor:"pointer"}}>Je suis Élève</button>
          </div>
        </>}

        {step==="password" && <>
          <button onClick={()=>{setStep("choose");setPwd("");setPwdErr(false);}} style={{fontSize:12,fontWeight:700,color:C.muted,background:"none",border:"none",cursor:"pointer",padding:0,marginBottom:16,fontFamily:F}}>← Retour</button>
          <div style={{fontSize:20,fontWeight:900,color:C.text,marginBottom:6}}>Accès professeur</div>
          <div style={{fontSize:13,fontWeight:600,color:C.muted,marginBottom:20}}>Entrez le mot de passe pour continuer.</div>
          <input ref={inputRef} type="password" value={pwd} onChange={e=>setPwd(e.target.value)} onKeyDown={e=>e.key==="Enter"&&tryPwd()} placeholder="Mot de passe" style={iStyle(pwdErr)}/>
          {pwdErr && <div style={{fontSize:12,fontWeight:700,color:C.red,marginBottom:10}}>Mot de passe incorrect.</div>}
          <button onClick={tryPwd} style={{width:"100%",padding:"13px 0",borderRadius:8,border:`2px solid ${C.accent}`,background:C.accent,color:"#fff",fontFamily:F,fontSize:14,fontWeight:900,cursor:"pointer"}}>Valider</button>
        </>}

        {step==="email" && <>
          <button onClick={()=>{setStep("choose");setEmail("");setOtpErr("");}} style={{fontSize:12,fontWeight:700,color:C.muted,background:"none",border:"none",cursor:"pointer",padding:0,marginBottom:16,fontFamily:F}}>← Retour</button>
          <div style={{fontSize:20,fontWeight:900,color:C.text,marginBottom:4}}>Connexion élève</div>
          <div style={{fontSize:13,fontWeight:600,color:C.muted,marginBottom:20,lineHeight:1.5}}>
            Entrez votre adresse email — un code à 4 chiffres vous sera envoyé.
          </div>
          <label style={{fontSize:12,fontWeight:800,color:C.muted,textTransform:"uppercase",letterSpacing:1,display:"block",marginBottom:6}}>Adresse email</label>
          <input ref={emailRef} type="email" value={email} onChange={e=>{setEmail(e.target.value);setOtpErr("");}} onKeyDown={e=>e.key==="Enter"&&sendCode()} placeholder="marie.dupont@lycee.fr" style={iStyle(!!otpErr)}/>
          {otpErr && <div style={{fontSize:12,fontWeight:700,color:C.red,marginBottom:10}}>{otpErr}</div>}
          <button onClick={sendCode} disabled={loading} style={{width:"100%",padding:"13px 0",borderRadius:8,border:`2px solid ${loading?C.border:C.green}`,background:loading?C.surface2:C.green,color:loading?C.muted:"#fff",fontFamily:F,fontSize:14,fontWeight:900,cursor:loading?"not-allowed":"pointer"}}>
            {loading?"Envoi en cours…":"Envoyer le code →"}
          </button>
        </>}

        {step==="otp" && <>
          <div style={{fontSize:20,fontWeight:900,color:C.text,marginBottom:4}}>Code de vérification</div>
          <div style={{fontSize:13,fontWeight:600,color:C.muted,marginBottom:6,lineHeight:1.5}}>
            Un code à 4 chiffres a été envoyé à<br/>
            <strong style={{color:C.text}}>{email}</strong>
          </div>
          <button onClick={()=>{setStep("email");setOtp("");setOtpErr("");}} style={{fontSize:12,fontWeight:700,color:C.accent,background:"none",border:"none",cursor:"pointer",padding:0,marginBottom:20,fontFamily:F,textDecoration:"underline"}}>
            Changer d'email
          </button>
          <label style={{fontSize:12,fontWeight:800,color:C.muted,textTransform:"uppercase",letterSpacing:1,display:"block",marginBottom:6}}>Code reçu par email</label>
          <input ref={otpRef} type="text" inputMode="numeric" maxLength={4} value={otp}
            onChange={e=>{setOtp(e.target.value.replace(/\D/g,""));setOtpErr("");}}
            onKeyDown={e=>e.key==="Enter"&&verifyOtp()}
            placeholder="_ _ _ _"
            style={{...iStyle(!!otpErr), fontSize:28, fontWeight:900, letterSpacing:14, textAlign:"center"}}/>
          {otpErr && <div style={{fontSize:12,fontWeight:700,color:C.red,marginBottom:10}}>{otpErr}</div>}
          <button onClick={verifyOtp} style={{width:"100%",padding:"13px 0",borderRadius:8,border:`2px solid ${C.green}`,background:C.green,color:"#fff",fontFamily:F,fontSize:14,fontWeight:900,cursor:"pointer"}}>
            Valider le code →
          </button>
          <button onClick={()=>{setLoading(true);sendCode();}} style={{width:"100%",marginTop:8,padding:"10px 0",borderRadius:8,border:`1.5px solid ${C.border}`,background:"transparent",color:C.muted,fontFamily:F,fontSize:13,fontWeight:700,cursor:"pointer"}}>
            Renvoyer le code
          </button>
        </>}
      </div>
    </div>
  );
}

// ── AddPointRow ───────────────────────────────────────────────────────────────
function AddPointRow({ mat, onAdd }) {
  const [selIdx, setSelIdx] = useState(0);
  const [theta, setTheta]   = useState("");
  const solv = SOLVANTS[selIdx];
  const handleAdd = () => {
    const t = parseFloat(theta);
    if (isNaN(t)||t<0||t>90) return;
    onAdd({ name: solv.name, gamma: solv.gamma, theta: t });
    setTheta("");
  };
  return (
    <div style={{display:"flex",gap:8,alignItems:"center",padding:"10px 12px",background:"#eff6ff",borderRadius:8,border:"1.5px solid #93c5fd",flexWrap:"wrap",marginTop:10}}>
      <span style={{fontSize:12,fontWeight:800,color:C.accent,whiteSpace:"nowrap"}}>+ Ajouter une mesure</span>
      <select value={selIdx} onChange={e=>setSelIdx(parseInt(e.target.value))} style={{flex:2,minWidth:160,fontFamily:F,fontSize:13,fontWeight:700,padding:"5px 8px",borderRadius:6,border:`1px solid ${C.border}`,background:C.surface,color:C.text}}>
        {SOLVANTS.map((s,i)=><option key={i} value={i}>{s.name} — {s.gamma} mN·m⁻¹</option>)}
      </select>
      <span style={{fontSize:12,fontWeight:700,color:C.muted,whiteSpace:"nowrap"}}>γLV = <strong style={{color:mat.color}}>{solv.gamma}</strong></span>
      <span style={{fontSize:12,fontWeight:700,color:C.muted}}>θ (°) =</span>
      <input type="number" min="0" max="90" step="0.1" value={theta} onChange={e=>setTheta(e.target.value)} onKeyDown={e=>e.key==="Enter"&&handleAdd()} placeholder="ex: 24.5" style={{width:72,fontFamily:F,fontSize:13,fontWeight:700,padding:"5px 8px",borderRadius:6,border:`1px solid ${C.border}`,background:C.surface,color:C.text}}/>
      <button onClick={handleAdd} style={{padding:"6px 14px",borderRadius:6,border:`2px solid ${C.accent}`,background:C.accent,color:"#fff",fontFamily:F,fontSize:13,fontWeight:800,cursor:"pointer"}}>Ajouter</button>
    </div>
  );
}

// ── Main App ──────────────────────────────────────────────────────────────────
export default function ZismanApp({ onBack }) {
  // BYPASS TEMPORAIRE — remettre `null` pour réactiver la demande de profil
  const [role,          setRole]          = useState("prof");
  const [eleveInfo,     setEleveInfo]     = useState({ email: "" });
  const [materials,     setMaterials]     = useState(MATERIALS_PROF);
  const [mat,           setMat]           = useState(MATERIALS_PROF[0]);
  const [mode,          setMode]          = useState("idle");
  const [firstPt,       setFirstPt]       = useState(null);
  const [fixedLine,     setFixedLine]     = useState(null);
  const [mousePt,       setMousePt]       = useState(null);
  const [validated,     setValidated]     = useState(false);
  const [hov,           setHov]           = useState(null);
  const [tab,           setTab]           = useState("graph");
  const [qAns,          setQAns]          = useState(null);
  const [qIdx,          setQIdx]          = useState(0);
  const [showGcList,    setShowGcList]    = useState(false);
  const [savedData,     setSavedData]     = useState({});
  const [editableData,  setEditableData]  = useState(null);
  const [saveStatus,    setSaveStatus]    = useState("idle");
  const [csvError,      setCsvError]      = useState(null);
  const [eleveResults,  setEleveResults]  = useState({});
  const [showFinish,    setShowFinish]    = useState(false);
  const [showInfo,      setShowInfo]      = useState(false);
  const svgRef  = useRef(null);
  const fileRef = useRef(null);

  const isProf  = role === "prof";
  const isEleve = role === "eleve";

  const handleRoleSelect = useCallback((r, info) => {
    setRole(r);
    if (r === "eleve") setEleveInfo(info);
    const mats = r==="prof" ? MATERIALS_PROF : MATERIALS_ELEVE;
    setMaterials(mats); setMat(mats[0]); setSavedData({}); setEditableData(null); setEleveResults({});
  }, []);

  useEffect(() => {
    if (!role) return;
    try { const r=localStorage.getItem(`zisman_${role}`); if(r) setSavedData(JSON.parse(r)); } catch(_){}
  }, [role]);

  useEffect(() => {
    setMode("idle"); setFirstPt(null); setFixedLine(null);
    setMousePt(null); setValidated(false);
    setEditableData(null); setSaveStatus("idle");
  }, [mat]);

  const matDef       = materials.find(m=>m.name===mat.name) ?? mat;
  const baseLiquids  = savedData[mat.name] ?? matDef.liquids;
  const activeLiquids = editableData ?? baseLiquids;
  const hasEdits     = editableData !== null;
  const hasSaved     = !!savedData[mat.name];
  const isLockedMat  = !!eleveResults[mat.name];

  const updateLiquid = (i, field, value) => {
    const base = editableData ?? baseLiquids;
    setEditableData(base.map((l,j)=>j===i?{...l,[field]:value}:l)); reset();
  };
  const addLiquidProf  = () => { setEditableData([...(editableData??baseLiquids),{name:"nouveau",gamma:30.0,theta:0.0}]); reset(); };
  const addLiquidEleve = (liq) => { setEditableData([...(editableData??baseLiquids),liq]); reset(); };
  const removeLiquid   = (i) => {
    const base=editableData??baseLiquids; if(base.length<=1) return;
    setEditableData(base.filter((_,j)=>j!==i)); reset();
  };

  const saveData = () => {
    const toSave={...savedData,[mat.name]:editableData??baseLiquids};
    try {
      localStorage.setItem(`zisman_${role}`,JSON.stringify(toSave));
      setSavedData(toSave); setEditableData(null); setSaveStatus("saved");
      setTimeout(()=>setSaveStatus("idle"),2000);
      const all=materials.map(m=>({...m,liquids:toSave[m.name]??m.liquids}));
      downloadFile(materialsToCSV(all),"zisman_donnees.csv");
    } catch(_){ setSaveStatus("error"); setTimeout(()=>setSaveStatus("idle"),2000); }
  };
  const resetSaved = () => {
    const toSave={...savedData}; delete toSave[mat.name];
    try{localStorage.setItem(`zisman_${role}`,JSON.stringify(toSave));}catch(_){}
    setSavedData(toSave); setEditableData(null); reset();
  };

  // ── Student: final lock per substrat ──────────────────────────────────────
  const handleFinalValidation = async () => {
    if (!fixedLine || !validated) return;
    const errPct = Math.abs((fixedLine.gc - mat.gc) / mat.gc) * 100;
    const statut = errPct < 5 ? "Excellent" : errPct < 15 ? "Bien" : "À améliorer";
    const result = {
      matName: mat.name, gcTheo: mat.gc,
      gcEleve: parseFloat(fixedLine.gc.toFixed(2)),
      errPct: parseFloat(errPct.toFixed(1)),
      nbPts: activeLiquids.length, statut,
      liquids: [...activeLiquids],
    };
    setEleveResults(prev=>({...prev,[mat.name]:result}));
    // Export CSV for this substrat
    downloadFile(resultsToCSV([result], eleveInfo.email), `zisman_${mat.name.replace(/\s+/g,"_")}.csv`);
    // Send webhook
    await sendWebhook(WEBHOOK_URL, {
      type: "substrat_valide",
      email: eleveInfo.email,
      timestamp: new Date().toLocaleString("fr-FR"),
      message: `Substrat validé : ${mat.name}`,
      substrat:     mat.name,
      gc_theorique: mat.gc,
      gc_eleve:     result.gcEleve,
      ecart_pct:    result.errPct,
      nb_points:    result.nbPts,
      statut:       result.statut,
      points:       activeLiquids,
    });
  };

  // ── Student: finish all ───────────────────────────────────────────────────
  const handleFinish = async () => {
    const all = Object.values(eleveResults);
    if (all.length === 0) return;
    const filename = `zisman_${eleveInfo.email.split("@")[0]}_resultats.csv`;
    downloadFile(resultsToCSV(all, eleveInfo.email), filename);
    // Send final webhook
    await sendWebhook(WEBHOOK_URL, {
      type: "fin_seance",
      email: eleveInfo.email,
      timestamp: new Date().toLocaleString("fr-FR"),
      message: "Fin de la séance Zisman — tous les résultats",
      nb_substrats: all.length,
      resultats: all.map(r=>({
        substrat:     r.matName,
        gc_theorique: r.gcTheo,
        gc_eleve:     r.gcEleve,
        ecart_pct:    r.errPct,
        statut:       r.statut,
        nb_points:    r.nbPts,
      })),
    });
    setShowFinish(true);
  };

  const handleCSVImport = (e) => {
    const file=e.target.files?.[0]; if(!file) return; setCsvError(null);
    const reader=new FileReader();
    reader.onload=(ev)=>{
      const parsed=parseCSV(ev.target.result);
      if(!parsed){setCsvError("Fichier CSV invalide.");return;}
      setMaterials(parsed); setMat(parsed[0]); setSavedData({});
    };
    reader.readAsText(file); e.target.value="";
  };

  const DATA   = activeLiquids.map(l=>({x:l.gamma,y:cosD(l.theta),name:l.name,theta:l.theta}));
  const bounds = getBounds(DATA);
  const {toS,fromS}=makeConv(bounds);
  const {xMin,xMax,yMin}=bounds;
  const xTicks=xTicksFor(xMin,xMax);
  const yTicks=yTicksFor(bounds.yMin,bounds.yMax);

  const getSvgPt=useCallback((e)=>{
    const r=svgRef.current?.getBoundingClientRect(); if(!r) return null;
    const sx=Math.max(PAD.l,Math.min(PAD.l+CW,((e.clientX-r.left)/r.width)*W));
    const sy=Math.max(PAD.t,Math.min(PAD.t+CH,((e.clientY-r.top)/r.height)*H));
    return fromS(sx,sy);
  },[fromS]);

  const handleMouseMove=useCallback((e)=>{
    if(mode!=="drawing") return; const pt=getSvgPt(e); if(pt) setMousePt(pt);
  },[mode,getSvgPt]);

  useEffect(()=>{
    const svg=svgRef.current; if(!svg) return;
    svg.addEventListener("mousemove",handleMouseMove);
    return()=>svg.removeEventListener("mousemove",handleMouseMove);
  },[handleMouseMove]);

  const handleSvgClick=useCallback((e)=>{
    if(isLockedMat) return;
    const pt=getSvgPt(e); if(!pt) return;
    if(mode==="first_click"){setFirstPt(pt);setMousePt(pt);setMode("drawing");}
    else if(mode==="drawing"){
      const line=lineFrom2(firstPt,pt);
      if(line){setFixedLine(line);setMode("done");setValidated(false);setMousePt(null);}
    }
  },[mode,firstPt,getSvgPt,isLockedMat]);

  const startDrawing=()=>{setFirstPt(null);setFixedLine(null);setValidated(false);setMousePt(null);setMode("first_click");};
  const reset=()=>{setFirstPt(null);setFixedLine(null);setValidated(false);setMousePt(null);setMode("idle");};

  const al=()=>{
    if(mode==="drawing"&&firstPt&&mousePt) return lineFrom2(firstPt,mousePt);
    if(mode==="done"&&fixedLine) return fixedLine;
    return null;
  };
  const aLine=al();
  const eps=aLine?{p1:toS(xMin,aLine.m*xMin+aLine.b),p2:toS(xMax,aLine.m*xMax+aLine.b)}:null;
  const cosOneSvg=toS(xMin,1).y;
  const errPct=validated&&fixedLine?Math.abs((fixedLine.gc-mat.gc)/mat.gc)*100:null;
  const showGc=validated&&fixedLine&&fixedLine.gc>=xMin&&fixedLine.gc<=xMax;
  const gcSvg=showGc?toS(fixedLine.gc,1):null;
  const nDone=Object.keys(eleveResults).length;
  const nTotal=materials.length;

  const b=(()=>{
    if(isLockedMat) return {color:C.green,bg:"#dcfce7",bdr:"#16a34a",msg:`Substrat validé — γc = ${eleveResults[mat.name]?.gcEleve} mN·m⁻¹ (écart ${eleveResults[mat.name]?.errPct}%)`};
    if(mode==="idle")        return {color:C.muted, bg:C.surface2,bdr:C.border, msg:"Cliquez sur « Tracer la droite » pour commencer."};
    if(mode==="first_click") return {color:C.amber, bg:"#fef9c3", bdr:"#ca8a04",msg:"Cliquez sur le graphe pour placer le premier point."};
    if(mode==="drawing")     return {color:C.accent,bg:"#eff6ff", bdr:"#93c5fd",msg:"Déplacez la souris pour orienter la droite — cliquez pour la fixer."};
    if(!validated)           return {color:C.green, bg:"#dcfce7", bdr:"#16a34a",msg:"Droite fixée. Cliquez « Valider » pour révéler γc."};
    return {color:C.green,bg:"#dcfce7",bdr:"#16a34a",msg:`γc trouvé = ${fixedLine?.gc.toFixed(1)} mN·m⁻¹ | γc théorique = ${mat.gc} mN·m⁻¹ | écart = ${errPct?.toFixed(1)}%`};
  })();

  const QS=[
    {q:"Une encre a γLV=35 mN·m⁻¹. Le PP a γc≈30 mN·m⁻¹. Quel est le résultat ?",choices:["Mouillage total (θ=0°)","Mouillage partiel (θ>0°)","Non-mouillage"],ans:1,expl:"γLV(35)>γc(30) → mouillage partiel. Un traitement corona est nécessaire."},
    {q:"Pourquoi trace-t-on cos θ et non θ directement ?",choices:["Convention historique","La relation de Young donne une droite en cos θ","Simplifier les calculs"],ans:1,expl:"La loi de Young-Dupré relie cos θ linéairement à γLV — la droite est naturelle."},
    {q:"Quelle famille de liquides est idéale pour la droite de Zisman ?",choices:["Liquides polaires (eau, glycérol)","Alcanes homologues","Tout liquide dont on connaît γLV"],ans:1,expl:"Les alcanes sont purement dispersifs (γᴾ≈0) — parfaits pour une série homologue."},
  ];
  const Q=QS[qIdx%QS.length];

  const Btn=({label,onClick,bg,bdr,col="#fff"})=>(
    <button onClick={onClick} style={{padding:"9px 20px",borderRadius:8,fontSize:14,fontWeight:800,fontFamily:F,border:`2px solid ${bdr}`,background:bg,color:col,cursor:"pointer"}}>{label}</button>
  );
  const card=(children,extra={})=>(
    <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:12,padding:18,...extra}}>{children}</div>
  );
  const smBtn=(label,onClick,color,filled=false)=>(
    <button onClick={onClick} style={{fontSize:12,fontWeight:800,fontFamily:F,padding:"5px 12px",borderRadius:6,border:`1.5px solid ${color}`,background:filled?color+"22":"transparent",color,cursor:"pointer"}}>{label}</button>
  );

  return (
    <div style={{minHeight:"100vh",background:C.bg,color:C.text,fontFamily:F}}>
      {/* BYPASS TEMPORAIRE — décommenter pour réactiver la demande de profil */}
      {/* {!role && <RolePopup onSelect={handleRoleSelect}/>} */}

      {/* Finish overlay */}
      {showFinish && (
        <div style={{position:"fixed",inset:0,background:"rgba(13,17,23,0.7)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:999}}>
          <div style={{background:C.surface,borderRadius:16,padding:"36px 40px",width:440,fontFamily:F,textAlign:"center"}}>
            <div style={{fontSize:36,marginBottom:12}}>🎉</div>
            <div style={{fontSize:22,fontWeight:900,color:C.text,marginBottom:8}}>Travail terminé !</div>
            <div style={{fontSize:13,fontWeight:600,color:C.muted,marginBottom:16,lineHeight:1.6}}>
              Email : <strong style={{color:C.text}}>{eleveInfo.email}</strong><br/>
              <strong style={{color:C.green}}>{nDone}</strong> substrat{nDone>1?"s":""} analysé{nDone>1?"s":""}. Résultats envoyés au professeur.
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:16}}>
              {Object.values(eleveResults).map(r=>(
                <div key={r.matName} style={{display:"flex",justifyContent:"space-between",padding:"8px 12px",borderRadius:8,background:r.errPct<5?"#dcfce7":r.errPct<15?"#fef9c3":"#fee2e2",fontSize:13,fontWeight:700}}>
                  <span style={{color:C.text}}>{r.matName}</span>
                  <span style={{color:r.errPct<5?C.green:r.errPct<15?C.amber:C.red}}>γc={r.gcEleve} | écart {r.errPct}% — {r.statut}</span>
                </div>
              ))}
            </div>
            <button onClick={()=>{setShowFinish(false);setRole(null);}} style={{width:"100%",padding:"12px 24px",borderRadius:10,border:`2px solid ${C.accent}`,background:C.accent,color:"#fff",fontFamily:F,fontSize:14,fontWeight:900,cursor:"pointer"}}>
              Fermer
            </button>
          </div>
        </div>
      )}

      {/* Info popup */}
      {showInfo && (
        <div style={{position:"fixed",inset:0,background:"rgba(13,17,23,0.6)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:999}} onClick={()=>setShowInfo(false)}>
          <div style={{background:C.surface,borderRadius:16,padding:"32px 36px",width:480,maxWidth:"90vw",fontFamily:F}} onClick={e=>e.stopPropagation()}>
            <div style={{fontSize:18,fontWeight:900,color:C.text,marginBottom:16}}>Comment tracer la droite de Zisman ?</div>
            {[
              {n:"1",color:C.amber,title:"Saisir vos mesures",text:"Dans le tableau en bas, choisissez un solvant dans le menu déroulant, entrez l'angle θ mesuré, puis cliquez « Ajouter ». Répétez pour chaque liquide (minimum 3 points)."},
              {n:"2",color:C.accent,title:"Tracer la droite",text:"Cliquez « Tracer la droite » puis posez un premier point sur le graphe. Déplacez la souris pour orienter la droite sur l'ensemble des points. Cliquez pour la fixer."},
              {n:"3",color:C.green,title:"Déterminer γc",text:"Cliquez « Valider — afficher γc ». La droite est prolongée jusqu'à cos θ = 1 : l'intersection donne la tension critique γc."},
              {n:"4",color:"#be185d",title:"Valider définitivement",text:"Cliquez « Valider définitivement ce substrat » pour enregistrer vos résultats et passer au substrat suivant."},
            ].map(s=>(
              <div key={s.n} style={{display:"flex",gap:12,marginBottom:14,alignItems:"flex-start"}}>
                <div style={{width:28,height:28,borderRadius:"50%",background:s.color,color:"#fff",fontWeight:900,fontSize:14,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>{s.n}</div>
                <div>
                  <div style={{fontSize:14,fontWeight:800,color:C.text,marginBottom:2}}>{s.title}</div>
                  <div style={{fontSize:13,fontWeight:600,color:C.muted,lineHeight:1.6}}>{s.text}</div>
                </div>
              </div>
            ))}
            <button onClick={()=>setShowInfo(false)} style={{marginTop:8,width:"100%",padding:"12px 0",borderRadius:8,border:`2px solid ${C.accent}`,background:C.accent,color:"#fff",fontFamily:F,fontSize:14,fontWeight:900,cursor:"pointer"}}>
              J'ai compris, commencer !
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{background:C.surface,borderBottom:`2px solid ${C.border}`,padding:"14px 28px",display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:8}}>
        <div>
          <div style={{fontSize:12,fontWeight:700,color:C.muted,letterSpacing:1.5,textTransform:"uppercase",marginBottom:2}}>BTS Métiers de la Chimie · Mouillage</div>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <div style={{fontSize:24,fontWeight:900,color:C.text}}>Droite de Zisman</div>
            {role && <span style={{fontSize:11,fontWeight:800,padding:"3px 10px",borderRadius:99,background:isProf?C.accent+"22":C.green+"22",color:isProf?C.accent:C.green,border:`1px solid ${isProf?C.accent:C.green}`}}>{isProf?"Professeur":`Élève — ${eleveInfo.email}`}</span>}
            {isEleve && nDone>0 && <span style={{fontSize:11,fontWeight:800,padding:"3px 10px",borderRadius:99,background:C.amber+"22",color:C.amber,border:`1px solid ${C.amber}`}}>{nDone}/{nTotal} validés</span>}
          </div>
        </div>
        <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
          {role && <>
            {isProf && smBtn("Modèle CSV",()=>downloadFile(materialsToCSV(MATERIALS_PROF),"zisman_modele.csv"),C.muted)}
            {smBtn("Exporter CSV",()=>{const all=materials.map(m=>({...m,liquids:savedData[m.name]??m.liquids}));downloadFile(materialsToCSV(all),"zisman_donnees.csv");},C.green)}
            <label style={{fontSize:12,fontWeight:800,fontFamily:F,padding:"5px 12px",borderRadius:6,border:`1.5px solid ${C.accent}`,background:C.accent+"22",color:C.accent,cursor:"pointer"}}>
              Importer CSV<input ref={fileRef} type="file" accept=".csv" onChange={handleCSVImport} style={{display:"none"}}/>
            </label>
          </>}
          {isEleve && nDone>0 && (
            <button onClick={handleFinish} style={{padding:"9px 20px",borderRadius:8,fontSize:14,fontWeight:900,fontFamily:F,border:`2px solid ${C.green}`,background:C.green,color:"#fff",cursor:"pointer"}}>J'ai fini →</button>
          )}
          
          <button onClick={()=>setRole(null)} style={{fontSize:12,fontWeight:800,fontFamily:F,padding:"5px 12px",borderRadius:6,border:`1.5px solid ${C.border}`,background:"transparent",color:C.muted,cursor:"pointer"}}>Changer de profil</button>
          {[["graph","Graphe"],["theory","Théorie"],["quiz","Quiz"]].map(([t,l])=>(
            <button key={t} onClick={()=>setTab(t)} style={{padding:"9px 20px",borderRadius:8,fontSize:14,fontWeight:800,fontFamily:F,border:`2px solid ${tab===t?C.accent:C.border}`,background:tab===t?C.accent:"transparent",color:tab===t?"#fff":C.muted,cursor:"pointer"}}>{l}</button>
          ))}
        </div>
      </div>

      {csvError && <div style={{background:"#fee2e2",border:"1px solid #dc2626",borderRadius:8,padding:"10px 20px",margin:"12px 20px 0",fontSize:13,fontWeight:700,color:C.red}}>{csvError}</div>}

      {/* ── GRAPH ── */}
      {tab==="graph" && (
        <div style={{padding:"20px 20px 40px",maxWidth:1200,margin:"0 auto"}}>
          <div style={{display:"grid",gridTemplateColumns:"360px 1fr",gap:16,alignItems:"start"}}>

            {/* Left */}
            <div style={{display:"flex",flexDirection:"column",gap:14}}>
              {card(<>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:4}}>
                  <div style={{fontSize:13,fontWeight:900,color:C.text,textTransform:"uppercase",letterSpacing:1}}>Choisir le substrat</div>
                  {isProf && <button onClick={()=>setShowGcList(v=>!v)} style={{fontSize:11,fontWeight:800,fontFamily:F,padding:"4px 10px",borderRadius:6,border:`1.5px solid ${C.border}`,background:showGcList?C.amber+"22":C.surface2,color:showGcList?C.amber:C.muted,cursor:"pointer"}}>{showGcList?"Masquer γc":"Afficher γc"}</button>}
                </div>
                {materials.map(m=>{
                  const sel=mat.name===m.name;
                  const res=eleveResults[m.name];
                  const showVal=isProf?(showGcList||(sel&&validated)):res!=null;
                  const hasData=(savedData[m.name]??m.liquids).length>0;
                  return (
                    <div key={m.name} onClick={()=>setMat(m)} style={{display:"flex",alignItems:"center",gap:8,padding:"8px 10px",borderRadius:8,marginBottom:4,cursor:"pointer",background:sel?C.surface2:"transparent",border:`2px solid ${sel?m.color:"transparent"}`,transition:"all 0.12s"}}>
                      <div style={{width:10,height:10,borderRadius:"50%",background:res?"#16a34a":m.color,flexShrink:0}}/>
                      <span style={{fontSize:13,fontWeight:800,color:C.text,flex:1}}>{m.name}</span>
                      {isEleve && !hasData && !res && <span style={{fontSize:10,fontWeight:700,color:C.amber,background:"#fef9c3",padding:"1px 6px",borderRadius:4}}>à compléter</span>}
                      {res && <span style={{fontSize:10,fontWeight:700,color:C.green,background:"#dcfce7",padding:"1px 6px",borderRadius:4}}>✓ validé</span>}
                      {showVal&&!res?(<><span style={{fontSize:13,fontWeight:900,color:C.amber}}>{m.gc}</span><span style={{fontSize:11,fontWeight:700,color:C.muted,marginRight:2}}>mN·m⁻¹</span></>)
                        :(!res&&<span style={{fontSize:11,fontWeight:700,color:C.muted,fontStyle:"italic",minWidth:60,textAlign:"right"}}>{sel?"droite…":"—"}</span>)}
                    </div>
                  );
                })}
                <div style={{marginTop:10,padding:"10px 14px",background:C.surface2,borderRadius:8,border:`1.5px solid ${mat.color}`,fontSize:13,fontWeight:700,color:C.muted,lineHeight:1.6}}>
                  <span style={{color:mat.color,fontWeight:900}}>{mat.name}</span>
                  {(validated||isLockedMat)?<>{" — γc = "}<span style={{color:C.amber,fontWeight:900}}>{isLockedMat?eleveResults[mat.name]?.gcEleve:fixedLine?.gc.toFixed(1)} mN·m⁻¹</span></>:<span style={{fontStyle:"italic"}}> — γc à déterminer</span>}
                  <br/>{mat.desc}
                </div>
                {isEleve && nDone>0 && (
                  <div style={{marginTop:12,padding:"10px 12px",background:"#dcfce7",borderRadius:8,border:"1px solid #16a34a",fontSize:12,fontWeight:700,color:C.green}}>
                    {nDone} substrat{nDone>1?"s":""} validé{nDone>1?"s":""}. {nDone<nTotal?`Encore ${nTotal-nDone} à analyser.`:"Vous pouvez cliquer « J'ai fini » !"}
                  </div>
                )}
              </>)}
            </div>

            {/* Right: chart */}
            {card(<>
              <div style={{padding:"11px 16px",borderRadius:8,marginBottom:14,background:b.bg,border:`1.5px solid ${b.bdr}`,fontSize:14,fontWeight:700,color:b.color}}>{b.msg}</div>

              <div style={{display:"flex",gap:8,marginBottom:14,flexWrap:"wrap",alignItems:"center"}}>
                {isEleve && <button onClick={()=>setShowInfo(true)} title="Aide" style={{width:34,height:34,borderRadius:"50%",border:`2px solid ${C.accent}`,background:C.accent+"18",color:C.accent,fontFamily:F,fontSize:16,fontWeight:900,cursor:"pointer",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center"}}>?</button>}
                {!isLockedMat && mode==="idle" && DATA.length>=2 && <Btn label="Tracer la droite" onClick={startDrawing} bg={C.accent} bdr={C.accent}/>}
                {!isLockedMat && mode==="idle" && DATA.length<2 && <span style={{fontSize:13,fontWeight:700,color:C.amber,padding:"9px 0"}}>Ajoutez au moins 2 points.</span>}
                {!isLockedMat && (mode==="first_click"||mode==="drawing") && <Btn label="Annuler" onClick={reset} bg="transparent" bdr={C.border} col={C.muted}/>}
                {!isLockedMat && mode==="done" && !validated && <><Btn label="Valider — afficher γc" onClick={()=>setValidated(true)} bg={C.green} bdr={C.green}/><Btn label="Recommencer" onClick={startDrawing} bg="transparent" bdr={C.accent} col={C.accent}/></>}
                {!isLockedMat && mode==="done" && validated && isProf && <><Btn label="Recommencer la droite" onClick={startDrawing} bg="transparent" bdr={C.accent} col={C.accent}/><Btn label="Reset" onClick={reset} bg="transparent" bdr={C.red} col={C.red}/></>}
                {!isLockedMat && mode==="done" && validated && isEleve && <>
                  <Btn label="Recommencer la droite" onClick={startDrawing} bg="transparent" bdr={C.muted} col={C.muted}/>
                  <button onClick={handleFinalValidation} style={{padding:"9px 20px",borderRadius:8,fontSize:14,fontWeight:900,fontFamily:F,border:`2px solid ${C.green}`,background:C.green,color:"#fff",cursor:"pointer"}}>✓ Valider définitivement</button>
                </>}
              </div>

              <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} width="100%" onClick={handleSvgClick} style={{display:"block",userSelect:"none",cursor:(mode==="first_click"||mode==="drawing")&&!isLockedMat?"crosshair":"default"}}>
                {xTicks.map(x=>{const sx=toS(x,yMin).x;return(<g key={x}><line x1={sx} y1={PAD.t} x2={sx} y2={PAD.t+CH} stroke={C.border} strokeWidth={0.8}/><text x={sx} y={PAD.t+CH+22} textAnchor="middle" fontSize={12} fontWeight={700} fill={C.muted} fontFamily={F}>{x}</text></g>);})}
                {yTicks.map(y=>{const sy=toS(xMin,y).y;return(<g key={y}><line x1={PAD.l} y1={sy} x2={PAD.l+CW} y2={sy} stroke={C.border} strokeWidth={0.8}/><text x={PAD.l-8} y={sy+5} textAnchor="end" fontSize={12} fontWeight={700} fill={C.muted} fontFamily={F}>{y.toFixed(2)}</text></g>);})}
                <line x1={PAD.l} y1={cosOneSvg} x2={PAD.l+CW} y2={cosOneSvg} stroke={C.green} strokeWidth={2} strokeDasharray="7 4"/>
                <text x={PAD.l+CW-4} y={cosOneSvg-7} textAnchor="end" fontSize={11} fontWeight={800} fill={C.green} fontFamily={F}>cos θ = 1</text>
                {eps && <line x1={eps.p1.x} y1={eps.p1.y} x2={eps.p2.x} y2={eps.p2.y} stroke={mat.color} strokeWidth={mode==="drawing"?2:2.5} strokeDasharray={mode==="drawing"?"8 5":"none"} opacity={mode==="drawing"?0.6:0.9}/>}
                {showGc && gcSvg && (<g>
                  <line x1={gcSvg.x} y1={PAD.t} x2={gcSvg.x} y2={PAD.t+CH} stroke={C.amber} strokeWidth={2} strokeDasharray="6 4"/>
                  <circle cx={gcSvg.x} cy={cosOneSvg} r={7} fill={C.amber} stroke="#fff" strokeWidth={2}/>
                  <rect x={gcSvg.x-62} y={PAD.t+5} width={128} height={28} rx={6} fill="#fff" stroke={C.amber} strokeWidth={2}/>
                  <text x={gcSvg.x+2} y={PAD.t+24} textAnchor="middle" fontSize={13} fontWeight={900} fill={C.amber} fontFamily={F}>γc = {fixedLine.gc.toFixed(1)} mN·m⁻¹</text>
                </g>)}
                {firstPt&&(()=>{const p=toS(firstPt.x,firstPt.y);return <circle cx={p.x} cy={p.y} r={7} fill={mat.color} stroke="#fff" strokeWidth={2.5}/>;})()}
                {DATA.map((p,i)=>{
                  const {x,y}=toS(p.x,p.y),isH=hov===i;
                  return(<g key={i} onMouseEnter={()=>setHov(i)} onMouseLeave={()=>setHov(null)} style={{cursor:"pointer"}}>
                    <circle cx={x} cy={y} r={isH?11:8} fill={mat.color} stroke="#fff" strokeWidth={2.5} style={{transition:"r 0.1s"}}/>
                    {isH&&(<g><rect x={x+14} y={y-44} width={200} height={48} rx={7} fill="#fff" stroke={C.border} strokeWidth={1.5}/><text x={x+22} y={y-24} fontSize={13} fontWeight={800} fill={C.text} fontFamily={F}>{p.name}</text><text x={x+22} y={y-8} fontSize={12} fontWeight={600} fill={C.muted} fontFamily={F}>γLV={p.x} | θ={p.theta}° | cosθ={p.y.toFixed(3)}</text></g>)}
                  </g>);
                })}
                {DATA.length===0&&<text x={PAD.l+CW/2} y={PAD.t+CH/2} textAnchor="middle" fontSize={13} fontWeight={700} fill={C.muted} fontFamily={F}>Ajoutez des mesures ci-dessous</text>}
                <text x={PAD.l+CW/2} y={H-6} textAnchor="middle" fontSize={13} fontWeight={800} fill={C.muted} fontFamily={F}>γLV (mN·m⁻¹)</text>
                <text x={13} y={PAD.t+CH/2} textAnchor="middle" fontSize={13} fontWeight={800} fill={C.muted} fontFamily={F} transform={`rotate(-90,13,${PAD.t+CH/2})`}>cos θ</text>
              </svg>

              {validated && errPct!==null && (
                <div style={{marginTop:12,padding:"12px 16px",borderRadius:8,fontSize:14,fontWeight:700,
                  background:errPct<5?"#dcfce7":errPct<15?"#fef9c3":"#fee2e2",
                  border:`2px solid ${errPct<5?"#16a34a":errPct<15?"#ca8a04":"#dc2626"}`,
                  color:errPct<5?C.green:errPct<15?C.amber:C.red}}>
                  {errPct<5  &&`Excellent ! γc=${fixedLine?.gc.toFixed(1)} mN·m⁻¹ — très proche de la valeur théorique (${mat.gc} mN·m⁻¹).`}
                  {errPct>=5 &&errPct<15&&`Bien ! Écart de ${errPct.toFixed(1)}% — ajustez légèrement la pente.`}
                  {errPct>=15&&`Écart de ${errPct.toFixed(1)}% — essayez d'aligner votre droite sur les points extrêmes.`}
                  {isEleve && !isLockedMat && <div style={{marginTop:6,fontSize:13,color:C.muted}}>Cliquez <strong>Valider définitivement</strong> pour enregistrer ce résultat.</div>}
                </div>
              )}

              {isLockedMat && eleveResults[mat.name] && (
                <div style={{marginTop:12,padding:"14px 16px",borderRadius:8,background:"#dcfce7",border:"2px solid #16a34a"}}>
                  <div style={{fontSize:14,fontWeight:900,color:C.green,marginBottom:8}}>Résultat enregistré — {mat.name}</div>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
                    {[["γc trouvé",`${eleveResults[mat.name].gcEleve} mN·m⁻¹`],["γc théorique",`${eleveResults[mat.name].gcTheo} mN·m⁻¹`],["Écart",`${eleveResults[mat.name].errPct}%`]].map(([k,v])=>(
                      <div key={k} style={{background:C.surface,borderRadius:8,padding:"8px 12px",textAlign:"center"}}>
                        <div style={{fontSize:11,fontWeight:700,color:C.muted,marginBottom:2}}>{k}</div>
                        <div style={{fontSize:16,fontWeight:900,color:C.text}}>{v}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Data table */}
              <div style={{marginTop:14,padding:"14px 16px",background:C.surface2,borderRadius:10,border:`1px solid ${C.border}`}}>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10,flexWrap:"wrap",gap:8}}>
                  <div>
                    <div style={{fontSize:13,fontWeight:900,color:C.text,textTransform:"uppercase",letterSpacing:1}}>Données — {mat.name}</div>
                    {hasSaved&&!hasEdits&&<div style={{fontSize:11,fontWeight:700,color:C.green,marginTop:2}}>Valeurs sauvegardées</div>}
                    {hasEdits&&<div style={{fontSize:11,fontWeight:700,color:C.amber,marginTop:2}}>Modifications non sauvegardées</div>}
                  </div>
                  {!isLockedMat&&(<div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                    {isProf&&smBtn("+ Ajouter",addLiquidProf,C.accent,true)}
                    {(hasEdits||hasSaved)&&(<button onClick={saveData} disabled={!hasEdits} style={{fontSize:12,fontWeight:800,fontFamily:F,padding:"5px 12px",borderRadius:6,border:`1.5px solid ${hasEdits?C.green:C.border}`,background:hasEdits?C.green+"18":C.surface2,color:hasEdits?C.green:C.muted,cursor:hasEdits?"pointer":"default"}}>{saveStatus==="saved"?"Sauvegardé ✓":saveStatus==="error"?"Erreur ✗":"💾 Sauvegarder + CSV"}</button>)}
                    {(hasEdits||hasSaved)&&smBtn(hasSaved&&!hasEdits?"Effacer":"Annuler",hasSaved&&!hasEdits?resetSaved:()=>{setEditableData(null);reset();},C.red)}
                  </div>)}
                </div>
                {activeLiquids.length>0?(
                  <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
                    <thead><tr style={{borderBottom:`1.5px solid ${C.border}`}}>
                      <th style={{textAlign:"left",fontWeight:800,color:C.muted,padding:"0 6px 8px",width:"30%"}}>Liquide</th>
                      <th style={{textAlign:"center",fontWeight:800,color:C.muted,padding:"0 4px 8px",width:"22%"}}>γLV (mN·m⁻¹)</th>
                      <th style={{textAlign:"center",fontWeight:800,color:C.muted,padding:"0 4px 8px"}}>θ (°)</th>
                      <th style={{textAlign:"center",fontWeight:800,color:C.muted,padding:"0 4px 8px"}}>cos θ</th>
                      {!isLockedMat&&<th style={{width:"10%"}}></th>}
                    </tr></thead>
                    <tbody>{activeLiquids.map((liq,i)=>(
                      <tr key={i} style={{background:i%2===0?C.surface:C.surface2,borderBottom:`0.5px solid ${C.border}`}}>
                        <td style={{padding:"4px 6px"}}>{isProf&&!isLockedMat?<input value={liq.name} onChange={e=>updateLiquid(i,"name",e.target.value)} style={{width:"100%",fontFamily:F,fontSize:12,fontWeight:700,padding:"3px 5px",borderRadius:5,border:`1px solid ${C.border}`,background:"transparent",color:C.text}}/>:<span style={{fontWeight:700,color:C.text}}>{liq.name}</span>}</td>
                        <td style={{padding:"4px 4px",textAlign:"center"}}>{isProf&&!isLockedMat?<input type="number" step="0.1" min="10" max="90" value={liq.gamma} onChange={e=>{const v=parseFloat(e.target.value);if(!isNaN(v))updateLiquid(i,"gamma",v);}} style={{width:64,textAlign:"center",fontFamily:F,fontSize:13,fontWeight:700,padding:"3px 4px",borderRadius:5,border:`1px solid ${C.border}`,background:"transparent",color:C.text}}/>:<span style={{fontWeight:700,color:C.muted}}>{liq.gamma}</span>}</td>
                        <td style={{padding:"4px 4px",textAlign:"center"}}>{!isLockedMat?<input type="number" step="0.1" min="0" max="90" value={liq.theta} onChange={e=>{const v=parseFloat(e.target.value);if(!isNaN(v))updateLiquid(i,"theta",Math.min(90,Math.max(0,v)));}} style={{width:54,textAlign:"center",fontFamily:F,fontSize:13,fontWeight:700,padding:"3px 4px",borderRadius:5,border:`1px solid ${C.border}`,background:"transparent",color:C.text}}/>:<span style={{fontWeight:700,color:C.muted}}>{liq.theta}</span>}</td>
                        <td style={{padding:"4px 6px",textAlign:"center",fontWeight:800,color:mat.color,fontSize:13}}>{cosD(liq.theta).toFixed(3)}</td>
                        {!isLockedMat&&<td style={{padding:"4px 6px",textAlign:"center"}}><button onClick={()=>removeLiquid(i)} disabled={activeLiquids.length<=1} style={{fontSize:14,fontWeight:900,fontFamily:F,padding:"1px 8px",borderRadius:5,border:`1px solid ${activeLiquids.length>1?C.red:C.border}`,background:"transparent",color:activeLiquids.length>1?C.red:C.border,cursor:activeLiquids.length>1?"pointer":"default",lineHeight:1}}>×</button></td>}
                      </tr>
                    ))}</tbody>
                  </table>
                ):(
                  <div style={{padding:"12px",textAlign:"center",fontSize:13,fontWeight:700,color:C.muted}}>Aucune donnée. Ajoutez vos mesures ci-dessous.</div>
                )}
                {isEleve&&!isLockedMat&&<AddPointRow mat={mat} onAdd={addLiquidEleve}/>}
                <div style={{marginTop:8,fontSize:11,fontWeight:600,color:C.muted,lineHeight:1.6}}>
                  {isProf?"Modifiez nom, γLV ou θ — le graphe se met à jour. Sauvegarder génère aussi un CSV."
                        :"Sélectionnez un solvant, entrez θ, cliquez Ajouter. Tracez la droite puis validez définitivement."}
                </div>
              </div>
            </>,{})}
          </div>
        </div>
      )}

      {/* ── THEORY ── */}
      {tab==="theory"&&(
        <div style={{padding:"28px 28px 48px",maxWidth:760,margin:"0 auto"}}>
          <div style={{display:"flex",flexDirection:"column",gap:16}}>
            {[
              {title:"Principe",color:C.accent,text:"Zisman a montré empiriquement que pour une série de liquides homologues (ex : alcanes) déposés sur un solide donné, cos θ varie linéairement avec γLV.\n\nEn extrapolant la droite jusqu'à cos θ = 1 (θ = 0°), on obtient la tension critique γc : c'est la tension de surface maximale d'un liquide permettant encore un mouillage total."},
              {title:"Critère de mouillage",color:C.amber,text:"γLV ≤ γc  →  mouillage total (θ = 0°)\nγLV > γc  →  mouillage partiel (θ > 0°)\n\nApplication : pour peindre un substrat polymère, la tension de surface de la peinture doit être inférieure à γc. Sinon, un traitement de surface s'impose."},
              {title:"Lien avec Young-Dupré",color:C.green,text:"La loi de Young-Dupré relie cos θ aux tensions interfaciales :\n\nWa = γLV (1 + cos θ) = γSV + γLV − γSL\n\nLa linéarité observée par Zisman est une conséquence directe de cette relation, avec γSV ≈ γc pour les liquides purement dispersifs."},
              {title:"Limites de la méthode",color:C.red,text:"· Ne donne qu'une valeur globale de γc, sans distinguer γᴰ et γᴾ.\n· Valable surtout pour les liquides homologues.\n· Les liquides polaires (eau) s'écartent souvent de la droite.\n· Pour séparer les composantes → méthode d'Owens-Wendt (eau + diiodométhane)."},
            ].map(c=>(<div key={c.title} style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:12,overflow:"hidden"}}>
              <div style={{padding:"13px 18px",borderBottom:`1px solid ${C.border}`,borderLeft:`5px solid ${c.color}`,fontSize:16,fontWeight:900,color:c.color}}>{c.title}</div>
              <div style={{padding:"16px 18px",fontSize:14,fontWeight:600,color:C.muted,lineHeight:1.9,whiteSpace:"pre-line"}}>{c.text}</div>
            </div>))}
            <div style={{background:C.surface2,border:`2px solid ${C.amber}`,borderRadius:12,padding:"20px 24px",textAlign:"center"}}>
              <div style={{fontSize:12,fontWeight:800,color:C.muted,marginBottom:10,letterSpacing:1.5,textTransform:"uppercase"}}>Équation de la droite de Zisman</div>
              <div style={{fontSize:20,fontWeight:900,color:C.amber}}>cos θ = 1 − b · (γLV − γc)</div>
              <div style={{fontSize:13,fontWeight:700,color:C.muted,marginTop:10}}>b = pente · γc = tension critique (extrapolation à cos θ = 1)</div>
            </div>
          </div>
        </div>
      )}

      {/* ── QUIZ ── */}
      {tab==="quiz"&&(
        <div style={{padding:"36px 28px 48px",maxWidth:640,margin:"0 auto"}}>
          <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:14,padding:30}}>
            <div style={{fontSize:12,fontWeight:800,color:C.muted,marginBottom:16,letterSpacing:1.5,textTransform:"uppercase"}}>Question {(qIdx%QS.length)+1} / {QS.length}</div>
            <div style={{fontSize:17,fontWeight:800,color:C.text,lineHeight:1.7,marginBottom:24}}>{Q.q}</div>
            <div style={{display:"flex",flexDirection:"column",gap:10}}>
              {Q.choices.map((ch,i)=>{
                const ok=i===Q.ans,sel=qAns===i;
                const bg=qAns===null?C.surface2:ok?"#dcfce7":sel?"#fee2e2":C.surface2;
                const bdr=qAns===null?C.border:ok?"#16a34a":sel?"#dc2626":C.border;
                const col=qAns===null?C.muted:ok?C.green:sel?C.red:C.muted;
                return <button key={i} disabled={qAns!==null} onClick={()=>setQAns(i)} style={{padding:"14px 18px",borderRadius:10,textAlign:"left",border:`2px solid ${bdr}`,background:bg,color:col,fontFamily:F,fontSize:14,fontWeight:700,cursor:qAns!==null?"default":"pointer",transition:"all 0.15s"}}>{ch}</button>;
              })}
            </div>
            {qAns!==null&&(<>
              <div style={{marginTop:18,padding:"14px 16px",borderRadius:10,background:C.surface2,border:`1px solid ${C.border}`,fontSize:14,fontWeight:700,color:C.muted,lineHeight:1.7}}>
                <span style={{color:qAns===Q.ans?C.green:C.red,fontWeight:900}}>{qAns===Q.ans?"Correct — ":"Incorrect — "}</span>{Q.expl}
              </div>
              <button onClick={()=>{setQAns(null);setQIdx(n=>n+1);}} style={{marginTop:16,padding:"12px 24px",borderRadius:10,border:`2px solid ${C.accent}`,background:C.accent,color:"#fff",fontFamily:F,fontSize:14,fontWeight:900,cursor:"pointer"}}>Question suivante →</button>
            </>)}
          </div>
        </div>
      )}
    </div>
  );
}
