
# Ta bort manuell fakturastatus på ordernivå

## Sammanfattning

Ersätt den manuella fakturastatus-dropdownen i orderdetaljer med en **skrivskyddad beräknad badge** som räknas ut automatiskt från arbetskortens `billing_status`. Ordertabellen använder redan den beräknade versionen -- nu gör vi samma sak i orderdetaljer.

## Ändringar

### 1. `src/pages/OrderDetails.tsx`
- **Ta bort** `handleBillingStatusChange`-funktionen (rad 112-118)
- **Ta bort** importen av `updateBillingStatus` från context (rad 55)
- **Ersätt** fakturastatus-dropdownen (rad 582-598) med en skrivskyddad `BillingStatusBadge` som visar resultatet av `calculateOrderBillingStatus(order)`
- Lägg till en liten infotext: "Beräknas från arbetskorten"

### 2. `src/contexts/OrdersContext.tsx`
- **Ta bort** `updateBillingStatus`-funktionen (ca rad 886+)
- **Ta bort** den från context-interfacet (rad 139) och providerns value-objekt (rad 1340)

### 3. `src/pages/Index.tsx`
- **Ta bort** `handleBillingStatusChange` (rad 73+) och relaterade pending-edit-logik
- **Ta bort** `onBillingStatusChange`-propen från BulkEditToolbar-anropet (rad 193)

### 4. `src/components/BulkEditToolbar.tsx`
- **Ta bort** `onBillingStatusChange`-propen om den finns (bulk-ändring av fakturastatus är inte längre relevant på ordernivå)

### Vad som INTE ändras
- Databaskolumnen `orders.billing_status` behålls (undviker destruktiv migration)
- Arbetskortens `billing_status` på `object_trucks` -- enda källan
- `calculateOrderBillingStatus()` -- redan korrekt
- Filtret i `OrderFilters.tsx` -- fortsätter filtrera mot beräknad status
- Ordertabellen -- redan korrekt
