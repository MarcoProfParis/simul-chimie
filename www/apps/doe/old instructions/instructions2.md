# Instructions — Suppression de la barre latérale (sidebar)
**Fichier : `src/apps/doe/PlanFactoriel.jsx`**

---

## Ce qui est supprimé

- Le composant `Dialog` sidebar (slide-in depuis la gauche) et tout son contenu
- Le state `sidebarOpen` / `setSidebarOpen`
- Le state `importedExamples` / `setImportedExamples`
- Le bouton hamburger `Bars3Icon` en haut de la Partie 1
- Les appels `setSidebarOpen(false)` dans `loadExample`, `resetToNew`, `validateAndImport`
- L'import `Bars3Icon` s'il n'est plus utilisé ailleurs

---

## Étape 1 — Supprimer les states

Chercher et **supprimer** ces deux lignes dans le bloc des `useState` :

```js
const [sidebarOpen, setSidebarOpen] = useState(false);
```
```js
const [importedExamples, setImportedExamples] = useState([]);
```

---

## Étape 2 — Nettoyer `loadExample`

Chercher dans `loadExample` :
```js
setSidebarOpen(false);
```
**Supprimer** cette ligne (garder `setPart(1)` juste en dessous).

---

## Étape 3 — Nettoyer `resetToNew`

Chercher dans `resetToNew` :
```js
setSidebarOpen(false);
```
**Supprimer** cette ligne.

---

## Étape 4 — Nettoyer `validateAndImport`

Chercher dans `validateAndImport` :
```js
setSidebarOpen(false);
```
**Supprimer** cette ligne.

---

## Étape 5 — Supprimer le bloc Dialog sidebar

Dans le `return (`, chercher le bloc entier suivant et **le supprimer entièrement**
(de `{/* ── BARRE LATÉRALE ── */}` jusqu'à la fermeture `</Dialog>`) :

```jsx
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
            className="pointer-events-auto w-72 transform transition ..."
          >
            <div className="flex h-full flex-col bg-white dark:bg-gray-900 shadow-xl overflow-y-auto">
              ... (tout le contenu de la sidebar : header, import JSON, nouveau plan vide, liste EXAMPLE_FILES, exemples importés)
            </div>
          </DialogPanel>
        </div>
      </div>
    </div>
  </Dialog>
)}
```

> **Repère de fin :** la fermeture du bloc est `</Dialog>` suivi du commentaire
> `{/* ── STEPPER ── */}`. Tout ce qui est entre `{/* ── BARRE LATÉRALE ── */}`
> et ce commentaire est à supprimer.

---

## Étape 6 — Supprimer le bouton hamburger en Partie 1

Dans la Partie 1, chercher ce bloc et **le supprimer entièrement** :

```jsx
<div className="flex items-center justify-between mb-4">
  <button onClick={() => setSidebarOpen(true)}
    className="flex items-center gap-2 rounded-lg border border-gray-200 ...">
    <Bars3Icon className="size-4" />
    {loadedExampleId
      ? <span>Exemple chargé : <span className="font-medium">...</span></span>
      : "Charger un exemple / Nouveau plan"}
  </button>
</div>
```

---

## Étape 7 — Nettoyer les imports inutilisés

Dans les imports en haut du fichier, **supprimer** `Bars3Icon` si elle n'est plus
utilisée ailleurs (vérifier avec une recherche dans le fichier) :

```js
import {
  ExclamationTriangleIcon,
  Bars3Icon,          // ← supprimer cette ligne
  XMarkIcon,
  PlusIcon,
  TrashIcon,
  ArrowPathIcon,
  BookOpenIcon,
} from "@heroicons/react/24/outline";
```

> `BookOpenIcon` était aussi utilisée dans la sidebar. Vérifier si elle est encore
> utilisée ailleurs dans le fichier (ex: dans `HelpDrawer.jsx`). Si non, la supprimer
> aussi de cet import.

---

## Résultat final

Après ces suppressions, le composant ne contient plus aucune référence à la sidebar.
La navigation vers les exemples passe **uniquement par la page d'accueil** (`part === 0`).

Les states `sidebarOpen` et `importedExamples` n'existent plus — si d'autres
endroits du code y font encore référence (ex: carte "Exemples" qui appelait
`setSidebarOpen(true)`), **remplacer** `setSidebarOpen(true)` par `setPart(0)`
pour revenir à l'accueil.

---

*Généré le 08 avril 2026*
