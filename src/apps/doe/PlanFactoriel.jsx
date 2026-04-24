import React, { useState, useEffect, useRef, useCallback } from "react";
import { useTheme } from "../../ThemeContext";
import { useLang } from "../../i18n";
import { ChevronDownIcon } from "@heroicons/react/16/solid";
import { EXAMPLE_FILES } from "./exampleFiles";
import {
  Dialog,
  DialogBackdrop,
  DialogPanel,
  DialogTitle,
} from "@headlessui/react";
import {
  ExclamationTriangleIcon,
  Bars3Icon,
  XMarkIcon,
  PlusIcon,
  TrashIcon,
  ArrowPathIcon,
  BookOpenIcon,
} from "@heroicons/react/24/outline";
import { CheckIcon } from "@heroicons/react/24/solid";
import { HelpProvider, HelpButton } from "./HelpDrawer";
import Surface3D from "./Surface3D";
import EffetsPanel from "./EffetsPanel";
import { CompactProvider, useCompact } from "./CompactContext";


// ─── imports des modules extraits ────────────────────────────────────────────
import { tCritical, normalQuantile } from "./mathUtils.js";
import {
  DEFAULT_FACTORS, DEFAULT_CENTER,
  genMatrix, computeDefaultModel, quadPureTerm, isQuadPure, isInteraction,
  getAllPossibleTerms, computePresetModel,
  termOrder, formatTermDisplay, termSubScript, formatTermHTML,
  getMissingRows, loadExampleData,
  fitOLS,
  sigStars, fmt, fmtP,
} from "./modelUtils.js";
import { exportPDF } from "./exportPDF.js";
import { Surface3DPanel } from "./Surface3DPanel.jsx";
import { PredictionPanel } from "./PredictionPanel.jsx";
import { ResidualPlot } from "./ResidualPlot.jsx";
import { QQPlotSVG } from "./QQPlotSVG.jsx";
import { IsoResponsePanel } from "./IsoResponsePanel.jsx";
import ExcelImportModal from "./ExcelImportModal.jsx";

const DEFAULT_RESPONSES = [{ id: "Y1", name: "Réponse 1", unit: "" }];

function PlanFactorielInner() {
  const { theme } = useTheme();
  const { t } = useLang();
  void ChevronDownIcon;

  const [part, setPart] = useState(0); // 0=accueil, 1=facteurs, 2=matrice, 3=modèle, 4=résultats
  // ── États écran d'accueil ────────────────────────────────────────────────
  const [welcomeModal, setWelcomeModal] = useState(null);
  const [showWelcomePopup, setShowWelcomePopup] = useState(false);
  const [showExportPopup, setShowExportPopup] = useState(false);   // popup export depuis "Exemple chargé"
  const [showQuitConfirm, setShowQuitConfirm] = useState(false);   // popup confirmation quitter sans sauvegarder
  const [dataModified, setDataModified] = useState(false);         // true si l'utilisateur a modifié qq chose
  const [newNbFactors, setNewNbFactors] = useState(2);
  const [newNbResponses, setNewNbResponses] = useState(1);
  const [jsonPasteText, setJsonPasteText] = useState('');
  const [jsonImportError, setJsonImportError] = useState(null);
  const [jsonDragOver, setJsonDragOver] = useState(false);
  const [excelImportError, setExcelImportError] = useState(null);
  const [excelDragOver, setExcelDragOver] = useState(false);
  const [exampleEditData, setExampleEditData] = useState(null); // données de l'exemple sélectionné
  // ── Mode compact ──────────────────────────────────────────────────────────
  const { compact: isCompact, setCompact } = useCompact();
  const cardCls = isCompact ? "border rounded-lg p-3" : "border-2 rounded-xl p-5";
  const cardSpace = isCompact ? "space-y-2" : "space-y-4";
  const [factors, setFactors] = useState(DEFAULT_FACTORS.map(f => ({ ...f, low: { ...f.low }, high: { ...f.high } })));
  const [responses, setResponses] = useState(DEFAULT_RESPONSES.map(r => ({ ...r })));
  const [centerPoint, setCenterPoint] = useState({ ...DEFAULT_CENTER });
  const [matrix, setMatrix] = useState(null);
  const [modelDefault, setModelDefault] = useState(() => computeDefaultModel(DEFAULT_FACTORS));
  // Multi-modèles : tableau de { id, name, terms, preset }
  const [models, setModels] = useState(() => {
    const def = computeDefaultModel(DEFAULT_FACTORS);
    return [{ id: 1, name: "Modèle 1", terms: [...def], preset: "default" }];
  });
  const [activeModelId, setActiveModelId] = useState(1);
  const [part4Tab, setPart4Tab] = useState("coefficients");
  const [part4Response, setPart4Response] = useState(0); // index de la réponse active
  const [excludedPoints, setExcludedPoints] = useState(new Set()); // indices des points exclus
  // Compat legacy pour le reste du composant
  const modelActive = models.find(m => m.id === activeModelId)?.terms || [];
  const modelPreset = models.find(m => m.id === activeModelId)?.preset || "default";
  const setModelActive = (terms) => setModels(ms => ms.map(m => m.id === activeModelId ? { ...m, terms } : m));
  const setModelPreset = (preset) => setModels(ms => ms.map(m => m.id === activeModelId ? { ...m, preset } : m));
  const [addRowLevels, setAddRowLevels] = useState(null);
  const [showRandomDialog, setShowRandomDialog] = useState(false);
  const [showRandomDone, setShowRandomDone] = useState(false);
  const [showCubicDialog, setShowCubicDialog] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loadedExampleId, setLoadedExampleId] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [importError, setImportError] = useState(null);
  const [importedExamples, setImportedExamples] = useState([]);
  const [editMode, setEditMode] = useState(false);
  const [editMeta, setEditMeta] = useState({ id: "", title: "", context: "", difficulty: "débutant", real_data: false, source: "" });
  const [validationHelpFit, setValidationHelpFit] = useState(null); // { fit, modelName }
  const [improvementHelpFit, setImprovementHelpFit] = useState(null); // { fit, verdict, modelName, modelTerms }
  const [nsTermHelp, setNsTermHelp] = useState(null); // { term, label, p, coeff, isInteraction, dfE, se }

  const loadExample = async (ex) => {
    setLoadError(null);
    try {
      // Exemples importés : données déjà embarquées dans _data
      const data = ex._data ? ex._data : await fetch(ex.url).then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status} — ${ex.url}`);
        return r.json();
      });
      const { factors: f, responses: r, centerPoint: cp, modelDefault: md, matrix: m } = loadExampleData(data);
      setFactors(f);
      setResponses(r);
      setCenterPoint(cp);
      setModelDefault(md);
      setModels([{ id: 1, name: "Modèle 1", terms: [...md], preset: "default" }]);
      setActiveModelId(1);
      setMatrix(m);
      setLoadedExampleId(ex.file);
      setSidebarOpen(false);
      setWelcomeModal(null);
      setPart(1);
    } catch (e) {
      console.error("Erreur chargement exemple:", e);
      setLoadError(e.message);
    }
  };

  // ── Créer un nouveau plan depuis l'écran d'accueil ──────────────────────────
  const createNewPlan = (nbFactors, nbResponses) => {
    const newFactors = Array.from({ length: nbFactors }, (_, i) => ({
      id: `X${i+1}`, name: `Facteur ${i+1}`, unit: '', continuous: true,
      low: { real: 0, coded: -1 }, high: { real: 1, coded: 1 },
    }));
    const newResponses = Array.from({ length: nbResponses }, (_, i) => ({
      id: `Y${i+1}`, name: `Réponse ${i+1}`, unit: '',
    }));
    const def = computeDefaultModel(newFactors);
    setFactors(newFactors);
    setResponses(newResponses);
    setCenterPoint({ ...DEFAULT_CENTER });
    setModelDefault(def);
    setModels([{ id: 1, name: 'Modèle 1', terms: [...def], preset: 'default' }]);
    setActiveModelId(1);
    setMatrix(null);
    setLoadedExampleId(null);
    setEditMode(false);
    setEditMeta({ id: '', title: '', context: '', difficulty: 'débutant', real_data: false, source: '' });
    setWelcomeModal(null);
    setPart(1);
  };

  // ── Importer JSON depuis texte (copier-coller) ou fichier ─────────────────
  const importFromJsonText = (text) => {
    setJsonImportError(null);
    try {
      const data = JSON.parse(text);
      const errors = [];
      if (!Array.isArray(data.factors) || data.factors.length < 1) errors.push("'factors' manquant");
      if (!Array.isArray(data.responses) || data.responses.length < 1) errors.push("'responses' manquant");
      if (errors.length > 0) { setJsonImportError(errors.join(' · ')); return; }
      const { factors: f, responses: r, centerPoint: cp, modelDefault: md, matrix: m } = loadExampleData(data);
      setFactors(f); setResponses(r); setCenterPoint(cp); setModelDefault(md);
      setModels([{ id: 1, name: 'Modèle 1', terms: [...md], preset: 'default' }]);
      setActiveModelId(1); setMatrix(m);
      setLoadedExampleId(data.meta?.id || 'import.json');
      setWelcomeModal(null); setPart(1);
    } catch (err) {
      setJsonImportError('JSON invalide : ' + err.message);
    }
  };

  // ── Télécharger un modèle CSV ──────────────────────────────────────────────
  const downloadCsvTemplate = () => {
    const header = 'id,coded_X1,coded_X2,real_X1,real_X2,Y1';
    const rows = [
      '1,-1,-1,0,0,',
      '2,1,-1,1,0,',
      '3,-1,1,0,1,',
      '4,1,1,1,1,',
    ];
    const csv = [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'modele_plan.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  const resetToNew = () => {
    setFactors(DEFAULT_FACTORS.map(f => ({ ...f, low: { ...f.low }, high: { ...f.high } })));
    setResponses(DEFAULT_RESPONSES.map(r => ({ ...r })));
    setCenterPoint({ ...DEFAULT_CENTER });
    const def = computeDefaultModel(DEFAULT_FACTORS);
    setModelDefault(def);
    setModels([{ id: 1, name: "Modèle 1", terms: [...def], preset: "default" }]);
    setActiveModelId(1);
    setMatrix(null);
    setLoadedExampleId(null);
    setEditMode(false);
    setEditMeta({ id: "", title: "", context: "", difficulty: "débutant", real_data: false, source: "" });
    setSidebarOpen(false);
    setPart(0);
  };

  // ── édition exemple ──
  const loadForEdit = async (ex) => {
    setLoadError(null);
    try {
      const data = ex._data ? ex._data : await fetch(ex.url).then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status} — ${ex.url}`);
        return r.json();
      });
      const { factors: f, responses: r, centerPoint: cp, modelDefault: md, matrix: m } = loadExampleData(data);
      setFactors(f);
      setResponses(r);
      setCenterPoint(cp);
      setModelDefault(md);
      setModels([{ id: 1, name: "Modèle 1", terms: [...md], preset: "default" }]);
      setActiveModelId(1);
      setMatrix(m);
      setLoadedExampleId(ex.file);
      setEditMeta({
        id: data.meta?.id || ex.file.replace(".json", ""),
        title: data.meta?.title || ex.title,
        context: data.meta?.context || ex.context,
        difficulty: data.meta?.difficulty || ex.difficulty,
        real_data: data.meta?.real_data ?? ex.real_data,
        source: data.meta?.source || "",
      });
      setEditMode(true);
      setSidebarOpen(false);
      setPart(1);
    } catch (e) {
      console.error("Erreur chargement exemple:", e);
      setLoadError(e.message);
    }
  };

  const validateAndImport = (file) => {
    setImportError(null);
    if (!file) return;
    if (!file.name.endsWith(".json")) {
      setImportError("Le fichier doit être un fichier .json");
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        // Validation du format
        const errors = [];
        if (!data.meta || typeof data.meta !== "object") errors.push("Champ 'meta' manquant ou invalide");
        if (!Array.isArray(data.factors) || data.factors.length < 2) errors.push("'factors' doit être un tableau d'au moins 2 facteurs");
        if (!Array.isArray(data.responses) || data.responses.length < 1) errors.push("'responses' doit contenir au moins une réponse");
        if (!Array.isArray(data.model_default)) errors.push("'model_default' doit être un tableau");
        if (!Array.isArray(data.runs)) errors.push("'runs' doit être un tableau");
        if (data.factors) {
          data.factors.forEach((f, i) => {
            if (!f.id) errors.push(`Facteur ${i+1} : 'id' manquant`);
            if (!f.name) errors.push(`Facteur ${i+1} : 'name' manquant`);
            if (f.continuous === undefined) errors.push(`Facteur ${i+1} : 'continuous' manquant`);
            if (f.continuous && (f.low?.real === undefined || f.high?.real === undefined))
              errors.push(`Facteur ${i+1} : 'low.real' ou 'high.real' manquant`);
            if (!f.continuous && (f.low?.label === undefined || f.high?.label === undefined))
              errors.push(`Facteur ${i+1} : 'low.label' ou 'high.label' manquant`);
          });
        }
        if (errors.length > 0) {
          setImportError(errors.join(" · "));
          return;
        }
        // Créer l'entrée exemple à partir des métadonnées
        const newEx = {
          file: file.name,
          url: null,
          title: data.meta?.title || file.name.replace(".json", ""),
          context: data.meta?.context || `${data.factors.length} facteurs`,
          difficulty: data.meta?.difficulty || "débutant",
          real_data: data.meta?.real_data ?? false,
          _data: data, // données embarquées directement
          imported: true,
        };
        // Éviter les doublons (même nom de fichier)
        setImportedExamples(prev => {
          const exists = prev.findIndex(e => e.file === file.name);
          if (exists >= 0) {
            const updated = [...prev];
            updated[exists] = newEx;
            return updated;
          }
          return [...prev, newEx];
        });
        // Charger directement comme un exemple normal
        const { factors: f, responses: r, centerPoint: cp, modelDefault: md, matrix: m } = loadExampleData(data);
        setFactors(f);
        setResponses(r);
        setCenterPoint(cp);
        setModelDefault(md);
        setModels([{ id: 1, name: "Modèle 1", terms: [...md], preset: "default" }]);
        setActiveModelId(1);
        setMatrix(m);
        setLoadedExampleId(file.name);
        setSidebarOpen(false);
        setPart(1);
      } catch (err) {
        setImportError("JSON invalide : " + err.message);
      }
    };
    reader.readAsText(file);
  };

  // ── Import depuis Excel/CSV ─────────────────────────────────────────────────
  const importFromExcel = async (file) => {
    setExcelImportError(null);
    // Charger SheetJS si besoin
    if (!window.XLSX) {
      await new Promise((resolve, reject) => {
        const s = document.createElement('script');
        s.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
        s.onload = resolve; s.onerror = reject;
        document.head.appendChild(s);
      });
    }
    const XLSX = window.XLSX;
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: 'array' });

      // ── Lire la feuille "Plan" (ou la première feuille) ──────────────────
      const sheetName = wb.SheetNames.includes('Plan') ? 'Plan' : wb.SheetNames[0];
      const ws = wb.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
      if (rows.length < 2) { setExcelImportError("Le fichier est vide ou ne contient qu'une ligne d'en-têtes."); return; }

      const headers = rows[0].map(h => String(h).trim());
      const dataRows = rows.slice(1).filter(r => r.some(c => c !== ''));

      // ── Détecter les colonnes ─────────────────────────────────────────────
      // Format attendu : Essai | Xi_code | Xi_reel | Yi
      // Ou : id | coded_Xi | real_Xi | Yi
      const codeIdxs = [];  // indices des colonnes codées
      const realIdxs = [];  // indices des colonnes réelles
      const yIdxs = [];     // indices des colonnes réponses
      const factorIds = [];
      const responseIds = [];

      headers.forEach((h, i) => {
        const hl = h.toLowerCase();
        if (hl === 'essai' || hl === 'id' || hl === '#') return;
        // Colonnes codées : coded_X1, X1_code, X1 (code), col contenant "cod"
        if (hl.includes('cod') || hl.match(/^x\d+_?c/i)) {
          const id = h.match(/x\d+/i)?.[0]?.toUpperCase() || `X${codeIdxs.length + 1}`;
          codeIdxs.push({ idx: i, id });
          if (!factorIds.includes(id)) factorIds.push(id);
        }
        // Colonnes réelles : real_X1, X1_reel, X1 (réel)
        else if (hl.includes('reel') || hl.includes('réel') || hl.includes('real') || hl.match(/^x\d+_?r/i)) {
          const id = h.match(/x\d+/i)?.[0]?.toUpperCase() || `X${realIdxs.length + 1}`;
          realIdxs.push({ idx: i, id });
        }
        // Colonnes réponses : Y1, Y2, réponse
        else if (hl.match(/^y\d*/i) || hl.includes('réponse') || hl.includes('reponse') || hl.includes('response')) {
          const id = h.match(/y\d*/i)?.[0]?.toUpperCase() || `Y${yIdxs.length + 1}`;
          yIdxs.push({ idx: i, id, name: h });
          if (!responseIds.includes(id)) responseIds.push(id);
        }
      });

      // ── Cas CSV simple : si peu de colonnes détectées, essayer format basique ─
      if (codeIdxs.length === 0 && realIdxs.length === 0) {
        // Essayer de détecter des facteurs par position
        // Ex : id, X1, X2, Y1 → colonnes 1..n-1 = facteurs, dernière = réponse
        const numCols = headers.length;
        if (numCols >= 3) {
          for (let i = 1; i < numCols - 1; i++) {
            const id = headers[i].match(/x\d+/i)?.[0]?.toUpperCase() || `X${i}`;
            codeIdxs.push({ idx: i, id });
            factorIds.push(id);
          }
          const lastH = headers[numCols - 1];
          const yId = lastH.match(/y\d*/i)?.[0]?.toUpperCase() || 'Y1';
          yIdxs.push({ idx: numCols - 1, id: yId, name: lastH });
          responseIds.push(yId);
        }
      }

      if (factorIds.length === 0) {
        setExcelImportError("Impossible de détecter les colonnes de facteurs. Vérifiez que les en-têtes contiennent 'coded_Xi' ou 'Xi_code' pour les colonnes codées.");
        return;
      }

      // ── Lire la feuille "Facteurs" si disponible ───────────────────────────
      const factorMeta = {};
      if (wb.SheetNames.includes('Facteurs')) {
        const wsFact = wb.Sheets['Facteurs'];
        const factRows = XLSX.utils.sheet_to_json(wsFact, { header: 1, defval: '' }).slice(1);
        factRows.forEach(r => {
          if (r[0]) factorMeta[String(r[0]).trim()] = {
            name: String(r[1] || r[0]).trim(),
            unit: String(r[2] || '').trim(),
            low: isNaN(+r[4]) ? null : +r[4],
            high: isNaN(+r[5]) ? null : +r[5],
          };
        });
      }

      // ── Construire les facteurs ────────────────────────────────────────────
      const builtFactors = factorIds.map((id, fi) => {
        const meta = factorMeta[id] || {};
        const codeCol = codeIdxs.find(c => c.id === id);
        const realCol = realIdxs.find(c => c.id === id);
        // Détecter les niveaux depuis les données
        const codedVals = codeCol ? [...new Set(dataRows.map(r => +r[codeCol.idx]).filter(v => !isNaN(v)))] : [-1, 1];
        const realVals = realCol ? dataRows.map(r => +r[realCol.idx]) : [];
        const lowReal = meta.low ?? (realVals.length ? Math.min(...realVals.filter(v => !isNaN(v))) : 0);
        const highReal = meta.high ?? (realVals.length ? Math.max(...realVals.filter(v => !isNaN(v))) : 1);
        return {
          id,
          name: meta.name || id,
          unit: meta.unit || '',
          continuous: true,
          low: { real: lowReal, coded: -1 },
          high: { real: highReal, coded: 1 },
        };
      });

      // ── Construire les réponses ───────────────────────────────────────────
      const builtResponses = yIdxs.length > 0
        ? yIdxs.map(({ id, name }) => ({ id, name: name || id, unit: '' }))
        : [{ id: 'Y1', name: 'Réponse 1', unit: '' }];

      // ── Construire la matrice ─────────────────────────────────────────────
      const builtMatrix = dataRows.map((row, ri) => {
        const coded = {}, real = {};
        factorIds.forEach((id, fi) => {
          const codeCol = codeIdxs.find(c => c.id === id);
          const realCol = realIdxs.find(c => c.id === id);
          coded[id] = codeCol ? (+row[codeCol.idx] || 0) : 0;
          real[id] = realCol ? (+row[realCol.idx] || 0) : 0;
        });
        const responses = {};
        yIdxs.forEach(({ idx, id }) => {
          const v = row[idx];
          responses[id] = v === '' || v === null || v === undefined ? '' : +v || '';
        });
        return { id: ri + 1, coded, real, center: Math.abs(coded[factorIds[0]]) < 0.5, responses };
      });

      // ── Charger ───────────────────────────────────────────────────────────
      const def = computeDefaultModel(builtFactors);
      setFactors(builtFactors);
      setResponses(builtResponses);
      setCenterPoint({ present: builtMatrix.some(r => r.center), replicates: 1 });
      setModelDefault(def);
      setModels([{ id: 1, name: 'Modèle 1', terms: [...def], preset: 'default' }]);
      setActiveModelId(1);
      setMatrix(builtMatrix);
      setLoadedExampleId(file.name);
      setWelcomeModal(null);
      setPart(1);
    } catch (err) {
      console.error('Import Excel error:', err);
      setExcelImportError("Erreur de lecture : " + err.message);
    }
  };

  const exportJSON = () => {
    // Reconstruit les runs depuis la matrice courante
    // Regroupe les lignes qui partagent les mêmes niveaux codés (réplicats)
    const runsMap = new Map();
    (matrix || []).forEach((row) => {
      const key = JSON.stringify(row.coded);
      if (!runsMap.has(key)) {
        runsMap.set(key, { coded: row.coded, real: row.real, center: row.center, replicates: [] });
      }
      const rep = { rep: runsMap.get(key).replicates.length + 1 };
      responses.forEach(r => { rep[r.id] = row.responses[r.id] ?? ""; });
      runsMap.get(key).replicates.push(rep);
    });
    const runs = Array.from(runsMap.values()).map((r, i) => ({ id: i + 1, ...r }));

    const json = {
      meta: {
        id: editMeta.id,
        title: editMeta.title,
        context: editMeta.context,
        difficulty: editMeta.difficulty,
        real_data: editMeta.real_data,
        source: editMeta.source,
      },
      factors: factors.map(f => {
        const base = { id: f.id, name: f.name, unit: f.unit || null, continuous: f.continuous };
        if (f.continuous) { base.low = { real: f.low.real, coded: -1 }; base.high = { real: f.high.real, coded: 1 }; }
        else { base.low = { label: f.low.label || "", coded: -1 }; base.high = { label: f.high.label || "", coded: 1 }; }
        return base;
      }),
      responses: responses.map(r => ({ id: r.id, name: r.name, unit: r.unit || null })),
      center_point: centerPoint,
      model_default: modelDefault,
      runs,
    };

    const blob = new Blob([JSON.stringify(json, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${editMeta.id || "plan"}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ── Export CSV — 3 sections : Métadonnées / Facteurs+Réponses / Matrice ──────
  const exportCSV = () => {
    const esc = (v) => {
      const s = String(v ?? '');
      return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g,'""')}"` : s;
    };
    const row = (...cells) => cells.map(esc).join(',');
    const lines = [];

    // ── Section 1 : Métadonnées ──
    lines.push('=== MÉTADONNÉES ===');
    lines.push(row('Titre', editMeta.title || ''));
    lines.push(row('ID', editMeta.id || ''));
    lines.push(row('Contexte', editMeta.context || ''));
    lines.push(row('Difficulté', editMeta.difficulty || ''));
    lines.push('');

    // ── Section 2 : Facteurs et Réponses ──
    lines.push('=== FACTEURS ===');
    lines.push(row('ID','Nom','Unité','Type','Niveau bas (-1)','Niveau haut (+1)'));
    factors.forEach(f => {
      lines.push(row(
        f.id, f.name, f.unit || '',
        f.continuous ? 'Continu' : 'Qualitatif',
        f.continuous ? f.low.real : (f.low.label || ''),
        f.continuous ? f.high.real : (f.high.label || ''),
      ));
    });
    lines.push('');
    lines.push('=== RÉPONSES ===');
    lines.push(row('ID','Nom','Unité'));
    responses.forEach(r => lines.push(row(r.id, r.name, r.unit || '')));
    lines.push('');

    // ── Section 3 : Matrice ──
    lines.push('=== MATRICE ===');
    lines.push(row('Essai', ...factors.map(f => `${f.id}_niveau`), ...responses.map(r => r.id)));
    (matrix || []).forEach((matRow, i) => {
      lines.push(row(
        i + 1,
        ...factors.map(f => matRow.coded[f.id] ?? ''),
        ...responses.map(r => matRow.responses[r.id] ?? ''),
      ));
    });

    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url;
    a.download = `${editMeta.title || editMeta.id || 'plan'}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  // ── Export Excel — 3 feuilles : Métadonnées / Facteurs+Réponses / Matrice ─────
  const exportXLSX = async () => {
    if (!window.XLSX) {
      await new Promise((resolve, reject) => {
        const s = document.createElement('script');
        s.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
        s.onload = resolve; s.onerror = reject;
        document.head.appendChild(s);
      });
    }
    const XLSX = window.XLSX;
    const toNum = (v) => { if (v === '' || v == null) return ''; const n = Number(v); return isNaN(n) ? String(v) : n; };

    // ── Feuille 1 : Métadonnées ──────────────────────────────────────────────
    const wsMeta = XLSX.utils.aoa_to_sheet([
      ["Plan d'expériences — BTS Métiers de la Chimie"],
      [],
      ['Titre',      editMeta.title || ''],
      ['ID',         editMeta.id || ''],
      ['Contexte',   editMeta.context || ''],
      ['Difficulté', editMeta.difficulty || ''],
      ['Données réelles', editMeta.real_data ? 'Oui' : 'Non'],
      ['Source',     editMeta.source || ''],
    ]);
    wsMeta['!cols'] = [{ wch: 16 }, { wch: 40 }];

    // ── Feuille 2 : Facteurs et Réponses ─────────────────────────────────────
    const factData = [
      ['FACTEURS'],
      ['ID', 'Nom', 'Unité', 'Type', 'Niveau bas (−1)', 'Niveau haut (+1)'],
      ...factors.map(f => [
        f.id, f.name, f.unit || '',
        f.continuous ? 'Continu' : 'Qualitatif',
        f.continuous ? toNum(f.low.real) : (f.low.label || ''),
        f.continuous ? toNum(f.high.real) : (f.high.label || ''),
      ]),
      [],
      ['RÉPONSES'],
      ['ID', 'Nom', 'Unité'],
      ...responses.map(r => [r.id, r.name, r.unit || '']),
    ];
    const wsFact = XLSX.utils.aoa_to_sheet(factData);
    wsFact['!cols'] = [{ wch: 6 }, { wch: 20 }, { wch: 8 }, { wch: 12 }, { wch: 16 }, { wch: 16 }];

    // ── Feuille 3 : Matrice ───────────────────────────────────────────────────
    // En-têtes : Essai | X1_niveau | X2_niveau | ... | Y1 | Y2 | ...
    const matHeader = [
      'Essai',
      ...factors.map(f => `${f.id}_niveau`),
      ...responses.map(r => r.id),
    ];
    const matData = [
      matHeader,
      ...(matrix || []).map((row, i) => [
        i + 1,
        ...factors.map(f => toNum(row.coded[f.id])),     // −1 / 0 / +1 en nombre
        ...responses.map(r => toNum(row.responses[r.id])),
      ]),
    ];
    const wsMat = XLSX.utils.aoa_to_sheet(matData);
    const matColWidths = [{ wch: 7 }, ...factors.map(() => ({ wch: 10 })), ...responses.map(() => ({ wch: 10 }))];
    wsMat['!cols'] = matColWidths;

    // ── Assembler et télécharger ──────────────────────────────────────────────
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, wsMeta, 'Métadonnées');
    XLSX.utils.book_append_sheet(wb, wsFact, 'Facteurs');
    XLSX.utils.book_append_sheet(wb, wsMat, 'Matrice');
    XLSX.writeFile(wb, `${editMeta.title || editMeta.id || 'plan'}.xlsx`);
  };

  const goTo = (n) => {
    if (n === 2 && !matrix) setMatrix(genMatrix(factors, responses, centerPoint));
    setPart(n);
  };

  const buildMatrix = () => {
    const m = matrix || genMatrix(factors, responses, centerPoint);
    const def = computeDefaultModel(factors);
    setMatrix(m);
    setModelDefault(def);
    setModels([{ id: 1, name: "Modèle 1", terms: [...def], preset: "default" }]);
    setActiveModelId(1);
    setPart(2);
  };

  const recompModel = (f) => {
    const def = computeDefaultModel(f);
    setModelDefault(def);
    setModels([{ id: 1, name: "Modèle 1", terms: [...def], preset: "default" }]);
    setActiveModelId(1);
    setMatrix(null);
  };

  const updateFactor = (i, key, val) => {
    const f = [...factors];
    f[i] = { ...f[i], [key]: val };
    if (key === "continuous") {
      if (val) f[i].low = { real: 0, coded: -1 }, f[i].high = { real: 1, coded: 1 };
      else f[i].low = { label: "", coded: -1 }, f[i].high = { label: "", coded: 1 };
    }
    setFactors(f); recompModel(f);
  };
  const updateFactorLevel = (i, side, val) => {
    const f = [...factors];
    f[i] = { ...f[i], [side]: { ...f[i][side], real: +val } };
    setFactors(f);
  };
  const updateFactorLabel = (i, side, val) => {
    const f = [...factors];
    f[i] = { ...f[i], [side]: { ...f[i][side], label: val } };
    setFactors(f);
  };
  const addFactor = () => {
    const n = factors.length + 1;
    const f = [...factors, { id: "X" + n, name: "Facteur " + n, unit: "", continuous: true, low: { real: 0, coded: -1 }, high: { real: 1, coded: 1 } }];
    setFactors(f); recompModel(f);
  };
  const removeFactor = (i) => {
    const f = factors.filter((_, j) => j !== i).map((fac, j) => ({ ...fac, id: "X" + (j + 1) }));
    setFactors(f); recompModel(f);
  };

  const updateResponse = (i, key, val) => {
    const r = [...responses]; r[i] = { ...r[i], [key]: val }; setResponses(r);
  };
  const addResponse = () => {
    const n = responses.length + 1;
    setResponses([...responses, { id: "Y" + n, name: "Réponse " + n, unit: "" }]);
  };
  const removeResponse = (i) => setResponses(responses.filter((_, j) => j !== i));

  const updateCell = (ri, fid, val) => {
    const m = [...matrix];
    m[ri] = { ...m[ri], real: { ...m[ri].real, [fid]: +val } };
    setMatrix(m);
  };
  const updateResp = (ri, rid, val) => {
    const m = [...matrix];
    m[ri] = { ...m[ri], responses: { ...m[ri].responses, [rid]: val === "" ? "" : +val } };
    setMatrix(m);
  };
  const removeRun = (i) => setMatrix(matrix.filter((_, j) => j !== i));

  const openAddRow = () => {
    const lvls = {};
    factors.forEach(f => { lvls[f.id] = -1; });
    setAddRowLevels(lvls);
  };
  const confirmAddRow = () => {
    const lvls = addRowLevels;
    const coded = {}, real = {};
    factors.forEach(f => {
      const c = lvls[f.id];
      coded[f.id] = c;
      if (f.continuous) real[f.id] = c === -1 ? f.low.real : c === 1 ? f.high.real : +((f.low.real + f.high.real) / 2).toFixed(3);
      else real[f.id] = c === -1 ? (f.low.label || "−1") : (f.high.label || "+1");
    });
    const rv = {};
    responses.forEach(r => { rv[r.id] = ""; });
    setMatrix([...matrix, { id: matrix.length + 1, coded, real, center: false, responses: rv }]);
    setAddRowLevels(null);
  };

  const fillRandom = () => {
    const m = matrix.map(row => {
      const r = { ...row, responses: { ...row.responses } };
      responses.forEach(resp => {
        if (r.responses[resp.id] === "" || r.responses[resp.id] === null || r.responses[resp.id] === undefined)
          r.responses[resp.id] = +(Math.random() * 80 + 20).toFixed(2);
      });
      return r;
    });
    setMatrix(m);
    setShowRandomDialog(false);
    setShowRandomDone(true);
  };

  const toggleTerm = (t) => {
    const idx = modelActive.indexOf(t);
    if (idx >= 0) setModelActive(modelActive.filter(x => x !== t));
    else setModelActive([...modelActive, t]);
    setModelPreset("custom");
  };
  const applyPreset = (p) => {
    if (p === "cubic" && factors.length < 3) { setShowCubicDialog(true); return; }
    setModelPreset(p);
    setModelActive(computePresetModel(p, factors, modelDefault));
  };
  const resetModel = () => { setModelActive([...modelDefault]); setModelPreset("default"); };

  const missingRows = matrix ? getMissingRows(matrix, responses) : [];
  const hasMissing = missingRows.length > 0;
  const isDefaultModel = JSON.stringify([...modelActive].sort()) === JSON.stringify([...modelDefault].sort());

  const allTerms = getAllPossibleTerms(factors);
  const byOrder = {};
  allTerms.forEach(t => {
    let key;
    if (termOrder(t, factors) === 1) key = "1";
    else if (isQuadPure(t, factors)) key = "quad";
    else key = String(termOrder(t, factors));
    if (!byOrder[key]) byOrder[key] = [];
    byOrder[key].push(t);
  });
  const orderLabels = {
    "1": "Effets principaux",
    "quad": "Termes quadratiques purs (X²)",
    "2": "Interactions ordre 2",
    "3": "Interactions ordre 3",
    "4": "Interactions ordre 4",
  };
  const orderedKeys = ["1", "quad", "2", "3", "4"].filter(k => byOrder[k]);

  const diffBadgeCls = {
    "débutant": "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
    "intermédiaire": "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
    "avancé": "bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300",
  };

  return (
    <HelpProvider>
    <div className="max-w-4xl mx-auto px-4 py-6">

      {/* ══════════════════════════════════════════════════════ ÉCRAN D'ACCUEIL */}
      {part === 0 && (
        <div className="min-h-[80vh] flex flex-col">
          {/* En-tête */}
          <div className="text-center mb-8 mt-4">
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">{t("doe.title")}</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">BTS Métiers de la Chimie — Choisissez comment démarrer</p>
          </div>

          {/* Grille de cartes */}
          <div className="flex flex-col gap-6">

            {/* Actions principales */}
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-3">Créer ou importer</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Nouveau plan */}
                <button onClick={() => setWelcomeModal('new')}
                  className="flex flex-col items-center gap-3 rounded-xl border-2 border-dashed border-indigo-300 dark:border-indigo-700 bg-indigo-50 dark:bg-indigo-900/20 p-6 hover:border-indigo-500 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-all text-center group">
                  <div className="size-12 rounded-xl bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center group-hover:bg-indigo-200 dark:group-hover:bg-indigo-900/70 transition-colors">
                    <PlusIcon className="size-6 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-indigo-700 dark:text-indigo-300">Nouveau plan</p>
                    <p className="text-xs text-indigo-500 dark:text-indigo-400 mt-0.5">Définir les facteurs</p>
                  </div>
                </button>

                {/* Charger JSON */}
                <button onClick={() => { setJsonPasteText(''); setJsonImportError(null); setWelcomeModal('json'); }}
                  className="flex flex-col items-center gap-3 rounded-xl border-2 border-dashed border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-900/20 p-6 hover:border-emerald-500 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-all text-center group">
                  <div className="size-12 rounded-xl bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center group-hover:bg-emerald-200 dark:group-hover:bg-emerald-900/70 transition-colors">
                    <BookOpenIcon className="size-6 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">Importer JSON</p>
                    <p className="text-xs text-emerald-500 dark:text-emerald-400 mt-0.5">Fichier ou coller le texte</p>
                  </div>
                </button>

                {/* Excel/CSV */}
                <button onClick={() => setWelcomeModal('excel')}
                  className="flex flex-col items-center gap-3 rounded-xl border-2 border-dashed border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20 p-6 hover:border-amber-500 hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-all text-center group">
                  <div className="size-12 rounded-xl bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center group-hover:bg-amber-200 dark:group-hover:bg-amber-900/70 transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="size-6 text-amber-600 dark:text-amber-400">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-amber-700 dark:text-amber-300">Importer Excel / CSV</p>
                    <p className="text-xs text-amber-500 dark:text-amber-400 mt-0.5">Excel, CSV ou modèle</p>
                  </div>
                </button>
              </div>
            </div>

            {/* Exemples par difficulté */}
            {["débutant", "intermédiaire", "avancé"].map(diff => {
              const diffExs = [...EXAMPLE_FILES, ...importedExamples].filter(e => e.difficulty === diff);
              if (diffExs.length === 0) return null;
              const diffColors = {
                "débutant": "text-emerald-600 dark:text-emerald-400",
                "intermédiaire": "text-amber-600 dark:text-amber-400",
                "avancé": "text-rose-600 dark:text-rose-400",
              };
              const diffBg = {
                "débutant": "border-emerald-200 dark:border-emerald-800 hover:border-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20",
                "intermédiaire": "border-amber-200 dark:border-amber-800 hover:border-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20",
                "avancé": "border-rose-200 dark:border-rose-800 hover:border-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/20",
              };
              return (
                <div key={diff}>
                  <p className={`text-[11px] font-semibold uppercase tracking-widest mb-3 ${diffColors[diff]}`}>
                    {diff === "débutant" ? "● " : diff === "intermédiaire" ? "●● " : "●●● "}
                    {diff === "débutant" ? t("doe.difficulty.beginner") : diff === "intermédiaire" ? t("doe.difficulty.intermediate") : t("doe.difficulty.advanced")}
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {diffExs.map(ex => (
                      <button key={ex.file} onClick={async () => {
                        try {
                          const data = ex._data ? ex._data : await fetch(ex.url).then(r => r.json());
                          setExampleEditData({ ex, data,
                            title: data.meta?.title || ex.title,
                            context: data.meta?.context || ex.context,
                            difficulty: data.meta?.difficulty || ex.difficulty,
                          });
                          setWelcomeModal('example');
                        } catch(e) { console.error(e); }
                      }}
                        className={`flex flex-col items-start gap-2 rounded-xl border bg-white dark:bg-gray-900 p-4 transition-all text-left ${diffBg[diff]}`}>
                        <div className="flex items-start justify-between w-full gap-2">
                          <p className="text-xs font-semibold text-gray-900 dark:text-white leading-tight">{ex.title}</p>
                          {ex.real_data && (
                            <span className="shrink-0 text-[9px] font-semibold bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 rounded-full px-1.5 py-0.5">réel</span>
                          )}
                          {ex.imported && (
                            <span className="shrink-0 text-[9px] font-semibold bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300 rounded-full px-1.5 py-0.5">importé</span>
                          )}
                        </div>
                        <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-relaxed">{ex.context}</p>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* ── MODALS ── */}

          {/* Modal Nouveau plan */}
          {welcomeModal === 'new' && (
            <div className="fixed inset-0 z-50 bg-black/30 dark:bg-black/50 flex items-center justify-center p-4" onClick={() => setWelcomeModal(null)}>
              <div className="bg-white dark:bg-gray-950 rounded-2xl shadow-2xl w-full max-w-sm p-6" onClick={e => e.stopPropagation()}>
                <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-4">Nouveau plan d'expériences</h2>
                <div className="space-y-4 mb-6">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1.5">Nombre de facteurs</label>
                    <div className="flex items-center gap-3">
                      <input type="range" min="2" max="6" value={newNbFactors} onChange={e => setNewNbFactors(+e.target.value)} className="flex-1" />
                      <span className="w-8 text-center font-semibold font-mono text-indigo-600 dark:text-indigo-400 text-lg">{newNbFactors}</span>
                    </div>
                    <p className="text-[10px] text-gray-400 mt-1">→ {Math.pow(2, newNbFactors)} essais minimum (plan 2<sup>{newNbFactors}</sup>)</p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1.5">Nombre de réponses mesurées</label>
                    <div className="flex items-center gap-3">
                      <input type="range" min="1" max="4" value={newNbResponses} onChange={e => setNewNbResponses(+e.target.value)} className="flex-1" />
                      <span className="w-8 text-center font-semibold font-mono text-indigo-600 dark:text-indigo-400 text-lg">{newNbResponses}</span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setWelcomeModal(null)} className="flex-1 rounded-lg border border-gray-200 dark:border-gray-700 px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">{t("common.cancel")}</button>
                  <button onClick={() => createNewPlan(newNbFactors, newNbResponses)} className="flex-1 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 transition-colors">Créer →</button>
                </div>
              </div>
            </div>
          )}

          {/* Modal JSON */}
          {welcomeModal === 'json' && (
            <div className="fixed inset-0 z-50 bg-black/30 dark:bg-black/50 flex items-center justify-center p-4" onClick={() => setWelcomeModal(null)}>
              <div className="bg-white dark:bg-gray-950 rounded-2xl shadow-2xl w-full max-w-lg p-6" onClick={e => e.stopPropagation()}>
                <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-4">Importer un fichier JSON</h2>
                {/* Zone drag & drop */}
                <div
                  onDragOver={e => { e.preventDefault(); setJsonDragOver(true); }}
                  onDragLeave={() => setJsonDragOver(false)}
                  onDrop={e => {
                    e.preventDefault(); setJsonDragOver(false);
                    const file = e.dataTransfer.files[0];
                    if (file) { const reader = new FileReader(); reader.onload = ev => setJsonPasteText(ev.target.result); reader.readAsText(file); }
                  }}
                  className={`rounded-xl border-2 border-dashed p-4 text-center mb-3 transition-colors ${jsonDragOver ? "border-indigo-400 bg-indigo-50 dark:bg-indigo-900/20" : "border-gray-200 dark:border-gray-700"}`}>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Glissez un fichier .json ici</p>
                  <p className="text-[10px] text-gray-400 mt-1">— ou —</p>
                  <label className="mt-2 inline-block cursor-pointer text-xs text-indigo-600 dark:text-indigo-400 hover:underline">
                    Parcourir
                    <input type="file" accept=".json" className="hidden" onChange={e => {
                      const file = e.target.files[0];
                      if (file) { const reader = new FileReader(); reader.onload = ev => setJsonPasteText(ev.target.result); reader.readAsText(file); }
                    }} />
                  </label>
                </div>
                <p className="text-[11px] text-gray-400 mb-1.5 text-center">— ou coller le contenu JSON —</p>
                <textarea
                  value={jsonPasteText}
                  onChange={e => { setJsonPasteText(e.target.value); setJsonImportError(null); }}
                  placeholder='{"meta": {...}, "factors": [...], "responses": [...], "runs": [...]}'
                  rows={5}
                  className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-transparent px-3 py-2 text-xs font-mono text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                />
                {jsonImportError && (
                  <p className="mt-2 text-xs text-red-500 dark:text-red-400">{jsonImportError}</p>
                )}
                <div className="flex gap-2 mt-4">
                  <button onClick={() => setWelcomeModal(null)} className="flex-1 rounded-lg border border-gray-200 dark:border-gray-700 px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">{t("common.cancel")}</button>
                  <button onClick={() => importFromJsonText(jsonPasteText)} disabled={!jsonPasteText.trim()} className="flex-1 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">{t("common.validate")} →</button>
                </div>
              </div>
            </div>
          )}

          {/* Modal Excel/CSV — rendu via sous-composant pour éviter useState dans IIFE */}
          {welcomeModal === 'excel' && (
            <ExcelImportModal
              onClose={() => { setWelcomeModal(null); setExcelImportError(null); }}
              excelDragOver={excelDragOver}
              setExcelDragOver={setExcelDragOver}
              importFromExcel={importFromExcel}
              excelImportError={excelImportError}
              setExcelImportError={setExcelImportError}
            />
          )}

                    {/* Modal Exemple */}
          {welcomeModal === 'example' && exampleEditData && (
            <div className="fixed inset-0 z-50 bg-black/30 dark:bg-black/50 flex items-center justify-center p-4" onClick={() => setWelcomeModal(null)}>
              <div className="bg-white dark:bg-gray-950 rounded-2xl shadow-2xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-1">{exampleEditData.difficulty}</p>
                    <h2 className="text-base font-semibold text-gray-900 dark:text-white">{exampleEditData.title}</h2>
                  </div>
                  {exampleEditData.ex?.real_data && <span className="shrink-0 text-[10px] font-semibold bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 rounded-full px-2 py-0.5">données réelles</span>}
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">{exampleEditData.context}</p>

                {/* Infos facteurs et réponses */}
                <div className="rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 p-3 mb-4 space-y-2">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 mb-1.5">Facteurs ({exampleEditData.data.factors?.length})</p>
                    <div className="space-y-1">
                      {exampleEditData.data.factors?.map(f => (
                        <div key={f.id} className="flex items-center gap-2 text-xs">
                          <span className="font-mono text-gray-400 w-6">{f.id}</span>
                          <span className="font-medium text-gray-700 dark:text-gray-200">{f.name}</span>
                          {f.continuous && <span className="text-gray-400">[{f.low.real}→{f.high.real}{f.unit?' '+f.unit:''}]</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 mb-1.5">Réponses ({exampleEditData.data.responses?.length})</p>
                    <div className="space-y-1">
                      {exampleEditData.data.responses?.map(r => (
                        <div key={r.id} className="flex items-center gap-2 text-xs">
                          <span className="font-mono text-gray-400 w-6">{r.id}</span>
                          <span className="font-medium text-gray-700 dark:text-gray-200">{r.name}{r.unit?' ('+r.unit+')':''}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <p className="text-[10px] text-gray-400">{exampleEditData.data.runs?.length} essais</p>
                </div>

                <div className="flex gap-2">
                  <button onClick={() => setWelcomeModal(null)} className="flex-1 rounded-lg border border-gray-200 dark:border-gray-700 px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">{t("common.cancel")}</button>
                  <button onClick={() => {
                    loadExample(exampleEditData.ex);
                    setWelcomeModal(null);
                  }} className="flex-1 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 transition-colors">Charger →</button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── BARRE LATÉRALE ── */}
      {part === 1 && (
        <Dialog open={sidebarOpen} onClose={setSidebarOpen} className="relative z-50">
          <DialogBackdrop
            transition
            className="fixed inset-0 bg-gray-900/50 transition-opacity duration-300 ease-in-out data-closed:opacity-0"
          />
          <div className="fixed inset-0 overflow-hidden">
            <div className="absolute inset-0 overflow-hidden">
              <div className="pointer-events-none fixed inset-y-0 left-0 flex max-w-full pr-10">
                <DialogPanel
                  transition
                  className="pointer-events-auto w-72 transform transition duration-300 ease-in-out data-closed:-translate-x-full"
                >
                  <div className="flex h-full flex-col bg-white dark:bg-gray-900 shadow-xl overflow-y-auto">
                    <div className="flex items-center justify-between px-4 py-4 border-b border-gray-200 dark:border-gray-700">
                      <DialogTitle className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
                        <BookOpenIcon className="size-4" />
                        Exemples &amp; nouveau plan
                      </DialogTitle>
                      <button onClick={() => setSidebarOpen(false)} className="rounded-md p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors">
                        <XMarkIcon className="size-5" />
                      </button>
                    </div>

                    {/* Import JSON */}
                    <div className="px-4 pt-4 pb-0">
                      <label className="w-full flex items-center justify-center gap-2 rounded-lg border border-gray-200 dark:border-gray-700 px-4 py-2.5 text-sm font-medium text-gray-600 dark:text-gray-300 hover:border-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors cursor-pointer">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="size-4 rotate-180">
                          <path fillRule="evenodd" d="M10 3a1 1 0 01.707.293l3 3a1 1 0 01-1.414 1.414L11 6.414V12a1 1 0 11-2 0V6.414L7.707 7.707a1 1 0 01-1.414-1.414l3-3A1 1 0 0110 3zm-3.707 9.293a1 1 0 011.414 1.414L10 16.414l2.293-2.293a1 1 0 011.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                        Importer un JSON
                        <input
                          type="file"
                          accept=".json"
                          className="sr-only"
                          onChange={e => { validateAndImport(e.target.files[0]); e.target.value = ""; }}
                        />
                      </label>
                      {importError && (
                        <div className="mt-2 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 px-3 py-2">
                          <p className="text-xs font-medium text-red-600 dark:text-red-400 mb-0.5">Format invalide</p>
                          <p className="text-[11px] text-red-500 dark:text-red-400 leading-relaxed">{importError}</p>
                        </div>
                      )}
                    </div>

                    <div className="px-4 pt-4 pb-2">
                      <button onClick={resetToNew}
                        className="w-full flex items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 px-4 py-3 text-sm font-medium text-gray-600 dark:text-gray-300 hover:border-gray-400 hover:text-gray-800 dark:hover:text-white transition-colors">
                        <PlusIcon className="size-4" />
                        Nouveau plan vide
                      </button>
                    </div>

                    <div className="px-4 py-3">
                      <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-3">Exemples</p>
                      <div className="flex flex-col gap-2">
                        {EXAMPLE_FILES.map((ex) => (
                          <div key={ex.file} className={`rounded-lg border transition-all ${
                              loadedExampleId === ex.file
                                ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 dark:border-indigo-400"
                                : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-500"
                            }`}>
                            <button onClick={() => loadExample(ex)} className="w-full text-left px-3 pt-2.5 pb-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-t-lg transition-colors">
                              <div className="flex items-start justify-between gap-2 mb-1">
                                <span className="text-xs font-medium text-gray-900 dark:text-white leading-tight">{ex.title}</span>
                                {ex.real_data && (
                                  <span className="shrink-0 text-[10px] font-semibold bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 rounded-full px-1.5 py-0.5">réel</span>
                                )}
                              </div>
                              <p className="text-[11px] text-gray-500 dark:text-gray-400 mb-1.5">{ex.context}</p>
                              <span className={`inline-block text-[10px] font-semibold rounded-full px-1.5 py-0.5 ${diffBadgeCls[ex.difficulty] || diffBadgeCls["débutant"]}`}>
                                {ex.difficulty}
                              </span>
                            </button>
                            <div className="border-t border-gray-100 dark:border-gray-700 px-3 py-1.5 flex justify-end">
                              <button onClick={() => loadForEdit(ex)}
                                className="flex items-center gap-1 text-[11px] text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                                title="Éditer cet exemple">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="size-3.5">
                                  <path d="M2.695 14.763l-1.262 3.154a.5.5 0 00.65.65l3.155-1.262a4 4 0 001.343-.885L17.5 5.5a2.121 2.121 0 00-3-3L3.58 13.42a4 4 0 00-.885 1.343z" />
                                </svg>
                                Éditer
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    {loadError && (
                      <div className="mx-4 mt-2 mb-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 px-3 py-2">
                        <p className="text-xs text-red-600 dark:text-red-400 font-medium mb-0.5">Erreur de chargement</p>
                        <p className="text-[11px] text-red-500 dark:text-red-400 break-all">{loadError}</p>
                      </div>
                    )}
                    </div>

                    {/* Exemples importés */}
                    {importedExamples.length > 0 && (
                      <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-800">
                        <div className="flex items-center justify-between mb-3">
                          <p className="text-[10px] font-semibold uppercase tracking-widest text-indigo-400 dark:text-indigo-500">Importés</p>
                          <button onClick={() => setImportedExamples([])}
                            className="text-[10px] text-gray-400 hover:text-red-500 transition-colors">
                            Tout supprimer
                          </button>
                        </div>
                        <div className="flex flex-col gap-2">
                          {importedExamples.map((ex) => (
                            <div key={ex.file} className={`rounded-lg border transition-all ${
                              loadedExampleId === ex.file
                                ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 dark:border-indigo-400"
                                : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-500"
                            }`}>
                              <button onClick={() => loadExample(ex)} className="w-full text-left px-3 pt-2.5 pb-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-t-lg transition-colors">
                                <div className="flex items-start justify-between gap-2 mb-1">
                                  <span className="text-xs font-medium text-gray-900 dark:text-white leading-tight">{ex.title}</span>
                                  <span className="shrink-0 text-[10px] font-semibold bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300 rounded-full px-1.5 py-0.5">importé</span>
                                </div>
                                <p className="text-[11px] text-gray-500 dark:text-gray-400 mb-1.5">{ex.context}</p>
                                <span className={`inline-block text-[10px] font-semibold rounded-full px-1.5 py-0.5 ${diffBadgeCls[ex.difficulty] || diffBadgeCls["débutant"]}`}>
                                  {ex.difficulty}
                                </span>
                              </button>
                              <div className="border-t border-gray-100 dark:border-gray-700 px-3 py-1.5 flex justify-between items-center">
                                <button onClick={() => setImportedExamples(prev => prev.filter(e => e.file !== ex.file))}
                                  className="text-[11px] text-red-400 hover:text-red-600 transition-colors">
                                  Supprimer
                                </button>
                                <button onClick={() => loadForEdit(ex)}
                                  className="flex items-center gap-1 text-[11px] text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="size-3.5">
                                    <path d="M2.695 14.763l-1.262 3.154a.5.5 0 00.65.65l3.155-1.262a4 4 0 001.343-.885L17.5 5.5a2.121 2.121 0 00-3-3L3.58 13.42a4 4 0 00-.885 1.343z" />
                                  </svg>
                                  Éditer
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </DialogPanel>
              </div>
            </div>
          </div>
        </Dialog>
      )}

      {/* ── STEPPER ── */}
      {part > 0 && <nav aria-label="Progression" className="mb-6">
        <ol role="list" className="divide-y divide-gray-300 rounded-md border border-gray-300 md:flex md:divide-y-0 dark:divide-white/15 dark:border-white/15">
          {[
            { n: 1, id: "01", l: `${t("doe.factors")} & ${t("doe.responses")}` },
            { n: 2, id: "02", l: t("doe.matrix") },
            { n: 3, id: "03", l: t("doe.model") },
            { n: 4, id: "04", l: t("doe.effects") },
          ].map((s, i, arr) => {
            const status = part > s.n ? "complete" : part === s.n ? "current" : "upcoming";
            return (
              <li key={s.n} className="relative md:flex md:flex-1">
                {status === "complete" ? (
                  <button onClick={() => goTo(s.n)} className="group flex w-full items-center">
                    <span className="flex items-center px-6 py-4 text-sm font-medium">
                      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-indigo-600 group-hover:bg-indigo-800 dark:bg-indigo-500 dark:group-hover:bg-indigo-400">
                        <CheckIcon aria-hidden="true" className="size-6 text-white" />
                      </span>
                      <span className="ml-4 text-sm font-medium text-gray-900 dark:text-white">{s.l}</span>
                    </span>
                  </button>
                ) : status === "current" ? (
                  <button onClick={() => goTo(s.n)} aria-current="step" className="flex items-center px-6 py-4 text-sm font-medium">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-full border-2 border-indigo-600 dark:border-indigo-400">
                      <span className="text-indigo-600 dark:text-indigo-400">{s.id}</span>
                    </span>
                    <span className="ml-4 text-sm font-medium text-indigo-600 dark:text-indigo-400">{s.l}</span>
                  </button>
                ) : (
                  <button onClick={() => goTo(s.n)} className="group flex items-center">
                    <span className="flex items-center px-6 py-4 text-sm font-medium">
                      <span className="flex size-10 shrink-0 items-center justify-center rounded-full border-2 border-gray-300 group-hover:border-gray-400 dark:border-white/15 dark:group-hover:border-white/25">
                        <span className="text-gray-500 group-hover:text-gray-900 dark:text-gray-400 dark:group-hover:text-white">{s.id}</span>
                      </span>
                      <span className="ml-4 text-sm font-medium text-gray-500 group-hover:text-gray-900 dark:text-gray-400 dark:group-hover:text-white">{s.l}</span>
                    </span>
                  </button>
                )}
                {i !== arr.length - 1 && (
                  <div aria-hidden="true" className="absolute top-0 right-0 hidden h-full w-5 md:block">
                    <svg fill="none" viewBox="0 0 22 80" preserveAspectRatio="none" className="size-full text-gray-300 dark:text-white/15">
                      <path d="M0 -2L20 40L0 82" stroke="currentcolor" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
                    </svg>
                  </div>
                )}
              </li>
            );
          })}
        </ol>
      </nav>}


      {/* ══════════════════════════════════════════════════════ PARTIE 1 */}
      {part === 1 && (
        <>
          {/* bandeau mode édition + bouton export */}
          {editMode && (
            <div className="flex items-center justify-between bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-700 rounded-xl px-4 py-3 mb-4 gap-3">
              <div className="flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="size-4 text-indigo-500">
                  <path d="M2.695 14.763l-1.262 3.154a.5.5 0 00.65.65l3.155-1.262a4 4 0 001.343-.885L17.5 5.5a2.121 2.121 0 00-3-3L3.58 13.42a4 4 0 00-.885 1.343z" />
                </svg>
                <span className="text-sm font-medium text-indigo-700 dark:text-indigo-300">Mode édition — {editMeta.title || loadedExampleId}</span>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => { setEditMode(false); }}
                  className="rounded-md border border-indigo-200 dark:border-indigo-700 px-2.5 py-1 text-xs text-indigo-600 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-colors">
                  {t("common.cancel")}
                </button>
                <button onClick={exportJSON}
                  className="flex items-center gap-1.5 rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500 transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="size-3.5">
                    <path fillRule="evenodd" d="M10 3a1 1 0 01.707.293l3 3a1 1 0 01-1.414 1.414L11 6.414V12a1 1 0 11-2 0V6.414L7.707 7.707a1 1 0 01-1.414-1.414l3-3A1 1 0 0110 3zm-3.707 9.293a1 1 0 011.414 1.414L10 16.414l2.293-2.293a1 1 0 011.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                  Exporter JSON
                </button>
              </div>
            </div>
          )}

          {/* ── Barre d'actions : Exemple chargé + Nouveau ── */}
          <div className="flex items-center gap-2 mb-4">
            {/* Bouton "Exemple chargé" → popup export */}
            <button onClick={() => setShowExportPopup(true)}
              className="flex items-center gap-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors shadow-sm">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="size-4 text-gray-400">
                <path fillRule="evenodd" d="M10 3a1 1 0 01.707.293l3 3a1 1 0 01-1.414 1.414L11 6.414V12a1 1 0 11-2 0V6.414L7.707 7.707a1 1 0 01-1.414-1.414l3-3A1 1 0 0110 3zm-3.707 9.293a1 1 0 011.414 1.414L10 16.414l2.293-2.293a1 1 0 011.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd"/>
              </svg>
              <span className="truncate max-w-xs">
                {loadedExampleId
                  ? <><span className="text-gray-400 text-xs mr-1">Chargé :</span><span className="font-medium">{[...EXAMPLE_FILES, ...importedExamples].find(e => e.file === loadedExampleId)?.title || loadedExampleId}</span></>
                  : <span className="text-gray-400">Aucun exemple chargé</span>}
              </span>
            </button>

            {/* Bouton "Nouveau" → quitter avec confirmation si données modifiées */}
            <button
              onClick={() => {
                // Détecter si des données ont été saisies (matrice non vide ou facteurs modifiés)
                const hasData = matrix && matrix.some(r => responses.some(resp => r.responses[resp.id] !== ''));
                if (hasData || loadedExampleId) {
                  setShowQuitConfirm(true);
                } else {
                  setPart(0);
                }
              }}
              className="flex items-center gap-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-500 dark:text-gray-400 hover:bg-gray-50 hover:text-gray-700 dark:hover:bg-gray-700 transition-colors shadow-sm"
              title="Revenir à l'écran d'accueil"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="size-4">
                <path fillRule="evenodd" d="M9.293 2.293a1 1 0 011.414 0l7 7A1 1 0 0117 11h-1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-3a1 1 0 00-1-1H9a1 1 0 00-1 1v3a1 1 0 01-1 1H5a1 1 0 01-1-1v-6H3a1 1 0 01-.707-1.707l7-7z" clipRule="evenodd"/>
              </svg>
              Nouveau
            </button>
          </div>

          {/* ── Popup export (depuis "Exemple chargé") ── */}
          {showExportPopup && (
            <div className="fixed inset-0 z-50 bg-black/30 dark:bg-black/50 flex items-center justify-center p-4" onClick={() => setShowExportPopup(false)}>
              <div className="bg-white dark:bg-gray-950 rounded-2xl shadow-2xl w-full max-w-sm p-6" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-4">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">Sauvegarder le plan</p>
                  <button onClick={() => setShowExportPopup(false)} className="size-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800">
                    <XMarkIcon className="size-5" />
                  </button>
                </div>
                {loadedExampleId && (
                  <p className="text-xs text-gray-400 mb-4 truncate">
                    Plan : <span className="text-gray-600 dark:text-gray-300 font-medium">{[...EXAMPLE_FILES, ...importedExamples].find(e => e.file === loadedExampleId)?.title || loadedExampleId}</span>
                  </p>
                )}
                <div className="flex flex-col gap-2">
                  <button onClick={() => { exportJSON(); setShowExportPopup(false); }}
                    className="flex items-center gap-3 rounded-xl border border-gray-200 dark:border-gray-700 px-4 py-3 text-sm text-gray-700 dark:text-gray-200 hover:border-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-all">
                    <div className="size-8 rounded-lg bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center">
                      <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400">JSON</span>
                    </div>
                    <div>
                      <p className="font-medium">Format JSON</p>
                      <p className="text-xs text-gray-400">Rechargeable dans l'application</p>
                    </div>
                  </button>
                  <button onClick={() => { exportCSV(); setShowExportPopup(false); }}
                    className="flex items-center gap-3 rounded-xl border border-gray-200 dark:border-gray-700 px-4 py-3 text-sm text-gray-700 dark:text-gray-200 hover:border-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-all">
                    <div className="size-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center">
                      <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">CSV</span>
                    </div>
                    <div>
                      <p className="font-medium">Format CSV</p>
                      <p className="text-xs text-gray-400">Compatible tableurs</p>
                    </div>
                  </button>
                  <button onClick={() => { exportXLSX(); setShowExportPopup(false); }}
                    className="flex items-center gap-3 rounded-xl border border-gray-200 dark:border-gray-700 px-4 py-3 text-sm text-gray-700 dark:text-gray-200 hover:border-amber-300 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-all">
                    <div className="size-8 rounded-lg bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center">
                      <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400">XLS</span>
                    </div>
                    <div>
                      <p className="font-medium">Format Excel</p>
                      <p className="text-xs text-gray-400">Vrai format .xlsx (Excel)</p>
                    </div>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── Popup confirmation quitter (depuis "Nouveau") ── */}
          {showQuitConfirm && (
            <div className="fixed inset-0 z-50 bg-black/30 dark:bg-black/50 flex items-center justify-center p-4" onClick={() => setShowQuitConfirm(false)}>
              <div className="bg-white dark:bg-gray-950 rounded-2xl shadow-2xl w-full max-w-sm p-6" onClick={e => e.stopPropagation()}>
                <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="size-6 text-amber-500">
                    <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd"/>
                  </svg>
                </div>
                <p className="text-base font-semibold text-gray-900 dark:text-white text-center mb-1">Sauvegarder avant de quitter ?</p>
                <p className="text-xs text-gray-400 text-center mb-5">Vos données seront perdues si vous ne sauvegardez pas.</p>
                <div className="flex flex-col gap-2 mb-3">
                  <button onClick={() => { exportJSON(); setShowQuitConfirm(false); setPart(0); }}
                    className="flex items-center gap-3 rounded-xl border border-gray-200 dark:border-gray-700 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:border-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-all">
                    <span className="size-7 rounded-lg bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center text-[9px] font-bold text-indigo-600 dark:text-indigo-400">JSON</span>
                    Sauvegarder en JSON et quitter
                  </button>
                  <button onClick={() => { exportCSV(); setShowQuitConfirm(false); setPart(0); }}
                    className="flex items-center gap-3 rounded-xl border border-gray-200 dark:border-gray-700 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:border-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-all">
                    <span className="size-7 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center text-[9px] font-bold text-emerald-600 dark:text-emerald-400">CSV</span>
                    Sauvegarder en CSV et quitter
                  </button>
                  <button onClick={() => { exportXLSX(); setShowQuitConfirm(false); setPart(0); }}
                    className="flex items-center gap-3 rounded-xl border border-gray-200 dark:border-gray-700 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:border-amber-300 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-all">
                    <span className="size-7 rounded-lg bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center text-[9px] font-bold text-amber-600 dark:text-amber-400">XLS</span>
                    Sauvegarder en Excel et quitter
                  </button>
                </div>
                <button onClick={() => { setShowQuitConfirm(false); setPart(0); }}
                  className="w-full rounded-xl border border-gray-200 dark:border-gray-700 px-4 py-2.5 text-sm text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                  Quitter sans sauvegarder
                </button>
              </div>
            </div>
          )}

                    {/* Section métadonnées — visible uniquement en mode édition */}
          {editMode && (
            <div className="bg-white dark:bg-gray-900 border border-indigo-200 dark:border-indigo-700 rounded-xl p-5 mb-4">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-indigo-400 dark:text-indigo-500 mb-3">Métadonnées de l'exemple</p>
              <div className="grid grid-cols-1 gap-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">ID fichier</label>
                    <input value={editMeta.id} onChange={e => setEditMeta({ ...editMeta, id: e.target.value })}
                      className="w-full rounded-md border border-gray-200 dark:border-gray-700 bg-transparent px-2 py-1.5 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Difficulté</label>
                    <select value={editMeta.difficulty} onChange={e => setEditMeta({ ...editMeta, difficulty: e.target.value })}
                      className="w-full rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-2 py-1.5 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
                      <option value="débutant">Débutant</option>
                      <option value="intermédiaire">Intermédiaire</option>
                      <option value="avancé">Avancé</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Titre</label>
                  <input value={editMeta.title} onChange={e => setEditMeta({ ...editMeta, title: e.target.value })}
                    className="w-full rounded-md border border-gray-200 dark:border-gray-700 bg-transparent px-2 py-1.5 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Contexte</label>
                  <input value={editMeta.context} onChange={e => setEditMeta({ ...editMeta, context: e.target.value })}
                    className="w-full rounded-md border border-gray-200 dark:border-gray-700 bg-transparent px-2 py-1.5 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Source</label>
                  <input value={editMeta.source} onChange={e => setEditMeta({ ...editMeta, source: e.target.value })}
                    placeholder="Auteur, publication, année…"
                    className="w-full rounded-md border border-gray-200 dark:border-gray-700 bg-transparent px-2 py-1.5 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={editMeta.real_data} onChange={e => setEditMeta({ ...editMeta, real_data: e.target.checked })}
                      className="size-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
                    <span className="text-sm text-gray-700 dark:text-gray-200">Données réelles (badge "réel")</span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* Facteurs */}
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-5 mb-4">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-3 flex items-center gap-2">Facteurs <HelpButton topic="facteurs" size="xs" /></p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-gray-800">
                    {["ID", "Nom", "Unité", "Type", "Niveau bas", "Niveau haut", ""].map((h, i) => (
                      <th key={i} className="text-left text-[11px] font-medium text-gray-400 dark:text-gray-500 pb-2 px-2 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {factors.map((f, i) => (
                    <tr key={f.id} className="border-b border-gray-50 dark:border-gray-800/50 last:border-0">
                      <td className="px-2 py-1.5">
                        <span className="font-mono text-xs font-semibold text-gray-400 dark:text-gray-500">{f.id}</span>
                      </td>
                      <td className="px-2 py-1.5">
                        <input value={f.name} onChange={e => updateFactor(i, "name", e.target.value)}
                          className="w-28 rounded-md border border-gray-200 dark:border-gray-700 bg-transparent px-2 py-1 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400" />
                      </td>
                      <td className="px-2 py-1.5">
                        <input value={f.unit || ""} placeholder="°C, g…" onChange={e => updateFactor(i, "unit", e.target.value)}
                          className="w-16 rounded-md border border-gray-200 dark:border-gray-700 bg-transparent px-2 py-1 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                      </td>
                      <td className="px-2 py-1.5">
                        <select value={String(f.continuous)} onChange={e => updateFactor(i, "continuous", e.target.value === "true")}
                          className="rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-2 py-1 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
                          <option value="true">Continu</option>
                          <option value="false">Discret</option>
                        </select>
                      </td>
                      <td className="px-2 py-1.5">
                        {f.continuous
                          ? <input type="number" value={f.low.real} onChange={e => updateFactorLevel(i, "low", e.target.value)}
                              className="w-20 rounded-md border border-gray-200 dark:border-gray-700 bg-transparent px-2 py-1 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                          : <input value={f.low.label || ""} placeholder="Label −1" onChange={e => updateFactorLabel(i, "low", e.target.value)}
                              className="w-24 rounded-md border border-gray-200 dark:border-gray-700 bg-transparent px-2 py-1 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                        }
                      </td>
                      <td className="px-2 py-1.5">
                        {f.continuous
                          ? <input type="number" value={f.high.real} onChange={e => updateFactorLevel(i, "high", e.target.value)}
                              className="w-20 rounded-md border border-gray-200 dark:border-gray-700 bg-transparent px-2 py-1 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                          : <input value={f.high.label || ""} placeholder="Label +1" onChange={e => updateFactorLabel(i, "high", e.target.value)}
                              className="w-24 rounded-md border border-gray-200 dark:border-gray-700 bg-transparent px-2 py-1 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                        }
                      </td>
                      <td className="px-2 py-1.5">
                        {factors.length > 2 && (
                          <button onClick={() => removeFactor(i)}
                            className="p-1 rounded text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                            <TrashIcon className="size-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {factors.length < 6
              ? <button onClick={addFactor}
                  className="mt-3 flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 border border-dashed border-gray-300 dark:border-gray-600 rounded-lg px-3 py-1.5 transition-colors">
                  <PlusIcon className="size-3.5" /> Ajouter un facteur
                </button>
              : <p className="mt-3 text-xs text-gray-400">Maximum 6 facteurs atteint.</p>
            }
          </div>

          {/* Réponses */}
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-5 mb-4">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-3">Réponses</p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-gray-800">
                    {["ID", "Nom", "Unité", ""].map((h, i) => (
                      <th key={i} className="text-left text-[11px] font-medium text-gray-400 dark:text-gray-500 pb-2 px-2">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {responses.map((r, i) => (
                    <tr key={r.id} className="border-b border-gray-50 dark:border-gray-800/50 last:border-0">
                      <td className="px-2 py-1.5">
                        <span className="font-mono text-xs font-semibold text-gray-400 dark:text-gray-500">{r.id}</span>
                      </td>
                      <td className="px-2 py-1.5">
                        <input value={r.name} onChange={e => updateResponse(i, "name", e.target.value)}
                          className="w-36 rounded-md border border-gray-200 dark:border-gray-700 bg-transparent px-2 py-1 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                      </td>
                      <td className="px-2 py-1.5">
                        <input value={r.unit || ""} placeholder="%, nm…" onChange={e => updateResponse(i, "unit", e.target.value)}
                          className="w-20 rounded-md border border-gray-200 dark:border-gray-700 bg-transparent px-2 py-1 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                      </td>
                      <td className="px-2 py-1.5">
                        {responses.length > 1 && (
                          <button onClick={() => removeResponse(i)}
                            className="p-1 rounded text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                            <TrashIcon className="size-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button onClick={addResponse}
              className="mt-3 flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 border border-dashed border-gray-300 dark:border-gray-600 rounded-lg px-3 py-1.5 transition-colors">
              <PlusIcon className="size-3.5" /> Ajouter une réponse
            </button>
          </div>

          {/* Point central */}
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-5 mb-4">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-3">Point central</p>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={centerPoint.present}
                  onChange={e => setCenterPoint({ ...centerPoint, present: e.target.checked })}
                  className="size-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
                <span className="text-sm text-gray-700 dark:text-gray-200">Inclure un point central</span>
              </label>
              {centerPoint.present && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400">Répétitions :</span>
                  <input type="number" min={1} max={10} value={centerPoint.replicates}
                    onChange={e => setCenterPoint({ ...centerPoint, replicates: Math.max(1, +e.target.value) })}
                    className="w-16 rounded-md border border-gray-200 dark:border-gray-700 bg-transparent px-2 py-1 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between mt-5">
            <p className="text-xs text-gray-400 dark:text-gray-500">
              Plan 2<sup>{factors.length}</sup> = <strong className="text-gray-600 dark:text-gray-300">{1 << factors.length}</strong> essai(s)
              {centerPoint.present ? ` + ${centerPoint.replicates} point(s) central` : ""}
            </p>
            <button onClick={buildMatrix}
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-600 transition-colors shadow-sm">
              {t("doe.matrix")} →
            </button>
          </div>
        </>
      )}

      {/* ══════════════════════════════════════════════════════ PARTIE 2 */}
      {part === 2 && matrix && (
        <>
          {/* Dialog ajout ligne */}
          <Dialog open={addRowLevels !== null} onClose={() => setAddRowLevels(null)} className="relative z-50">
            <DialogBackdrop transition className="fixed inset-0 bg-gray-900/50 transition-opacity data-closed:opacity-0" />
            <div className="fixed inset-0 z-10 flex items-center justify-center p-4">
              <DialogPanel transition className="w-full max-w-sm rounded-xl bg-white dark:bg-gray-900 p-6 shadow-xl transition-all data-closed:opacity-0 data-closed:scale-95">
                <DialogTitle className="text-sm font-semibold text-gray-900 dark:text-white mb-4">
                  Nouvelle ligne — choisir les niveaux
                </DialogTitle>
                {addRowLevels && factors.map(f => {
                  const sel = addRowLevels[f.id];
                  return (
                    <div key={f.id} className="mb-3">
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1.5">{f.id} — {f.name}</p>
                      <div className="flex gap-2">
                        <button onClick={() => setAddRowLevels({ ...addRowLevels, [f.id]: -1 })}
                          className={`flex-1 rounded-lg border px-2 py-1.5 text-xs font-mono font-medium transition-colors ${sel === -1 ? "bg-red-50 border-red-300 text-red-700 dark:bg-red-900/30 dark:border-red-500 dark:text-red-300" : "border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300"}`}>
                          −1{f.continuous ? ` (${f.low.real}${f.unit ? " " + f.unit : ""})` : (f.low.label ? " " + f.low.label : "")}
                        </button>
                        {f.continuous && (
                          <button onClick={() => setAddRowLevels({ ...addRowLevels, [f.id]: 0 })}
                            className={`flex-1 rounded-lg border px-2 py-1.5 text-xs font-mono font-medium transition-colors ${sel === 0 ? "bg-amber-50 border-amber-300 text-amber-700 dark:bg-amber-900/30 dark:border-amber-500 dark:text-amber-300" : "border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300"}`}>
                            0 ({+((f.low.real + f.high.real) / 2).toFixed(2)}{f.unit ? " " + f.unit : ""})
                          </button>
                        )}
                        <button onClick={() => setAddRowLevels({ ...addRowLevels, [f.id]: 1 })}
                          className={`flex-1 rounded-lg border px-2 py-1.5 text-xs font-mono font-medium transition-colors ${sel === 1 ? "bg-emerald-50 border-emerald-300 text-emerald-700 dark:bg-emerald-900/30 dark:border-emerald-500 dark:text-emerald-300" : "border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300"}`}>
                          +1{f.continuous ? ` (${f.high.real}${f.unit ? " " + f.unit : ""})` : (f.high.label ? " " + f.high.label : "")}
                        </button>
                      </div>
                    </div>
                  );
                })}
                <div className="flex justify-end gap-2 mt-5">
                  <button onClick={() => setAddRowLevels(null)}
                    className="rounded-md bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 px-3 py-1.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                    {t("common.cancel")}
                  </button>
                  <button onClick={confirmAddRow}
                    className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-indigo-500 transition-colors">
                    {t("common.validate")}
                  </button>
                </div>
              </DialogPanel>
            </div>
          </Dialog>

          {/* Dialog confirmation remplissage aléatoire */}
          <Dialog open={showRandomDialog} onClose={setShowRandomDialog} className="relative z-50">
            <DialogBackdrop transition className="fixed inset-0 bg-gray-900/50 transition-opacity data-closed:opacity-0" />
            <div className="fixed inset-0 z-10 flex items-center justify-center p-4">
              <DialogPanel transition className="w-full max-w-md rounded-xl bg-white dark:bg-gray-900 p-6 shadow-xl transition-all data-closed:opacity-0 data-closed:scale-95">
                <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30">
                  <ExclamationTriangleIcon className="size-6 text-amber-600 dark:text-amber-400" />
                </div>
                <DialogTitle className="text-center text-base font-semibold text-gray-900 dark:text-white mb-2">
                  Remplir avec des valeurs aléatoires ?
                </DialogTitle>
                <p className="text-center text-sm text-gray-500 dark:text-gray-400 mb-6">
                  Des valeurs fictives (entre 20 et 100) seront générées pour toutes les réponses manquantes.
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <button onClick={() => setShowRandomDialog(false)}
                    className="rounded-md bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                    {t("common.cancel")}
                  </button>
                  <button onClick={fillRandom}
                    className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-500 transition-colors">
                    {t("common.validate")}
                  </button>
                </div>
              </DialogPanel>
            </div>
          </Dialog>

          {/* Dialog remplissage effectué */}
          <Dialog open={showRandomDone} onClose={setShowRandomDone} className="relative z-50">
            <DialogBackdrop transition className="fixed inset-0 bg-gray-900/50 transition-opacity data-closed:opacity-0" />
            <div className="fixed inset-0 z-10 flex items-center justify-center p-4">
              <DialogPanel transition className="w-full max-w-sm rounded-xl bg-white dark:bg-gray-900 p-6 shadow-xl text-center transition-all data-closed:opacity-0 data-closed:scale-95">
                <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30">
                  <CheckIcon className="size-6 text-emerald-600 dark:text-emerald-400" />
                </div>
                <DialogTitle className="text-base font-semibold text-gray-900 dark:text-white mb-2">Valeurs générées</DialogTitle>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                  Les réponses manquantes ont été remplies avec des valeurs aléatoires fictives.
                </p>
                <button onClick={() => setShowRandomDone(false)}
                  className="w-full rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-500 transition-colors">
                  OK
                </button>
              </DialogPanel>
            </div>
          </Dialog>

          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-5 mb-4">
            <div className="flex items-center justify-between mb-4">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">Matrice d'expériences</p>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400">{matrix.length} essai(s)</span>
                <button onClick={openAddRow}
                  className="flex items-center gap-1 rounded-md border border-gray-200 dark:border-gray-700 px-2.5 py-1 text-xs text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                  <PlusIcon className="size-3.5" /> Ligne
                </button>
              </div>
            </div>

            {hasMissing && (
              <div className="flex items-center justify-between bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg px-3 py-2 mb-4 gap-3">
                <span className="text-xs text-amber-700 dark:text-amber-300">{missingRows.length} ligne(s) sans réponse complète.</span>
                <button onClick={() => setShowRandomDialog(true)}
                  className="shrink-0 rounded-md bg-amber-100 dark:bg-amber-900/40 border border-amber-300 dark:border-amber-600 px-2.5 py-1 text-xs font-medium text-amber-700 dark:text-amber-300 hover:bg-amber-200 transition-colors">
                  Remplir valeurs aléatoires…
                </button>
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-gray-800">
                    <th className="text-[11px] font-medium text-gray-400 pb-2 px-2 w-8 text-center">#</th>
                    {factors.map(f => (
                      <th key={f.id} className="text-left text-[11px] font-medium text-gray-400 pb-2 px-2 whitespace-nowrap">
                        {f.id}<br />
                        <span className="text-[10px] font-normal text-gray-300 dark:text-gray-600">{f.name}{f.unit ? ` (${f.unit})` : ""}</span>
                      </th>
                    ))}
                    <th className="w-px bg-gray-100 dark:bg-gray-800 p-0" />
                    {responses.map(r => (
                      <th key={r.id} className="text-left text-[11px] font-medium text-emerald-600 dark:text-emerald-400 pb-2 px-2 whitespace-nowrap">
                        {r.id}<br />
                        <span className="text-[10px] font-normal text-emerald-400 dark:text-emerald-600">{r.name}{r.unit ? ` (${r.unit})` : ""}</span>
                      </th>
                    ))}
                    <th className="w-8" />
                  </tr>
                </thead>
                <tbody>
                  {matrix.map((row, ri) => {
                    const isMissing = missingRows.includes(ri);
                    return (
                      <tr key={ri} className={`border-b border-gray-50 dark:border-gray-800/50 last:border-0 ${row.center ? "bg-amber-50/40 dark:bg-amber-900/10" : isMissing ? "bg-red-50/40 dark:bg-red-900/10" : ""}`}>
                        <td className="px-2 py-1.5 text-center text-[11px] text-gray-400">{row.center ? "PC" : ri + 1}</td>
                        {factors.map(f => {
                          const c = row.coded[f.id];
                          const rv = row.real[f.id];
                          const cLabel = c === 0 ? "0" : c === -1 ? "−1" : "+1";
                          const cCls = c === -1 ? "text-red-500 dark:text-red-400" : c === 1 ? "text-emerald-600 dark:text-emerald-400" : "text-amber-500";
                          if (row.center && !f.continuous) return (
                            <td key={f.id} className="px-2 py-1.5 text-center text-xs text-gray-300 dark:text-gray-600">—</td>
                          );
                          return (
                            <td key={f.id} className="px-2 py-1.5">
                              <div className="flex items-center gap-1">
                                <span className={`font-mono text-[10px] w-6 shrink-0 ${cCls}`}>({cLabel})</span>
                                {f.continuous
                                  ? <input type="number" value={rv} onChange={e => updateCell(ri, f.id, e.target.value)}
                                      className="w-14 rounded border border-transparent bg-transparent px-1 py-0.5 text-xs text-gray-700 dark:text-gray-200 hover:border-gray-200 dark:hover:border-gray-700 focus:outline-none focus:border-indigo-400 transition-colors" />
                                  : <span className="text-xs text-gray-500 dark:text-gray-400">{rv ?? "—"}</span>
                                }
                              </div>
                            </td>
                          );
                        })}
                        <td className="w-px bg-gray-100 dark:bg-gray-800 p-0" />
                        {responses.map(r => {
                          const v = row.responses[r.id];
                          const isEmpty = v === "" || v === null || v === undefined;
                          return (
                            <td key={r.id} className="px-2 py-1.5">
                              <input type="number" value={isEmpty ? "" : v} placeholder="—"
                                onChange={e => updateResp(ri, r.id, e.target.value)}
                                className={`w-16 rounded border bg-transparent px-1 py-0.5 text-xs text-emerald-700 dark:text-emerald-300 hover:border-gray-200 dark:hover:border-gray-700 focus:outline-none focus:border-indigo-400 transition-colors ${isEmpty ? "border-red-300 dark:border-red-700" : "border-transparent"}`} />
                            </td>
                          );
                        })}
                        <td className="px-2 py-1.5">
                          <button onClick={() => removeRun(ri)}
                            className="p-1 rounded text-red-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                            <TrashIcon className="size-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex items-center justify-between mt-4">
            <button onClick={() => goTo(1)}
              className="rounded-lg border border-gray-200 dark:border-gray-700 px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
              ← {t("common.back")}
            </button>
            <div className="flex items-center gap-3">
              {editMode && (
                <button onClick={exportJSON}
                  className="flex items-center gap-1.5 rounded-md border border-indigo-300 dark:border-indigo-700 bg-indigo-50 dark:bg-indigo-900/20 px-3 py-1.5 text-xs font-medium text-indigo-600 dark:text-indigo-300 hover:bg-indigo-100 transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="size-3.5">
                    <path fillRule="evenodd" d="M10 3a1 1 0 01.707.293l3 3a1 1 0 01-1.414 1.414L11 6.414V12a1 1 0 11-2 0V6.414L7.707 7.707a1 1 0 01-1.414-1.414l3-3A1 1 0 0110 3zm-3.707 9.293a1 1 0 011.414 1.414L10 16.414l2.293-2.293a1 1 0 011.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                  Exporter JSON
                </button>
              )}
              {hasMissing && <span className="text-xs text-red-500 dark:text-red-400">Compléter les réponses pour continuer</span>}
              <button onClick={() => { if (!hasMissing) goTo(3); }} disabled={hasMissing}
                className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                {t("doe.model")} →
              </button>
            </div>
          </div>
        </>
      )}

      {/* ══════════════════════════════════════════════════════ PARTIE 3 */}
      {part === 3 && (() => {
        const nRuns = matrix ? matrix.length : 0;
        const maxTerms = nRuns - 1; // constante comprise = nRuns, donc termes hors constante = nRuns-1
        const activeModel = models.find(m => m.id === activeModelId);

        const addModel = () => {
          if (models.length >= 3) return;
          const newId = Math.max(...models.map(m => m.id)) + 1;
          setModels([...models, { id: newId, name: `Modèle ${newId}`, terms: [...modelDefault], preset: "default" }]);
          setActiveModelId(newId);
        };

        const deleteModel = (id) => {
          if (models.length <= 1) return;
          const remaining = models.filter(m => m.id !== id);
          setModels(remaining);
          if (activeModelId === id) setActiveModelId(remaining[0].id);
        };

        const renameModel = (id, name) => setModels(ms => ms.map(m => m.id === id ? { ...m, name } : m));

        const applyPresetTo = (id, p) => {
          if (p === "cubic" && factors.length < 3) { setShowCubicDialog(true); return; }
          const terms = computePresetModel(p, factors, modelDefault);
          setModels(ms => ms.map(m => m.id === id ? { ...m, terms, preset: p } : m));
        };

        const toggleTermFor = (id, t) => {
          const m = models.find(x => x.id === id);
          if (!m) return;
          const has = m.terms.includes(t);
          // Si on ajoute : vérifier contrainte
          if (!has && m.terms.length >= maxTerms) return;
          const terms = has ? m.terms.filter(x => x !== t) : [...m.terms, t];
          setModels(ms => ms.map(x => x.id === id ? { ...x, terms, preset: "custom" } : x));
        };

        const resetModelTo = (id) => setModels(ms => ms.map(m => m.id === id ? { ...m, terms: [...modelDefault], preset: "default" } : m));

        const modelColors = [
          { border: "border-indigo-500", bg: "bg-indigo-50 dark:bg-indigo-900/20", text: "text-indigo-700 dark:text-indigo-300", tab: "bg-indigo-600", dot: "bg-indigo-500" },
          { border: "border-emerald-500", bg: "bg-emerald-50 dark:bg-emerald-900/20", text: "text-emerald-700 dark:text-emerald-300", tab: "bg-emerald-600", dot: "bg-emerald-500" },
          { border: "border-amber-500", bg: "bg-amber-50 dark:bg-amber-900/20", text: "text-amber-700 dark:text-amber-300", tab: "bg-amber-500", dot: "bg-amber-500" },
        ];

        return (
          <>
            {/* Dialog cubique impossible */}
            <Dialog open={showCubicDialog} onClose={setShowCubicDialog} className="relative z-50">
              <DialogBackdrop transition className="fixed inset-0 bg-gray-900/50 transition-opacity data-closed:opacity-0" />
              <div className="fixed inset-0 z-10 flex items-center justify-center p-4">
                <DialogPanel transition className="w-full max-w-sm rounded-xl bg-white dark:bg-gray-900 p-6 shadow-xl text-center transition-all data-closed:opacity-0 data-closed:scale-95">
                  <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
                    <ExclamationTriangleIcon className="size-6 text-red-600 dark:text-red-400" />
                  </div>
                  <DialogTitle className="text-base font-semibold text-gray-900 dark:text-white mb-2">Modèle impossible</DialogTitle>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Le modèle cubique (ordre 3) nécessite au moins 3 facteurs.</p>
                  <button onClick={() => setShowCubicDialog(false)} className="w-full rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-500 transition-colors">Fermer</button>
                </DialogPanel>
              </div>
            </Dialog>

            {/* En-tête : onglets modèles + bouton ajouter */}
            <div className="flex items-center gap-2 mb-4 flex-wrap">
              {models.map((m, mi) => {
                const col = modelColors[mi % modelColors.length];
                const isActive = m.id === activeModelId;
                return (
                  <button key={m.id} onClick={() => setActiveModelId(m.id)}
                    className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-all ${isActive ? `${col.border} ${col.bg} ${col.text}` : "border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-600"}`}>
                    <span className={`size-2 rounded-full ${col.dot}`} />
                    {m.name}
                    <span className="text-[11px] opacity-60">({m.terms.length + 1} termes)</span>
                  </button>
                );
              })}
              {models.length < 3 && (
                <button onClick={addModel}
                  className="flex items-center gap-1.5 rounded-lg border border-dashed border-gray-300 dark:border-gray-600 px-3 py-2 text-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:border-gray-400 transition-colors">
                  <PlusIcon className="size-4" /> Ajouter un modèle
                </button>
              )}
            </div>

            {/* Carte du modèle actif */}
            {activeModel && (() => {
              const mi = models.findIndex(m => m.id === activeModelId);
              const col = modelColors[mi % modelColors.length];
              const isDefault = JSON.stringify([...activeModel.terms].sort()) === JSON.stringify([...modelDefault].sort());
              const atLimit = activeModel.terms.length >= maxTerms;

              return (
                <div className={`bg-white dark:bg-gray-900 ${cardCls} ${col.border} mb-4`}>
                  {/* Header modèle */}
                  <div className="flex items-center justify-between mb-4 gap-3">
                    <input value={activeModel.name} onChange={e => renameModel(activeModel.id, e.target.value)}
                      className="text-sm font-semibold bg-transparent border-b border-transparent hover:border-gray-300 dark:hover:border-gray-600 focus:outline-none focus:border-indigo-400 text-gray-900 dark:text-white w-40 transition-colors" />
                    <div className="flex items-center gap-2">
                      {!isDefault && (
                        <button onClick={() => resetModelTo(activeModel.id)}
                          className="flex items-center gap-1 rounded-md border border-gray-200 dark:border-gray-700 px-2 py-1 text-xs text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                          <ArrowPathIcon className="size-3" /> Défaut
                        </button>
                      )}
                      <button onClick={() => deleteModel(activeModel.id)} disabled={models.length <= 1}
                        className="p-1.5 rounded-md text-red-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        title={models.length <= 1 ? "Au moins un modèle requis" : "Supprimer ce modèle"}>
                        <TrashIcon className="size-4" />
                      </button>
                    </div>
                  </div>

                  {/* Presets */}
                  <div className="flex flex-wrap items-center gap-2 mb-4">
                    <HelpButton topic="modele" size="xs" />
                    {[
                      { id: "linear", label: "Linéaire" },
                      { id: "synergie", label: "Synergie" },
                      { id: "quadratic", label: "Quadratique" },
                      { id: "cubic", label: "Cubique" },
                    ].map(p => (
                      <button key={p.id} onClick={() => applyPresetTo(activeModel.id, p.id)}
                        className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                          activeModel.preset === p.id
                            ? `${col.tab} border-transparent text-white`
                            : "border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800"
                        }`}>
                        {p.label}
                      </button>
                    ))}
                  </div>

                  {/* Contrainte */}
                  {atLimit && (
                    <div className="flex items-center gap-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg px-3 py-2 mb-3">
                      <ExclamationTriangleIcon className="size-4 text-amber-500 shrink-0" />
                      <span className="text-xs text-amber-700 dark:text-amber-300">
                        Maximum atteint : {nRuns} essais → max {maxTerms} termes + constante.
                      </span>
                    </div>
                  )}

                  <div className="h-px bg-gray-100 dark:bg-gray-800 mb-3" />

                  {/* Constante */}
                  <div className="mb-3">
                    <span className="inline-flex items-center rounded-full bg-purple-100 dark:bg-purple-900/30 border border-purple-200 dark:border-purple-700 px-3 py-1 text-xs font-mono font-semibold text-purple-700 dark:text-purple-300 mr-2">α₀</span>
                    <span className="text-xs text-gray-400">constante — toujours incluse</span>
                  </div>

                  {/* Termes par groupe */}
                  {orderedKeys.map(order => (
                    <div key={order} className="mb-3">
                      <p className="text-xs text-gray-400 dark:text-gray-500 mb-2">{orderLabels[order]}</p>
                      <div className="flex flex-wrap gap-1.5">
                        {byOrder[order].map(t => {
                          const isOn = activeModel.terms.includes(t);
                          const wouldExceed = !isOn && atLimit;
                          return (
                            <button key={t} onClick={() => !wouldExceed && toggleTermFor(activeModel.id, t)}
                              title={wouldExceed ? "Limite atteinte" : modelDefault.includes(t) ? "Dans le modèle par défaut" : ""}
                              className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-mono font-medium transition-all ${
                                isOn
                                  ? `bg-emerald-50 dark:bg-emerald-900/30 border-emerald-300 dark:border-emerald-600 text-emerald-700 dark:text-emerald-300`
                                  : wouldExceed
                                    ? "bg-gray-50 dark:bg-gray-800 border-gray-100 dark:border-gray-800 text-gray-300 dark:text-gray-700 cursor-not-allowed"
                                    : "bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-400 dark:text-gray-500 opacity-50 line-through hover:opacity-70"
                              }`}>
                              {formatTermDisplay(t, factors)}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}

                  <div className="h-px bg-gray-100 dark:bg-gray-800 mt-4 mb-3" />
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs text-gray-400">Termes actifs :</span>
                    <strong className="text-sm text-gray-700 dark:text-gray-200">{activeModel.terms.length + 1}</strong>
                    <span className="text-xs text-gray-400">/ {nRuns} essais</span>
                    {!isDefault
                      ? <span className="rounded-full bg-amber-100 dark:bg-amber-900/30 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:text-amber-300">Modifié</span>
                      : <span className="rounded-full bg-emerald-100 dark:bg-emerald-900/30 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-300">Défaut JSON</span>
                    }
                  </div>
                </div>
              );
            })()}

            {/* Équations de tous les modèles */}
            <div className="grid gap-3 mb-4" style={{ gridTemplateColumns: `repeat(${models.length}, minmax(0, 1fr))` }}>
              {models.map((m, mi) => {
                const col = modelColors[mi % modelColors.length];
                return (
                  <div key={m.id} className={`bg-gray-50 dark:bg-gray-800/50 border ${col.border} rounded-xl p-4`}>
                    <p className={`text-[11px] font-semibold uppercase tracking-widest mb-2 ${col.text}`}>{m.name}</p>
                    <div className="font-mono text-xs text-gray-700 dark:text-gray-200 leading-loose">
                      <span>Ŷ = α₀</span>
                      {m.terms.map(t => (
                        <span key={t}> + α<sub>{termSubScript(t, factors)}</sub>·<span dangerouslySetInnerHTML={{ __html: formatTermHTML(t, factors) }} /></span>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-between mt-4">
              <button onClick={() => goTo(2)}
                className="rounded-lg border border-gray-200 dark:border-gray-700 px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                ← {t("common.back")}
              </button>
              <div className="flex items-center gap-3">
                {editMode && (
                  <button onClick={exportJSON}
                    className="flex items-center gap-1.5 rounded-md border border-indigo-300 dark:border-indigo-700 bg-indigo-50 dark:bg-indigo-900/20 px-3 py-1.5 text-xs font-medium text-indigo-600 dark:text-indigo-300 hover:bg-indigo-100 transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="size-3.5">
                      <path fillRule="evenodd" d="M10 3a1 1 0 01.707.293l3 3a1 1 0 01-1.414 1.414L11 6.414V12a1 1 0 11-2 0V6.414L7.707 7.707a1 1 0 01-1.414-1.414l3-3A1 1 0 0110 3zm-3.707 9.293a1 1 0 011.414 1.414L10 16.414l2.293-2.293a1 1 0 011.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                    Exporter JSON
                  </button>
                )}
                <button onClick={() => setPart(4)} className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 transition-colors">
                  Continuer → ({models.length} modèle{models.length > 1 ? "s" : ""})
                </button>
              </div>
            </div>
          </>
        );
      })()}

      {/* ══════════════════════════════════════════════════════ PARTIE 4 */}
      {part === 4 && (() => {
        const contFactors = factors.filter(f => f.continuous);
        const has3D = contFactors.length >= 2;
        // Mode compact : raccourcis pour les classes (isCompact vient du composant parent)
        const TABS = [
          { id: "effets_calcul", label: t("doe.effects") },
          { id: "coefficients", label: "Coefficients" },
          { id: "residus", label: t("doe.residuals") },
          { id: "anova", label: t("doe.anova") },
          { id: "effets", label: `${t("doe.effects")} (${t("doe.pareto")})` },
          { id: "isoresponse", label: t("doe.isoresponse") },
          ...(has3D ? [{ id: "iso3d", label: t("doe.surface3d") }] : []),
        ];

        const modelColors = [
          { border: "border-indigo-500", bg: "bg-indigo-50 dark:bg-indigo-900/20", text: "text-indigo-600 dark:text-indigo-300", badge: "bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300", dot: "bg-indigo-500" },
          { border: "border-emerald-500", bg: "bg-emerald-50 dark:bg-emerald-900/20", text: "text-emerald-600 dark:text-emerald-300", badge: "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300", dot: "bg-emerald-500" },
          { border: "border-amber-500", bg: "bg-amber-50 dark:bg-amber-900/20", text: "text-amber-600 dark:text-amber-300", badge: "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300", dot: "bg-amber-500" },
        ];

        const activeResp = responses[part4Response] || responses[0];
        const yValues = (matrix || []).map(row => {
          const v = row.responses[activeResp.id];
          return v === "" || v === null || v === undefined ? null : +v;
        });
        // Tous les points valides (réponse renseignée), avant exclusion
        const allValidRows = (matrix || []).map((row, i) => ({ row, i, y: yValues[i] })).filter(x => x.y !== null);
        // Points valides ET non exclus → utilisés pour le calcul
        const activeRows = allValidRows.filter(x => !excludedPoints.has(x.i));
        const validRows = activeRows.map(x => x.row);
        const validY = activeRows.map(x => x.y);

        // Toggle exclusion d'un point (avec contrainte min)
        const toggleExclude = (globalIdx, modelTermsCount) => {
          const minRequired = modelTermsCount + 2; // p+1 degrés de liberté résidus
          setExcludedPoints(prev => {
            const next = new Set(prev);
            if (next.has(globalIdx)) {
              next.delete(globalIdx);
            } else {
              // Vérifier que le nombre de points restants sera suffisant pour le modèle le plus grand
              const maxTerms = Math.max(...models.map(m => m.terms.length));
              const wouldRemain = allValidRows.length - next.size - 1;
              if (wouldRemain < maxTerms + 2) return prev; // refus
              next.add(globalIdx);
            }
            return next;
          });
        };

        // Calcul OLS pour chaque modèle (sur points actifs)
        const fits = models.map(m => {
          if (validRows.length < m.terms.length + 2) return null;
          return fitOLS(m.terms, validRows, validY, factors);
        });

        // Noms des termes (constante + termes du modèle)
        const termLabel = (t) => formatTermDisplay(t, factors);
        const allTermLabels = (terms) => ["α₀ (constante)", ...terms.map(t => `α${termSubScript(t, factors)} · ${termLabel(t)}`)];

        return (
          <>
            {/* Sélecteur réponse si plusieurs */}
            {responses.length > 1 && (
              <div className="flex items-center gap-3 mb-4">
                <span className="text-xs text-gray-500 dark:text-gray-400">Réponse :</span>
                <div className="flex gap-2">
                  {responses.map((r, i) => (
                    <button key={r.id} onClick={() => setPart4Response(i)}
                      className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${i === part4Response ? "bg-indigo-600 border-indigo-600 text-white" : "border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"}`}>
                      {r.id} — {r.name}{r.unit ? ` (${r.unit})` : ""}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Tabs */}
            <div className="mb-4">
              <div className="grid grid-cols-1 sm:hidden">
                <select value={part4Tab} onChange={e => setPart4Tab(e.target.value)}
                  className="col-start-1 row-start-1 w-full appearance-none rounded-md bg-white py-2 pr-8 pl-3 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 dark:bg-gray-800/50 dark:text-gray-100 dark:outline-white/10 dark:focus:outline-indigo-500">
                  {TABS.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                </select>
                <ChevronDownIcon aria-hidden="true" className="pointer-events-none col-start-1 row-start-1 mr-2 size-5 self-center justify-self-end fill-gray-500 dark:fill-gray-400" />
              </div>
              <div className="hidden sm:block">
                <nav aria-label="Tabs" className="flex items-center space-x-1">
                  {TABS.map(t => (
                    <button key={t.id} onClick={() => setPart4Tab(t.id)}
                      className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                        t.id === part4Tab
                          ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300"
                          : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800"
                      }`}>
                      {t.label}
                    </button>
                  ))}

                </nav>
              </div>
            </div>

            {/* ── TAB : CALCUL DES EFFETS ── */}
            {part4Tab === "effets_calcul" && (
              <div className={cardSpace}>
                {/* ── Tabs par modèle ── */}
                {models.length > 1 && (
                  <div className="flex gap-1 flex-wrap mb-3">
                    {models.map((m, mi) => {
                      const col = modelColors[mi % modelColors.length];
                      return (
                        <button key={m.id} onClick={() => setActiveModelId(m.id)}
                          className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-all ${
                            m.id === activeModelId
                              ? `${col.border} ${col.bg} ${col.text}`
                              : "border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-gray-300"
                          }`}>
                          <span className={`size-2 rounded-full ${col.dot}`} />
                          {m.name}
                        </button>
                      );
                    })}
                  </div>
                )}
                {models.map((m, mi) => {
                  if (m.id !== activeModelId) return null;
                  const fit = fits[mi];
                  const col = modelColors[mi % modelColors.length];
                  return (
                    <div key={m.id} className={`bg-white dark:bg-gray-900 ${cardCls} ${col.border}`}>
                      <div className="flex items-center gap-2 mb-4">
                        <span className={`size-2.5 rounded-full ${col.dot}`} />
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                          {m.name} — Calcul des effets et interactions
                        </h3>
                        <HelpButton topic="effets_calcul" size="xs" className="ml-auto" />
                      </div>
                      <EffetsPanel
                        model={m}
                        fit={fit}
                        matrix={matrix}
                        factors={factors}
                        responses={responses}
                        activeResp={activeResp}
                        col={col}
                        compact={isCompact}
                      />
                    </div>
                  );
                })}
              </div>
            )}

            {/* ── TAB : COEFFICIENTS ── */}
            {part4Tab === "coefficients" && (
              <div className={cardSpace}>
                <div className="flex items-center gap-2 mb-3">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{t("doe.effects")}</h3>
                  <HelpButton topic="coefficients" size="xs" />
                </div>

                {/* ── Tabs par modèle ── */}
                {models.length > 1 && (
                  <div className="flex gap-1 flex-wrap mb-3">
                    {models.map((m, mi) => {
                      const col = modelColors[mi % modelColors.length];
                      return (
                        <button key={m.id} onClick={() => setActiveModelId(m.id)}
                          className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-all ${
                            m.id === activeModelId
                              ? `${col.border} ${col.bg} ${col.text}`
                              : "border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-gray-300"
                          }`}>
                          <span className={`size-2 rounded-full ${col.dot}`} />
                          {m.name}
                        </button>
                      );
                    })}
                  </div>
                )}
                {models.map((m, mi) => {
                  if (m.id !== activeModelId) return null;
                  const fit = fits[mi];
                  const col = modelColors[mi % modelColors.length];
                  const labels = allTermLabels(m.terms);
                  return (
                    <div key={m.id} className={`bg-white dark:bg-gray-900 ${cardCls} ${col.border}`}>
                      <div className="flex items-center gap-2 mb-4">
                        <span className={`size-2.5 rounded-full ${col.dot}`} />
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{m.name}</h3>
                        {fit && (
                          <span className={`ml-auto rounded-full px-2 py-0.5 text-[11px] font-semibold ${col.badge}`}>
                            R² = {fmt(fit.R2, 4)} · R²adj = {fmt(fit.R2adj, 4)}
                          </span>
                        )}
                      </div>
                      {!fit ? (
                        <p className="text-sm text-red-500">Impossible de calculer — vérifiez que toutes les réponses sont renseignées et que le nombre d'essais est suffisant.</p>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="border-b border-gray-100 dark:border-gray-800">
                                <th className="text-left text-[11px] font-medium text-gray-400 pb-2 px-2">Terme</th>
                                <th className="text-right text-[11px] font-medium text-gray-400 pb-2 px-2">Estimation</th>
                                <th className="text-right text-[11px] font-medium text-gray-400 pb-2 px-2">Écart-type</th>
                                <th className="text-right text-[11px] font-medium text-gray-400 pb-2 px-2">t ratio</th>
                                <th className="text-right text-[11px] font-medium text-gray-400 pb-2 px-2">Prob &gt; |t|</th>
                                <th className="text-center text-[11px] font-medium text-gray-400 pb-2 px-2">Sig.</th>
                              </tr>
                            </thead>
                            <tbody>
                              {fit.coeffs.map((c, ci) => {
                                const p = fit.pCoeffs[ci];
                                const sig = sigStars(p);
                                const isSignif = p !== null && p < 0.05;
                                return (
                                  <tr key={ci} className={`border-b border-gray-50 dark:border-gray-800/50 last:border-0 ${isSignif ? "bg-indigo-50/30 dark:bg-indigo-900/10" : ""}`}>
                                    <td className="px-2 py-1.5 font-mono text-gray-700 dark:text-gray-200">{labels[ci]}</td>
                                    <td className="px-2 py-1.5 text-right font-mono font-semibold text-gray-900 dark:text-white">{fmt(c)}</td>
                                    <td className="px-2 py-1.5 text-right font-mono text-gray-500">{fmt(fit.seCoeffs[ci])}</td>
                                    <td className="px-2 py-1.5 text-right font-mono text-gray-500">{fmt(fit.tStats[ci], 3)}</td>
                                    <td className={`px-2 py-1.5 text-right font-mono ${isSignif ? "text-indigo-600 dark:text-indigo-300 font-semibold" : "text-gray-400"}`}>{fmtP(p)}</td>
                                    <td className="px-2 py-1.5 text-center text-amber-500 font-bold">{sig}</td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                          <p className="mt-2 text-[10px] text-gray-400">Significativité : *** p&lt;0.001 · ** p&lt;0.01 · * p&lt;0.05 · · p&lt;0.1</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* ── TAB : RÉSIDUS ── */}
                        {part4Tab === "residus" && (
              <div className={cardSpace}>
                <div className="flex items-center gap-2 mb-3">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{t("doe.residuals")}</h3>
                  <HelpButton topic="residus" size="xs" />
                </div>
                {/* Info points exclus */}
                {excludedPoints.size > 0 && (
                  <div className="flex items-center justify-between bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg px-3 py-2">
                    <span className="text-xs text-amber-700 dark:text-amber-300">
                      {excludedPoints.size} point(s) exclu(s) du calcul.
                    </span>
                    <button onClick={() => setExcludedPoints(new Set())}
                      className="text-xs text-amber-600 dark:text-amber-400 hover:underline">
                      {t("doe.residual.exclude")} (tous)
                    </button>
                  </div>
                )}

                {/* ── Tabs par modèle ── */}
                {models.length > 1 && (
                  <div className="flex gap-1 flex-wrap mb-2">
                    {models.map((m, mi) => {
                      const col = modelColors[mi % modelColors.length];
                      return (
                        <button key={m.id} onClick={() => setActiveModelId(m.id)}
                          className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-all ${
                            m.id === activeModelId
                              ? `${col.border} ${col.bg} ${col.text}`
                              : "border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-gray-300"
                          }`}>
                          <span className={`size-2 rounded-full ${col.dot}`} />
                          {m.name}
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Contenu pour le modèle actif */}
                {(() => {
                  const mi = models.findIndex(m => m.id === activeModelId);
                  const m = models[mi];
                  const fit = fits[mi];
                  const col = modelColors[mi % modelColors.length];
                  if (!fit) return (
                    <div className={`bg-white dark:bg-gray-900 ${cardCls} ${col.border}`}>
                      <p className="text-sm text-red-500">Calcul impossible — pas assez de points actifs ({validRows.length}) pour {m.terms.length + 1} paramètres.</p>
                    </div>
                  );
                  const minRequired = Math.max(...models.map(x => x.terms.length)) + 2;
                  return (
                    <div className={`bg-white dark:bg-gray-900 ${cardCls} ${col.border}`}>
                      <div className="flex items-center gap-2 mb-4">
                        <span className={`size-2.5 rounded-full ${col.dot}`} />
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{m.name}</h3>
                        <span className="ml-auto text-xs text-gray-400">{activeRows.length} points actifs</span>
                      </div>

                      {/* Graphe résidus vs Ŷ agrandi */}
                      <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-3">Résidus vs Ŷ — cliquer sur un point pour le détail</p>
                      <ResidualPlot
                        yHat={fit.yHat}
                        residuals={fit.residuals}
                        MSE={fit.MSE}
                        globalIndices={activeRows.map(x => x.i)}
                        allValidRows={activeRows}
                        onExclude={(gIdx) => toggleExclude(gIdx, Math.max(...models.map(x => x.terms.length)))}
                        onReinclude={(gIdx) => toggleExclude(gIdx, Math.max(...models.map(x => x.terms.length)))}
                        excludedGlobalIndices={excludedPoints}
                        minRequired={minRequired}
                        color={col.dot}
                      />

                      {/* Q-Q Plot */}
                      {fit.residuals.length >= 3 && (
                        <div className="mt-5 border-t border-gray-100 dark:border-gray-800 pt-4">
                          <div className="flex items-center gap-2 mb-3">
                            <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">Q-Q Plot — Normalité des résidus</p>
                            <HelpButton topic="qqplot" size="xs" />
                          </div>
                          <div className="flex flex-col sm:flex-row gap-4 items-start">
                            <div className="shrink-0"><QQPlotSVG residuals={fit.residuals} MSE={fit.MSE} col={col} /></div>
                            <div className="flex-1 space-y-2">
                              {(() => {
                                const s = fit.MSE > 0 ? Math.sqrt(fit.MSE) : 1;
                                const normed = fit.residuals.map(r => r / s).sort((a,b) => a - b);
                                const n = normed.length;
                                const theoretical = normed.map((_, i) => normalQuantile((i + 1 - 0.375) / (n + 0.25)));
                                const maxDev = Math.max(...normed.map((v, i) => Math.abs(v - theoretical[i])));
                                const nAnom = normed.filter((v, i) => Math.abs(v - theoretical[i]) > 0.65).length;
                                const isNormal = maxDev < 0.65;
                                return (
                                  <>
                                    <div className={`rounded-lg px-3 py-2 text-xs ${isNormal ? "bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-700" : "bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700"}`}>
                                      <p className={`font-semibold mb-1 ${isNormal ? "text-emerald-700 dark:text-emerald-300" : "text-amber-700 dark:text-amber-300"}`}>
                                        {isNormal ? "✓ Normalité probable" : "△ Normalité questionnable"}
                                      </p>
                                      <p className={isNormal ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"}>
                                        {isNormal
                                          ? "Les points s'alignent sur la droite rouge — hypothèse de normalité respectée."
                                          : `${nAnom} point(s) s'écarte(nt) de la droite. Distribution peut-être non normale.`}
                                      </p>
                                    </div>
                                    <div className="rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700 px-3 py-2 text-xs text-gray-500 dark:text-gray-400 space-y-1">
                                      <p className="font-medium text-gray-600 dark:text-gray-300">Comment lire :</p>
                                      <p>• Points sur la droite rouge → résidus normaux ✓</p>
                                      <p>• Forme en S → queues épaisses · Courbe → asymétrie</p>
                                      <p className="text-[10px] text-gray-400 italic">Avec peu d'essais (&lt; 15), indicatif seulement.</p>
                                    </div>
                                  </>
                                );
                              })()}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            )}

            {part4Tab === "anova" && (
              <div className={cardSpace}>
                <div className="flex items-center gap-2 mb-3">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{t("doe.anova")}</h3>
                  <HelpButton topic="anova" size="xs" />
                </div>

                {/* ── Tabs par modèle ── */}
                {models.length > 1 && (
                  <div className="flex gap-1 flex-wrap mb-3">
                    {models.map((m, mi) => {
                      const col = modelColors[mi % modelColors.length];
                      return (
                        <button key={m.id} onClick={() => setActiveModelId(m.id)}
                          className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-all ${
                            m.id === activeModelId
                              ? `${col.border} ${col.bg} ${col.text}`
                              : "border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-gray-300"
                          }`}>
                          <span className={`size-2 rounded-full ${col.dot}`} />
                          {m.name}
                        </button>
                      );
                    })}
                  </div>
                )}
                {models.map((m, mi) => {
                  if (m.id !== activeModelId) return null;
                  const fit = fits[mi];
                  const col = modelColors[mi % modelColors.length];
                  if (!fit) return <div key={m.id} className={`bg-white dark:bg-gray-900 ${cardCls} ${col.border}`}><p className="text-sm text-red-500">Calcul impossible.</p></div>;
                  const modelOK = fit.pF !== null && fit.pF < 0.05;
                  const R2ok = fit.R2adj > 0.8;
                  const verdict = modelOK && R2ok ? "acceptable" : !modelOK ? "à rejeter" : "insuffisant";
                  const verdictCls = verdict === "acceptable" ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300" : verdict === "à rejeter" ? "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300" : "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300";
                  return (
                    <div key={m.id} className={`bg-white dark:bg-gray-900 ${cardCls} ${col.border}`}>
                      <div className="flex items-center gap-2 mb-4">
                        <span className={`size-2.5 rounded-full ${col.dot}`} />
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{m.name}</h3>
                        <span className={`ml-auto rounded-full px-3 py-1 text-xs font-semibold ${verdictCls}`}>
                          Modèle {verdict}
                        </span>
                      </div>
                      {/* Indicateurs */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                        {[
                          { label: "R²", value: fmt(fit.R2, 4) },
                          { label: "R² ajusté", value: fmt(fit.R2adj, 4) },
                          { label: "F", value: fmt(fit.Fstat, 3) },
                          { label: "Prob &gt; F", value: fmtP(fit.pF) },
                        ].map(stat => (
                          <div key={stat.label} className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 text-center">
                            <p className="text-[11px] text-gray-400 mb-1">{stat.label}</p>
                            <p className="text-sm font-semibold font-mono text-gray-900 dark:text-white">{stat.value}</p>
                          </div>
                        ))}
                      </div>
                      {/* Tableau ANOVA */}
                      <div className="overflow-x-auto mb-4">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="border-b border-gray-100 dark:border-gray-800">
                              {[
                                { label: "Source", help: null },
                                { label: t("doe.ss"), help: "Somme des Carrés — mesure la dispersion de chaque source" },
                                { label: t("doe.df"), help: "Degrés de Liberté — nombre de valeurs indépendantes" },
                                { label: t("doe.ms"), help: "Carré Moyen = SC/dl — variance estimée" },
                                { label: t("doe.fstat"), help: "Statistique de Fisher = CM_R/CM_E — grand F = bon modèle" },
                                { label: t("doe.pvalue"), help: "p-valeur : < 0.05 → modèle significatif ✓" },
                              ].map(({ label, help }) => (
                                <th key={label} className="text-left text-[11px] font-medium text-gray-400 pb-2 px-2">
                                  <span className="flex items-center gap-1">
                                    {label}
                                    {help && (
                                      <span title={help} className="cursor-help text-gray-300 hover:text-indigo-400 transition-colors">
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="size-3">
                                          <path fillRule="evenodd" d="M15 8A7 7 0 1 1 1 8a7 7 0 0 1 14 0ZM9 5a1 1 0 1 1-2 0 1 1 0 0 1 2 0ZM6.75 8a.75.75 0 0 0 0 1.5h.75v1.75a.75.75 0 0 0 1.5 0v-2.5A.75.75 0 0 0 8.25 8h-1.5Z" clipRule="evenodd" />
                                        </svg>
                                      </span>
                                    )}
                                  </span>
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {[
                              { label: "Régression", sc: fit.SSR, df: fit.dfR, cm: fit.MSR, f: fit.Fstat, p: fit.pF },
                              { label: "Résidus", sc: fit.SSE, df: fit.dfE, cm: fit.MSE, f: null, p: null },
                              { label: "Total", sc: fit.SST, df: fit.n - 1, cm: null, f: null, p: null },
                            ].map(row => (
                              <tr key={row.label} className="border-b border-gray-50 dark:border-gray-800/50 last:border-0">
                                <td className="px-2 py-1.5 font-medium text-gray-700 dark:text-gray-200">{row.label}</td>
                                <td className="px-2 py-1.5 text-right font-mono text-gray-600 dark:text-gray-300">{fmt(row.sc, 4)}</td>
                                <td className="px-2 py-1.5 text-right font-mono text-gray-600 dark:text-gray-300">{row.df}</td>
                                <td className="px-2 py-1.5 text-right font-mono text-gray-600 dark:text-gray-300">{row.cm !== null ? fmt(row.cm, 4) : "—"}</td>
                                <td className="px-2 py-1.5 text-right font-mono text-gray-600 dark:text-gray-300">{row.f !== null ? fmt(row.f, 3) : "—"}</td>
                                <td className={`px-2 py-1.5 text-right font-mono ${row.p !== null && row.p < 0.05 ? "text-indigo-600 dark:text-indigo-300 font-semibold" : "text-gray-400"}`}>{row.p !== null ? fmtP(row.p) : "—"}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      {/* Verdict détaillé */}
                      <div className={`rounded-lg p-3 ${verdict === "acceptable" ? "bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-700" : verdict === "à rejeter" ? "bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700" : "bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700"}`}>
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-xs font-medium text-gray-700 dark:text-gray-200">Analyse de validation</p>
                          <button
                            type="button"
                            onClick={() => setValidationHelpFit({ fit, modelName: m.name })}
                            className="inline-flex items-center gap-1 text-[10px] text-indigo-500 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 transition-colors"
                            title="Aide : comprendre ces calculs avec vos valeurs"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="size-3.5">
                              <path fillRule="evenodd" d="M15 8A7 7 0 1 1 1 8a7 7 0 0 1 14 0ZM9 5a1 1 0 1 1-2 0 1 1 0 0 1 2 0ZM6.75 8a.75.75 0 0 0 0 1.5h.75v1.75a.75.75 0 0 0 1.5 0v-2.5A.75.75 0 0 0 8.25 8h-1.5Z" clipRule="evenodd"/>
                            </svg>
                            Comment sont calculés ces indicateurs ?
                          </button>
                        </div>
                        <ul className="text-xs space-y-1">
                          <li className={`flex items-start gap-1.5 ${R2ok ? "text-emerald-700 dark:text-emerald-300" : "text-amber-700 dark:text-amber-300"}`}>
                            <span>{R2ok ? "✓" : "△"}</span>
                            <span>R² ajusté = {fmt(fit.R2adj, 4)} {R2ok ? "(bon ajustement ≥ 0.8)" : "(ajustement insuffisant < 0.8)"}</span>
                          </li>
                          <li className={`flex items-start gap-1.5 ${modelOK ? "text-emerald-700 dark:text-emerald-300" : "text-red-700 dark:text-red-300"}`}>
                            <span>{modelOK ? "✓" : "✗"}</span>
                            <span>ANOVA modèle : Prob &gt; F = {fmtP(fit.pF)} {modelOK ? "(modèle significatif)" : "(modèle non significatif — à rejeter)"}</span>
                          </li>
                          <li className="flex items-start gap-1.5 text-gray-500">
                            <span>·</span>
                            <span>Degrés de liberté résidus : {fit.dfE} {fit.dfE < 2 ? "⚠ trop peu pour une analyse fiable" : ""}</span>
                          </li>
                        </ul>

                        {verdict !== "acceptable" && (
                          <div className="mt-2 pt-2 border-t border-red-200 dark:border-red-800/50 flex items-center justify-between">
                            <span className="text-[10px] text-red-600 dark:text-red-400 font-medium">
                              Ce modèle ne peut pas être utilisé en l'état.
                            </span>
                            <button
                              type="button"
                              onClick={() => setImprovementHelpFit({ fit, verdict, modelName: m.name, modelTerms: m.terms })}
                              className="inline-flex items-center gap-1.5 text-[10px] font-medium text-white bg-red-500 hover:bg-red-600 dark:bg-red-700 dark:hover:bg-red-600 px-2.5 py-1 rounded-md transition-colors"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="size-3">
                                <path d="M8 1a.75.75 0 0 1 .75.75V6h4.5a.75.75 0 0 1 0 1.5h-4.5v4.25a.75.75 0 0 1-1.5 0V7.5H2.75a.75.75 0 0 1 0-1.5h4.5V1.75A.75.75 0 0 1 8 1Z"/>
                              </svg>
                              Comment améliorer ce modèle ?
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Prédiction interactive */}
                      <PredictionPanel model={m} fit={fit} factors={factors} col={col} />
                    </div>
                  );
                })}
              </div>
            )}

            {/* ── TAB : EFFETS (PARETO) ── */}
            {part4Tab === "effets" && (
              <div className={cardSpace}>
                <div className="flex items-center gap-2 mb-4">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{t("doe.pareto")}</h3>
                  <HelpButton topic="pareto" size="xs" />
                </div>

                {/* ── Tabs par modèle ── */}
                {models.length > 1 && (
                  <div className="flex gap-1 flex-wrap mb-3">
                    {models.map((m, mi) => {
                      const col = modelColors[mi % modelColors.length];
                      return (
                        <button key={m.id} onClick={() => setActiveModelId(m.id)}
                          className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-all ${
                            m.id === activeModelId
                              ? `${col.border} ${col.bg} ${col.text}`
                              : "border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-gray-300"
                          }`}>
                          <span className={`size-2 rounded-full ${col.dot}`} />
                          {m.name}
                        </button>
                      );
                    })}
                  </div>
                )}
                {models.map((m, mi) => {
                  if (m.id !== activeModelId) return null;
                  const fit = fits[mi];
                  const col = modelColors[mi % modelColors.length];
                  if (!fit) return <div key={m.id} className={`bg-white dark:bg-gray-900 ${cardCls} ${col.border}`}><p className="text-sm text-red-500">Calcul impossible.</p></div>;
                  // Effets = |coefficients| sauf constante, triés
                  const effects = m.terms.map((t, i) => ({
                    term: t,
                    label: termLabel(t),
                    coeff: fit.coeffs[i + 1],
                    absCoeff: Math.abs(fit.coeffs[i + 1]),
                    p: fit.pCoeffs[i + 1],
                  })).sort((a, b) => b.absCoeff - a.absCoeff);
                  const maxAbs = effects[0]?.absCoeff || 1;
                  return (
                    <div key={m.id} className={`bg-white dark:bg-gray-900 ${cardCls} ${col.border}`}>
                      <div className="flex items-center gap-2 mb-4">
                        <span className={`size-2.5 rounded-full ${col.dot}`} />
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{m.name} — {t("doe.pareto")}</h3>
                      </div>
                      {/* ── Diagramme de Pareto ── */}
                      {(() => {
                        const seMean = fit.seCoeffs?.slice(1).length > 0
                          ? fit.seCoeffs.slice(1).reduce((s,v)=>s+v,0) / fit.seCoeffs.slice(1).length
                          : null;
                        const tCrit = fit.dfE >= 1 ? tCritical(fit.dfE) : null;
                        const threshold = tCrit && seMean ? tCrit * seMean : null;
                        const thresholdPct = threshold && maxAbs > 0 ? (threshold / maxAbs) * 100 : null;
                        const thresholdVisible = thresholdPct !== null && thresholdPct <= 100;

                        const allNS = effects.every(ef => ef.p === null || ef.p >= 0.05);

                        return (
                          <div className="space-y-1">
                            {/* Bandeau "tout gris" */}
                            {allNS && (
                              <div className="flex items-start gap-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-300 dark:border-amber-700 px-4 py-3 mb-3">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="size-5 text-amber-500 shrink-0 mt-0.5">
                                  <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd"/>
                                </svg>
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-semibold text-amber-800 dark:text-amber-300 mb-1">
                                    Aucun terme significatif — toutes les barres sont grises
                                  </p>
                                  <p className="text-[11px] text-amber-700 dark:text-amber-400 leading-relaxed">
                                    {fit.dfE < 2
                                      ? `Le modèle a trop de termes (dfE = ${fit.dfE}). Le test de Student ne peut pas détecter de significativité. → Réduire le nombre de termes dans la Partie 3.`
                                      : `Aucun facteur ni interaction n'a d'effet statistiquement significatif sur la réponse (tous p ≥ 0.05). Le phénomène mesuré n'est peut-être pas bien capturé par les facteurs choisis, ou la variabilité expérimentale est trop grande.`}
                                  </p>
                                  <div className="flex flex-wrap gap-2 mt-2">
                                    {fit.dfE < 2 && (
                                      <span className="inline-flex items-center gap-1 text-[10px] bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 px-2 py-0.5 rounded-full">
                                        → Partie 3 : choisir Linéaire ou Synergie
                                      </span>
                                    )}
                                    {fit.dfE >= 2 && (
                                      <>
                                        <span className="inline-flex items-center gap-1 text-[10px] bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 px-2 py-0.5 rounded-full">
                                          → Vérifier la saisie des réponses
                                        </span>
                                        <span className="inline-flex items-center gap-1 text-[10px] bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 px-2 py-0.5 rounded-full">
                                          → Vérifier le choix des facteurs
                                        </span>
                                        <span className="inline-flex items-center gap-1 text-[10px] bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 px-2 py-0.5 rounded-full">
                                          → Voir onglet Résidus
                                        </span>
                                      </>
                                    )}
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* Barres */}
                            {effects.map((ef) => {
                              const barPct  = maxAbs > 0 ? (ef.absCoeff / maxAbs) * 100 : 0;
                              const isSignif = ef.p !== null && ef.p < 0.05;
                              const isNS     = !isSignif;
                              const isInteractionTerm = factors.filter(f => ef.term.includes(f.id)).length > 1;
                              const pFmt = ef.p !== null ? (ef.p < 0.001 ? "<0.001" : ef.p.toFixed(3)) : "—";
                              const helpMsg = isInteractionTerm
                                ? `L'interaction ${ef.label} n'est pas significative (p = ${pFmt} ≥ 0.05). L'effet combiné de ces facteurs n'est pas démontrable avec les données actuelles. Elle peut être retirée du modèle.`
                                : `${ef.label} n'est pas significatif (p = ${pFmt} ≥ 0.05). Ce facteur n'a pas d'influence statistiquement démontrable sur la réponse dans les conditions étudiées. Il peut être retiré du modèle pour gagner des degrés de liberté.`;

                              return (
                                <div key={ef.term} className="flex items-center gap-2">
                                  <span className={`text-[11px] font-mono w-20 truncate text-right shrink-0 ${
                                    isSignif ? "text-gray-600 dark:text-gray-300" : "text-gray-400 dark:text-gray-500"
                                  }`}>
                                    {ef.label}
                                  </span>
                                  <div className="flex-1 relative h-5 bg-gray-100 dark:bg-gray-800 rounded overflow-visible">
                                    <div
                                      className={`absolute left-0 top-0 h-full rounded transition-all ${
                                        isSignif
                                          ? (ef.coeff >= 0 ? "bg-indigo-500" : "bg-indigo-400")
                                          : "bg-gray-300 dark:bg-gray-600"
                                      }`}
                                      style={{ width: `${barPct}%` }}
                                    />
                                    {thresholdVisible && (
                                      <div
                                        className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-10"
                                        style={{ left: `${thresholdPct}%` }}
                                        title={`Seuil p=0.05 : |b| = ${threshold.toFixed(3)}`}
                                      />
                                    )}
                                  </div>
                                  <span className={`text-[10px] font-mono w-14 text-right shrink-0 ${
                                    isSignif ? "text-gray-500" : "text-gray-300 dark:text-gray-600"
                                  }`}>
                                    {ef.absCoeff.toFixed(3)}
                                  </span>
                                  {ef.p !== null && (
                                    <span className={`text-[10px] font-mono w-12 text-right shrink-0 ${
                                      isSignif ? "text-indigo-600 dark:text-indigo-300 font-semibold" : "text-gray-400"
                                    }`}>
                                      {pFmt}
                                    </span>
                                  )}
                                  {isNS && (
                                    <button
                                      type="button"
                                      title={helpMsg}
                                      className="shrink-0 size-4 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-gray-500 dark:text-gray-400 hover:bg-amber-100 dark:hover:bg-amber-900/40 hover:text-amber-700 dark:hover:text-amber-300 transition-colors"
                                      onClick={() => setNsTermHelp({ term: ef.term, label: ef.label, p: ef.p, coeff: ef.coeff, isInteraction: isInteractionTerm, dfE: fit.dfE, se: fit.seCoeffs?.[m.terms.indexOf(ef.term)+1] })}
                                    >
                                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="size-3">
                                        <path fillRule="evenodd" d="M15 8A7 7 0 1 1 1 8a7 7 0 0 1 14 0ZM9 5a1 1 0 1 1-2 0 1 1 0 0 1 2 0ZM6.75 8a.75.75 0 0 0 0 1.5h.75v1.75a.75.75 0 0 0 1.5 0v-2.5A.75.75 0 0 0 8.25 8h-1.5Z" clipRule="evenodd"/>
                                      </svg>
                                    </button>
                                  )}
                                  {/* Bouton supprimer ce terme du modèle */}
                                  <button
                                    type="button"
                                    title={`Retirer ${ef.label} du modèle`}
                                    className="shrink-0 size-4 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-400 hover:bg-red-100 dark:hover:bg-red-900/30 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                                    onClick={() => {
                                      const terms = m.terms.filter(t => t !== ef.term);
                                      setModels(ms => ms.map(mx => mx.id === m.id ? { ...mx, terms, preset: "custom" } : mx));
                                    }}
                                  >
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="size-3">
                                      <path d="M3.72 3.72a.75.75 0 0 1 1.06 0L8 6.94l3.22-3.22a.75.75 0 1 1 1.06 1.06L9.06 8l3.22 3.22a.75.75 0 1 1-1.06 1.06L8 9.06l-3.22 3.22a.75.75 0 0 1-1.06-1.06L6.94 8 3.72 4.78a.75.75 0 0 1 0-1.06Z"/>
                                    </svg>
                                  </button>
                                </div>
                              );
                            })}

                            {/* Zone d'ajout de termes au modèle */}
                            {(() => {
                              const nRunsLocal = matrix ? matrix.length : 0;
                              const maxTermsLocal = nRunsLocal - 1;
                              // Proposer uniquement les termes pertinents pour un plan factoriel :
                              // effets principaux (ordre 1) + interactions 2 à 2 (ordre 2, sans quadratiques purs)
                              const allPossible = getAllPossibleTerms(factors).filter(t => {
                                if (isQuadPure(t, factors)) return false; // pas de X²
                                const order = factors.filter(f => t.includes(f.id)).length;
                                return order <= 2; // linéaires + interactions 2à2 seulement
                              });
                              const available = allPossible.filter(t => !m.terms.includes(t));
                              const atLimit = m.terms.length >= maxTermsLocal;
                              if (available.length === 0) return null;
                              return (
                                <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800">
                                  <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-2">
                                    Ajouter un terme au modèle
                                    {atLimit && <span className="ml-2 text-amber-500 normal-case font-normal">(limite atteinte : {nRunsLocal} essais → max {maxTermsLocal} termes)</span>}
                                  </p>
                                  <div className="flex flex-wrap gap-1.5">
                                    {available.map(t => {
                                      const tLabel = termLabel(t);
                                      const disabled = atLimit;
                                      return (
                                        <button
                                          key={t}
                                          type="button"
                                          disabled={disabled}
                                          title={disabled ? "Limite atteinte" : `Ajouter ${tLabel} au modèle`}
                                          onClick={() => {
                                            if (disabled) return;
                                            setModels(ms => ms.map(mx => mx.id === m.id ? { ...mx, terms: [...mx.terms, t], preset: "custom" } : mx));
                                          }}
                                          className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-mono transition-colors ${
                                            disabled
                                              ? "border-gray-100 dark:border-gray-800 text-gray-300 dark:text-gray-700 cursor-not-allowed"
                                              : "border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer"
                                          }`}
                                        >
                                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="size-3">
                                            <path d="M8.75 3.75a.75.75 0 0 0-1.5 0v3.5h-3.5a.75.75 0 0 0 0 1.5h3.5v3.5a.75.75 0 0 0 1.5 0v-3.5h3.5a.75.75 0 0 0 0-1.5h-3.5v-3.5Z"/>
                                          </svg>
                                          {tLabel}
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>
                              );
                            })()}

                            {/* Légende */}
                            <div className="mt-3 pt-2 border-t border-gray-100 dark:border-gray-800 space-y-1">
                              {thresholdVisible ? (
                                <p className="text-[10px] text-gray-500 flex items-center gap-1">
                                  <span className="inline-block w-3 border-t-2 border-red-500"/>
                                  Seuil p = 0.05 : |b| = {threshold.toFixed(3)} (t = {tCrit?.toFixed(2)}, dfE = {fit.dfE})
                                </p>
                              ) : threshold ? (
                                <p className="text-[10px] text-amber-600 dark:text-amber-400">
                                  ⚠ Seuil p = 0.05 hors graphe ({threshold.toFixed(3)}) — dfE = {fit.dfE}, modèle sur-paramétré
                                </p>
                              ) : null}
                              <p className="text-[10px] text-gray-400">
                                Barres <span className="text-indigo-500">bleues</span> = significatifs (p &lt; 0.05) ·
                                Barres <span className="text-gray-400">grises</span> = non significatifs · Le bouton ? donne des explications
                              </p>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  );
                })}
              </div>
            )}

            {/* ── TAB : ISORÉPONSES ── */}
            {part4Tab === "isoresponse" && (
              <div className={cardSpace}>
                <div className="flex items-center gap-2 mb-4">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{t("doe.isoresponse")}</h3>
                  <HelpButton topic="isoreponse" size="xs" />
                </div>

                {/* ── Tabs par modèle ── */}
                {models.length > 1 && (
                  <div className="flex gap-1 flex-wrap mb-3">
                    {models.map((m, mi) => {
                      const col = modelColors[mi % modelColors.length];
                      return (
                        <button key={m.id} onClick={() => setActiveModelId(m.id)}
                          className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-all ${
                            m.id === activeModelId
                              ? `${col.border} ${col.bg} ${col.text}`
                              : "border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-gray-300"
                          }`}>
                          <span className={`size-2 rounded-full ${col.dot}`} />
                          {m.name}
                        </button>
                      );
                    })}
                  </div>
                )}
                {models.map((m, mi) => {
                  if (m.id !== activeModelId) return null;
                  const fit = fits[mi];
                  const col = modelColors[mi % modelColors.length];
                  if (!fit) return <div key={m.id} className={`bg-white dark:bg-gray-900 ${cardCls} ${col.border}`}><p className="text-sm text-red-500">Calcul impossible.</p></div>;
                  const contFactors = factors.filter(f => f.continuous);
                  if (contFactors.length < 2) return (
                    <div key={m.id} className={`bg-white dark:bg-gray-900 ${cardCls} ${col.border}`}>
                      <p className="text-sm text-gray-500">Les courbes isoréponses nécessitent au moins 2 facteurs continus.</p>
                    </div>
                  );
                  return (
                    <IsoResponsePanel key={m.id} model={m} fit={fit} factors={factors} modelColors={col} allTerms={getAllPossibleTerms(factors)} modelDefault={modelDefault} />
                  );
                })}
              </div>
            )}

            {/* ── TAB : SURFACE 3D ── */}
            {part4Tab === "iso3d" && has3D && (
              <div className={cardSpace}>
                {/* ── Tabs par modèle ── */}
                {models.length > 1 && (
                  <div className="flex gap-1 flex-wrap mb-3">
                    {models.map((m, mi) => {
                      const col = modelColors[mi % modelColors.length];
                      return (
                        <button key={m.id} onClick={() => setActiveModelId(m.id)}
                          className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-all ${
                            m.id === activeModelId
                              ? `${col.border} ${col.bg} ${col.text}`
                              : "border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-gray-300"
                          }`}>
                          <span className={`size-2 rounded-full ${col.dot}`} />
                          {m.name}
                        </button>
                      );
                    })}
                  </div>
                )}
                {models.map((m, mi) => {
                  if (m.id !== activeModelId) return null;
                  const fit = fits[mi];
                  const col = modelColors[mi % modelColors.length];
                  return (
                    <div key={m.id} className={`bg-white dark:bg-gray-900 ${cardCls} ${col.border}`}>
                      <div className="flex items-center gap-2 mb-4">
                        <span className={`size-2.5 rounded-full ${col.dot}`} />
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                          {m.name} — {t("doe.surface3d")}
                        </h3>
                        <HelpButton topic="isoreponse" size="xs" className="ml-auto" />
                      </div>
                      <Surface3D model={m} fit={fit} factors={factors} col={col} response={activeResp} />
                    </div>
                  );
                })}
              </div>
            )}

            {/* Navigation */}
            <div className="flex items-center justify-between mt-6">
              <button onClick={() => goTo(3)}
                className="rounded-lg border border-gray-200 dark:border-gray-700 px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                ← {t("common.back")}
              </button>
              <div className="flex items-center gap-3">
                {editMode && (
                  <button onClick={exportJSON}
                    className="flex items-center gap-1.5 rounded-md border border-indigo-300 dark:border-indigo-700 bg-indigo-50 dark:bg-indigo-900/20 px-3 py-1.5 text-xs font-medium text-indigo-600 dark:text-indigo-300 hover:bg-indigo-100 transition-colors">
                    Exporter JSON
                  </button>
                )}
                <button onClick={() => exportPDF({ models, fits, factors, responses, activeResp, allValidRows, activeRows, excludedPoints, validY, modelDefault, matrix })}
                  className="flex items-center gap-2 rounded-lg bg-gray-900 dark:bg-white px-4 py-2 text-sm font-semibold text-white dark:text-gray-900 hover:bg-gray-700 dark:hover:bg-gray-100 transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="size-4">
                    <path fillRule="evenodd" d="M4.5 2A1.5 1.5 0 003 3.5v13A1.5 1.5 0 004.5 18h11a1.5 1.5 0 001.5-1.5V7.621a1.5 1.5 0 00-.44-1.06l-4.12-4.122A1.5 1.5 0 0011.378 2H4.5zm4 9.75a.75.75 0 011.5 0v2.546l.943-1.048a.75.75 0 111.114 1.004l-2.25 2.5a.75.75 0 01-1.114 0l-2.25-2.5a.75.75 0 111.114-1.004l.943 1.048V11.75z" clipRule="evenodd" />
                  </svg>
                  Exporter rapport PDF
                </button>
              </div>
            </div>
          </>
        );
      })()}

      {/* ── Panneau d'aide ANOVA avec valeurs calculées ── */}
      {validationHelpFit && (() => {
        const { fit, modelName } = validationHelpFit;
        const f4 = v => v != null ? (+v).toFixed(4) : "—";
        const f2 = v => v != null ? (+v).toFixed(2) : "—";
        const fp = v => v == null ? "—" : v < 0.001 ? "<0.001" : (+v).toFixed(3);
        return (
          <div className="fixed inset-0 z-50 bg-black/30 dark:bg-black/50 flex items-end sm:items-center justify-center p-4"
               onClick={() => setValidationHelpFit(null)}>
            <div className="bg-white dark:bg-gray-950 rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto"
                 onClick={e => e.stopPropagation()}>
              <div className="sticky top-0 bg-indigo-50 dark:bg-indigo-950/60 border-b border-indigo-100 dark:border-indigo-900 px-5 py-4 flex items-center gap-3">
                <div className="size-9 rounded-lg bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="size-5 text-indigo-600 dark:text-indigo-400">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 15.75V18m-7.5-6.75h.008v.008H8.25v-.008zm0 2.25h.008v.008H8.25V13.5zm0 2.25h.008v.008H8.25v-.008zm0 2.25h.008v.008H8.25V18zm2.498-6.75h.007v.008h-.007v-.008zm0 2.25h.007v.008h-.007V13.5zm0 2.25h.007v.008h-.007v-.008zm0 2.25h.007v.008h-.007V18z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-indigo-400 mb-0.5">Aide pédagogique — {modelName}</p>
                  <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Comment sont calculés ces indicateurs ?</h2>
                </div>
                <button onClick={() => setValidationHelpFit(null)}
                  className="size-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="size-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="px-5 py-4 space-y-4 text-xs">
                <div className="rounded-xl border border-blue-200 dark:border-blue-900 overflow-hidden">
                  <div className="bg-blue-50 dark:bg-blue-900/30 px-4 py-2 font-semibold text-blue-800 dark:text-blue-300 text-sm">
                    R² — Coefficient de détermination
                  </div>
                  <div className="px-4 py-3 space-y-2">
                    <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 font-mono text-indigo-700 dark:text-indigo-300">
                      R² = SC_R / SC_T = {f4(fit.SSR)} / {f4(fit.SST)} = <span className="font-bold">{f4(fit.R2)}</span>
                    </div>
                    <p className="text-gray-500 dark:text-gray-400">
                      Fraction de la variabilité totale expliquée par le modèle.
                      Un R² de {f4(fit.R2)} signifie que le modèle explique {(fit.R2*100).toFixed(1)} % de la variabilité observée.
                    </p>
                  </div>
                </div>

                <div className="rounded-xl border border-blue-200 dark:border-blue-900 overflow-hidden">
                  <div className="bg-blue-50 dark:bg-blue-900/30 px-4 py-2 font-semibold text-blue-800 dark:text-blue-300 text-sm">
                    R² ajusté — Ajustement pénalisé
                  </div>
                  <div className="px-4 py-3 space-y-2">
                    <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 font-mono text-indigo-700 dark:text-indigo-300 text-[11px]">
                      R²_adj = 1 − (SC_E/dl_E) / (SC_T/dl_T)<br/>
                      = 1 − ({f4(fit.SSE)}/{fit.dfE}) / ({f4(fit.SST)}/{fit.n-1})<br/>
                      = 1 − {f4(fit.MSE)} / {f4(fit.SST/(fit.n-1))}<br/>
                      = <span className="font-bold">{f4(fit.R2adj)}</span>
                      {fit.R2adj < 0.8 ? " ← insuffisant (< 0.8)" : " ← bon (≥ 0.8)"}
                    </div>
                    <p className="text-gray-500 dark:text-gray-400">
                      Contrairement à R², il pénalise les termes inutiles. Préférer R² ajusté pour comparer des modèles.
                    </p>
                  </div>
                </div>

                <div className="rounded-xl border border-blue-200 dark:border-blue-900 overflow-hidden">
                  <div className="bg-blue-50 dark:bg-blue-900/30 px-4 py-2 font-semibold text-blue-800 dark:text-blue-300 text-sm">
                    F — Statistique de Fisher
                  </div>
                  <div className="px-4 py-3 space-y-2">
                    <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 font-mono text-indigo-700 dark:text-indigo-300 text-[11px]">
                      CM_R = SC_R / dl_R = {f4(fit.SSR)} / {fit.dfR} = {f4(fit.MSR)}<br/>
                      CM_E = SC_E / dl_E = {f4(fit.SSE)} / {fit.dfE} = {f4(fit.MSE)}<br/>
                      F = CM_R / CM_E = {f4(fit.MSR)} / {f4(fit.MSE)} = <span className="font-bold">{f2(fit.Fstat)}</span>
                      {fit.Fstat < 1 ? " ← résidus > régression !" : fit.Fstat < 4 ? " ← faible" : " ← bon (> 4)"}
                    </div>
                    <p className="text-gray-500 dark:text-gray-400">
                      F compare la variance expliquée et la variance résiduelle.
                      Un F {fit.Fstat >= 4 ? "élevé (" + f2(fit.Fstat) + " > 4) → bon modèle." : "faible (" + f2(fit.Fstat) + " < 4) → le modèle n'explique pas mieux que le hasard."}
                    </p>
                  </div>
                </div>

                <div className="rounded-xl border border-blue-200 dark:border-blue-900 overflow-hidden">
                  <div className="bg-blue-50 dark:bg-blue-900/30 px-4 py-2 font-semibold text-blue-800 dark:text-blue-300 text-sm">
                    Prob &gt; F — p-valeur du modèle
                  </div>
                  <div className="px-4 py-3 space-y-2">
                    <div className={`rounded-lg p-3 font-mono text-[11px] ${
                      fit.pF < 0.05
                        ? "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300"
                        : "bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300"
                    }`}>
                      Prob &gt; F = {fp(fit.pF)}
                      {fit.pF < 0.05
                        ? " ← modèle significatif ✓ (< 0.05)"
                        : " ← modèle non significatif ✗ (≥ 0.05)"}
                    </div>
                    <p className="text-gray-500 dark:text-gray-400">
                      Probabilité d'observer un F aussi grand par hasard si le modèle n'avait aucun effet.
                      {fit.pF < 0.05
                        ? ` Ici ${fp(fit.pF)} < 0.05 → moins de 5 % de chance que ce soit dû au hasard.`
                        : ` Ici ${fp(fit.pF)} ≥ 0.05 → probabilité trop élevée, le modèle n'est pas fiable.`}
                    </p>
                  </div>
                </div>

                {fit.dfE < 3 && (
                  <div className="rounded-xl border border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-900/20 px-4 py-3">
                    <p className="font-semibold text-amber-700 dark:text-amber-300 mb-1">
                      ⚠ Degrés de liberté résidus = {fit.dfE}
                    </p>
                    <p className="text-amber-600 dark:text-amber-400">
                      dl_E = n − p − 1 = {fit.n} − {fit.p-1} − 1 = {fit.dfE}.
                      Avec aussi peu de degrés de liberté, tous les tests statistiques sont peu fiables.
                      Il faut au minimum 3–5 degrés de liberté résiduels.
                    </p>
                  </div>
                )}
              </div>

              <div className="px-5 py-3 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 text-center text-[10px] text-gray-400">
                Basé sur le référentiel BTS Métiers de la Chimie — Plans d'expériences
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── Panneau "Comment améliorer ce modèle ?" ── */}
      {improvementHelpFit && (() => {
        const { fit, modelName, modelTerms } = improvementHelpFit;
        const nsTerms = modelTerms.filter((_, i) => {
          const p = fit.pCoeffs?.[i + 1];
          return p != null && p >= 0.05;
        });
        const dfTooLow   = fit.dfE < 3;
        const probTooHigh = fit.pF == null || fit.pF >= 0.05;
        const r2TooLow   = fit.R2adj < 0.8;
        const fTooLow    = fit.Fstat < 1;
        const fp = v => v == null ? "—" : v < 0.001 ? "<0.001" : (+v).toFixed(3);

        return (
          <div className="fixed inset-0 z-50 bg-black/30 dark:bg-black/50 flex items-end sm:items-center justify-center p-4"
               onClick={() => setImprovementHelpFit(null)}>
            <div className="bg-white dark:bg-gray-950 rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto"
                 onClick={e => e.stopPropagation()}>
              <div className="sticky top-0 bg-red-50 dark:bg-red-950/60 border-b border-red-100 dark:border-red-900 px-5 py-4 flex items-center gap-3">
                <div className="size-9 rounded-lg bg-red-100 dark:bg-red-900/50 flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="size-5 text-red-600 dark:text-red-400">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 004.486-6.336l-3.276 3.277a3.004 3.004 0 01-2.25-2.25l3.276-3.276a4.5 4.5 0 00-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085" />
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-red-400 mb-0.5">Diagnostic — {modelName}</p>
                  <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Comment améliorer ce modèle ?</h2>
                </div>
                <button onClick={() => setImprovementHelpFit(null)}
                  className="size-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="size-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="px-5 py-4 space-y-3 text-xs">
                <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-4 py-3">
                  <p className="font-semibold text-red-700 dark:text-red-300 mb-2">Problèmes détectés :</p>
                  <ul className="space-y-1 text-red-600 dark:text-red-400">
                    {dfTooLow    && <li>✗ dl résidus = {fit.dfE} (trop faible — minimum recommandé : 3)</li>}
                    {probTooHigh && <li>✗ Prob &gt; F = {fp(fit.pF)} (≥ 0.05 → modèle non significatif)</li>}
                    {r2TooLow    && <li>✗ R² ajusté = {(+fit.R2adj).toFixed(3)} (&lt; 0.8 → ajustement insuffisant)</li>}
                    {fTooLow     && <li>✗ F = {(+fit.Fstat).toFixed(2)} (&lt; 1 → résidus &gt; régression)</li>}
                    {nsTerms.length > 0 && <li>△ {nsTerms.length} terme(s) non significatif(s) : {nsTerms.join(", ")}</li>}
                  </ul>
                </div>

                <p className="font-semibold text-gray-700 dark:text-gray-200">Pistes d'amélioration :</p>

                {dfTooLow && (
                  <div className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 px-4 py-3">
                    <p className="font-semibold text-amber-700 dark:text-amber-300 mb-1">1. Réduire le nombre de termes</p>
                    <p className="text-amber-600 dark:text-amber-400 mb-2">
                      Avec {fit.n} essais et {fit.p - 1} termes, dl_E = {fit.dfE} seulement.
                      En retirant {Math.max(0, 3 - fit.dfE)} terme(s), dl_E atteindrait {fit.dfE + Math.max(0, 3 - fit.dfE)} → tests fiables.
                    </p>
                    <p className="text-amber-600 dark:text-amber-400">
                      → Aller dans <strong>Partie 3</strong> → choisir un modèle avec moins de termes
                      (ex: passer de Quadratique à Synergie, ou supprimer les termes les moins significatifs du Pareto).
                    </p>
                  </div>
                )}

                {nsTerms.length > 0 && (
                  <div className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 px-4 py-3">
                    <p className="font-semibold text-amber-700 dark:text-amber-300 mb-1">
                      2. Supprimer les termes non significatifs
                    </p>
                    <p className="text-amber-600 dark:text-amber-400 mb-1">
                      Termes dont Prob &gt; |t| ≥ 0.05 : <span className="font-mono">{nsTerms.join(", ")}</span>
                    </p>
                    <p className="text-amber-600 dark:text-amber-400">
                      → Ces termes n'apportent pas d'information significative. Les retirer libère des dl pour les résidus
                      et améliore F et R² ajusté.
                    </p>
                  </div>
                )}

                {r2TooLow && !dfTooLow && (
                  <div className="rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 px-4 py-3">
                    <p className="font-semibold text-blue-700 dark:text-blue-300 mb-1">3. Ajouter des termes de courbure</p>
                    <p className="text-blue-600 dark:text-blue-400">
                      R² ajusté faible ({(+fit.R2adj).toFixed(3)}) avec des degrés de liberté suffisants suggère que
                      le modèle est trop simple. Essayer un modèle avec des termes quadratiques (X²) si des points
                      centraux sont disponibles.
                    </p>
                  </div>
                )}

                {!dfTooLow && !r2TooLow && probTooHigh && (
                  <div className="rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 px-4 py-3">
                    <p className="font-semibold text-blue-700 dark:text-blue-300 mb-1">3. Vérifier les données</p>
                    <p className="text-blue-600 dark:text-blue-400">
                      Avec R² ajusté = {(+fit.R2adj).toFixed(3)} et Prob &gt; F = {fp(fit.pF)}, la variabilité
                      expérimentale est peut-être trop grande. Vérifier :
                    </p>
                    <ul className="mt-1 space-y-0.5 text-blue-600 dark:text-blue-400 ml-3">
                      <li>• Saisie correcte des valeurs de réponse</li>
                      <li>• Absence de valeurs aberrantes (voir onglet Résidus)</li>
                      <li>• Répétabilité des essais (points centraux)</li>
                    </ul>
                  </div>
                )}

                <div className="rounded-lg border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-900/20 px-4 py-3">
                  <p className="font-semibold text-indigo-700 dark:text-indigo-300 mb-1">Rappel : règle de décision</p>
                  <ul className="space-y-0.5 text-indigo-600 dark:text-indigo-400">
                    <li>✓ Prob &gt; F &lt; 0.05 → modèle significatif</li>
                    <li>✓ R² ajusté ≥ 0.80 → bon ajustement</li>
                    <li>✓ dl résidus ≥ 3 → tests fiables</li>
                    <li>✓ Résidus bien répartis (voir onglet Résidus)</li>
                  </ul>
                </div>
              </div>

              <div className="px-5 py-3 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 text-center text-[10px] text-gray-400">
                Basé sur le référentiel BTS Métiers de la Chimie — Plans d'expériences
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── Aide sur terme non significatif ── */}
      {nsTermHelp && (() => {
        const { label, p, coeff, isInteraction, dfE, se } = nsTermHelp;
        const pFmt = p !== null ? (p < 0.001 ? "<0.001" : p.toFixed(3)) : "—";
        const tStat = se > 0 ? (coeff / se).toFixed(3) : "—";

        return (
          <div className="fixed inset-0 z-50 bg-black/30 dark:bg-black/50 flex items-end sm:items-center justify-center p-4"
               onClick={() => setNsTermHelp(null)}>
            <div className="bg-white dark:bg-gray-950 rounded-2xl shadow-2xl w-full max-w-md max-h-[80vh] overflow-y-auto"
                 onClick={e => e.stopPropagation()}>
              <div className="sticky top-0 bg-gray-50 dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 px-5 py-4 flex items-center gap-3">
                <div className="size-9 rounded-lg bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="size-5 text-gray-500 dark:text-gray-300">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 5.25h.008v.008H12v-.008Z"/>
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-0.5">Terme non significatif</p>
                  <h2 className="text-sm font-semibold text-gray-900 dark:text-white font-mono">{label}</h2>
                </div>
                <button onClick={() => setNsTermHelp(null)}
                  className="size-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="size-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
                  </svg>
                </button>
              </div>

              <div className="px-5 py-4 space-y-3 text-xs">
                <div className="rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-4 py-3">
                  <p className="font-semibold text-gray-700 dark:text-gray-200 mb-2">Résultat du test de Student</p>
                  <div className="space-y-1 font-mono text-gray-600 dark:text-gray-300">
                    <p>b = {coeff.toFixed(4)} · s(b) = {se?.toFixed(4) || "—"}</p>
                    <p>t = b / s(b) = {tStat}</p>
                    <p>Prob &gt; |t| = <span className="text-amber-600 dark:text-amber-400 font-semibold">{pFmt}</span> ≥ 0.05 → <span className="text-gray-500">non significatif</span></p>
                  </div>
                </div>

                <div className="rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 px-4 py-3">
                  <p className="font-semibold text-amber-800 dark:text-amber-300 mb-1">Qu'est-ce que ça signifie ?</p>
                  <p className="text-amber-700 dark:text-amber-400 leading-relaxed">
                    {isInteraction
                      ? `L'interaction ${label} a une probabilité de ${pFmt} d'être due au hasard. On ne peut pas affirmer que l'effet combiné de ces facteurs est réel avec un niveau de confiance de 95 %.`
                      : `${label} a une probabilité de ${pFmt} d'être dû au hasard. On ne peut pas affirmer que ce facteur a un effet réel sur la réponse avec un niveau de confiance de 95 %.`}
                  </p>
                </div>

                {dfE < 3 && (
                  <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 px-4 py-3">
                    <p className="font-semibold text-red-700 dark:text-red-300 mb-1">
                      Cause probable : dfE = {dfE} (trop faible)
                    </p>
                    <p className="text-red-600 dark:text-red-400 leading-relaxed">
                      Avec seulement {dfE} degré(s) de liberté résiduel(s), le test de Student
                      manque de puissance pour détecter des effets significatifs, même réels.
                      Le seuil critique est très élevé (t critique ≈ {dfE === 1 ? "12.71" : dfE === 2 ? "4.30" : "3.18"}).
                    </p>
                  </div>
                )}

                <div className="rounded-lg bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-700 px-4 py-3">
                  <p className="font-semibold text-indigo-700 dark:text-indigo-300 mb-1">Que faire ?</p>
                  <ul className="space-y-1 text-indigo-600 dark:text-indigo-400 leading-relaxed">
                    {dfE < 3 ? (
                      <li>→ Retirer d'autres termes non significatifs du modèle (Partie 3) pour augmenter dfE</li>
                    ) : (
                      <>
                        <li>→ Retirer ce terme du modèle pour simplifier et gagner 1 degré de liberté</li>
                        <li>→ Après retrait, recalculer : les autres termes peuvent devenir plus significatifs</li>
                        {isInteraction && (
                          <li>→ Une interaction non significative peut souvent être ignorée en première approximation</li>
                        )}
                      </>
                    )}
                  </ul>
                </div>
              </div>

              <div className="px-5 py-3 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 text-center text-[10px] text-gray-400">
                Basé sur le référentiel BTS Métiers de la Chimie — Plans d'expériences
              </div>
            </div>
          </div>
        );
      })()}
    </div>
    </HelpProvider>
  );
}
// ── Wrapper qui fournit le contexte compact ──────────────────────────────────
export default function PlanFactoriel() {
  return (
    <CompactProvider>
      <PlanFactorielInner />
    </CompactProvider>
  );
}
