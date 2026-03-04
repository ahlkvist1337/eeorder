

## Problem

The `markLocalUpdate()` timestamp-based guard (2 seconds) is still not enough. Even though we added `markLocalUpdate()` after every `await`, the realtime events from the last DB writes can arrive **after** the 2-second window expires post-last-write. The timestamp approach is inherently racy -- it depends on network latency being under 2 seconds, which isn't guaranteed.

V1 worked because `updateTruckStepStatus` had only 2 simple DB writes (no cascade), so the chain completed fast enough.

## Fix: Operation-in-progress counter

Replace the fragile timestamp-only approach with a **counter + trailing guard** pattern:

1. Add `operationInProgressRef = useRef<number>(0)` alongside `lastLocalUpdateRef`
2. In `debouncedFetch`, skip if `operationInProgressRef.current > 0` (hard block during operations)
3. Wrap each long update function in `operationInProgressRef.current++` / `operationInProgressRef.current--` + `markLocalUpdate()` in a `finally` block
4. Remove all the intermediate `markLocalUpdate()` calls (no longer needed -- the counter handles the guard during the chain, and the trailing `markLocalUpdate()` in `finally` handles the 2-second post-operation window)

### File: `src/contexts/OrdersContext.tsx`

**Add ref** (near line 484):
```typescript
const operationInProgressRef = useRef<number>(0);
```

**Update debouncedFetch** (line 492-494):
```typescript
if (operationInProgressRef.current > 0) return;
const timeSinceLocalUpdate = Date.now() - lastLocalUpdateRef.current;
if (timeSinceLocalUpdate < 2000) return;
```

**Wrap these functions** in `operationInProgressRef.current++` at the start, and a `finally` block with `operationInProgressRef.current--; markLocalUpdate();`:
- `updateUnitStepStatus`
- `updateUnitObjectStatus`
- `updateUnitObjectBillingStatus`
- `updateTruckStepStatus`
- `updateTruckStatus`
- `updateTruckBillingStatus`
- `updateProductionStatus`
- `updateOrderStep`

Remove all intermediate `markLocalUpdate()` calls from these functions (they become unnecessary with the counter).

| Change | Detail |
|--------|--------|
| New ref | `operationInProgressRef` counter |
| debouncedFetch | Hard-block while counter > 0 |
| 8 update functions | Wrap in counter increment/decrement with finally + trailing markLocalUpdate |
| Cleanup | Remove ~40 intermediate markLocalUpdate calls |

No database changes. No new dependencies.

