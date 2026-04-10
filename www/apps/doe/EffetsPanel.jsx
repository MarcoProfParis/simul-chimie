// ─── EffetsPanel.jsx ──────────────────────────────────────────────────────────
// Onglet pédagogique "Calcul des effets"
// Affiche pour chaque terme du modèle :
//   - la matrice des essais avec colonne active colorée
//   - les essais contribuant à Moy(+1) et Moy(-1)
//   - la formule détaillée avec les vraies valeurs numériques
//   - le coefficient résultant et son interprétation

import React, { useState, useRef, useEffect } from "react";

// ─── Utilitaire : signe d'un terme pour un essai ─────────────────────────────
function getSign(row, termFactors, factors) {
  // Pour un terme linéaire : signe = coded[Xi]
  // Pour une interaction : signe = produit des coded
  // isQuadPure : géré en amont (non montré ici car difficile à expliquer visuellement)
  return termFactors.reduce((prod, fid) => {
    const c = row.coded[fid] ?? 0;
    return prod * c;
  }, 1);
}

// ─── Composant principal ──────────────────────────────────────────────────────
export default function EffetsPanel({ model, fit, matrix, factors, responses, activeResp, col }) {
  const [selectedTerm, setSelectedTerm] = useState(null);
  const [showCalcPopup, setShowCalcPopup] = useState(false);
  const [popupPos, setPopupPos] = useState({ x: 80, y: 120 });
  const dragRef = useRef(null);
  const popupRef = useRef(null);

  // Drag de la popup
  useEffect(() => {
    if (!showCalcPopup) return;
    const onMove = (e) => {
      if (!dragRef.current) return;
      setPopupPos(prev => ({
        x: prev.x + e.movementX,
        y: prev.y + e.movementY,
      }));
    };
    const onUp = () => { dragRef.current = false; };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [showCalcPopup]);

  // Filtrer les lignes actives avec une vraie valeur de réponse
  const validRows = (matrix || []).filter(row => {
    const v = row.responses[activeResp?.id];
    return v !== "" && v !== null && v !== undefined && !isNaN(+v);
  });

  if (!validRows.length) {
    return (
      <p className="text-sm text-gray-400 p-4">
        Saisir les valeurs de réponse dans la matrice pour voir les calculs d'effets.
      </p>
    );
  }

  // Termes du modèle (hors constante, hors quadratiques purs pour garder l'approche BTS)
  const linearAndInteractionTerms = model.terms.filter(t => {
    // Exclure les termes quadratiques purs (id + "2")
    return !factors.some(f => t === f.id + "2");
  });

  const termLabel = (t) => {
    let s = t;
    factors.forEach((f, i) => { s = s.split(f.id).join(`X${i + 1}`); });
    // Remettre les vrais noms
    const fIds = factors.filter(f => t.includes(f.id));
    if (fIds.length === 1) return `${fIds[0].id} — ${fIds[0].name}`;
    return fIds.map(f => f.id).join("·") + " — Interaction";
  };

  const term = selectedTerm ? linearAndInteractionTerms.find(t => t === selectedTerm) : null;
  const termFactors = term ? factors.filter(f => term.includes(f.id)) : [];
  const isInteraction = termFactors.length > 1;

  // Calcul des signes, moyennes et effet
  let plusRows = [], minusRows = [], moyPlus = null, moyMinus = null, effet = null;
  if (term && termFactors.length > 0) {
    const yKey = activeResp?.id;
    plusRows  = validRows.filter(r => getSign(r, termFactors.map(f => f.id), factors) > 0);
    minusRows = validRows.filter(r => getSign(r, termFactors.map(f => f.id), factors) < 0);
    if (plusRows.length && minusRows.length) {
      moyPlus  = plusRows.reduce((s, r) => s + (+r.responses[yKey]), 0) / plusRows.length;
      moyMinus = minusRows.reduce((s, r) => s + (+r.responses[yKey]), 0) / minusRows.length;
      effet = (moyPlus - moyMinus) / 2;
    }
  }

  const fmt = (v) => v !== null && v !== undefined ? (+v).toFixed(3) : "—";
  const fmt2 = (v) => v !== null && v !== undefined ? (+v).toFixed(2) : "—";
  const yKey = activeResp?.id;

  return (
    <div className="space-y-4">

      {/* ── Sélecteur de terme ── */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-3">
          Sélectionner un terme à calculer
        </p>
        <div className="flex flex-wrap gap-2">
          {linearAndInteractionTerms.map(t => {
            const tFactors = factors.filter(f => t.includes(f.id));
            const label = tFactors.length === 1
              ? `${t} — ${tFactors[0].name}`
              : tFactors.map(f => f.id).join("·") + " — interaction";
            return (
              <button key={t} onClick={() => setSelectedTerm(t === selectedTerm ? null : t)}
                className={`rounded-lg border px-3 py-1.5 text-xs font-mono transition-colors ${
                  selectedTerm === t
                    ? "bg-indigo-600 text-white border-transparent"
                    : "border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/20"
                }`}>
                {label}
              </button>
            );
          })}
        </div>
        {linearAndInteractionTerms.length === 0 && (
          <p className="text-xs text-gray-400 mt-2">
            Aucun terme linéaire ou d'interaction dans le modèle actuel.
          </p>
        )}
        {/* Mini-tableau récapitulatif des niveaux */}
        {factors.filter(f => f.continuous).length > 0 && (
          <div className="mt-4 overflow-x-auto">
            <table className="text-xs border-collapse w-auto">
              <thead>
                <tr>
                  <th className="px-2 py-1 border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-500 text-left font-medium">
                    Facteur
                  </th>
                  <th className="px-2 py-1 border border-gray-200 dark:border-gray-700 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 font-medium text-center">
                    −1
                  </th>
                  <th className="px-2 py-1 border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-500 font-medium text-center">
                    0
                  </th>
                  <th className="px-2 py-1 border border-gray-200 dark:border-gray-700 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 font-medium text-center">
                    +1
                  </th>
                </tr>
              </thead>
              <tbody>
                {factors.filter(f => f.continuous).map(f => (
                  <tr key={f.id}>
                    <td className="px-2 py-1 border border-gray-200 dark:border-gray-700 font-mono text-gray-700 dark:text-gray-300">
                      {f.id} — {f.name}{f.unit ? ` (${f.unit})` : ""}
                    </td>
                    <td className="px-2 py-1 border border-gray-200 dark:border-gray-700 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 text-center font-mono">
                      {f.low.real}
                    </td>
                    <td className="px-2 py-1 border border-gray-200 dark:border-gray-700 text-gray-500 text-center font-mono">
                      {+((f.low.real + f.high.real) / 2).toFixed(2)}
                    </td>
                    <td className="px-2 py-1 border border-gray-200 dark:border-gray-700 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 text-center font-mono">
                      {f.high.real}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Contenu du calcul ── */}
      {term && termFactors.length > 0 && (
        <>
          {/* Étape 1 — Matrice avec colonne active */}
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-3">
              Étape 1 — Matrice des essais · colonne {term}
            </p>
            <div className="overflow-x-auto">
              <table className="text-xs border-collapse font-mono whitespace-nowrap">
                <thead>
                  <tr>
                    <th className="text-left px-3 py-2 border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800 text-gray-400 font-medium">
                      Essai
                    </th>
                    {factors.filter(f => f.continuous).map(f => (
                      <th key={f.id}
                        className={`px-3 py-2 border font-medium text-center ${
                          termFactors.some(tf => tf.id === f.id)
                            ? "border-indigo-300 dark:border-indigo-700 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300"
                            : "border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800 text-gray-400"
                        }`}>
                        {f.id}
                        <span className="block font-normal text-[10px] opacity-70">{f.name}</span>
                      </th>
                    ))}
                    {isInteraction && (
                      <th className="px-3 py-2 border border-indigo-300 dark:border-indigo-700 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 font-medium text-center">
                        {term}
                        <span className="block font-normal text-[10px] opacity-70">
                          {termFactors.map(f => f.id).join("×")}
                        </span>
                      </th>
                    )}
                    <th className="px-3 py-2 border border-gray-100 dark:border-gray-800 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 font-medium text-center">
                      {activeResp?.name || "Y"} ({activeResp?.unit || ""})
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {validRows.map((row, ri) => {
                    const s = getSign(row, termFactors.map(f => f.id), factors);
                    const isPlus = s > 0;
                    const yVal = +(row.responses[yKey]);
                    const contFactors = factors.filter(f => f.continuous);
                    return (
                      <tr key={ri}>
                        <td className="px-3 py-1.5 border border-gray-100 dark:border-gray-800 text-gray-500 dark:text-gray-400 font-sans">
                          Essai {ri + 1}
                        </td>
                        {contFactors.map(f => {
                          const c = row.coded[f.id];
                          const isActiveFactor = termFactors.some(tf => tf.id === f.id);
                          return (
                            <td key={f.id}
                              className={`px-3 py-1.5 border text-center font-semibold ${
                                c > 0
                                  ? "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 border-emerald-100 dark:border-emerald-900/50"
                                  : c < 0
                                  ? "bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border-red-100 dark:border-red-900/50"
                                  : "border-gray-100 dark:border-gray-800 text-gray-400"
                              }`}>
                              {c > 0 ? "+1" : c < 0 ? "−1" : "0"}
                            </td>
                          );
                        })}
                        {isInteraction && (
                          <td className={`px-3 py-1.5 border text-center font-bold ${
                            isPlus
                              ? "bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800"
                              : "bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border-red-100 dark:border-red-900/50"
                          }`}>
                            {isPlus ? "+1" : "−1"}
                          </td>
                        )}
                        <td className={`px-3 py-1.5 border text-center font-semibold ${
                          isPlus
                            ? "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/50"
                            : "bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border-red-100 dark:border-red-900/50"
                        }`}>
                          {yVal.toFixed(2)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-2">
              {isInteraction
                ? `Colonne ${term} = produit des signes de ${termFactors.map(f => f.id).join(" et ")}. Cases indigo = +1 (contribuent à Moy(+1)).`
                : `Cases vertes = essais où ${termFactors[0].id} est au niveau +1 · Cases rouges = niveau −1.`}
              {" "}Cases orangées = valeurs Y utilisées pour Moy(+1).
            </p>
          </div>

          {/* Étape 2 — Moyennes */}
          {moyPlus !== null && (
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-3">
                Étape 2 — Moyennes par niveau
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">

                {/* Moy(+1) */}
                <div className="rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-400 mb-2">
                    Moy(+1) — essais où {term} = +1
                  </p>
                  <div className="flex flex-wrap gap-1 mb-2">
                    {plusRows.map((r, i) => {
                      const ri = validRows.indexOf(r);
                      return (
                        <span key={i} className="inline-block bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300 font-mono text-xs px-2 py-0.5 rounded">
                          E{ri + 1} = {(+r.responses[yKey]).toFixed(2)}
                        </span>
                      );
                    })}
                  </div>
                  <p className="text-[11px] text-emerald-700 dark:text-emerald-400 font-mono">
                    = ({plusRows.map(r => (+r.responses[yKey]).toFixed(2)).join(" + ")}) / {plusRows.length}
                  </p>
                  <p className="text-lg font-semibold font-mono text-emerald-700 dark:text-emerald-300 mt-1">
                    = {fmt2(moyPlus)}
                  </p>
                </div>

                {/* Moy(-1) */}
                <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-red-700 dark:text-red-400 mb-2">
                    Moy(−1) — essais où {term} = −1
                  </p>
                  <div className="flex flex-wrap gap-1 mb-2">
                    {minusRows.map((r, i) => {
                      const ri = validRows.indexOf(r);
                      return (
                        <span key={i} className="inline-block bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-300 font-mono text-xs px-2 py-0.5 rounded">
                          E{ri + 1} = {(+r.responses[yKey]).toFixed(2)}
                        </span>
                      );
                    })}
                  </div>
                  <p className="text-[11px] text-red-700 dark:text-red-400 font-mono">
                    = ({minusRows.map(r => (+r.responses[yKey]).toFixed(2)).join(" + ")}) / {minusRows.length}
                  </p>
                  <p className="text-lg font-semibold font-mono text-red-700 dark:text-red-300 mt-1">
                    = {fmt2(moyMinus)}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Étape 3 — Formule et résultat */}
          {effet !== null && (
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-3">
                Étape 3 — Calcul de l'effet = coefficient b
              </p>

              <div className="flex justify-end mb-3">
                <button
                  onClick={() => {
                    setPopupPos({ x: 80, y: 120 });
                    setShowCalcPopup(true);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500 transition-colors shadow-sm"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="size-3.5">
                    <path d="M2 3a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3ZM2 7.5h5v5H3a1 1 0 0 1-1-1v-4ZM8.5 7.5v5H13a1 1 0 0 1 1-1v-4H8.5Z"/>
                  </svg>
                  Montrer les calculs
                </button>
              </div>

              {/* Formule */}
              <div className="flex items-center flex-wrap gap-3 mb-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <span className="text-sm font-mono text-gray-600 dark:text-gray-300">
                  b<sub>{termFactors.map((f,i) => String(i+1 + (termFactors.indexOf(f) > 0 ? termFactors.length : 0))).join("")}</sub> =
                </span>
                {/* Fraction */}
                <div className="flex flex-col items-center text-sm font-mono">
                  <span className="border-b border-gray-400 dark:border-gray-500 px-3 pb-0.5 text-emerald-700 dark:text-emerald-300">
                    Moy(+1) − Moy(−1)
                  </span>
                  <span className="pt-0.5 text-gray-500">2</span>
                </div>
                <span className="text-sm font-mono text-gray-500">=</span>
                <div className="flex flex-col items-center text-sm font-mono">
                  <span className="border-b border-gray-400 dark:border-gray-500 px-3 pb-0.5">
                    <span className="text-emerald-700 dark:text-emerald-300">{fmt2(moyPlus)}</span>
                    {" − "}
                    <span className="text-red-600 dark:text-red-400">{fmt2(moyMinus)}</span>
                  </span>
                  <span className="pt-0.5 text-gray-500">2</span>
                </div>
                <span className="text-sm font-mono text-gray-500">=</span>
                <span className={`inline-block font-mono font-semibold text-base px-4 py-1 rounded-lg border ${
                  effet > 0.5
                    ? "bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 border-indigo-300 dark:border-indigo-700"
                    : effet < -0.5
                    ? "bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border-red-300 dark:border-red-700"
                    : "bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700"
                }`}>
                  {effet > 0 ? "+" : ""}{fmt(effet)}
                </span>
              </div>

              {/* Interprétation */}
              <div className={`rounded-lg px-4 py-3 border-l-4 text-xs leading-relaxed ${
                Math.abs(effet) < 0.3
                  ? "bg-gray-50 dark:bg-gray-800/50 border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400"
                  : effet > 0
                  ? "bg-indigo-50 dark:bg-indigo-900/20 border-indigo-400 text-indigo-800 dark:text-indigo-300"
                  : "bg-red-50 dark:bg-red-900/20 border-red-400 text-red-800 dark:text-red-300"
              }`}>
                {Math.abs(effet) < 0.3 ? (
                  <p>Effet très faible ({fmt(effet)}) → {termFactors.map(f => f.name).join(" × ")} a peu d'influence sur {activeResp?.name || "la réponse"}.</p>
                ) : effet > 0 ? (
                  <p>
                    Effet positif (+{fmt(effet)}) → {isInteraction
                      ? `l'interaction ${termFactors.map(f => f.name).join(" × ")} a un effet synergique.`
                      : `augmenter ${termFactors[0].name} augmente ${activeResp?.name || "la réponse"} de ${Math.abs(effet * 2).toFixed(2)} ${activeResp?.unit || ""} entre les deux niveaux.`}
                  </p>
                ) : (
                  <p>
                    Effet négatif ({fmt(effet)}) → {isInteraction
                      ? `l'interaction ${termFactors.map(f => f.name).join(" × ")} a un effet antagoniste.`
                      : `augmenter ${termFactors[0].name} diminue ${activeResp?.name || "la réponse"} de ${Math.abs(effet * 2).toFixed(2)} ${activeResp?.unit || ""} entre les deux niveaux.`}
                  </p>
                )}
                {isInteraction && (
                  <p className="mt-1 opacity-80">
                    L'interaction signifie que l'effet de {termFactors[0].name} n'est pas le même selon le niveau de {termFactors[1].name}.
                  </p>
                )}
              </div>

              {/* Vérification avec fit si disponible */}
              {fit && (() => {
                const termIdx = model.terms.indexOf(term);
                if (termIdx < 0) return null;
                const bFromFit = fit.coeffs[termIdx + 1];
                const diff = Math.abs(bFromFit - effet);
                return (
                  <div className="mt-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 px-3 py-2 text-xs text-amber-700 dark:text-amber-300">
                    <span className="font-semibold">Vérification :</span> coefficient estimé par moindres carrés = {bFromFit.toFixed(3)}.
                    {diff < 0.01
                      ? " ✓ Les deux méthodes donnent le même résultat (plan orthogonal)."
                      : ` Différence de ${diff.toFixed(3)} — le plan n'est pas parfaitement orthogonal (points centraux inclus).`}
                  </div>
                );
              })()}
            </div>
          )}
        </>
      )}

      {/* ── Popup draggable "Calcul complet" ── */}
      {showCalcPopup && effet !== null && (
        <div
          ref={popupRef}
          style={{
            position: "fixed",
            left: popupPos.x,
            top: popupPos.y,
            zIndex: 300,
            width: 340,
            background: "var(--bg, #fff)",
            border: "1.5px solid #6366f1",
            borderRadius: 12,
            boxShadow: "0 8px 32px rgba(0,0,0,0.18)",
            userSelect: "none",
          }}
        >
          {/* Header draggable */}
          <div
            onMouseDown={() => { dragRef.current = true; }}
            style={{ cursor: "grab", padding: "10px 14px", borderBottom: "1px solid #e5e7eb",
              display: "flex", alignItems: "center", justifyContent: "space-between",
              background: "#eef2ff", borderRadius: "10px 10px 0 0" }}
          >
            <span style={{ fontSize: 12, fontWeight: 700, color: "#4338ca" }}>
              ✦ Calcul — {term}
            </span>
            <button
              onMouseDown={e => e.stopPropagation()}
              onClick={() => setShowCalcPopup(false)}
              style={{ fontSize: 16, lineHeight: 1, background: "none", border: "none",
                color: "#6b7280", cursor: "pointer", padding: "0 2px" }}
            >
              ×
            </button>
          </div>

          {/* Contenu compact */}
          <div style={{ padding: "12px 14px", fontSize: 12 }}>

            {/* Résultat principal */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10,
              padding: "8px 12px", background: "#f0fdf4", borderRadius: 8, border: "1px solid #bbf7d0" }}>
              <span style={{ fontFamily: "monospace", color: "#374151" }}>b = </span>
              <span style={{ fontFamily: "monospace", fontWeight: 700, fontSize: 16,
                color: effet > 0 ? "#15803d" : effet < 0 ? "#dc2626" : "#6b7280" }}>
                {effet > 0 ? "+" : ""}{(+effet).toFixed(3)}
              </span>
              {activeResp?.unit && (
                <span style={{ fontSize: 10, color: "#9ca3af" }}>{activeResp.unit}</span>
              )}
            </div>

            {/* Formule */}
            <div style={{ fontFamily: "monospace", fontSize: 11, color: "#374151", marginBottom: 8 }}>
              <div style={{ marginBottom: 4, color: "#6b7280", fontSize: 10, textTransform: "uppercase", letterSpacing: 1 }}>
                Formule
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                <span>b =</span>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                  <span style={{ borderBottom: "1px solid #9ca3af", paddingBottom: 1, color: "#15803d" }}>
                    {(+moyPlus).toFixed(2)} − {(+moyMinus).toFixed(2)}
                  </span>
                  <span style={{ color: "#6b7280", paddingTop: 1 }}>2</span>
                </div>
                <span>=</span>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                  <span style={{ borderBottom: "1px solid #9ca3af", paddingBottom: 1 }}>
                    {(+(moyPlus - moyMinus)).toFixed(2)}
                  </span>
                  <span style={{ color: "#6b7280", paddingTop: 1 }}>2</span>
                </div>
                <span>=</span>
                <span style={{ fontWeight: 700, color: effet > 0 ? "#15803d" : "#dc2626" }}>
                  {(+effet).toFixed(3)}
                </span>
              </div>
            </div>

            {/* Interprétation courte */}
            <div style={{ fontSize: 11, color: "#374151", padding: "6px 10px",
              background: Math.abs(effet) < 0.3 ? "#f9fafb" : effet > 0 ? "#eff6ff" : "#fef2f2",
              borderRadius: 6, borderLeft: `3px solid ${Math.abs(effet) < 0.3 ? "#d1d5db" : effet > 0 ? "#6366f1" : "#ef4444"}` }}>
              {Math.abs(effet) < 0.3
                ? `Effet faible → ${termFactors.map(f => f.name).join(" × ")} peu influent.`
                : effet > 0
                ? `Effet positif → augmenter ${isInteraction ? "l'interaction" : termFactors[0]?.name} augmente ${activeResp?.name || "Y"}.`
                : `Effet négatif → augmenter ${isInteraction ? "l'interaction" : termFactors[0]?.name} diminue ${activeResp?.name || "Y"}.`
              }
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
