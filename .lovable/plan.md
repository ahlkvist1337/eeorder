

# Plan: Steg-badges till objekthuvudet, stoppa omladdning, QR per objekt

## Tre problem

1. **Steg-badges sitter i enhetshuvudet** — ska vara i objekthuvudet så varje objekt har sina egna klickbara statusar
2. **Sidan laddar om vid varje strukturell ändring** — `updateUnits()` gör delete-and-recreate + `fetchOrders()` → allt expanderat nollställs
3. **QR-kod pekar på hela ordern** — ska kunna peka direkt på ett specifikt objekt

## Lösning

### 1. Flytta steg-badges från enhetshuvud till objekthuvud

**UnitsEditor.tsx**: Ta bort steg-badge-blocket (rad 348-377) ur enhetens header. Istället renderas objekten **alltid synliga** (utan att behöva expandera enheten) med sina steg-badges direkt i objektraden:

```
#ABC123  [Väntande v]  ✏️ 📋 🗑
  Motorlåda    [Maskering ○] [Målning ●]  🖨
  Stomme       [Blästring ✓] [Lackering ○]  🖨
```

Expand-knappen styr bara redigering av objekt/steg-struktur (lägga till/ta bort), inte visning av steg-badges.

På mobil blir det en naturlig vertikal lista — varje objekt tar en rad med sina steg-badges som redan har 44px klickyta.

### 2. Stoppa omladdning — optimistisk uppdatering i `updateUnits`

**OrdersContext.tsx** rad 1475-1530: 
- Lägg till optimistisk lokal uppdatering (`setOrders(...)`) **före** DB-anropen
- **Ta bort** `await fetchOrders()` på rad 1529
- Behåll `markLocalUpdate()` så realtime-debounce ignorerar ekon

Resultat: expanderat state bevaras, ingen flimmer.

### 3. QR-kod direkt till objekt

Lägg till en URL-parameter `/order/:id?object=:objectId`. 

**workCardPrint.ts** (`printWorkCardV2Object`): Ändra QR-URL:en från `/order/${orderId}` till `/order/${orderId}?object=${objectId}`.

**OrderDetails.tsx**: Läs `searchParams.get('object')` vid mount. Om satt, auto-expandera rätt enhet och scrolla till objektet (via `ref` + `scrollIntoView`). Eventuellt highlighta objektet kort.

### Tips på mobil-UX

Eftersom objekten visas direkt utan expand, blir mobilvyn enkel:
- Enhetshuvud = kompakt rad med namn + status-dropdown
- Under den: varje objekt med steg-badges (klickbara, 44px) + utskriftsknapp
- Expand-knappen bara för att redigera struktur (lägga till/ta bort steg/objekt)
- QR-koden på arbetskortet tar verkstadspersonalen direkt till rätt objekt i appen

## Påverkade filer

| Fil | Ändring |
|-----|---------|
| `src/components/UnitsEditor.tsx` | Flytta steg-badges till objektrad, visa objekt utan expand |
| `src/contexts/OrdersContext.tsx` | Optimistisk uppdatering i `updateUnits`, ta bort `fetchOrders()` |
| `src/lib/workCardPrint.ts` | QR-URL med `?object=objectId` |
| `src/pages/OrderDetails.tsx` | Läs `?object=` param, auto-scrolla till objekt |

