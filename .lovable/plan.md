

## Problem

Multiple places in the codebase only look at V1 data (`order.objects.trucks`) when computing statistics, summaries, and production stats. V2 orders use `order.units` with `unit_objects` instead, so they are invisible to:

1. **Statistics page** (`Statistics.tsx` lines 76-83): "Fakturerade ordrar" and "Klar för fakturering" only check V1 trucks
2. **Production stats hook** (`useProductionStats.ts`): Only queries `object_trucks` table, never `unit_objects` -- so V2 work items don't count for in-progress, waiting, completed today, overdue, or lead time
3. **OrdersTable** (`OrdersTable.tsx` lines 162-196): `getTruckSummary` and `getTruckNumbers` only use V1 trucks

## Proposed Changes

### 1. `src/pages/Statistics.tsx` -- Fix billed/ready counts

Replace the V1-only billing checks (lines 76-83) with logic that handles both models:

```typescript
const billedOrders = filteredOrders.filter(o => {
  if (o.dataModelVersion === 2 && o.units) {
    const allObjects = o.units.flatMap(u => u.objects);
    return allObjects.length > 0 && allObjects.every(ob => ob.billingStatus === 'billed');
  }
  const allTrucks = (o.objects || []).flatMap(obj => obj.trucks || []);
  return allTrucks.length > 0 && allTrucks.every(t => t.billingStatus === 'billed');
});

const readyForBilling = filteredOrders.filter(o => {
  if (o.dataModelVersion === 2 && o.units) {
    return o.units.flatMap(u => u.objects).some(ob => ob.billingStatus === 'ready_for_billing');
  }
  return (o.objects || []).flatMap(obj => obj.trucks || []).some(t => t.billingStatus === 'ready_for_billing');
});
```

### 2. `src/hooks/useProductionStats.ts` -- Include V2 unit_objects

Add a parallel fetch for `unit_objects` table alongside `object_trucks`. Merge both into a unified work-item list for all stat calculations (in-progress, waiting, completed today, overdue, lead time). The lifecycle events table already stores V2 events with the same structure, so no changes needed there.

```typescript
// Fetch both V1 trucks and V2 unit objects
const [trucksResult, unitObjectsResult, eventsResult] = await Promise.all([
  supabase.from('object_trucks').select('id, status, object_id, truck_number'),
  supabase.from('unit_objects').select('id, status, unit_id, name'),
  supabase.from('truck_lifecycle_events').select('...'),
]);

// Merge into unified work items
const allWorkItems = [
  ...(trucksResult.data || []).map(t => ({ id: t.id, status: t.status, name: t.truck_number })),
  ...(unitObjectsResult.data || []).map(o => ({ id: o.id, status: o.status, name: o.name })),
];
```

Then use `allWorkItems` instead of just `trucks` for counting in-progress, waiting, etc.

### 3. `src/components/OrdersTable.tsx` -- Fix getTruckSummary and getTruckNumbers

Add V2 branches:

```typescript
const getTruckSummary = (order: Order) => {
  if (order.dataModelVersion === 2 && order.units) {
    const allObjects = order.units.flatMap(u => u.objects);
    return {
      total: allObjects.length,
      active: allObjects.filter(o => o.status === 'arrived' || o.status === 'started').length,
      completed: allObjects.filter(o => o.status === 'completed').length,
    };
  }
  // ... existing V1 logic
};

const getTruckNumbers = (order: Order): string[] => {
  if (order.dataModelVersion === 2 && order.units) {
    return order.units.map(u => u.unitNumber ? `#${u.unitNumber}` : 'Enhet');
  }
  // ... existing V1 logic
};
```

Also fix the `getProductionProgress` function (lines 130-182) to handle V2 step statuses from `unit.objects.steps`.

| File | Change |
|------|--------|
| `Statistics.tsx` | V2-aware billed/ready filtering |
| `useProductionStats.ts` | Fetch and merge `unit_objects` into stats |
| `OrdersTable.tsx` | V2-aware truck summary, numbers, and production progress |

No database changes needed.

