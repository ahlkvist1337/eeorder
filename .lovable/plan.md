

## Problem

There are two different billing status checks that are out of sync:

1. **Index.tsx** (archive split) uses `o.billingStatus` — the raw database field on the order record
2. **Statistics.tsx** checks individual unit objects/trucks directly (lines 76-83), ignoring the order-level field

When orders are billed via admin override (which sets the order-level `billingStatus` to `'billed'`), they appear in the archive (26 orders) but Statistics doesn't count them (shows only 7) because it only looks at individual truck/object statuses.

The existing `calculateOrderBillingStatus()` function in `src/types/order.ts` also doesn't account for admin overrides — it only aggregates from child items.

## Fix

### 1. `src/types/order.ts` — Respect admin override in `calculateOrderBillingStatus`

If the order-level `billingStatus` is `'billed'` (set by admin override), return `'billed'` immediately before checking child items:

```typescript
export function calculateOrderBillingStatus(order: Order): BillingStatus {
  // Admin override: if order-level status is billed, respect it
  if (order.billingStatus === 'billed') return 'billed';
  
  // ... existing V2/V1 logic unchanged ...
}
```

### 2. `src/pages/Statistics.tsx` — Use `calculateOrderBillingStatus` instead of inline checks

Replace the inline billed/ready checks (lines 76-89) with the shared function:

```typescript
import { calculateOrderBillingStatus } from '@/types/order';

const billedOrders = filteredOrders.filter(o => calculateOrderBillingStatus(o) === 'billed');
const readyForBilling = filteredOrders.filter(o => calculateOrderBillingStatus(o) === 'ready_for_billing');
```

### 3. `src/pages/Index.tsx` — Use `calculateOrderBillingStatus` for archive split

Replace `o.billingStatus` with `calculateOrderBillingStatus(o)` for consistency:

```typescript
const activeOrders = orders.filter(o => calculateOrderBillingStatus(o) !== 'billed');
const archivedOrders = orders.filter(o => calculateOrderBillingStatus(o) === 'billed');
```

| File | Change |
|------|--------|
| `src/types/order.ts` | Respect order-level `billed` override in `calculateOrderBillingStatus` |
| `src/pages/Statistics.tsx` | Use shared function instead of inline truck/object checks |
| `src/pages/Index.tsx` | Use shared function for archive/active split |

No database changes needed.

