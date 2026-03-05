

## Problem Analysis

### 1. Step status jump-back (root cause found)

In `updateUnitStepStatus`, there are multiple `setOrders` calls. The first one (line 1716) correctly applies the step status change. But the second one (line 1814) overwrites it because `allObjectsUpdated` (line 1798) is computed from stale `unit.objects` captured at function start (line 1698), which doesn't include the step change. The objects array written to state at line 1824 has the OLD step statuses, reverting the visual update.

```text
Timeline:
1. setOrders(step → completed)     ← correct, user sees "Klar"
2. ... DB writes ...
3. allObjectsUpdated = unit.objects.map(...)  ← uses STALE unit from line 1698
4. setOrders(objects: allObjectsUpdated)      ← overwrites step back to old status!
```

### 2. Invoice quantity not proportional / previously billed stale

Two sub-issues:
- **`billedLoaded` never resets**: After an export inserts records into `invoice_export_items`, the `billedLoaded` flag stays `true` so the previously billed data is never re-fetched. On the second billing, `prevQty = 0` and the user can select the full quantity.
- **Proportional calc uses `row.quantity` instead of `remaining`**: Line 130 calculates `(readyCount / totalCount) * row.quantity` then caps with `remaining`. This is correct for first billing but misleading for subsequent. Should use `remaining` as the base for proportion.

## Proposed Changes

### File: `src/contexts/OrdersContext.tsx`

**Fix step jump-back** (lines 1797-1802): Include the step status change in `allObjectsUpdated` so it doesn't overwrite the optimistic step update:

```typescript
const allObjectsUpdated = unit.objects.map(ob => {
  // Preserve the step status change from earlier in this function
  const updatedSteps = ob.steps.map(s => s.id === stepId ? { ...s, status: newStatus } : s);
  if (ob.id === parentObj.id) {
    return { 
      ...ob,
      steps: updatedSteps,
      status: targetObjectStatus!,
      ...(rollingBackBilling ? { billingStatus: 'not_billable' as TruckBillingStatus } : {}),
    };
  }
  return { ...ob, steps: updatedSteps };
});
```

### File: `src/components/InvoicingTab.tsx`

**Fix 1 -- Reset billedLoaded** when orders change or export dialog closes (so previously billed data is re-fetched):

```typescript
// Reset billedLoaded when orders change (new billing records might exist)
useEffect(() => {
  setBilledLoaded(false);
}, [orders]);
```

And reset after export dialog closes:
```typescript
// In the exportDialogOpen onChange handler, reset billedLoaded
onOpenChange={(open) => {
  setExportDialogOpen(open);
  if (!open) setBilledLoaded(false);
}}
```

**Fix 2 -- Proportional calc** (line 130): Use `remaining` instead of `row.quantity` so the proportion is based on what's left to bill:

```typescript
const proportional = (readyCount / totalCount) * remaining;
```

This ensures that for a second billing, the quantity is proportional to the remaining unbilled amount.

| File | Change | Bug Fixed |
|------|--------|-----------|
| `OrdersContext.tsx` | Include step update in `allObjectsUpdated` | Step status jump-back |
| `InvoicingTab.tsx` | Reset `billedLoaded` on orders change + dialog close | Stale previously billed data |
| `InvoicingTab.tsx` | Use `remaining` in V2 proportional calc | Wrong quantity suggestion |

No database changes needed.

