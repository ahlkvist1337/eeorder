

# Plan: Fixa automatisk statusändring + Ta bort "Planerad"-status

## Identifierat problem

Automatiken för att ändra orderstatus till "Startad" fungerar inte på grund av fel kodväg:

1. `OrderStepsEditor` anropar `onStepsChange` med alla uppdaterade steg
2. `OrderDetails.tsx` tar emot detta via `handleStepsChange` och anropar `updateOrder(order.id, { steps: newSteps })`
3. `updateOrder` i `OrdersContext` hanterar **INTE** automatisk statusändring - den logiken finns bara i `updateOrderStep`

Resultat: När ett steg ändras till "Pågående" triggas aldrig koden som ska ändra ordern till "Startad".

## Lösning

### Del 1: Flytta automatisk statuslogik till `updateOrder`

Uppdatera `updateOrder`-funktionen i `OrdersContext.tsx` så att den också kontrollerar om något steg ändras till `in_progress` och uppdaterar orderstatusen automatiskt.

**Modifiera `src/contexts/OrdersContext.tsx`:**

I den del av `updateOrder` som hanterar `updates.steps`, lägg till logik för automatisk statusändring:

```typescript
// Inside updateOrder, after logging step history entries
if (updates.steps !== undefined) {
  const currentOrder = orders.find(o => o.id === id);
  
  if (currentOrder) {
    // Check if any step is being changed to 'in_progress'
    const hasNewInProgress = updates.steps.some(newStep => {
      const oldStep = currentOrder.steps.find(s => s.id === newStep.id);
      return oldStep && oldStep.status !== 'in_progress' && newStep.status === 'in_progress';
    });

    // Auto-change order status to "started" when a step begins
    if (hasNewInProgress) {
      const statusesThatShouldChangeToStarted: ProductionStatus[] = ['created', 'arrived'];
      
      if (statusesThatShouldChangeToStarted.includes(currentOrder.productionStatus)) {
        await supabase.from('status_history').insert({
          order_id: id,
          from_status: currentOrder.productionStatus,
          to_status: 'started',
        });
        
        // Add to dbUpdates so it's included in the order update
        dbUpdates.production_status = 'started';
      }
    }
    
    // ... existing step history logging code ...
  }
}
```

### Del 2: Ta bort "Planerad" (planned) produktionsstatus

Ta bort `planned` som en giltig produktionsstatus i hela applikationen.

**Filer som ska uppdateras:**

1. **`src/types/order.ts`** - Ta bort `'planned'` från `ProductionStatus` typ och `productionStatusLabels`

2. **`src/components/StatusBadge.tsx`** - Ta bort `planned` från `productionStatusColors`

3. **`src/contexts/OrdersContext.tsx`** - Ta bort `'planned'` från arrayen `statusesThatShouldChangeToStarted`

4. **`src/index.css`** - Ta bort CSS-variabeln `--status-planned` (om den finns)

5. **Databas** - Behöver INTE ändras för enum-typen, men eventuella existerande ordrar med status `planned` bör migreras till `created` eller `arrived`

### Ordning för genomförande

1. Flytta automatisk statuslogik till `updateOrder` (hög prioritet - fixar buggen)
2. Ta bort `planned` från TypeScript-typer
3. Ta bort `planned` från UI-komponenter
4. Uppdatera arrayen för statusar som triggar "started"

## Resultat

- När ett steg ändras till "Pågående" kommer ordern automatiskt att ändras till "Startad" (om den var "Skapad" eller "Ankommen")
- "Planerad"-statusen finns inte längre i systemet
- Förenklad statusflöde: Skapad → Ankommen → Startad → Pausad → Avslutad/Avbruten

