

# Fix: Statistik visar 0 kr redo for fakturering + orderstatus andras inte till Avslutad

## Problem 1: "Klar for fakturering" visar alltid 0 kr

Statistiksidan filtrerar pa `order.billingStatus === 'ready_for_billing'`, men orderns `billing_status` i databasen uppdateras aldrig -- bara enskilda arbetskorts `billing_status` satts till `ready_for_billing` nar de levereras. Ordernivan forblir `not_ready`.

**Losning**: Andra berakningen i `Statistics.tsx` sa att den harledar faktureringsstatusen fran arbetskorten istallet for orderns `billingStatus`-falt. En order raknas som "klar for fakturering" om minst ett arbetskort har `billingStatus === 'ready_for_billing'` och inget ar `not_billable` (eller enklare: minst ett ar `ready_for_billing`).

Alternativt (och battre): berakna "klar for fakturering"-vardet genom att summera `totalPrice` for ordrar som har minst en truck med `billingStatus === 'ready_for_billing'` och ingen truck med `billingStatus === 'billed'` pa alla.

## Problem 2: Orderstatus andras inte till "Avslutad"

I `updateTruckStatus` (rad 1225-1226) raknas bara truckar med exakt `status === 'completed'`. Om nagra truckar redan har status `packed` eller `delivered` rakas de inte som "klara", sa villkoret `completedCount === allTrucks.length` uppfylls aldrig.

**Losning**: Andra filtret sa att truckar med status `completed`, `packed` eller `delivered` alla raknas som "klara" vid kontrollen.

## Andringar

### `src/pages/Statistics.tsx`
- Andra `readyForBilling`-berakningen fran `o.billingStatus === 'ready_for_billing'` till att undersoka varje orders arbetskort: `o.objects?.some(obj => obj.trucks?.some(t => t.billingStatus === 'ready_for_billing'))`
- Samma for `billedOrders`: kontrollera om alla truckar ar `billed`

### `src/contexts/OrdersContext.tsx`
- Rad 1225-1226: Andra `t.status === 'completed'` till `['completed', 'packed', 'delivered'].includes(t.status)` sa att truckar som redan passerat "Klar" ocksa raknas

