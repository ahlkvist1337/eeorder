

# Fix: V2 drag persistence — add sort_order to unit_objects and fix routing

## Root cause
1. `handleDragEnd` skips V2 items entirely (line 218: `continue`)
2. `handleResetSorting` routes V2 to `order_units` table — wrong, should be `unit_objects`
3. `unit_objects` table lacks a `sort_order` column

## Changes

### 1. Database migration
Add `sort_order` column to `unit_objects`:
```sql
ALTER TABLE public.unit_objects ADD COLUMN sort_order integer;
```

### 2. `src/pages/ProductionScreen.tsx`

**`handleDragEnd`** (lines 216-223): Remove the skip. Route V2 items to `unit_objects`, V1 to `object_trucks`. Add debug log.

```typescript
for (const update of updates) {
  const isV2 = v2UnitObjectIds.has(update.id);
  const table = isV2 ? 'unit_objects' : 'object_trucks';
  console.log('Drag end - updating table:', table, 'for item', update.id, 'to position', update.sort_order);
  await supabase.from(table).update({ sort_order: update.sort_order }).eq('id', update.id);
}
```

**`handleResetSorting`** (line 230): Change `'order_units'` to `'unit_objects'` for V2 items.

### 3. `src/pages/ProductionScreen.tsx` — FlatTruck builder
In `getActiveTrucks` (line ~53), read `sort_order` from `unitObject` (obj) instead of hardcoding `unit.sortOrder`:
```typescript
sortOrder: obj.sort_order ?? unit.sortOrder,
```
This requires the `UnitObject` type to include `sortOrder`.

### 4. `src/types/order.ts`
Add `sortOrder?: number | null` to `UnitObject` interface (if not already present).

### 5. `src/contexts/OrdersContext.tsx`
Map `sort_order` from DB to `sortOrder` on unit objects when hydrating.

| File | Change |
|------|--------|
| DB migration | Add `sort_order` to `unit_objects` |
| `src/pages/ProductionScreen.tsx` | Fix table routing in drag+reset; add debug log |
| `src/types/order.ts` | Add `sortOrder` to `UnitObject` |
| `src/contexts/OrdersContext.tsx` | Map `sort_order` field for unit objects |

