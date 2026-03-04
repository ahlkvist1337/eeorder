

# Plan: Migrate XML import to V2 and remove V1 defaults

## Summary

XML import currently creates V1 orders (`dataModelVersion: 1`, `OrderObject[]` + `OrderStep[]`), while manual creation uses V2 (`OrderUnit[]`). This causes mismatches in status cascading, billing, and production views.

## Changes

### 1. `src/pages/CreateOrder.tsx` — Switch XML import to V2

**Remove** V1 state variables:
- `xmlObjects` (`OrderObject[]`) → replace with `xmlUnits` (`OrderUnit[]`)
- `xmlSteps` (`OrderStep[]`) → no longer needed (steps live inside unit objects)

**Replace** `OrderObjectsEditor` with `UnitsEditor` in the XML import UI (same component used by manual creation).

**Update** `handleXmlSubmit`:
- Set `dataModelVersion: 2`
- Use `units: xmlUnits` instead of `objects: xmlObjects`
- Remove `steps: xmlSteps`

**Reset** handler also updated to clear `xmlUnits` instead of `xmlObjects`/`xmlSteps`.

### 2. `src/contexts/OrdersContext.tsx` — Default to V2

Two lines to change:
- Line 177: `(dbOrder as any).data_model_version ?? 1` → `?? 2`
- Line 589: `order.dataModelVersion ?? 1` → `?? 2`

This ensures any order without an explicit version defaults to V2.

### 3. No other file changes needed

The V1/V2 conditionals in `order.ts`, `InvoicingTab.tsx`, `ProductionScreen.tsx`, `OrderDetails.tsx`, and `ProductionTruckCard.tsx` will continue to work — they just won't hit V1 branches for new orders. Existing V1 orders in the database remain supported.

## Affected files

| File | Change |
|------|--------|
| `src/pages/CreateOrder.tsx` | Replace V1 objects/steps state with V2 units; use `UnitsEditor` for XML; set `dataModelVersion: 2` |
| `src/contexts/OrdersContext.tsx` | Default `data_model_version` fallback from `1` to `2` (2 lines) |

