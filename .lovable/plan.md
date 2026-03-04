

# Fix: Delfakturerad badge/lås + status-rollback

## Problem 1: Ingen visuell indikation eller lås för delfakturerade enheter
Enheter med `billingStatus === 'ready_for_billing'` eller `'billed'` saknar badge och kan redigeras fritt.

## Problem 2: Status cascadar inte vid steg-rollback
I `updateUnitStepStatus` (rad 1730-1810): Om ett steg går från `completed` → `in_progress` medan objektet är `completed`, saknas logik för att backa objektet till `started`. Dessutom återställs inte `billing_status` vid rollback i step-automationen.

## Ändringar

### 1. `src/components/UnitsEditor.tsx`

**Unit header (rad 327-347)** — Lägg till badge efter enhetsnamn:
- Om `unit.billingStatus === 'billed'`: röd badge "Fakturerad"
- Om `unit.billingStatus === 'ready_for_billing'`: orange badge "Klar för fakturering"

**Objekt-rad (rad 397-537)** — Lås redigering om enheten är fakturerad/klar:
- Ny variabel `unitLocked = unit.billingStatus === 'billed' || unit.billingStatus === 'ready_for_billing'`
- Om `unitLocked && !isAdmin`:
  - Disable status-dropdown (redan `Select`), steg-knappar, ta bort-knappar, lägg till steg
  - Stegbadges: `pointer-events-none opacity-60`
- Om `unitLocked && isAdmin`:
  - Visa allt som vanligt men med varningsdialog vid klick på steg/status: `confirm('Är du säker? Detta kan påverka fakturering')`

**Import**: Lägg till `useAuth` → `isAdmin` (redan importeras `isProduction`)

### 2. `src/contexts/OrdersContext.tsx` — `updateUnitStepStatus` (rad 1730-1810)

**Rad 1736-1742** — Utöka step-automation med rollback från `completed`:
```typescript
// Existing: step → in_progress → object starts (waiting/arrived)
// ADD: step rollback from completed → any non-completed:
//   if object was completed/packed/delivered and now a step is no longer completed → object → started
if (newStatus !== 'completed' && currentStatus === 'completed') {
  const finishedObjStatuses: TruckStatus[] = ['completed', 'packed', 'delivered'];
  if (finishedObjStatuses.includes(parentObj.status)) {
    targetObjectStatus = 'started';
  }
}
```

**Rad 1758-1775** — Efter object status rollback, reset billing:
```typescript
// If object moved back from delivered/completed → reset billing
if (targetObjectStatus === 'started' || targetObjectStatus === 'arrived') {
  await supabase.from('unit_objects').update({ billing_status: 'not_billable' }).eq('id', parentObj.id);
  // Update unit billing aggregate
  // ... same pattern as in updateUnitObjectStatus
}
```

Add `console.log('Status rollback: Steg ändrat – uppdaterar enhet/order status')` for debug.

## Filöversikt

| Fil | Ändring |
|-----|---------|
| `src/components/UnitsEditor.tsx` | Badge + lås för fakturerade enheter, admin-override med confirm |
| `src/contexts/OrdersContext.tsx` | Step rollback → object status + billing reset cascade |

