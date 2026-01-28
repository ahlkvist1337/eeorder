

# Plan: Forhindra redundant statushistorik

## Problem

Statushistorik loggas aven nar en order redan har samma status som den nya. Till exempel:
- Startad -> Startad (ingen faktisk andring)
- Byter status fram och tillbaka skapar manga onodiga rader

## Losning

Lagg till en enkel kontroll i bada funktioner som hanterar statusandringar.

## Tekniska andringar

### Uppdatera `OrdersContext.tsx`

**1. Funktion `updateProductionStatus` (rad 391-408)**

Lagg till kontroll som avbryter om status ar samma:

```typescript
const updateProductionStatus = useCallback(async (id: string, newStatus: ProductionStatus) => {
  const order = orders.find(o => o.id === id);
  if (!order) return;

  // Hoppa over om status ar samma (ingen andring)
  if (order.productionStatus === newStatus) return;

  // ... resten av koden
}, [orders, fetchOrders]);
```

**2. Funktion `bulkUpdateOrders` (rad 501-519)**

Filtrera bort ordrar dar status redan ar samma:

```typescript
if (updates.productionStatus !== undefined) {
  const historyEntries = orderIds
    .map(orderId => {
      const order = orders.find(o => o.id === orderId);
      if (!order) return null;
      // Hoppa over om status ar samma
      if (order.productionStatus === updates.productionStatus) return null;
      return {
        order_id: orderId,
        from_status: order.productionStatus,
        to_status: updates.productionStatus!,
      };
    })
    .filter(Boolean);
  // ...
}
```

## Resultat

- Statushistorik loggas endast nar status faktiskt andras
- Befintliga "dod" historikposter finns kvar (kan rensas manuellt i databasen om onskad)
- Ingen ny historik skapas for "samma -> samma" andringar

