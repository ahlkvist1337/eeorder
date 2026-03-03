

# Plan: Fix V2 automatisk status- och faktureringshantering

## Problem

Tre buggar gör att V2-ordrar inte hanteras korrekt:

1. **Order blir aldrig "Avslutad"**: `updateUnitObjectStatus` uppdaterar enhetens aggregerade status men triggar aldrig auto-complete på **ordernivå** (production_status → 'completed').
2. **Enhetens billing_status uppdateras aldrig**: `updateUnitObjectBillingStatus` skriver till `unit_objects` men aggregerar aldrig till `order_units.billing_status`.
3. **`calculateOrderBillingStatus` och `getOrderBillingLabel`** tittar på `unit.billingStatus` (som aldrig uppdateras) istället för att aggregera från `unit.objects[].billingStatus`.

## Lösning

### 1. Auto-complete order i `updateUnitObjectStatus` (OrdersContext.tsx)

Efter att enhetens status aggregerats — kontrollera om **alla enheter** i ordern nu har status `completed`/`packed`/`delivered`. Om ja → sätt `orders.production_status = 'completed'` (samma logik som V1).

### 2. Aggregera billing i `updateUnitObjectBillingStatus` (OrdersContext.tsx)

Efter att objektets billing_status uppdaterats:
- Beräkna enhetens billing_status från alla dess objekt (alla billed → billed, någon ready → ready, annars not_billable)
- Uppdatera `order_units.billing_status` i DB och optimistiskt i state

### 3. Fixa beräkningsfunktionerna i `order.ts`

Ändra `calculateOrderBillingStatus` och `getOrderBillingLabel` att för V2 titta på **objektens** billingStatus istället för enheternas:

```typescript
// V2: aggregate from unit objects, not unit level
const allObjects = order.units.flatMap(u => u.objects);
if (allObjects.length === 0) return order.billingStatus;
const allBilled = allObjects.every(o => o.billingStatus === 'billed');
if (allBilled) return 'billed';
const someReady = allObjects.some(o => o.billingStatus === 'ready_for_billing' || o.billingStatus === 'billed');
if (someReady) return 'ready_for_billing';
return 'not_ready';
```

Samma princip för `getOrderBillingLabel` — kolla om alla objekt (inte enheter) har ready/billed för att visa "Delvis klar" vs "Klar".

## Påverkade filer

| Fil | Ändring |
|-----|---------|
| `src/contexts/OrdersContext.tsx` | Auto-complete order vid objektstatus, aggregera billing vid objektbilling |
| `src/types/order.ts` | `calculateOrderBillingStatus` och `getOrderBillingLabel` baseras på objekt |

