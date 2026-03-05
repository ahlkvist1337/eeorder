

## Problem

The "previously billed" tracking relies entirely on `invoice_export_items` records. For this order, no such records exist (likely billed via admin override or a previous export that didn't save items correctly). So `prevQty = 0`, meaning:
- "Antal" shows 4 (correct — that's the article row total)
- "Att fakturera" suggests 2 (correct proportional calc)
- But the input `max` allows up to 4 instead of capping at 3 (since 1 unit is already billed)

The system needs a fallback: when `invoice_export_items` has no data, derive previously billed quantity from the count of units with `billingStatus === 'billed'`.

## Fix

### `src/components/InvoicingTab.tsx`

**1. Add fallback billed calculation in `getSuggestedQuantity`:**

When `prevQty` from DB is 0 but there are billed units, compute it from unit ratios:

```typescript
// Fallback: derive from billed units count
const billedUnits = allTrucks.filter(t => t.billingStatus === 'billed').length;
const prevQtyFromUnits = allTrucks.length > 0 
  ? Math.round((billedUnits / allTrucks.length) * row.quantity) 
  : 0;
const effectivePrevQty = Math.max(prevQty, prevQtyFromUnits);
const remaining = row.quantity - effectivePrevQty;
```

**2. Fix the `max` attribute on the quantity input** to use the same effective remaining:

Currently: `max={row.quantity - prevQty}` where prevQty comes only from DB records.
Fix: compute effective prevQty the same way and use it for max.

**3. Apply same fallback in `invoiceExport.ts`** `calculateProportionalBilling` so the export also respects billed units.

### `src/lib/invoiceExport.ts`

In the V2 branch, add the same fallback logic: if `prevQty` from DB is 0, derive it from billed unit count.

| File | Change |
|------|--------|
| `InvoicingTab.tsx` | Fallback prevQty from billed units count; fix max on input |
| `invoiceExport.ts` | Same fallback in V2 proportional branch |

No database changes needed.

