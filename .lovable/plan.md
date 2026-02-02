# Plan: Truckstatus-sparning och Mott/Klart-automatisering

## Status: ✅ IMPLEMENTERAD

### Åtgärdade problem:

1. **Truckstatus sparas nu till databasen** ✅
   - Lagt till `status` och `sort_order` i truck-upsert i `OrdersContext.tsx`

2. **Callbacks kopplade hela vägen** ✅
   - `onTruckStatusChange` och `onTruckStepStatusChange` skickas nu från:
     - `OrderDetails.tsx` → `OrderObjectsEditor.tsx` → `ObjectTrucksEditor.tsx`

3. **Mott (receivedQuantity) uppdateras automatiskt** ✅
   - +1 när truck ändras till `arrived`
   - -1 när truck ändras tillbaka till `waiting`

4. **Klart (completedQuantity) uppdateras automatiskt** ✅
   - +1 när truck ändras till `completed`
   - -1 när truck ändras tillbaka från `completed`

### Ej automatiserat:
- **Plan (plannedQuantity)**: Behålls manuellt. Kräver datamodellsändring för att koppla artikelrader till objekt.

### Filer ändrade:
- `src/contexts/OrdersContext.tsx` - updateTruckStatus med kvantitetslogik, truck-upsert med status
- `src/components/OrderObjectsEditor.tsx` - nya props för callbacks
- `src/pages/OrderDetails.tsx` - handler-funktioner för truck-callbacks

### Flöde:
```
Truck #108 → "Ankommen"
    ↓
handleTruckStatusChange(truckId, 'arrived')
    ↓
updateTruckStatus(orderId, truckId, 'arrived')
    ↓
1. receivedDelta = +1
2. Optimistisk UI-uppdatering
3. UPDATE object_trucks SET status = 'arrived'
4. UPDATE order_objects SET received_quantity = received_quantity + 1
    ↓
UI: Mott: 0 → 1
```
