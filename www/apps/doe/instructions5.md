# Instructions — Import Excel avec ExcelImportModal
**Fichier : src/apps/doe/PlanFactoriel.jsx**

---

## Vue d'ensemble

- La carte "Exemples" de l'accueil devient "Charger Excel"
- Clic → ouvre ExcelImportModal (le composant fourni)
- La modal contient : drag & drop, 5 onglets d'explication, bouton télécharger le modèle
- La fonction importFromExcel lit les 5 feuilles et charge le plan dans l'app

---

## Étape 1 — Coller ExcelImportModal dans le fichier

Où : juste avant "export default function PlanFactoriel()", après les autres
sous-composants (NewPlanModal, etc.)

Coller le composant fourni tel quel — il est autonome, aucune modification nécessaire.

---

## Étape 2 — Ajouter les states

Dans le bloc des useState du composant PlanFactoriel, ajouter :

```js
const [showExcelModal,   setShowExcelModal]   = useState(false);
const [excelDragOver,    setExcelDragOver]    = useState(false);
const [excelImportError, setExcelImportError] = useState(null);
```

---

## Étape 3 — Ajouter la fonction importFromExcel

À placer juste après validateAndImport.

```js
const importFromExcel = async (file) => {
  setExcelImportError(null);
  try {
    if (!window.XLSX) {
      await new Promise((res, rej) => {
        const s = document.createElement("script");
        s.src = "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js";
        s.onload = res; s.onerror = rej;
        document.head.appendChild(s);
      });
    }
    const XL = window.XLSX;
    const buffer = await file.arrayBuffer();
    const wb = XL.read(buffer, { type: "array" });

    const getSheet = (names) => {
      for (const n of names) {
        const found = wb.SheetNames.find(s => s.toLowerCase() === n.toLowerCase());
        if (found) return wb.Sheets[found];
      }
      return null;
    };
    const sheetToRows = (ws) =>
      XL.utils.sheet_to_json(ws, { header: 1, defval: "" });

    // Facteurs (obligatoire)
    const wsFact = getSheet(["Facteurs", "Factors", "facteurs"]);
    if (!wsFact) throw new Error("Feuille 'Facteurs' introuvable.");
    const factRows = sheetToRows(wsFact).slice(1).filter(r => r[0]);
    if (!factRows.length) throw new Error("Aucun facteur trouvé dans la feuille 'Facteurs'.");

    const newFactors = factRows.map(r => {
      const id = String(r[0]).trim();
      const isCont = String(r[3] || "Continu").toLowerCase() !== "qualitatif";
      const base = { id, name: String(r[1] || id).trim(), unit: String(r[2] || "").trim(), continuous: isCont };
      if (isCont) {
        base.low  = { real: parseFloat(r[4]) || 0, coded: -1 };
        base.high = { real: parseFloat(r[5]) || 1, coded:  1 };
      } else {
        base.low  = { label: String(r[4] || "").trim(), coded: -1 };
        base.high = { label: String(r[5] || "").trim(), coded:  1 };
      }
      return base;
    });

    // Réponses (obligatoire)
    const wsResp = getSheet(["Réponses", "Reponses", "réponses", "responses"]);
    if (!wsResp) throw new Error("Feuille 'Réponses' introuvable.");
    const respRows = sheetToRows(wsResp).slice(1).filter(r => r[0]);
    if (!respRows.length) throw new Error("Aucune réponse trouvée dans la feuille 'Réponses'.");
    const newResponses = respRows.map(r => ({
      id: String(r[0]).trim(), name: String(r[1] || r[0]).trim(), unit: String(r[2] || "").trim(),
    }));

    // Matrice (obligatoire)
    const wsMat = getSheet(["Matrice", "Matrix", "matrice"]);
    if (!wsMat) throw new Error("Feuille 'Matrice' introuvable.");
    const matRows = sheetToRows(wsMat);
    if (matRows.length < 2) throw new Error("La feuille 'Matrice' est vide.");

    const headers = matRows[0].map(h => String(h).trim());
    const factColIdx = {};
    newFactors.forEach(f => {
      const idx = headers.findIndex(h =>
        h.toLowerCase() === f.id.toLowerCase() + "_niveau" || h.toLowerCase() === f.id.toLowerCase()
      );
      if (idx >= 0) factColIdx[f.id] = idx;
    });
    const respColIdx = {};
    newResponses.forEach(r => {
      const idx = headers.findIndex(h => h.toLowerCase() === r.id.toLowerCase());
      if (idx >= 0) respColIdx[r.id] = idx;
    });

    const newMatrix = [];
    matRows.slice(1).forEach((row, ri) => {
      if (row.every(c => c === "" || c === null || c === undefined)) return;
      const coded = {}, real = {};
      newFactors.forEach(f => {
        const ci = factColIdx[f.id];
        const val = ci !== undefined ? parseFloat(row[ci]) : 0;
        coded[f.id] = isNaN(val) ? 0 : val;
        if (f.continuous) {
          if (coded[f.id] === -1)      real[f.id] = f.low.real;
          else if (coded[f.id] === 1)  real[f.id] = f.high.real;
          else                         real[f.id] = +((f.low.real + f.high.real) / 2).toFixed(3);
        } else {
          real[f.id] = coded[f.id] === -1 ? (f.low.label || "-1") : (f.high.label || "+1");
        }
      });
      const responses = {};
      newResponses.forEach(r => {
        const ci = respColIdx[r.id];
        const v  = ci !== undefined ? row[ci] : "";
        responses[r.id] = (v !== "" && v !== null && v !== undefined) ? (+v || "") : "";
      });
      const isCenter = newFactors.every(f => coded[f.id] === 0);
      newMatrix.push({ id: ri + 1, coded, real, center: isCenter, responses });
    });
    if (!newMatrix.length) throw new Error("Aucune ligne valide dans la feuille 'Matrice'.");

    // Métadonnées (optionnelle)
    const wsMeta = getSheet(["Métadonnées", "Metadonnees", "métadonnées", "metadata"]);
    const newMeta = { id: "", title: "", context: "", difficulty: "débutant", real_data: false, source: "" };
    if (wsMeta) {
      sheetToRows(wsMeta).slice(1).forEach(r => {
        const k = String(r[0] || "").toLowerCase().trim();
        const v = String(r[1] || "").trim();
        if (k === "titre")     newMeta.title      = v;
        if (k === "id")        newMeta.id         = v;
        if (k === "contexte")  newMeta.context    = v;
        if (k === "difficulté" || k === "difficulte") newMeta.difficulty = v || "débutant";
        if (k === "données réelles" || k === "donnees reelles") newMeta.real_data = v.toLowerCase() === "oui";
        if (k === "source")    newMeta.source     = v;
      });
    }

    // Charger dans l'app
    const newModelDef = computeDefaultModel(newFactors);
    setFactors(newFactors);
    setResponses(newResponses);
    setCenterPoint({ present: newMatrix.some(r => r.center), replicates: 1 });
    setModelDefault(newModelDef);
    setModels([{ id: 1, name: "Modèle 1", terms: [...newModelDef], preset: "default" }]);
    setActiveModelId(1);
    setMatrix(newMatrix);
    setLoadedExampleId(file.name);
    setEditMeta(newMeta);
    setShowExcelModal(false);
    setPart(1);

  } catch (err) {
    console.error("Erreur import Excel:", err);
    setExcelImportError(err.message);
  }
};
```

---

## Étape 4 — Remplacer la carte "Exemples" par "Charger Excel"

Chercher dans {part === 0 && ...} :

```jsx
            {/* Carte 3 : Exemples */}
            <button
              onClick={() => setPart(0)}
```

Remplacer par :

```jsx
            {/* Carte 3 : Charger Excel */}
            <button
              onClick={() => { setExcelImportError(null); setShowExcelModal(true); }}
              className="flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 p-6 text-center hover:border-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/10 transition-all group"
            >
              <div className="rounded-full bg-amber-100 dark:bg-amber-900/30 p-3 group-hover:bg-amber-200 dark:group-hover:bg-amber-900/50 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="size-6 text-amber-600 dark:text-amber-400">
                  <path fillRule="evenodd" d="M5.625 1.5H9a3.75 3.75 0 0 1 3.75 3.75v1.875c0 1.036.84 1.875 1.875 1.875H16.5a3.75 3.75 0 0 1 3.75 3.75v7.875c0 1.035-.84 1.875-1.875 1.875H5.625a1.875 1.875 0 0 1-1.875-1.875V3.375c0-1.036.84-1.875 1.875-1.875ZM9.75 14.25a.75.75 0 0 0 0 1.5H15a.75.75 0 0 0 0-1.5H9.75Zm0-3.75a.75.75 0 0 0 0 1.5H15a.75.75 0 0 0 0-1.5H9.75Z" clipRule="evenodd" />
                  <path d="M14.25 5.25a5.23 5.23 0 0 0-1.279-3.434 9.768 9.768 0 0 1 6.963 6.963A5.23 5.23 0 0 0 16.5 7.5h-1.875a.375.375 0 0 1-.375-.375V5.25Z" />
                </svg>
              </div>
              <div>
                <p className="font-semibold text-gray-800 dark:text-white text-sm">Charger Excel</p>
                <p className="text-xs text-gray-400 mt-0.5">Importer un fichier .xlsx</p>
              </div>
            </button>
```

---

## Étape 5 — Monter ExcelImportModal dans le return

Au niveau racine du return, après la popup examplePopup et avant {/* PARTIE 1 */} :

```jsx
      {/* Modal Import Excel */}
      {showExcelModal && (
        <ExcelImportModal
          onClose={() => setShowExcelModal(false)}
          excelDragOver={excelDragOver}
          setExcelDragOver={setExcelDragOver}
          importFromExcel={importFromExcel}
          excelImportError={excelImportError}
          setExcelImportError={setExcelImportError}
        />
      )}
```

---

## Récapitulatif

| Etape | Quoi | Où |
|---|---|---|
| 1 | Coller ExcelImportModal | Avant export default function PlanFactoriel |
| 2 | 3 nouveaux states | Bloc useState |
| 3 | importFromExcel(file) | Après validateAndImport |
| 4 | Carte "Exemples" → "Charger Excel" | {part === 0}, 3ème carte |
| 5 | ExcelImportModal dans le return | Racine du return, hors blocs part |

Generé le 08 avril 2026
