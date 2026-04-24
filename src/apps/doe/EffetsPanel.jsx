// ─── EffetsPanel.jsx ──────────────────────────────────────────────────────────
// Onglet pédagogique "Calcul des effets"
// Affiche pour chaque terme du modèle :
//   - la matrice des essais avec colonne active colorée
//   - les essais contribuant à Moy(+1) et Moy(-1)
//   - la formule détaillée avec les vraies valeurs numériques
//   - le coefficient résultant et son interprétation

import React, { useState } from "react";
import { useLang } from "../../i18n";

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
export default function EffetsPanel({ model, fit, matrix, factors, responses, activeResp, col, compact = false }) {
  const { t } = useLang();
  const [selectedTerm, setSelectedTerm] = useState(null);
  const [showCalcPopup, setShowCalcPopup] = useState(false);
  const [popupPos, setPopupPos] = useState({ x: 80, y: 80 });
  const popupDrag = React.useRef(null); // { startX, startY, origX, origY }
  const popupRef = React.useRef(null);

  const onPopupMouseDown = (e) => {
    if (e.target.closest('button')) return; // ne pas déclencher sur les boutons
    e.preventDefault();
    popupDrag.current = {
      startX: e.clientX,
      startY: e.clientY,
      origX: popupPos.x,
      origY: popupPos.y,
    };
    const onMove = (ev) => {
      if (!popupDrag.current) return;
      const dx = ev.clientX - popupDrag.current.startX;
      const dy = ev.clientY - popupDrag.current.startY;
      setPopupPos({
        x: Math.max(0, popupDrag.current.origX + dx),
        y: Math.max(0, popupDrag.current.origY + dy),
      });
    };
    const onUp = () => {
      popupDrag.current = null;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

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
          {t("doe.selectTerm")}
        </p>
        <div className="flex flex-wrap gap-2">
          {linearAndInteractionTerms.map(t => {
            const tFactors = factors.filter(f => t.includes(f.id));
            const label = tFactors.length === 1
              ? `${t} — ${tFactors[0].name}`
              : tFactors.map(f => f.id).join("·") + " — interaction";
            // Calcul rapide du coefficient b pour ce terme
            const tPlusRows  = validRows.filter(r => getSign(r, tFactors.map(f => f.id), factors) > 0);
            const tMinusRows = validRows.filter(r => getSign(r, tFactors.map(f => f.id), factors) < 0);
            let bVal = null;
            if (tPlusRows.length && tMinusRows.length) {
              const mp = tPlusRows.reduce((s,r)=>s+(+r.responses[activeResp?.id]),0)/tPlusRows.length;
              const mm = tMinusRows.reduce((s,r)=>s+(+r.responses[activeResp?.id]),0)/tMinusRows.length;
              bVal = (mp - mm) / 2;
            }
            const isActive = selectedTerm === t;
            return (
              <button key={t} onClick={() => { setSelectedTerm(t === selectedTerm ? null : t); setShowCalcPopup(false); }}
                className={`flex flex-col items-start rounded-lg border px-3 py-1.5 text-xs font-mono transition-colors ${
                  isActive
                    ? "bg-indigo-600 text-white border-transparent"
                    : "border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/20"
                }`}>
                <span>{label}</span>
                {bVal !== null && (
                  <span className={`text-[10px] font-semibold mt-0.5 ${
                    isActive ? "text-indigo-200"
                    : bVal > 0.3 ? "text-emerald-600 dark:text-emerald-400"
                    : bVal < -0.3 ? "text-red-600 dark:text-red-400"
                    : "text-gray-400"
                  }`}>
                    b = {bVal > 0 ? "+" : ""}{bVal.toFixed(3)}
                  </span>
                )}
              </button>
            );
          })}
        </div>
        {linearAndInteractionTerms.length === 0 && (
          <p className="text-xs text-gray-400 mt-2">
            Aucun terme linéaire ou d'interaction dans le modèle actuel.
          </p>
        )}

        {/* ── Niveaux du terme sélectionné : badges −1/0/+1 avec valeur réelle ── */}
        {selectedTerm && (() => {
          const selTerm = linearAndInteractionTerms.find(t => t === selectedTerm);
          if (!selTerm) return null;
          const selFactors = factors.filter(f => selTerm.includes(f.id));
          const toReal = (f, c) => {
            if (!f.continuous) return c > 0 ? (f.high.label || '+1') : c < 0 ? (f.low.label || '−1') : '0';
            const mid = (f.low.real + f.high.real) / 2;
            const half = (f.high.real - f.low.real) / 2;
            return +(mid + c * half).toFixed(2);
          };
          return (
            <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800">
              <div className="flex flex-wrap gap-4">
                {selFactors.map(f => {
                  const levels = f.continuous ? [-1, 0, 1] : [-1, 1];
                  return (
                    <div key={f.id} className="flex flex-col gap-1.5">
                      <span className="text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 font-mono">
                        {f.id} — {f.name}
                      </span>
                      <div className="flex items-center gap-1.5">
                        {levels.map(c => (
                          <span key={c} className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-mono font-semibold border ${
                            c > 0  ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300'
                            : c < 0 ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300'
                                    : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400'
                          }`}>
                            {c > 0 ? '+1' : c < 0 ? '−1' : '0'}
                            <span className="text-[10px] font-normal opacity-70">
                              : {toReal(f, c)}{f.unit ? ' ' + f.unit : ''}
                            </span>
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}
      </div>

      {/* ── Contenu du calcul ── */}
      {term && termFactors.length > 0 && (
        <div className="flex flex-col gap-4">
          {/* Matrice avec colonne active */}
          <div className={`w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl ${compact ? "p-3" : "p-5"}`}>
            <div className="flex items-center justify-between mb-3">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">
                Matrice des essais · colonne {term}
              </p>
              {effet !== null && (
                <button
                  onClick={() => setShowCalcPopup(true)}
                  className="inline-flex items-center gap-1.5 text-[11px] font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-700 rounded-lg px-2.5 py-1 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="size-3.5">
                    <path fillRule="evenodd" d="M15 8A7 7 0 1 1 1 8a7 7 0 0 1 14 0ZM9 5a1 1 0 1 1-2 0 1 1 0 0 1 2 0ZM6.75 8a.75.75 0 0 0 0 1.5h.75v1.75a.75.75 0 0 0 1.5 0v-2.5A.75.75 0 0 0 8.25 8h-1.5Z" clipRule="evenodd" />
                  </svg>
                  {t("doe.showCalc")}
                </button>
              )}
            </div>
            <div className="overflow-x-auto">
              <table className="text-xs border-collapse font-mono w-full" style={{tableLayout:"fixed"}}>
                <colgroup>
                  <col style={{width:"50px"}} />
                  {factors.filter(f => f.continuous).map(f => (
                    <col key={f.id} style={{width:"60px"}} />
                  ))}
                  {isInteraction && <col style={{width:"56px"}} />}
                  <col style={{width:"80px"}} />
                </colgroup>
                <thead>
                  <tr>
                    <th className="text-left px-2 py-1.5 border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800 text-gray-400 font-medium text-[11px]">
                      Essai
                    </th>
                    {factors.filter(f => f.continuous).map(f => (
                      <th key={f.id}
                        className={`px-3 py-2 border font-medium text-center ${
                          termFactors.some(tf => tf.id === f.id)
                            ? "border-indigo-300 dark:border-indigo-700 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300"
                            : "border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800 text-gray-400"
                        }`}>
                        <span className="block truncate text-[11px]" title={f.id}>{f.id}</span>
                        <span className="block font-normal text-[10px] opacity-70 truncate" title={f.name}>{f.name}</span>
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
                      <span className="block truncate text-[10px]" title={`${activeResp?.name||"Y"} (${activeResp?.unit||""})`}>
                        {activeResp?.name || "Y"}{activeResp?.unit ? ` (${activeResp.unit})` : ""}
                      </span>
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
                        <td className="px-1.5 py-1 border border-gray-100 dark:border-gray-800 text-gray-500 dark:text-gray-400 font-sans text-[11px]">
                          E{ri + 1}
                        </td>
                        {contFactors.map(f => {
                          const c = row.coded[f.id];
                          const isActiveFactor = termFactors.some(tf => tf.id === f.id);
                          return (
                            <td key={f.id}
                              className={`px-1.5 py-1 border text-center font-semibold text-xs ${
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
                          <td className={`px-1.5 py-1 border text-center font-bold text-xs ${
                            isPlus
                              ? "bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800"
                              : "bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border-red-100 dark:border-red-900/50"
                          }`}>
                            {isPlus ? "+1" : "−1"}
                          </td>
                        )}
                        <td className={`px-1.5 py-1 border text-center font-semibold text-xs ${
                          isPlus
                            ? "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/50"
                            : "bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border-red-100 dark:border-red-900/50"
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

          {/* Résultat coefficient — affiché sous la matrice */}
          {effet !== null && (
            <div className={`rounded-xl px-4 py-3 border text-sm font-mono font-semibold flex items-center justify-between gap-3 ${
              Math.abs(effet) < 0.3
                ? "bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400"
                : effet > 0
                ? "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300"
                : "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300"
            }`}>
              <span>
                b = {effet > 0 ? "+" : ""}{fmt(effet)}
                <span className="text-xs font-normal ml-2 opacity-70">
                  = ({fmt2(moyPlus)} − {fmt2(moyMinus)}) / 2
                </span>
              </span>
              <button
                onClick={() => setShowCalcPopup(true)}
                className="text-[11px] font-medium opacity-60 hover:opacity-100 transition-opacity underline underline-offset-2"
              >
                détail →
              </button>
            </div>
          )}

          {/* Interprétation courte */}
          {effet !== null && (
            <div className={`rounded-lg px-3 py-2 border-l-4 text-xs leading-relaxed ${
              Math.abs(effet) < 0.3
                ? "bg-gray-50 dark:bg-gray-800/50 border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400"
                : effet > 0
                ? "bg-indigo-50 dark:bg-indigo-900/20 border-indigo-400 text-indigo-800 dark:text-indigo-300"
                : "bg-red-50 dark:bg-red-900/20 border-red-400 text-red-800 dark:text-red-300"
            }`}>
              {Math.abs(effet) < 0.3
                ? `Effet très faible — peu d'influence sur ${activeResp?.name || "la réponse"}.`
                : effet > 0
                ? `Effet positif → augmenter ${isInteraction ? termFactors.map(f=>f.name).join("×") : termFactors[0]?.name} augmente ${activeResp?.name||"Y"} de ${Math.abs(effet*2).toFixed(2)}${activeResp?.unit?" "+activeResp.unit:""} entre les deux niveaux.`
                : `Effet négatif → augmenter ${isInteraction ? termFactors.map(f=>f.name).join("×") : termFactors[0]?.name} diminue ${activeResp?.name||"Y"} de ${Math.abs(effet*2).toFixed(2)}${activeResp?.unit?" "+activeResp.unit:""} entre les deux niveaux.`
              }
            </div>
          )}

          {/* Popup calculs détaillés */}
          {showCalcPopup && effet !== null && (
            <div
              ref={popupRef}
              style={{ position: 'fixed', left: popupPos.x, top: popupPos.y, zIndex: 100, width: 400, maxHeight: '85vh' }}
              className="bg-white dark:bg-gray-950 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col"
            >
              {/* Header — zone de drag */}
              <div
                onMouseDown={onPopupMouseDown}
                className="bg-indigo-50 dark:bg-indigo-950/60 border-b border-indigo-100 dark:border-indigo-900 px-4 py-3 flex items-center justify-between cursor-grab active:cursor-grabbing select-none"
              >
                <div className="flex items-center gap-2 min-w-0">
                  {/* Poignée visuelle */}
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="size-3.5 text-indigo-300 shrink-0">
                    <path d="M3 4a1 1 0 0 1 1-1h8a1 1 0 1 1 0 2H4a1 1 0 0 1-1-1ZM3 8a1 1 0 0 1 1-1h8a1 1 0 1 1 0 2H4a1 1 0 0 1-1-1ZM4 11a1 1 0 1 0 0 2h8a1 1 0 1 0 0-2H4Z"/>
                  </svg>
                  <div className="min-w-0">
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-indigo-400 mb-0.5 truncate">Détail du calcul — {term}</p>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">b = {effet > 0 ? "+" : ""}{fmt(effet)}</p>
                  </div>
                </div>
                <button onClick={() => setShowCalcPopup(false)}
                  className="size-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-white dark:hover:bg-gray-800 transition-colors shrink-0">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="size-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="overflow-y-auto">
                {/* Corps */}
                <div className="px-5 py-4 space-y-4 text-xs">

                  {/* Étape 2 — Moyennes */}
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-3">Étape 2 — Moyennes par niveau</p>
                    <div className="flex flex-col gap-3">
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
                        <p className="text-lg font-semibold font-mono text-emerald-700 dark:text-emerald-300 mt-1">= {fmt2(moyPlus)}</p>
                      </div>
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
                        <p className="text-lg font-semibold font-mono text-red-700 dark:text-red-300 mt-1">= {fmt2(moyMinus)}</p>
                      </div>
                    </div>
                  </div>

                  {/* Étape 3 — Formule */}
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-3">Étape 3 — Calcul de l'effet = coefficient b</p>
                    <div className="flex items-center flex-wrap gap-2 mb-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg font-mono text-sm">
                      <span className="text-gray-600 dark:text-gray-300">b =</span>
                      <div className="flex flex-col items-center">
                        <span className="border-b border-gray-400 dark:border-gray-500 px-2 pb-0.5 text-[11px]">
                          <span className="text-emerald-700 dark:text-emerald-300">Moy(+1)</span> − <span className="text-red-600 dark:text-red-400">Moy(−1)</span>
                        </span>
                        <span className="pt-0.5 text-gray-500 text-[11px]">2</span>
                      </div>
                      <span className="text-gray-500">=</span>
                      <div className="flex flex-col items-center">
                        <span className="border-b border-gray-400 dark:border-gray-500 px-2 pb-0.5 text-[11px]">
                          <span className="text-emerald-700 dark:text-emerald-300">{fmt2(moyPlus)}</span> − <span className="text-red-600 dark:text-red-400">{fmt2(moyMinus)}</span>
                        </span>
                        <span className="pt-0.5 text-gray-500 text-[11px]">2</span>
                      </div>
                      <span className="text-gray-500">=</span>
                      <span className={`font-semibold text-base px-3 py-0.5 rounded-lg border ${
                        effet > 0.3 ? "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700"
                        : effet < -0.3 ? "bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border-red-300 dark:border-red-700"
                        : "bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700"
                      }`}>
                        {effet > 0 ? "+" : ""}{fmt(effet)}
                      </span>
                    </div>
                    {/* Vérification */}
                    {fit && (() => {
                      const termIdx = model.terms.indexOf(term);
                      if (termIdx < 0) return null;
                      const bFromFit = fit.coeffs[termIdx + 1];
                      const diff = Math.abs(bFromFit - effet);
                      return (
                        <div className="rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 px-3 py-2 text-[11px] text-amber-700 dark:text-amber-300">
                          <span className="font-semibold">Vérification :</span> coefficient moindres carrés = {bFromFit.toFixed(3)}.
                          {diff < 0.01 ? " ✓ Même résultat (plan orthogonal)." : ` Δ = ${diff.toFixed(3)} (points centraux présents).`}
                        </div>
                      );
                    })()}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Étapes 2+3 — colonne droite en compact */}
          <div className="hidden">
          {/* Étape 2 — Moyennes */}
          {moyPlus !== null && (
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-3">
                Étape 2 — Moyennes par niveau
              </p>
              <div className="flex flex-col gap-3">

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
          </div>
        </div>
      )}
    </div>
  );
}