

# Plan: Automatisk ändring till "Startad" vid stegpåbörjande

## Bakgrund

Användaren vill att orderstatusen automatiskt ändras till "Startad" när ett behandlingssteg påbörjas (ändras till "in_progress").

## Analys

Funktionen `updateOrderStep` i `src/contexts/OrdersContext.tsx` hanterar redan uppdateringar av steg och loggar statusändringar. Det är den naturliga platsen att lägga till denna automatik.

## Logik som ska implementeras

När ett steg ändras till `in_progress`:
1. Kontrollera om ordern INTE redan är i status `started`
2. Om orderstatus är `created`, `planned`, eller `arrived` - ändra till `started`
3. Logga statusändringen i `status_history` för att upprätthålla spårbarhet
4. Undvik att ändra status om ordern redan är `started`, `paused`, `completed`, eller `cancelled`

## Teknisk implementation

### Uppdatera `src/contexts/OrdersContext.tsx`

I funktionen `updateOrderStep`, efter att ha loggat stegstatusen, lägg till:

```typescript
const updateOrderStep = useCallback(async (orderId: string, stepId: string, updates: Partial<OrderStep>) => {
  const order = orders.find(o => o.id === orderId);
  const currentStep = order?.steps.find(s => s.id === stepId);
  
  // ... befintlig kod för att logga steghistorik ...

  // NY LOGIK: Om ett steg påbörjas, sätt orderstatusen till "started"
  if (updates.status === 'in_progress' && order) {
    const statusesThatShouldChangeToStarted: ProductionStatus[] = ['created', 'planned', 'arrived'];
    
    if (statusesThatShouldChangeToStarted.includes(order.productionStatus)) {
      // Logga statusändring
      await supabase.from('status_history').insert({
        order_id: orderId,
        from_status: order.productionStatus,
        to_status: 'started',
      });
      
      // Uppdatera orderstatus
      await supabase
        .from('orders')
        .update({ production_status: 'started' })
        .eq('id', orderId);
    }
  }

  // ... resten av befintlig kod ...
}, [orders, fetchOrders]);
```

## Varför detta fungerar

- Stegstatusen `in_progress` indikerar att arbete har påbörjats
- Endast relevanta orderstatusar (`created`, `planned`, `arrived`) ändras
- Om ordern redan är `started`, `paused`, `completed` eller `cancelled` sker ingen ändring
- Statushistorik loggas korrekt för spårbarhet

## Statusar som påverkas

| Nuvarande orderstatus | Steg blir `in_progress` | Ny orderstatus |
|-----------------------|-------------------------|----------------|
| Skapad (created)      | Ja                      | Startad        |
| Planerad (planned)    | Ja                      | Startad        |
| Ankommen (arrived)    | Ja                      | Startad        |
| Startad (started)     | Ja                      | Oförändrad     |
| Pausad (paused)       | Ja                      | Oförändrad     |
| Avslutad (completed)  | Ja                      | Oförändrad     |
| Avbruten (cancelled)  | Ja                      | Oförändrad     |

