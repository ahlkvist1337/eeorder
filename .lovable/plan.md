

## Problem

Step statuses "jump back" because the 2-second realtime guard window expires before all sequential database operations complete. Here is the timeline:

1. User clicks step status badge
2. `markLocalUpdate()` is called ONCE at the start (timestamp = T)
3. Optimistic UI update shows new status immediately
4. Sequential `await` chain begins: `unit_object_steps.update` → `truck_status_history.insert` → `unit_objects.update` → `truck_lifecycle_events.insert` → `order_units.update` → `orders.update`
5. Each DB write triggers a Supabase realtime event
6. The later events arrive at T + 3-5 seconds, AFTER the 2-second guard has expired
7. `debouncedFetch` runs → `fetchOrders()` overwrites optimistic state with stale data → step "jumps back"

## Fix

Add `markLocalUpdate()` after every `await` in the long chains, so the 2-second guard window keeps getting extended. This is the minimal change -- no restructuring, no `Promise.all`, no new logic.

### Files to change

**`src/contexts/OrdersContext.tsx`** -- add `markLocalUpdate()` after each `await` in:

1. **`updateUnitStepStatus`** (line 1672-1851): Add after each of the ~8 `await` calls (lines 1722, 1728, 1771, 1774, 1797, 1817, 1830-1835, 1841-1846)

2. **`updateUnitObjectStatus`** (line 1878-2037): Add after each of the ~8 `await` calls (lines 1946, 1949, 1963, 1981, 2004-2009, 2015-2020, 2031, 2079)

3. **`updateUnitObjectBillingStatus`** (line 2039-2086): Add after each `await` (lines 2066, 2079)

4. **`updateTruckStepStatus`** (V1 equivalent, if still used): Same pattern

No other files change. No database changes. No new dependencies.

