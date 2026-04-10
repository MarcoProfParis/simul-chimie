# Instructions — Boutons "Nouveau" et "Sauvegarder" (Parties 1 à 4)
**Fichier : `src/apps/doe/PlanFactoriel.jsx`**

---

## Vue d'ensemble

- **Bouton "Nouveau"** → popup proposant de sauvegarder (JSON ou Excel) avant de revenir à `part=0`, ou de quitter directement sans sauvegarder.
- **Bouton "Sauvegarder"** → popup proposant JSON ou Excel, puis ferme la popup (reste sur la partie courante).
- Les deux boutons apparaissent dans une **barre fixe sous le stepper**, visible dès `part > 0`.

---

## Étape 1 — Ajouter les states

Dans le bloc des `useState`, **ajouter** :

```js
const [showSavePopup, setShowSavePopup]   = useState(false); // popup Sauvegarder
const [showNewPopup,  setShowNewPopup]    = useState(false); // popup Nouveau
```

---

## Étape 2 — Fonction `exportXLSX`

Ajouter cette fonction **juste après `exportJSON`** (vers la ligne 2057).
Elle génère un `.xlsx` conforme au modèle en 5 feuilles via SheetJS (CDN).

```js
const exportXLSX = async () => {
  // Charger SheetJS dynamiquement si pas déjà présent
  if (!window.XLSX) {
    await new Promise((res, rej) => {
      const s = document.createElement("script");
      s.src = "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js";
      s.onload = res; s.onerror = rej;
      document.head.appendChild(s);
    });
  }
  const XL = window.XLSX;

  const wb = XL.utils.book_new();

  // ── Feuille Info ──
  const wsInfo = XL.utils.aoa_to_sheet([
    ["MODÈLE DE FICHIER — Plan d'expériences BTS Métiers de la Chimie"],
    ["Ce fichier contient 4 feuilles à remplir :"],
    ["• Métadonnées : titre, contexte, difficulté de l'exemple"],
    ["• Facteurs    : liste des facteurs avec leurs niveaux réels"],
    ["• Réponses    : liste des grandeurs mesurées"],
    ["• Matrice     : plan avec les niveaux codés (-1, 0, +1) et les mesures"],
    ["RÈGLES IMPORTANTES :"],
    ['• Colonne "ID" : utiliser X1, X2, X3… pour les facteurs et Y1, Y2… pour les réponses'],
    ["• Matrice : n'utiliser que -1, 0 ou +1 dans les colonnes Xi_niveau"],
    ["• Les valeurs réelles sont dans la feuille Facteurs (Niveau bas / Niveau haut)"],
    ["• Ne pas modifier les noms de feuilles ni les en-têtes de colonnes"],
  ]);
  XL.utils.book_append_sheet(wb, wsInfo, "Info");

  // ── Feuille Métadonnées ──
  const toVal = (v) => { const n = Number(v); return (!isNaN(n) && v !== "" && v !== null) ? n : (v ?? ""); };
  const wsMeta = XL.utils.aoa_to_sheet([
    ["Champ", "Valeur", "Description"],
    ["Titre",           editMeta.title || "Mon plan d'expériences", "Nom de l'expérience"],
    ["ID",              editMeta.id    || "mon_plan",               "Identifiant court (sans espaces)"],
    ["Contexte",        editMeta.context || "",                     "Description courte"],
    ["Difficulté",      editMeta.difficulty || "débutant",          "débutant / intermédiaire / avancé"],
    ["Données réelles", editMeta.real_data ? "Oui" : "Non",         "Oui ou Non"],
    ["Source",          editMeta.source || "",                      "Référence bibliographique (optionnel)"],
  ]);
  XL.utils.book_append_sheet(wb, wsMeta, "Métadonnées");

  // ── Feuille Facteurs ──
  const factRows = [["ID", "Nom", "Unité", "Type", "Niveau bas (-1)", "Niveau haut (+1)"]];
  factors.forEach(f => {
    factRows.push([
      f.id, f.name, f.unit || "",
      f.continuous ? "Continu" : "Qualitatif",
      f.continuous ? toVal(f.low.real)  : (f.low.label  || ""),
      f.continuous ? toVal(f.high.real) : (f.high.label || ""),
    ]);
  });
  const wsFact = XL.utils.aoa_to_sheet(factRows);
  XL.utils.book_append_sheet(wb, wsFact, "Facteurs");

  // ── Feuille Réponses ──
  const respRows = [["ID", "Nom", "Unité"]];
  responses.forEach(r => { respRows.push([r.id, r.name, r.unit || ""]); });
  const wsResp = XL.utils.aoa_to_sheet(respRows);
  XL.utils.book_append_sheet(wb, wsResp, "Réponses");

  // ── Feuille Matrice ──
  const header = ["Essai", ...factors.map(f => `${f.id}_niveau`), ...responses.map(r => r.id)];
  const matRows = [header];
  (matrix || []).forEach((row, ri) => {
    const line = [ri + 1];
    factors.forEach(f => { line.push(toVal(row.coded[f.id])); });
    responses.forEach(r => { line.push(toVal(row.responses[r.id])); });
    matRows.push(line);
  });
  const wsMat = XL.utils.aoa_to_sheet(matRows);
  XL.utils.book_append_sheet(wb, wsMat, "Matrice");

  // ── Téléchargement ──
  XL.writeFile(wb, `${editMeta.title || editMeta.id || "plan"}.xlsx`);
};
```

---

## Étape 3 — Barre "Nouveau / Sauvegarder" sous le stepper

Chercher la fin du bloc stepper :

```jsx
      </nav>
      )}
```

**Ajouter juste après** (toujours dans `{part > 0 && ...}`, donc envelopper aussi dans cette condition) :

```jsx
      {/* ── Barre Nouveau / Sauvegarder ── */}
      {part > 0 && (
        <div className="flex items-center justify-between mb-4">
          {/* Bouton Nouveau */}
          <button
            onClick={() => setShowNewPopup(true)}
            className="flex items-center gap-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-300 hover:border-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors shadow-sm"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="size-3.5 text-gray-400">
              <path d="M8.75 3.75a.75.75 0 0 0-1.5 0v3.5h-3.5a.75.75 0 0 0 0 1.5h3.5v3.5a.75.75 0 0 0 1.5 0v-3.5h3.5a.75.75 0 0 0 0-1.5h-3.5v-3.5Z" />
            </svg>
            Nouveau
          </button>

          {/* Bouton Sauvegarder */}
          <button
            onClick={() => setShowSavePopup(true)}
            className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500 transition-colors shadow-sm"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="size-3.5">
              <path d="M2.75 14A1.75 1.75 0 0 1 1 12.25v-8.5C1 2.784 1.784 2 2.75 2h8.5c.464 0 .909.184 1.237.513l1 1A1.75 1.75 0 0 1 14 4.75v7.5A1.75 1.75 0 0 1 12.25 14H2.75ZM9 3.5v2.25c0 .138-.112.25-.25.25h-4.5A.25.25 0 0 1 4 5.75V3.5H2.75a.25.25 0 0 0-.25.25v8.5c0 .138.112.25.25.25h9.5a.25.25 0 0 0 .25-.25v-7.5a.25.25 0 0 0-.073-.177l-1-1A.25.25 0 0 0 11.25 3.5H9Zm-1 5a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3Z" />
            </svg>
            Sauvegarder
          </button>
        </div>
      )}
```

---

## Étape 4 — Popup "Sauvegarder"

À placer **après le bloc stepper et la barre**, toujours au niveau racine du `return` (pas dans un `{part === X && ...}`).

```jsx
      {/* ── Popup Sauvegarder ── */}
      {showSavePopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60"
          onClick={() => setShowSavePopup(false)}>
          <div className="w-full max-w-xs rounded-2xl bg-white dark:bg-gray-900 shadow-2xl overflow-hidden"
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 pt-5 pb-3">
              <h2 className="text-sm font-bold text-gray-900 dark:text-white">Sauvegarder</h2>
              <button onClick={() => setShowSavePopup(false)}
                className="rounded-lg p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                <XMarkIcon className="size-5" />
              </button>
            </div>
            <p className="px-5 pb-3 text-xs text-gray-500 dark:text-gray-400">
              Choisissez le format d'export.
            </p>
            <div className="px-5 pb-5 flex flex-col gap-2">
              <button
                onClick={() => { exportJSON(); setShowSavePopup(false); }}
                className="w-full flex items-center gap-3 rounded-xl border border-gray-200 dark:border-gray-700 px-4 py-3 text-left hover:border-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/10 transition-all group"
              >
                <span className="text-lg">📄</span>
                <div>
                  <p className="text-xs font-semibold text-gray-800 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400">JSON</p>
                  <p className="text-[11px] text-gray-400">Format natif de l'application</p>
                </div>
              </button>
              <button
                onClick={() => { exportXLSX(); setShowSavePopup(false); }}
                className="w-full flex items-center gap-3 rounded-xl border border-gray-200 dark:border-gray-700 px-4 py-3 text-left hover:border-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-900/10 transition-all group"
              >
                <span className="text-lg">📊</span>
                <div>
                  <p className="text-xs font-semibold text-gray-800 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400">Excel (.xlsx)</p>
                  <p className="text-[11px] text-gray-400">5 feuilles : Info, Métadonnées, Facteurs, Réponses, Matrice</p>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}
```

---

## Étape 5 — Popup "Nouveau"

À placer juste après la popup Sauvegarder.

```jsx
      {/* ── Popup Nouveau ── */}
      {showNewPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60"
          onClick={() => setShowNewPopup(false)}>
          <div className="w-full max-w-xs rounded-2xl bg-white dark:bg-gray-900 shadow-2xl overflow-hidden"
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 pt-5 pb-3">
              <h2 className="text-sm font-bold text-gray-900 dark:text-white">Nouveau plan</h2>
              <button onClick={() => setShowNewPopup(false)}
                className="rounded-lg p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                <XMarkIcon className="size-5" />
              </button>
            </div>
            <p className="px-5 pb-3 text-xs text-gray-500 dark:text-gray-400">
              Voulez-vous sauvegarder le plan en cours avant de repartir à zéro ?
            </p>
            <div className="px-5 pb-5 flex flex-col gap-2">
              {/* Sauvegarder en JSON puis quitter */}
              <button
                onClick={() => { exportJSON(); setShowNewPopup(false); setPart(0); }}
                className="w-full flex items-center gap-3 rounded-xl border border-gray-200 dark:border-gray-700 px-4 py-3 text-left hover:border-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/10 transition-all group"
              >
                <span className="text-lg">📄</span>
                <div>
                  <p className="text-xs font-semibold text-gray-800 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400">Sauvegarder en JSON</p>
                  <p className="text-[11px] text-gray-400">Télécharge le fichier puis retourne à l'accueil</p>
                </div>
              </button>
              {/* Sauvegarder en Excel puis quitter */}
              <button
                onClick={() => { exportXLSX(); setShowNewPopup(false); setPart(0); }}
                className="w-full flex items-center gap-3 rounded-xl border border-gray-200 dark:border-gray-700 px-4 py-3 text-left hover:border-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-900/10 transition-all group"
              >
                <span className="text-lg">📊</span>
                <div>
                  <p className="text-xs font-semibold text-gray-800 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400">Sauvegarder en Excel</p>
                  <p className="text-[11px] text-gray-400">Télécharge le fichier puis retourne à l'accueil</p>
                </div>
              </button>
              {/* Quitter sans sauvegarder */}
              <button
                onClick={() => { setShowNewPopup(false); setPart(0); }}
                className="w-full rounded-xl border border-red-200 dark:border-red-800 px-4 py-2.5 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors"
              >
                Quitter sans sauvegarder
              </button>
            </div>
          </div>
        </div>
      )}
```

---

## Résumé des modifications

| Étape | Quoi | Où |
|---|---|---|
| 1 | Ajouter `showSavePopup` + `showNewPopup` | Bloc des `useState` |
| 2 | Ajouter `exportXLSX()` | Juste après `exportJSON` |
| 3 | Barre "Nouveau / Sauvegarder" | Après `</nav>` `)}` du stepper |
| 4 | Popup Sauvegarder | Niveau racine du `return`, hors des blocs `part === X` |
| 5 | Popup Nouveau | Niveau racine du `return`, après la popup Sauvegarder |

---

### Note sur `exportJSON`

La version actuelle contient `setEditMode(false)` à la fin — **supprimer cette ligne**
pour éviter un re-render inattendu lors de l'export depuis les popups.

---

*Généré le 08 avril 2026*
