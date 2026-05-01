# DOE model default visual state design

## Problem

In the PlanFactoriel model editor, users can load a JSON file whose `model_default` defines the default active terms. The current UI already loads those terms correctly, but the term list presentation is confusing because users can interpret additional available terms as if they were also active by default.

For the `modele_4facteurs_lineaire.json` example, only these terms should be highlighted as active by default:

- `X1`
- `X2`
- `X3`
- `X4`
- `X1X2`

All other available terms should stay visible but appear inactive by default.

## Goal

Make the default visual state unambiguous:

- terms present in `model_default` must appear active in green on initial load
- terms absent from `model_default` must remain visible but appear inactive in gray/struck style
- no change to model computation, presets, export, or statistical behavior

## Recommended approach

Update only the presentation logic of the term pills in the model editor.

The active/inactive styling must be driven exclusively by whether a term is present in the active model term list for the current model. Since the example loader already initializes the active model from `model_default`, this keeps the behavior aligned with the JSON without changing model state logic.

## Alternatives considered

### 1. Presentation-only fix

Keep the current loading logic and correct only the pill styling.

**Pros**

- smallest safe change
- no risk to calculations or export
- directly matches the user expectation

**Cons**

- does not introduce a separate “recommended by JSON” visual state

### 2. Add separate JSON-recommended state

Track a second state layer for “recommended by JSON” terms.

**Pros**

- could support richer UI later

**Cons**

- unnecessary complexity for the current need
- risks divergence between displayed and active model state

## Detailed design

### Data flow

No data-flow change is needed.

The existing flow remains:

1. `loadExampleData()` reads `exFile.model_default`
2. `PlanFactoriel` stores it in `modelDefault`
3. the active model is initialized with `terms: [...md]`
4. the UI renders term pills from the full available term list

The only required adjustment is in the rendering rule for those pills so that inactive terms are visually inactive and active terms are visually active.

### Component scope

Only the term-pill rendering inside `src/apps/doe/PlanFactoriel.jsx` should change.

No changes are needed in:

- `modelUtils.js`
- JSON example format
- preset generation
- export logic
- result panels

### Visual behavior

For each displayed term pill:

- if the term is included in `activeModel.terms`, render it in the existing active green style
- otherwise render it in the inactive gray/struck style

This rule must hold on initial load from JSON and after later user edits.

### Error handling

No new error handling is required because this change does not alter parsing or model state.

### Testing

Verification should confirm:

1. loading `modele_4facteurs_lineaire.json` shows only `X1`, `X2`, `X3`, `X4`, `X1X2` in green
2. terms such as `X1X3`, `X1X4`, `X2X3`, etc. remain visible but inactive
3. toggling a term still updates its style correctly
4. lint and build still pass

## Scope boundary

This change does not attempt to:

- hide inactive terms
- redesign presets
- change default model computation
- alter model selection workflows
