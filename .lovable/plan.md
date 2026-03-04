

## Issues Found

### 1. Search with `#` doesn't find V2 units
The search in `OrdersTable` only looks at V1 truck numbers (`order.objects.trucks.truckNumber`). It never searches V2 unit numbers (`order.units.unitNumber`), so searching for `#1` finds nothing in V2 orders.

**Fix** (`src/components/OrdersTable.tsx`, lines 48-65): Add V2 unit numbers to the search pool:
```typescript
// Add V2 unit numbers
const allUnitNumbers = (order.units || [])
  .map(u => (u.unitNumber || '').toLowerCase());
```
Then add `allUnitNumbers.some(un => un.includes(query))` to the `matchesSearch` condition.

---

### 2. InvoicingTab not showing "Delvis fakturerbar" order
**Root cause**: Bug in `updateUnitObjectStatus` (line 2042-2054). When all objects in a unit reach "delivered", lines 1997-2009 correctly set all objects' `billingStatus` to `ready_for_billing` in DB and state. But then lines 2042-2054 recalculate unit billing using the **old** object billing statuses (captured at function start), overwriting the correct `ready_for_billing` with `not_billable`.

The InvoicingTab checks `u.billingStatus === 'ready_for_billing'` at unit level, so the order never appears.

**Fix** (`src/contexts/OrdersContext.tsx`, lines 2042-2054): After the "all objects delivered" block (line 1997-2009) sets objects to `ready_for_billing`, also set the unit billing directly and skip the redundant aggregation:

```typescript
if (updatedObjs.every(ob => finishedObjStatuses.includes(ob.status))) {
  // All delivered → set all objects AND unit to ready_for_billing
  for (const ob of updatedObjs) {
    await supabase.from('unit_objects').update({ billing_status: 'ready_for_billing' }).eq('id', ob.id);
  }
  await supabase.from('order_units').update({ billing_status: 'ready_for_billing' }).eq('id', unitId);
  setOrders(prev => prev.map(o => {
    if (o.id !== orderId) return o;
    return {
      ...o,
      units: o.units?.map(u => u.id === unitId ? {
        ...u,
        billingStatus: 'ready_for_billing' as TruckBillingStatus,
        objects: u.objects.map(ob => ({ ...ob, billingStatus: 'ready_for_billing' as TruckBillingStatus })),
      } : u),
    };
  }));
} else {
  // Only run billing aggregation when NOT all delivered
  const billingNewStatus = resetBilling ? 'not_billable' : obj.billingStatus;
  // ... existing aggregation logic ...
}
```

---

### 3. Step statuses still jumping back (visual bug)
The history log confirms changes ARE saved to DB. The visual revert is likely caused by the same pattern: multiple sequential `setOrders` calls within the same function, where later calls don't account for changes made by earlier calls (they all reference the stale `unit`/`order` captured at function start). Each `setOrders(prev => ...)` uses functional form correctly, but the **DB write decisions** are based on stale data.

This is the same class of bug as issue #2. The fix for issue #2 will also address part of this by ensuring the final `setOrders` at the end of `updateUnitObjectStatus` doesn't overwrite earlier optimistic updates.

### Files changed
| File | Change |
|------|--------|
| `src/components/OrdersTable.tsx` | Add V2 unit numbers to search |
| `src/contexts/OrdersContext.tsx` | Fix billing aggregation to not overwrite correct state |

No database changes needed.

