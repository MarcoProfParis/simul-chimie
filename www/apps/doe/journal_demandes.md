# Journal des demandes — PlanFactoriel.jsx
**BTS Métiers de la Chimie · Session du 08 avril 2026**

---

## Session précédente (compactée)

### 1. Mode compact & EffetsPanel
- Boutons compact ne fonctionnaient plus → correction
- Partie 1 : réduire margins et paddings en mode compact
- Partie 2 : n'afficher que les 10 premières lignes du tableau en mode compact
- Partie 4 : raccourcir les libellés de l'onglet calculs

### 2. Bug Partie 3 blanche
- Rien ne s'affichait en Partie 3 → `cardCls`/`cardSpace` déclarés dans la IIFE de la Partie 4 mais utilisés en Partie 3 → déplacés au niveau composant

### 3. EffetsPanel — mini-tableau niveaux
- Sous les boutons de termes, afficher un mini-tableau −1 : 50°C / 0 : 65°C / +1 : 80°C
- Colonne Y : vert si +1, rouge si −1

### 4. Popup "Montrer les calculs" draggable
- La popup doit être mobile et déplaçable par l'utilisateur (utile pour un prof en cours)
- Les étapes 2 et 3 disparaissent dans la popup (seul résultat + interprétation courte)
- Header `cursor-grab`, position `fixed` via `popupPos` state, listeners `mousemove`/`mouseup` sur `window`

### 5. Matrice des essais — colonnes uniformes
- Taille des colonnes ajustée à la longueur du nom du facteur → uniformiser en plus petit et uniforme
- Colonne réponse dans Étape 1 : utiliser les mêmes couleurs que le facteur/interaction choisi (rouge/bleu, pas jaune/gris)

### 6. Pareto interactif
- Bouton × sur chaque barre → retire le terme du modèle (`preset: "custom"`)
- Zone "Ajouter un terme" : badges filtrés (ordre ≤ 2, pas de quadratiques purs)
- Bug page blanche sur clic Pareto → `nRunsLocal`/`maxTermsLocal` calculés localement pour éviter bug de scope IIFE

### 7. Écran d'accueil (part=0)
- Remplacer la Partie 1 par un écran d'accueil avec 3 cartes : "Nouveau plan", "Charger JSON", "Importer Excel/CSV"
- Stepper conditionnel : `{part > 0 && <nav...>}`
- Modal "Nouveau plan" avec section métadonnées + boutons 1–6–+ pour facteurs/réponses

### 8. Bouton "Exemple chargé" → popup écran d'accueil
- Clic → popup avec le même écran que la page d'accueil (changer d'exemple, créer un nouveau plan)
- `ExcelImportModal` extrait en sous-composant React (hooks dans IIFE interdits)

### 9. Dans Pareto : "Ajouter un terme au modèle"
- N'afficher que les termes qu'il est possible d'ajouter (pas déjà présents, ordre ≤ 2)

---

## Session courante

### 10. Résidus — graphe agrandi + interaction points
**Demande :** retirer le tableau, agrandir le graphe des résidus et les points  ; clic = détail + possibilité de supprimer le point ; montrer la valeur de la somme des résidus.

**Réalisé :**
- `ResidualPlot` refait en 560×320 (vs 480×220), grille graduée, points r=6, numérotés
- Survol : tooltip HTML overlay avec Ŷ, résidu brut, résidu normé
- Clic : popup HTML `position:absolute` `zIndex:200` avec Y/Ŷ/résidu/normé + bouton "✕ Exclure ce point"
- Somme des résidus affichée sous le graphe (verte si ≈0, ambre sinon)
- Tableau supprimé, Q-Q plot conservé

### 11. Tabs par modèle dans tous les onglets Partie 4
**Demande :** ajouter des tabs pour passer d'un modèle à l'autre (pareil pour les autres tabs).

**Réalisé :**
- Tabs de sélection dans : Calcul effets, Coefficients, Résidus, ANOVA, Pareto, Isoréponses, Surface 3D
- Filtrage via `if (m.id !== activeModelId) return null` dans chaque `models.map()`

### 12. Bug z-index popup résidus + tabs modèle ne fonctionnaient pas
**Demande :** z-index plus fort sur le survol, popup plus compacte, bouton supprimer toujours visible ; tabs modèle ne fonctionnaient pas dans Calculs effets, Coefficients, ANOVA, Pareto, Isoréponse, 3D.

**Réalisé :**
- Popup clic → div HTML `position:absolute` avec `zIndex:200` (plus de `foreignObject` SVG)
- Fix tabs : le `models.map()` itérait sur tous les modèles sans filtrer → ajout `if (m.id !== activeModelId) return null` dans les 6 onglets

### 13. Bouton "Exemple chargé" — refonte
**Demande :** remplacer le bouton par deux boutons : "Exemple chargé" (popup save JSON/CSV/Excel) + "Nouveau" (retour accueil). Si données modifiées, proposer d'abord de sauvegarder avant de quitter.

**Réalisé :**
- Bouton "Chargé : [titre]" → popup `showExportPopup` avec 3 formats (JSON, CSV, Excel)
- Bouton "Nouveau" (icône maison) → détecte si des réponses ont été saisies → popup `showQuitConfirm` "Sauvegarder avant de quitter ?" avec 3 formats + "Quitter sans sauvegarder"
- Dans tous les cas : retour `part=0`

### 14. Export XLSX — vrai format + nombres
**Demande :** avoir `.xlsx` (pas `.xls`) et mettre en format nombre quand c'est possible.

**Réalisé :**
- `exportXLSX` refaite avec SheetJS (`xlsx.full.min.js`) chargé dynamiquement
- Fonction `toVal()` : `Number(v)` → nombre natif si pas NaN, sinon string
- Feuille "Facteurs" ajoutée dans le classeur
- Bug apostrophe `'Plan d'expériences'` → guillemets doubles

### 15. Suppression boutons Compact
**Demande :** retirer les boutons compact qui ne servent plus à rien.

**Réalisé :**
- Bouton compact global (après le stepper) supprimé
- Bouton compact dans la barre d'onglets Partie 4 supprimé
- Variables `isCompact`/`cardCls`/`cardSpace` conservées pour les styles

### 16. Import Excel
**Demande :** ajouter la possibilité d'importer un exemple au format Excel (pas seulement le modèle).

**Réalisé :**
- Fonction `importFromExcel()` avec SheetJS
- Détection flexible des colonnes : `coded_Xi`, `Xi_code`, `real_Xi`, `Xi_reel`
- Lecture feuille "Facteurs" si disponible → noms/unités/niveaux
- Zone drag & drop + bouton "Parcourir" dans le modal
- Gestion d'erreurs avec message précis
- Modèle `.xlsx` téléchargeable avec feuilles Plan + Facteurs pré-remplies
- Bug écran blanc → `useState` dans IIFE interdit → `ExcelImportModal` extrait en sous-composant

### 17. Modal Excel — "Importer Excel/CSV", popup plus grande, tabs format
**Demande :** changer "Excel/CSV" en "Importer Excel/CSV" ; popup plus grande ; pour le format attendu, indiquer que pour Excel il faut deux onglets et mettre un tab pour chaque onglet.

**Réalisé :**
- Label carte → "Importer Excel / CSV"
- Modal : `max-w-xl`, `max-h-[90vh] overflow-y-auto`, header sticky
- Section format avec tabs "Onglet Plan" / "Onglet Facteurs"
- Boutons avec `mt-2`

### 18. Somme des résidus — correction conceptuelle
**Demande :** dans quel cas la somme des résidus peut être non nulle ? → discussion → la somme des résidus est **toujours 0** avec une constante dans le modèle (propriété MCO). Remplacer par des indicateurs plus utiles.

**Réalisé :**
- Somme des résidus remplacée par :
  - **SCE** (Somme des Carrés des Écarts = Σrᵢ²)
  - **Résidu normé max** (rouge si > 2 → point aberrant potentiel)

### 19. Bug export CSV/Excel — matrice vide après renommage
**Demande :** quand on charge un exemple (ex : Résine A) et qu'on change le nom en "Résine A1", l'export n'a plus la matrice.

**Cause :** `setEditMode(false)` dans `exportJSON` déclenchait un re-render.

**Réalisé :**
- Suppression de `setEditMode(false)` dans `exportJSON`
- Refonte complète des formats d'export (3 feuilles/sections)

### 20. Refonte format d'export — 3 feuilles
**Demande :** format plus simple — page 1 métadonnées, page 2 facteurs (X1, X2…) + réponses (Y1, Y2…) avec noms libres, page 3 matrice avec en-têtes X1_niveau / Y1 seulement (sans le nom ni l'unité).

**Réalisé :**
- **CSV** : 3 sections `=== MÉTADONNÉES ===` / `=== FACTEURS ===` / `=== RÉPONSES ===` / `=== MATRICE ===`
- **XLSX** : 3 feuilles — Métadonnées / Facteurs / Matrice
- En-têtes matrice : `X1_niveau`, `X2_niveau`… (−1/0/+1 numériques), `Y1`, `Y2`…
- Colonnes réelles supprimées de la matrice (déductibles depuis la feuille Facteurs)
- Nom de fichier = `editMeta.title` si renseigné

### 21. Métadonnées lues depuis `exampleFiles.js`
**Demande :** les champs `title`, `context`, `difficulty`, `real_data` présents dans `exampleFiles.js` doivent être lus lors de l'import (JSON, Excel, CSV). Pour Excel : séparer Facteurs et Réponses en deux feuilles + ajouter un tab "Info" au départ.

**Réalisé :**
- `loadExample()` → remplit `editMeta` depuis `ex.title/context/difficulty/real_data` + `data.meta`
- `importFromJsonText()` → remplit `editMeta` depuis `data.meta`
- `importFromExcel()` → lit feuille "Métadonnées" (insensible casse) → remplit `editMeta` ; lit feuille "Réponses" → noms/unités
- Export XLSX : 4 feuilles séparées (Métadonnées / Facteurs / **Réponses** / Matrice)
- `ExcelImportModal` : 5 onglets — ① Info / ② Métadonnées / ③ Facteurs / ④ Réponses / ⑤ Matrice
- Modèle `.xlsx` téléchargeable avec les 5 feuilles pré-remplies

### 22. Feuille Facteurs — supprimer les réponses
**Demande :** supprimer les réponses dans la feuille Facteurs de l'export Excel.

**Réalisé :** suppression du bloc `['RÉPONSES']` + `responses.map()` dans la construction de `wsFact`.

### 23. Bug matrice vidée au renommage d'un facteur/réponse
**Demande :** quand on charge un exemple et qu'on change le nom d'un facteur ou réponse, la matrice perd les valeurs des réponses.

**Cause :** `updateFactor()` appelait `recompModel(f)` pour toute modification, y compris `name` et `unit`. Or `recompModel` contient `setMatrix(null)`.

**Réalisé :**
```js
if (key !== "name" && key !== "unit") recompModel(f);
```
Le modèle n'est recalculé (et la matrice n'est vidée) que pour les changements structurels.

### 24. Modal "Nouveau plan" — métadonnées + boutons
**Demande :** dans la popup "Nouveau plan", demander les métadonnées avec des valeurs par défaut et remplacer les sliders par des boutons 1, 2, 3, 4, 5, 6 et + pour en mettre plus.

**Réalisé :**
- Métadonnées pré-remplies à l'ouverture : titre "Mon plan d'expériences", difficulté "débutant"
- Champs : Titre, Contexte, Niveau (débutant/intermédiaire/avancé), case "Données réelles"
- Boutons 1–6 + bouton `+` qui affiche le nombre courant si > 6 (idem pour réponses 1–4 + +)
- Avertissement si > 6 facteurs (plan très large) avec bouton `−1`
- Réinitialisation à chaque ouverture du modal

---

## Bugs récurrents notés

| Type | Règle |
|---|---|
| Apostrophe dans string JS | `'Plan d'exp...'` → `"Plan d'exp..."` (guillemets doubles) |
| Hook dans IIFE | Jamais `useState()` dans `{cond && (() => { ... })()}` → sous-composant React |
| `setEditMode(false)` dans export | Provoque re-render → à éviter |
| `cardCls` scope | Déclarer au niveau composant, pas dans les IIFE des parties |
| `models.map` sans filtre | Toujours filtrer par `activeModelId` dans les onglets Partie 4 |
| `recompModel` sur renommage | Ne pas vider la matrice pour les changements cosmétiques (name/unit) |

---

*Fichier généré le 08 avril 2026*
