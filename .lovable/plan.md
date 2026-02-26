

# Ta bort ordernivåns fakturastatus -- använd enbart arbetskortens

## Bakgrund

Just nu finns fakturastatus på **två nivåer**:
1. **Order-nivå**: `orders.billing_status` -- en manuell dropdown i orderdetaljer
2. **Arbetskort-nivå**: `object_trucks.billing_status` -- sätts per arbetskort efter leverans

I ordertabellen används redan den **beräknade** versionen (`calculateOrderBillingStatus`) som räknar ut orderns fakturastatus automatiskt från arbetskorten. Men i orderdetaljer finns fortfarande en manuell dropdown som skriver direkt till `orders.billing_status` -- vilket kan skapa förvirring och konflikter.

## Vad vi gör

Ta bort den manuella fakturastatus-dropdownen på ordernivå och ersätt med en **skrivskyddad beräknad visning** baserad på arbetskortens status. Kolumnen `billing_status` i `orders`-tabellen behålls i databasen (för att inte behöva en destruktiv migration), men UI:t slutar skriva till den.

## Ändringar

### 1. `src/pages/OrderDetails.tsx`
- **Ta bort** `handleBillingStatusChange`-funktionen
- **Ersätt** fakturastatus-dropdownen med en beräknad badge (från `calculateOrderBillingStatus`)
- Visa en liten infotext under badgen: "Beräknas automatiskt från arbetskorten"

### 2. `src/contexts/OrdersContext.tsx`
- **Ta bort** `updateBillingStatus`-funktionen helt
- Ta bort den från context-interfacet och providern

### 3. `src/components/OrdersTable.tsx`
- Redan korrekt -- använder `calculateOrderBillingStatus`. Ingen ändring behövs.

### 4. `src/components/OrderFilters.tsx`
- Filtret för fakturastatus behöver uppdateras så att det filtrerar mot den **beräknade** statusen istället för `order.billingStatus`. Detta görs redan i OrdersTable men bör verifieras.

### 5. `src/types/order.ts`
- Behåll `BillingStatus`-typen och `billingStatusLabels` (de används för badges)
- Ingen ändring behövs

### Vad som INTE ändras
- Databasens `orders.billing_status`-kolumn behålls (undviker destruktiv migration)
- Arbetskortens `billing_status` på `object_trucks` -- detta är nu den enda "riktiga" källan
- `calculateOrderBillingStatus()` -- redan korrekt implementerad
- Fakturaexportlogiken -- redan baserad på arbetskortens billing_status

## Sammanfattning

En enkel förenkling: ta bort manuell dubblering, låt arbetskorten vara den enda sanningskällan för fakturastatus. Orderns fakturastatus visas fortfarande men beräknas automatiskt.
