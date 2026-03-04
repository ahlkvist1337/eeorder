

# Fix: Billing status per enhet + ny badge för "Delvis"

## Två ändringar

### 1. Billing-logik: vänta tills ALLA objekt i enheten är klara (`src/contexts/OrdersContext.tsx`)

**Nuvarande beteende (rad 1889, 1904-1905):** När ETT objekt sätts till `delivered` → dess `billing_status` sätts direkt till `ready_for_billing`. Detta gör att `calculateOrderBillingStatus` ser "delvis klar" för tidigt.

**Nytt beteende:** Ta bort den direkta `billing_status`-uppdateringen vid leverans. Lägg istället till en check efter enhetsstatus-aggregeringen (rad ~1935): om ALLA objekt i enheten nu är `completed`/`packed`/`delivered`, sätt `billing_status = 'ready_for_billing'` på samtliga objekt i enheten. Annars ingen ändring.

```typescript
// Rad ~1889: Ta bort delivered → ready_for_billing
// Rad ~1904-1905: Ta bort billing_status från dbUpdate vid delivered

// Ny kod efter rad 1935 (efter unit status aggregation):
const finishedObjStatuses = ['completed', 'packed', 'delivered'];
const updatedObjs = unit.objects.map(ob => ob.id === objectId ? { ...ob, status: newStatus } : ob);
const doneCount = updatedObjs.filter(ob => finishedObjStatuses.includes(ob.status)).length;
console.log('Checking unit completion:', doneCount, 'objects done out of', updatedObjs.length);

if (updatedObjs.every(ob => finishedObjStatuses.includes(ob.status))) {
  // Alla objekt klara → sätt billing_status på alla
  for (const ob of updatedObjs) {
    await supabase.from('unit_objects').update({ billing_status: 'ready_for_billing' }).eq('id', ob.id);
  }
  setOrders(prev => prev.map(o => {
    if (o.id !== orderId) return o;
    return { ...o, units: o.units?.map(u => u.id === unitId ? {
      ...u, objects: u.objects.map(ob => ({ ...ob, billingStatus: 'ready_for_billing' })),
    } : u) };
  }));
}
```

Behåll `resetBilling`-logiken (backning) oförändrad.

### 2. Badge: "Delvis fakturerbar" med orange färg

**`src/types/order.ts`** (rad 269, 275): Ändra `'Delvis klar för fakturering'` → `'Delvis fakturerbar'`

**`src/components/StatusBadge.tsx`** (rad 48-59): Detektera `label === 'Delvis fakturerbar'` och applicera orange:

```tsx
export function BillingStatusBadge({ status, className, label }: BillingStatusBadgeProps) {
  const isPartial = label === 'Delvis fakturerbar';
  const colorClass = isPartial
    ? 'bg-orange-500 text-white'
    : billingStatusColors[status];
  return (
    <Badge className={cn('font-medium rounded-sm', colorClass, className)}>
      {label || billingStatusLabels[status]}
    </Badge>
  );
}
```

| Fil | Ändring |
|-----|---------|
| `src/contexts/OrdersContext.tsx` | Ta bort per-objekt billing vid leverans; lägg till enhetscheck + debug log |
| `src/types/order.ts` | Korta label till "Delvis fakturerbar" |
| `src/components/StatusBadge.tsx` | Orange färg för delvis-badge |

