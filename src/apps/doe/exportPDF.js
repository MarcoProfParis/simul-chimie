import { buildResidualSVG, buildParetoSVG, buildIsoSVG, svgToDataUrl } from "./svgUtils.js";
import { quadPureTerm, isQuadPure } from "./modelUtils.js";

export function exportPDF({ models, fits, factors, responses, activeResp, allValidRows, activeRows, excludedPoints, validY, modelDefault, matrix }) {
  const date = new Date().toLocaleDateString("fr-FR", { year: "numeric", month: "long", day: "numeric" });
  const modelColors = ["#6366f1", "#10b981", "#f59e0b"];

  const termLbl = (t) => {
    for (let i = 0; i < factors.length; i++)
      if (t === quadPureTerm(factors[i].id)) return `X${i + 1}²`;
    let s = t;
    factors.forEach((f, i) => { s = s.split(f.id).join(`X${i + 1}`); });
    return s;
  };
  const termSub = (t) => {
    for (let i = 0; i < factors.length; i++)
      if (t === quadPureTerm(factors[i].id)) return `${i + 1}${i + 1}`;
    let s = t;
    factors.forEach((f, i) => { s = s.replaceAll(f.id, `${i + 1}`); });
    return s;
  };
  const sigStar = (p) => { if (p === null || p === undefined) return ""; if (p < 0.001) return "***"; if (p < 0.01) return "**"; if (p < 0.05) return "*"; if (p < 0.1) return "·"; return ""; };
  const f4 = (v) => (v === null || v === undefined || !isFinite(v)) ? "—" : v.toFixed(4);
  const f3 = (v) => (v === null || v === undefined || !isFinite(v)) ? "—" : v.toFixed(3);
  const fp = (p) => { if (p === null || p === undefined) return "—"; if (p < 0.001) return "< 0.001"; return p.toFixed(3); };

  const modelSection = (m, fit, color) => {
    if (!fit) return `<div class="model-card"><h3 style="color:${color}">${m.name}</h3><p class="error">Calcul impossible — données insuffisantes.</p></div>`;

    const allLabels = ["α₀ (constante)", ...m.terms.map(t => `α${termSub(t)} · ${termLbl(t)}`)];
    const verdict = (fit.pF !== null && fit.pF < 0.05 && fit.R2adj > 0.8) ? "acceptable" : (fit.pF !== null && fit.pF >= 0.05) ? "à rejeter" : "insuffisant";
    const verdictColor = verdict === "acceptable" ? "#059669" : verdict === "à rejeter" ? "#dc2626" : "#d97706";

    const effects = m.terms.map((t, i) => ({ label: termLbl(t), coeff: fit.coeffs[i + 1], absCoeff: Math.abs(fit.coeffs[i + 1]), p: fit.pCoeffs[i + 1] }))
      .sort((a, b) => b.absCoeff - a.absCoeff);

    const residSvg = buildResidualSVG(fit.yHat, fit.residuals, color);
    const paretoSvg = buildParetoSVG(effects, color);
    const isoSvg = buildIsoSVG(m, fit, factors, color);

    return `
    <div class="model-card" style="border-left: 4px solid ${color}">
      <h3 style="color:${color}">${m.name}</h3>

      <h4>Équation du modèle</h4>
      <div class="equation">Ŷ = α₀${m.terms.map(t => ` + α<sub>${termSub(t)}</sub>·${termLbl(t)}`).join("")}</div>

      <div class="metrics-row">
        <div class="metric"><span class="metric-label">R²</span><span class="metric-val">${f4(fit.R2)}</span></div>
        <div class="metric"><span class="metric-label">R² ajusté</span><span class="metric-val">${f4(fit.R2adj)}</span></div>
        <div class="metric"><span class="metric-label">F</span><span class="metric-val">${f3(fit.Fstat)}</span></div>
        <div class="metric"><span class="metric-label">Prob &gt; F</span><span class="metric-val">${fp(fit.pF)}</span></div>
        <div class="metric"><span class="metric-label">Verdict</span><span class="metric-val" style="color:${verdictColor};font-weight:700">Modèle ${verdict}</span></div>
      </div>

      <h4>Coefficients estimés</h4>
      <table>
        <thead><tr><th>Terme</th><th>Estimation</th><th>Écart-type</th><th>t ratio</th><th>Prob &gt; |t|</th><th>Sig.</th></tr></thead>
        <tbody>${fit.coeffs.map((c, ci) => {
          const p = fit.pCoeffs[ci]; const sig = sigStar(p); const signif = p !== null && p < 0.05;
          return `<tr class="${signif ? "signif-row" : ""}"><td class="mono">${allLabels[ci]}</td><td class="mono right bold">${f4(c)}</td><td class="mono right">${f4(fit.seCoeffs[ci])}</td><td class="mono right">${f3(fit.tStats[ci])}</td><td class="mono right ${signif ? "signif" : ""}">${fp(p)}</td><td class="center bold amber">${sig}</td></tr>`;
        }).join("")}</tbody>
      </table>
      <p class="note">Significativité : *** p&lt;0.001 · ** p&lt;0.01 · * p&lt;0.05 · · p&lt;0.1</p>

      <h4>Analyse de la variance (ANOVA)</h4>
      <table>
        <thead><tr><th>Source</th><th>SC</th><th>dl</th><th>CM</th><th>F</th><th>Prob &gt; F</th></tr></thead>
        <tbody>
          <tr><td>Régression</td><td class="mono right">${f4(fit.SSR)}</td><td class="right">${fit.dfR}</td><td class="mono right">${f4(fit.MSR)}</td><td class="mono right">${f3(fit.Fstat)}</td><td class="mono right ${fit.pF < 0.05 ? "signif" : ""}">${fp(fit.pF)}</td></tr>
          <tr><td>Résidus</td><td class="mono right">${f4(fit.SSE)}</td><td class="right">${fit.dfE}</td><td class="mono right">${f4(fit.MSE)}</td><td>—</td><td>—</td></tr>
          <tr class="total-row"><td>Total</td><td class="mono right">${f4(fit.SST)}</td><td class="right">${fit.n - 1}</td><td>—</td><td>—</td><td>—</td></tr>
        </tbody>
      </table>
      <div class="verdict-box" style="border-color:${verdictColor};background:${verdictColor}18">
        <strong style="color:${verdictColor}">Conclusion : Modèle ${verdict}</strong><br>
        R² ajusté = ${f4(fit.R2adj)} ${fit.R2adj >= 0.8 ? "✓ bon ajustement" : "△ insuffisant"} · 
        ANOVA Prob&gt;F = ${fp(fit.pF)} ${fit.pF < 0.05 ? "✓ significatif" : "✗ non significatif"} · 
        dl résidus = ${fit.dfE}
      </div>

      <h4>Tableau des résidus${excludedPoints.size > 0 ? ` (${excludedPoints.size} point(s) exclu(s))` : ""}</h4>
      <table>
        <thead><tr><th>#</th><th>Statut</th><th>Y mesuré</th><th>Ŷ calculé</th><th>Résidu</th><th>Résidu normé</th></tr></thead>
        <tbody>${allValidRows.map(({ i: globalIdx, y }) => {
          const isExcluded = excludedPoints.has(globalIdx);
          const activeIdx = activeRows.findIndex(x => x.i === globalIdx);
          const resid = !isExcluded && activeIdx >= 0 ? fit.residuals[activeIdx] : null;
          const yHatVal = !isExcluded && activeIdx >= 0 ? fit.yHat[activeIdx] : null;
          const normed = resid !== null && fit.MSE > 0 ? resid / Math.sqrt(fit.MSE) : null;
          const isLarge = normed !== null && Math.abs(normed) > 2;
          return `<tr class="${isExcluded ? "excluded-row" : isLarge ? "large-resid" : ""}">
            <td class="right">${globalIdx + 1}</td><td class="center">${isExcluded ? "exclu" : "actif"}</td>
            <td class="mono right">${f3(y)}</td><td class="mono right">${yHatVal !== null ? f3(yHatVal) : "—"}</td>
            <td class="mono right ${resid !== null ? (resid >= 0 ? "pos" : "neg") : ""}">${resid !== null ? f3(resid) : "—"}</td>
            <td class="mono right ${isLarge ? "large-val" : ""}">${normed !== null ? f3(normed) : "—"}</td>
          </tr>`;
        }).join("")}</tbody>
      </table>

      <h4>Graphique des résidus vs Ŷ</h4>
      <div class="chart-wrap">
        <img src="${svgToDataUrl(residSvg)}" width="480" height="220" style="max-width:100%" alt="Résidus vs Ŷ"/>
      </div>

      <h4>Diagramme de Pareto des effets</h4>
      <div class="chart-wrap">
        <img src="${svgToDataUrl(paretoSvg)}" width="500" style="max-width:100%" alt="Pareto effets"/>
      </div>

      ${isoSvg ? `<h4>Courbes isoréponses (${factors.filter(f => f.continuous)[0]?.name} × ${factors.filter(f => f.continuous)[1]?.name})</h4>
      <div class="chart-wrap">
        <img src="${svgToDataUrl(isoSvg)}" width="320" height="320" style="max-width:100%" alt="Isoréponses"/>
      </div>` : ""}
    </div>`;
  };

  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>Rapport — Plans d'expériences</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 11px; color: #111; background: white; padding: 20mm; }
    h1 { font-size: 20px; font-weight: 700; margin-bottom: 4px; }
    h2 { font-size: 14px; font-weight: 600; color: #374151; margin: 20px 0 8px; border-bottom: 1.5px solid #e5e7eb; padding-bottom: 4px; }
    h3 { font-size: 13px; font-weight: 700; margin-bottom: 12px; }
    h4 { font-size: 10px; font-weight: 600; color: #4b5563; margin: 14px 0 6px; text-transform: uppercase; letter-spacing: 0.05em; }
    .header { margin-bottom: 24px; padding-bottom: 16px; border-bottom: 2px solid #111; }
    .header-meta { font-size: 10px; color: #6b7280; margin-top: 6px; }
    .model-card { margin-bottom: 32px; padding: 16px; border: 1px solid #e5e7eb; border-radius: 8px; break-inside: avoid; }
    .equation { font-family: 'Courier New', monospace; font-size: 12px; background: #f9fafb; border: 1px solid #e5e7eb; padding: 8px 12px; border-radius: 6px; margin-bottom: 12px; }
    .metrics-row { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 12px; }
    .metric { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; padding: 6px 12px; text-align: center; min-width: 90px; }
    .metric-label { display: block; font-size: 9px; color: #9ca3af; margin-bottom: 2px; text-transform: uppercase; }
    .metric-val { display: block; font-size: 12px; font-weight: 600; font-family: 'Courier New', monospace; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 8px; font-size: 10px; }
    th { background: #f3f4f6; text-align: left; padding: 5px 8px; font-size: 9px; font-weight: 600; color: #6b7280; text-transform: uppercase; border-bottom: 1px solid #e5e7eb; }
    td { padding: 4px 8px; border-bottom: 1px solid #f3f4f6; vertical-align: middle; }
    tr:last-child td { border-bottom: none; }
    .mono { font-family: 'Courier New', monospace; }
    .right { text-align: right; } .center { text-align: center; } .bold { font-weight: 700; }
    .signif { color: #4f46e5; font-weight: 700; } .signif-row { background: #eef2ff; }
    .amber { color: #d97706; } .pos { color: #059669; } .neg { color: #dc2626; }
    .large-val { color: #dc2626; font-weight: 700; } .large-resid { background: #fef2f2; }
    .excluded-row { color: #9ca3af; font-style: italic; }
    .total-row { font-weight: 600; background: #f9fafb; }
    .note { font-size: 9px; color: #9ca3af; margin-top: 4px; }
    .error { color: #dc2626; font-style: italic; }
    .verdict-box { padding: 8px 12px; border-radius: 6px; border: 1px solid; margin-top: 8px; font-size: 10px; line-height: 1.6; }
    .chart-wrap { margin: 8px 0 12px; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; padding: 8px; display: inline-block; }
    .page-break { page-break-before: always; }
    @media print {
      body { padding: 10mm 15mm; }
      .model-card { break-inside: avoid; }
      h2 { break-after: avoid; } h4 { break-after: avoid; }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>Rapport d'analyse — Plans d'expériences</h1>
    <div class="header-meta">
      Généré le ${date} · Réponse : ${activeResp.name}${activeResp.unit ? " (" + activeResp.unit + ")" : ""} · 
      ${allValidRows.length} essais${excludedPoints.size > 0 ? " (" + excludedPoints.size + " exclu(s))" : ""} · 
      ${models.length} modèle(s)
    </div>
  </div>

  <h2>Facteurs étudiés</h2>
  <table>
    <thead><tr><th>ID</th><th>Nom</th><th>Unité</th><th>Type</th><th>Niveau bas (−1)</th><th>Niveau haut (+1)</th></tr></thead>
    <tbody>${factors.map(f => `<tr><td class="mono">${f.id}</td><td>${f.name}</td><td>${f.unit || "—"}</td><td>${f.continuous ? "Continu" : "Discret"}</td><td class="mono">${f.continuous ? f.low.real : (f.low.label || "—")}</td><td class="mono">${f.continuous ? f.high.real : (f.high.label || "—")}</td></tr>`).join("")}</tbody>
  </table>

  <h2>Matrice d'expériences</h2>
  <table>
    <thead><tr><th>#</th>${factors.map(f => `<th>${f.id}</th>`).join("")}${responses.map(r => `<th>${r.id} (${r.name}${r.unit ? ", " + r.unit : ""})</th>`).join("")}<th>Statut</th></tr></thead>
    <tbody>${(matrix || []).map((row, ri) => {
      const isExcluded = excludedPoints.has(ri);
      return `<tr class="${isExcluded ? "excluded-row" : ""}">
        <td class="right">${row.center ? "PC" : ri + 1}</td>
        ${factors.map(f => { const c = row.coded[f.id]; const rv = row.real[f.id]; const cl = c === 0 ? "0" : c === -1 ? "−1" : "+1"; return `<td class="mono">(${cl}) ${rv ?? ""}</td>`; }).join("")}
        ${responses.map(r => `<td class="mono right">${row.responses[r.id] !== "" && row.responses[r.id] !== null && row.responses[r.id] !== undefined ? row.responses[r.id] : "—"}</td>`).join("")}
        <td class="center">${isExcluded ? "exclu" : "actif"}</td>
      </tr>`;
    }).join("")}</tbody>
  </table>

  <h2>Résultats par modèle</h2>
  ${models.map((m, mi) => modelSection(m, fits[mi], modelColors[mi % modelColors.length])).join("")}

  ${models.length > 1 ? `<div class="page-break"></div>
  <h2>Comparaison des modèles</h2>
  <table>
    <thead><tr><th>Modèle</th><th>Termes</th><th>R²</th><th>R² ajusté</th><th>F</th><th>Prob &gt; F</th><th>Verdict</th></tr></thead>
    <tbody>${models.map((m, mi) => {
      const fit = fits[mi];
      if (!fit) return `<tr><td>${m.name}</td><td colspan="6" class="center">—</td></tr>`;
      const verdict = (fit.pF < 0.05 && fit.R2adj > 0.8) ? "acceptable" : fit.pF >= 0.05 ? "à rejeter" : "insuffisant";
      const vc = verdict === "acceptable" ? "#059669" : verdict === "à rejeter" ? "#dc2626" : "#d97706";
      return `<tr><td style="color:${modelColors[mi % modelColors.length]};font-weight:700">${m.name}</td><td class="right">${m.terms.length + 1}</td><td class="mono right">${f4(fit.R2)}</td><td class="mono right">${f4(fit.R2adj)}</td><td class="mono right">${f3(fit.Fstat)}</td><td class="mono right ${fit.pF < 0.05 ? "signif" : ""}">${fp(fit.pF)}</td><td style="color:${vc};font-weight:600">Modèle ${verdict}</td></tr>`;
    }).join("")}</tbody>
  </table>` : ""}
</body>
</html>`;

  const win = window.open("", "_blank", "width=900,height=700");
  win.document.write(html);
  win.document.close();
  win.onload = () => { setTimeout(() => { win.print(); }, 600); };
}
