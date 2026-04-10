# Instructions — Corriger le chargement des exemples
**Fichier : `src/apps/doe/PlanFactoriel.jsx`**

---

## 3 corrections à faire, dans l'ordre

---

### Correction 1 — `loadExample` : synchrone + `setPart(1)`

**Chercher** (vers la ligne 2027) :

```js
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
  } catch (e) {
    console.error("Erreur chargement exemple:", e);
    setLoadError(e.message);
  }
};
```

**Remplacer par** :

```js
const loadExample = (ex) => {
  setLoadError(null);
  try {
    if (!ex._data) throw new Error("Données manquantes pour cet exemple.");
    const { factors: f, responses: r, centerPoint: cp, modelDefault: md, matrix: m } = loadExampleData(ex._data);
    setFactors(f);
    setResponses(r);
    setCenterPoint(cp);
    setModelDefault(md);
    setModels([{ id: 1, name: "Modèle 1", terms: [...md], preset: "default" }]);
    setActiveModelId(1);
    setMatrix(m);
    setLoadedExampleId(ex.file);
    setPart(1);
  } catch (e) {
    console.error("Erreur chargement exemple:", e);
    setLoadError(e.message);
  }
};
```

---

### Correction 2 — Handler "Charger" : capturer `ex` avant de fermer la popup

**Chercher** dans le bouton "Charger" de la popup :

```jsx
onClick={() => {
  setExamplePopup(null);
  loadExample(examplePopup);
}}
```

**Remplacer par** :

```jsx
onClick={() => {
  const ex = examplePopup;
  setExamplePopup(null);
  loadExample(ex);
}}
```

---

### Correction 3 — Sortir la popup du bloc `{part === 0 && (...)}`

**Chercher** ce bloc (la popup est actuellement à l'intérieur de `{part === 0 && ...}`,
juste avant les deux lignes qui ferment ce bloc) :

```jsx
          {/* ── Popup de prévisualisation ── */}
          {examplePopup && (
            ...
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════ PARTIE 1 */}
```

**Remplacer par** (la popup sort du bloc, les deux balises fermantes `</div>` et `)}` remontent) :

```jsx
        </div>
      )}

      {/* ── Popup de prévisualisation exemple ── */}
      {examplePopup && (
        ...
      )}

      {/* ══════════════════════════════════════════════════════ PARTIE 1 */}
```

> **Explication :** quand `loadExample` appelle `setPart(1)`, React démonte tout
> le bloc `{part === 0 && ...}`, y compris la popup qui est dedans. La popup
> disparaît *avant* que `loadExample` ait fini. En la mettant à l'extérieur,
> elle survit au changement de `part` et `loadExample` s'exécute normalement.

---

## Résumé des 3 lignes / blocs à modifier

| # | Quoi | Où chercher |
|---|---|---|
| 1 | `loadExample` — supprimer `async`/`fetch`, ajouter `setPart(1)` | `const loadExample = async (ex) =>` |
| 2 | Handler Charger — `const ex = examplePopup` avant `setExamplePopup(null)` | `onClick={() => { setExamplePopup(null); loadExample(examplePopup);` |
| 3 | Popup — déplacer hors du `{part === 0 && ...}` | `{/* ── Popup de prévisualisation ── */}` |

---

*Généré le 08 avril 2026*
