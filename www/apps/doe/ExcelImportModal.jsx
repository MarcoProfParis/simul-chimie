// ─── ExcelImportModal.jsx ─────────────────────────────────────────────────────
// Modal d'import Excel/CSV pour PlanFactoriel
// Props : onClose, excelDragOver, setExcelDragOver, importFromExcel,
//         excelImportError, setExcelImportError

import React from "react";

export default function ExcelImportModal({ onClose, excelDragOver, setExcelDragOver, importFromExcel, excelImportError, setExcelImportError }) {
  const [xlsTab, setXlsTab] = React.useState('info');

  const TABS = [
    { id: 'info',      label: '① Info' },
    { id: 'meta',      label: '② Métadonnées' },
    { id: 'facteurs',  label: '③ Facteurs' },
    { id: 'reponses',  label: '④ Réponses' },
    { id: 'matrice',   label: '⑤ Matrice' },
  ];

  const downloadTemplate = async () => {
    if (!window.XLSX) {
      await new Promise((res, rej) => {
        const s = document.createElement('script');
        s.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
        s.onload = res; s.onerror = rej;
        document.head.appendChild(s);
      });
    }
    const XLSX = window.XLSX;

    const wsInfo = XLSX.utils.aoa_to_sheet([
      ["MODÈLE DE FICHIER — Plan d'expériences BTS Métiers de la Chimie"],
      [],
      ['Ce fichier contient 4 feuilles à remplir :'],
      ["• Métadonnées : titre, contexte, difficulté de l'exemple"],
      ['• Facteurs    : liste des facteurs avec leurs niveaux réels'],
      ['• Réponses    : liste des grandeurs mesurées'],
      ['• Matrice     : plan avec les niveaux codés (-1, 0, +1) et les mesures'],
      [],
      ['RÈGLES IMPORTANTES :'],
      ['• Colonne "ID" : utiliser X1, X2, X3… pour les facteurs et Y1, Y2… pour les réponses'],
      ["• Matrice : n'utiliser que -1, 0 ou +1 dans les colonnes Xi_niveau"],
      ['• Les valeurs réelles sont dans la feuille Facteurs (Niveau bas / Niveau haut)'],
      ['• Ne pas modifier les noms de feuilles ni les en-têtes de colonnes'],
    ]);
    wsInfo['!cols'] = [{ wch: 80 }];

    const wsMeta = XLSX.utils.aoa_to_sheet([
      ['Champ',          'Valeur',               'Description'],
      ['Titre',          "Mon plan d'expériences", "Nom de l'expérience"],
      ['ID',             'mon_plan',              'Identifiant court (sans espaces)'],
      ['Contexte',       '2 facteurs · Rendement',  'Description courte'],
      ['Difficulté',     'débutant',              'débutant / intermédiaire / avancé'],
      ['Données réelles','Non',                   'Oui ou Non'],
      ['Source',         '',                      'Référence bibliographique (optionnel)'],
    ]);
    wsMeta['!cols'] = [{ wch: 16 }, { wch: 28 }, { wch: 36 }];

    const wsFact = XLSX.utils.aoa_to_sheet([
      ['ID', 'Nom',          'Unité', 'Type',    'Niveau bas (-1)', 'Niveau haut (+1)'],
      ['X1', 'Température',  '°C',    'Continu', 50,                80],
      ['X2', 'Durée',        'min',   'Continu', 25,                65],
      ['X3', 'Nature résine','',      'Qualitatif','Résine A',      'Résine B'],
    ]);
    wsFact['!cols'] = [{ wch: 6 }, { wch: 18 }, { wch: 8 }, { wch: 12 }, { wch: 16 }, { wch: 16 }];

    const wsResp = XLSX.utils.aoa_to_sheet([
      ['ID', 'Nom',                    'Unité'],
      ['Y1', 'Rigidité',               'MPa'],
      ['Y2', 'Résistance aux chocs',   'kJ/m²'],
    ]);
    wsResp['!cols'] = [{ wch: 6 }, { wch: 24 }, { wch: 10 }];

    const wsMat = XLSX.utils.aoa_to_sheet([
      ['Essai', 'X1_niveau', 'X2_niveau', 'X3_niveau', 'Y1',   'Y2'],
      [1,        -1,          -1,           -1,          '',     ''],
      [2,         1,          -1,           -1,          '',     ''],
      [3,        -1,           1,           -1,          '',     ''],
      [4,         1,           1,           -1,          '',     ''],
      [5,        -1,          -1,            1,          '',     ''],
      [6,         1,          -1,            1,          '',     ''],
      [7,        -1,           1,            1,          '',     ''],
      [8,         1,           1,            1,          '',     ''],
    ]);
    wsMat['!cols'] = [{ wch: 7 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 8 }, { wch: 8 }];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, wsInfo,  'Info');
    XLSX.utils.book_append_sheet(wb, wsMeta,  'Métadonnées');
    XLSX.utils.book_append_sheet(wb, wsFact,  'Facteurs');
    XLSX.utils.book_append_sheet(wb, wsResp,  'Réponses');
    XLSX.utils.book_append_sheet(wb, wsMat,   'Matrice');
    XLSX.writeFile(wb, 'modele_plan.xlsx');
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/30 dark:bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white dark:bg-gray-950 rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-gray-950 border-b border-gray-100 dark:border-gray-800 px-6 py-4 flex items-center justify-between z-10">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">Importer depuis Excel / CSV</h2>
          <button onClick={onClose} className="size-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="size-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-6 py-5 flex flex-col gap-4">

          {/* Zone drag & drop */}
          <div
            onDragOver={e => { e.preventDefault(); setExcelDragOver(true); }}
            onDragLeave={() => setExcelDragOver(false)}
            onDrop={e => { e.preventDefault(); setExcelDragOver(false); const f = e.dataTransfer.files[0]; if (f) importFromExcel(f); }}
            className={`rounded-xl border-2 border-dashed p-4 text-center transition-colors ${excelDragOver ? "border-amber-400 bg-amber-50 dark:bg-amber-900/20" : "border-gray-200 dark:border-gray-700"}`}
          >
            <p className="text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Glissez votre fichier ici</p>
            <p className="text-xs text-gray-400 mb-3">.xlsx · .xls · .csv acceptés</p>
            <label className="inline-flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-400 transition-colors cursor-pointer">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="size-4">
                <path d="M9.25 13.25a.75.75 0 001.5 0V4.636l2.955 3.129a.75.75 0 001.09-1.03l-4.25-4.5a.75.75 0 00-1.09 0l-4.25 4.5a.75.75 0 101.09 1.03L9.25 4.636v8.614z"/>
                <path d="M3.5 12.75a.75.75 0 00-1.5 0v2.5A2.75 2.75 0 004.75 18h10.5A2.75 2.75 0 0018 15.25v-2.5a.75.75 0 00-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5z"/>
              </svg>
              Parcourir…
              <input type="file" accept=".xlsx,.xls,.csv" className="hidden"
                onChange={e => { const f = e.target.files[0]; if (f) importFromExcel(f); e.target.value = ''; }} />
            </label>
          </div>

          {/* Erreur */}
          {excelImportError && (
            <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 px-3 py-2">
              <p className="text-xs font-medium text-red-600 dark:text-red-400 mb-0.5">Erreur d'import</p>
              <p className="text-xs text-red-500 dark:text-red-400">{excelImportError}</p>
            </div>
          )}

          {/* Format — 5 onglets */}
          <div className="rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="border-b border-gray-200 dark:border-gray-700 px-3 pt-3 pb-0">
              <p className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 mb-2">
                Structure du fichier Excel — <span className="text-amber-600 dark:text-amber-400">5 feuilles</span>
              </p>
              <div className="flex gap-1 flex-wrap">
                {TABS.map(t => (
                  <button key={t.id} onClick={() => setXlsTab(t.id)}
                    className={`px-2.5 py-1.5 text-[10px] font-medium rounded-t-lg border border-b-0 transition-colors ${
                      xlsTab === t.id
                        ? 'bg-white dark:bg-gray-950 border-gray-200 dark:border-gray-700 text-amber-600 dark:text-amber-400'
                        : 'border-transparent text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
                    }`}>
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Tab Info */}
            {xlsTab === 'info' && (
              <div className="p-3 space-y-2 text-[11px]">
                <p className="font-semibold text-gray-700 dark:text-gray-200">Le fichier Excel doit contenir 5 feuilles dans cet ordre :</p>
                <div className="space-y-1.5">
                  {[
                    ['amber',   '① Info',         "Cette feuille — mode d'emploi (non lue à l'import)"],
                    ['indigo',  '② Métadonnées',  'Titre, contexte, difficulté, source'],
                    ['emerald', '③ Facteurs',     'ID (X1…), Nom, Unité, Type, Niveaux bas/haut'],
                    ['violet',  '④ Réponses',     'ID (Y1…), Nom, Unité'],
                    ['sky',     '⑤ Matrice',      'Essai | X1_niveau … | Y1 … (valeurs −1/0/+1 et mesures)'],
                  ].map(([c, label, desc]) => (
                    <div key={label} className="flex items-start gap-2">
                      <span className={`shrink-0 text-[10px] font-semibold text-${c}-600 dark:text-${c}-400 bg-${c}-50 dark:bg-${c}-900/30 rounded px-1.5 py-0.5 w-28 text-center`}>{label}</span>
                      <span className="text-gray-500 dark:text-gray-400">{desc}</span>
                    </div>
                  ))}
                </div>
                <p className="text-[10px] text-gray-400 pt-1 border-t border-gray-200 dark:border-gray-700">
                  Seules les feuilles Facteurs, Réponses et Matrice sont obligatoires. Métadonnées est optionnelle mais recommandée.
                </p>
              </div>
            )}

            {/* Tab Métadonnées */}
            {xlsTab === 'meta' && (
              <div className="p-3">
                <p className="text-[10px] text-gray-400 mb-2">Feuille optionnelle. Renseigne le titre et les infos de l'exemple.</p>
                <table className="text-[10px] font-mono border-collapse w-full">
                  <thead><tr className="bg-gray-200 dark:bg-gray-700">
                    {["Champ","Valeur","Description"].map(h => (
                      <th key={h} className="border border-gray-300 dark:border-gray-600 px-1.5 py-1 text-left text-gray-600 dark:text-gray-300 font-semibold">{h}</th>
                    ))}
                  </tr></thead>
                  <tbody>
                    {[
                      ["Titre","Mon expérience","Nom affiché"],
                      ["ID","mon_plan","Identifiant court"],
                      ["Contexte","2 facteurs · Rendement","Description brève"],
                      ["Difficulté","débutant","débutant / intermédiaire / avancé"],
                      ["Données réelles","Non","Oui ou Non"],
                      ["Source","","Référence (optionnel)"],
                    ].map((row, i) => (
                      <tr key={i} className={i % 2 === 0 ? "bg-white dark:bg-gray-900" : "bg-gray-50 dark:bg-gray-800/50"}>
                        {row.map((cell, j) => (
                          <td key={j} className="border border-gray-200 dark:border-gray-700 px-1.5 py-1 text-gray-600 dark:text-gray-300">{cell}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Tab Facteurs */}
            {xlsTab === 'facteurs' && (
              <div className="p-3">
                <p className="text-[10px] text-gray-400 mb-2">Une ligne par facteur. <strong className="text-gray-500">ID obligatoire</strong> : X1, X2, X3…</p>
                <table className="text-[10px] font-mono border-collapse w-full">
                  <thead><tr className="bg-gray-200 dark:bg-gray-700">
                    {["ID","Nom","Unité","Type","Niveau bas (−1)","Niveau haut (+1)"].map(h => (
                      <th key={h} className="border border-gray-300 dark:border-gray-600 px-1.5 py-1 text-left text-gray-600 dark:text-gray-300 font-semibold">{h}</th>
                    ))}
                  </tr></thead>
                  <tbody>
                    {[
                      ["X1","Température","°C","Continu","50","80"],
                      ["X2","Durée","min","Continu","25","65"],
                      ["X3","Nature résine","","Qualitatif","Résine A","Résine B"],
                    ].map((row, i) => (
                      <tr key={i} className={i % 2 === 0 ? "bg-white dark:bg-gray-900" : "bg-gray-50 dark:bg-gray-800/50"}>
                        {row.map((cell, j) => (
                          <td key={j} className="border border-gray-200 dark:border-gray-700 px-1.5 py-1 text-gray-600 dark:text-gray-300">{cell}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Tab Réponses */}
            {xlsTab === 'reponses' && (
              <div className="p-3">
                <p className="text-[10px] text-gray-400 mb-2">Une ligne par réponse mesurée. <strong className="text-gray-500">ID obligatoire</strong> : Y1, Y2…</p>
                <table className="text-[10px] font-mono border-collapse w-full">
                  <thead><tr className="bg-gray-200 dark:bg-gray-700">
                    {["ID","Nom","Unité"].map(h => (
                      <th key={h} className="border border-gray-300 dark:border-gray-600 px-1.5 py-1 text-left text-gray-600 dark:text-gray-300 font-semibold">{h}</th>
                    ))}
                  </tr></thead>
                  <tbody>
                    {[["Y1","Rigidité","MPa"],["Y2","Résistance aux chocs","kJ/m²"]].map((row, i) => (
                      <tr key={i} className={i % 2 === 0 ? "bg-white dark:bg-gray-900" : "bg-gray-50 dark:bg-gray-800/50"}>
                        {row.map((cell, j) => (
                          <td key={j} className="border border-gray-200 dark:border-gray-700 px-1.5 py-1 text-gray-600 dark:text-gray-300">{cell}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Tab Matrice */}
            {xlsTab === 'matrice' && (
              <div className="p-3">
                <p className="text-[10px] text-gray-400 mb-2">
                  En-têtes : <code className="bg-gray-200 dark:bg-gray-700 px-1 rounded">Essai</code> puis{" "}
                  <code className="bg-gray-200 dark:bg-gray-700 px-1 rounded">X1_niveau</code>…{" "}
                  puis <code className="bg-gray-200 dark:bg-gray-700 px-1 rounded">Y1</code>…{" "}
                  Valeurs −1, 0 ou +1 uniquement pour les niveaux.
                </p>
                <table className="text-[10px] font-mono border-collapse w-full">
                  <thead><tr className="bg-gray-200 dark:bg-gray-700">
                    {["Essai","X1_niveau","X2_niveau","Y1","Y2"].map(h => (
                      <th key={h} className={`border border-gray-300 dark:border-gray-600 px-1.5 py-1 text-left font-semibold ${
                        h.endsWith('_niveau') ? 'text-indigo-600 dark:text-indigo-400'
                        : h.startsWith('Y') ? 'text-amber-600 dark:text-amber-400'
                        : 'text-gray-600 dark:text-gray-300'
                      }`}>{h}</th>
                    ))}
                  </tr></thead>
                  <tbody>
                    {[[1,-1,-1,"",""],[2,1,-1,"68.2",""],[3,-1,1,"",""],[4,1,1,"71.5",""]].map((row, i) => (
                      <tr key={i} className={i % 2 === 0 ? "bg-white dark:bg-gray-900" : "bg-gray-50 dark:bg-gray-800/50"}>
                        {row.map((cell, j) => (
                          <td key={j} className={`border border-gray-200 dark:border-gray-700 px-1.5 py-1 ${
                            cell === "" ? "text-gray-300" : "text-gray-600 dark:text-gray-300"
                          } ${j === 3 && cell ? "text-amber-600 dark:text-amber-400 font-semibold" : ""}`}>
                            {cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Boutons */}
          <div className="flex gap-2 mt-1">
            <button onClick={onClose}
              className="flex-1 rounded-lg border border-gray-200 dark:border-gray-700 px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
              Fermer
            </button>
            <button onClick={downloadTemplate}
              className="flex-1 rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-400 transition-colors">
              ↓ Télécharger le modèle .xlsx
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
