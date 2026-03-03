

# Förbättringar: Deadline-varningar + Ta bort polling

## 1. Ta bort 30s polling i produktionsvyn

**`src/pages/ProductionScreen.tsx`**
- Ta bort `useEffect` med `setInterval(refresh, 30000)` (rad 176-184)
- Uppdatera `lastUpdated` via en ny `useEffect` som lyssnar på `orders` istället, så klockan fortfarande visar senaste uppdateringstid
- Realtidsuppdateringar via OrdersContext hanterar redan all synkronisering

## 2. Deadline-varningar i produktionsvyn

Visa en visuell varning direkt på arbetskorten när orderns planerade slutdatum har passerat eller närmar sig (inom 2 dagar).

**`src/components/ProductionTruckCard.tsx`**
- Importera `AlertTriangle` och `differenceInDays` från date-fns
- I footer-sektionen (rad 174-179): Beräkna dagar kvar till `order.plannedEnd`
  - **Försenad** (passerat datum): Visa texten i rött med varningsikon och "X dagar försenad"
  - **Snart deadline** (inom 2 dagar): Visa texten i orange/amber med "Idag"/"Imorgon"/"2 dagar kvar"
  - **Ingen deadline**: Visa som vanligt
- Lägg till en tunn röd/orange kant överst på kortet om det är försenat/nära deadline, via en extra CSS-klass

### Teknisk detalj

```typescript
// I ProductionTruckCard, beräkning av deadline-status:
const now = new Date();
const plannedEnd = order.plannedEnd ? new Date(order.plannedEnd) : null;
const daysUntilDeadline = plannedEnd ? differenceInDays(plannedEnd, now) : null;
const isOverdue = daysUntilDeadline !== null && daysUntilDeadline < 0;
const isUrgent = daysUntilDeadline !== null && daysUntilDeadline >= 0 && daysUntilDeadline <= 2;
```

Kort som är försenade får `ring-2 ring-destructive` utöver befintlig border. Kort med nära deadline får `ring-2 ring-amber-500`.

