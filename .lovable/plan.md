

## Problem

Orders with billing status "Fakturerad" (billed) should appear under "Orderhistorik" instead of only orders that are both `completed` AND `billed`. The "Fakturerad" option should be removed from the billing filter dropdown on the active orders tab since those orders will no longer appear there.

## Changes

### 1. `src/pages/Index.tsx` — Update archive/active split logic

Currently (lines 58-68):
- Active: orders where NOT (`completed` AND `billed`)
- Archive: orders where `completed` AND `billed`

Change to:
- Active: orders where billing status is NOT `billed` (regardless of production status)
- Archive: orders where billing status IS `billed` OR (`completed` AND `billed`)

More precisely: any order whose computed billing status is `billed` goes to archive.

### 2. `src/components/OrderFilters.tsx` — Remove "Fakturerad" from billing filter

Filter the `billingStatusLabels` entries to exclude `billed`, since those orders are now only in the archive tab. Only show `not_ready` and `ready_for_billing`.

### 3. `src/types/order.ts` — No changes needed

The `billingStatusLabels` object stays as-is since it's used elsewhere (e.g., badge display).

| File | Change |
|------|--------|
| `src/pages/Index.tsx` | Archive = billed orders; Active = non-billed |
| `src/components/OrderFilters.tsx` | Remove "Fakturerad" from billing dropdown |

No database changes needed.

