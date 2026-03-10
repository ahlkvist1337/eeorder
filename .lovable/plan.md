

## Plan

### Problem
1. **Billing stats use unfiltered `orders`** — the last change made billing stats ignore the time filter. User wants this reverted so billing stats follow the time filter like everything else.
2. **Zero-price orders follow time filter** — should always show ALL orders with 0-price articles regardless of selected period.
3. **Billed orders show in "Aktuella ordrar"** — Index.tsx already uses `calculateOrderBillingStatus` which checks admin override first (line 59). Need to verify this is working; if not, the issue is likely that the order-level `billingStatus` field isn't set to `'billed'` for all overridden orders, or the function has a bug.

### Changes

#### 1. `src/pages/Statistics.tsx` — Revert billing stats to use `filteredOrders`

Lines 77-79: Change `orders.filter(...)` back to `filteredOrders.filter(...)` for both `billedOrders` and `readyForBilling`. Remove `orders` from the `useMemo` dependency on line 108.

#### 2. `src/pages/Statistics.tsx` — Zero-price uses all orders

Lines 110-117: Change `zeroPriceOrders` to use `orders` instead of `filteredOrders`. Update subtitle on line 316 to clarify it shows all orders.

#### 3. `src/pages/Index.tsx` — Verify archive split

Lines 58-64 already use `calculateOrderBillingStatus(o)` which respects admin override (`order.billingStatus === 'billed'`). This should work correctly. If orders still appear in "Aktuella" with status "Fakturerad", I'll check how `calculateOrderBillingStatus` handles the case and ensure the function in `src/types/order.ts` is correct (the admin override on line ~233 was added in a previous edit).

