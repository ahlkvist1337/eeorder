

## Problem

The `calculateProportionalBilling` function in `src/lib/invoiceExport.ts` is used when generating the actual export (PDF/Excel). For V2 orders, article rows have no `objectId` (V2 doesn't use V1 objects), so they always hit the fallback branch (line 81-101) which uses the **full remaining quantity** instead of proportional.

The UI in `InvoicingTab.tsx` has correct V2 proportional logic (lines 131-136), but `calculateProportionalBilling` does not — these two are out of sync.

## Fix

### `src/lib/invoiceExport.ts` — Add V2 proportional logic

In `calculateProportionalBilling`, add V2-aware handling before the V1 object-linkage check. When the order is V2, calculate proportionally based on the number of trucks (units) being invoiced vs total units:

```typescript
export function calculateProportionalBilling(
  order: Order,
  trucksToInvoice: ObjectTruck[],
  previouslyBilled: PreviouslyBilledItem[],
  quantityOverrides?: Record<string, number>
): InvoiceExportArticleRow[] {
  const articleRows = order.articleRows || [];
  const results: InvoiceExportArticleRow[] = [];
  const isV2 = order.dataModelVersion === 2;

  for (const row of articleRows) {
    const prev = previouslyBilled.find(p => p.article_row_id === row.id);
    const prevQty = prev?.total_billed_quantity || 0;
    const remainingQty = row.quantity - prevQty;
    const override = quantityOverrides?.[row.id];

    // V2: proportional by units being invoiced
    if (isV2) {
      const totalUnits = (order.units || []).length;
      const readyCount = trucksToInvoice.length;
      let qty: number;
      if (override !== undefined) {
        qty = Math.min(override, remainingQty);
      } else if (totalUnits === 0) {
        qty = remainingQty;
      } else {
        qty = Math.round((readyCount / totalUnits) * remainingQty);
      }
      qty = Math.max(0, qty);
      if (qty > 0) {
        results.push({ ... row data with qty ... });
      }
      continue;
    }

    // ... existing V1 logic unchanged ...
  }
}
```

This aligns the export logic with the UI suggestion logic.

### Files changed

| File | Change |
|------|--------|
| `src/lib/invoiceExport.ts` | Add V2 proportional branch in `calculateProportionalBilling` |

No database changes needed.

