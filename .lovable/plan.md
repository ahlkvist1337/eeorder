

# Dölj avbrutna ordrar från produktionsvyn

## Problem
Produktionsvyn (`ProductionScreen.tsx`) filtrerar enbart på arbetskortets status (`arrived`/`started`/`paused`) men kontrollerar inte orderns administrativa status. En avbruten order med ett ankommet arbetskort visas därför fortfarande i produktionen.

## Lösning
Lägg till en kontroll i `getActiveTrucks()` och `getPausedTrucks()` som hoppar över ordrar med `productionStatus === 'cancelled'`.

### `src/pages/ProductionScreen.tsx`
- I `getActiveTrucks` (rad 23): Lägg till `if (order.productionStatus === 'cancelled') continue;` i for-loopen
- I `getPausedTrucks` (rad 40): Samma kontroll

```typescript
// I båda funktionerna, direkt efter "for (const order of orders) {"
if (order.productionStatus === 'cancelled') continue;
```

Inga andra filer behöver ändras. Historiken bevaras i databasen -- ordern finns kvar i orderöversiktens historik.

