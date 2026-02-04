
# Plan: Automatisk orderstatus och realtidsuppdateringar

## Sammanfattning

Två separata problem identifierades:

| Problem | Orsak |
|---------|-------|
| Orderstatus ändras inte automatiskt till "Avslutad" | Logiken kollar bara `order_steps`, inte `truck_step_status` |
| Uppdateringar visas inte i realtid | Ingen Supabase realtime-prenumeration existerar |

---

## Åtgärd 1: Automatisk orderstatus "Avslutad"

### Problemet i detalj
- Nuvarande logik i `updateOrder()` kontrollerar om alla `order_steps` är `completed`
- Men produktionen använder `truck_step_status` (arbetskort-nivå), inte `order_steps`
- När ett arbetskort markeras som klart via `updateTruckStatus()` kontrolleras aldrig om hela ordern ska bli "Avslutad"

### Lösning
Lägg till kontroll i `updateTruckStatus()` i OrdersContext.tsx:

```typescript
// After marking truck as completed, check if ALL trucks in the order are completed
if (newStatus === 'completed') {
  // Get updated state after this change
  const allTrucks = order.objects?.flatMap(obj => obj.trucks || []) || [];
  
  // Count how many will be completed after this change
  const completedCount = allTrucks.filter(t => 
    t.id === truckId ? true : t.status === 'completed'
  ).length;
  
  // If all trucks are now completed, set order to completed
  if (completedCount === allTrucks.length && allTrucks.length > 0) {
    const statusesThatShouldChangeToCompleted = ['created', 'arrived', 'started', 'paused'];
    
    if (statusesThatShouldChangeToCompleted.includes(order.productionStatus)) {
      await supabase.from('status_history').insert({
        order_id: orderId,
        from_status: order.productionStatus,
        to_status: 'completed',
      });
      
      await supabase.from('orders')
        .update({ production_status: 'completed' })
        .eq('id', orderId);
      
      // Update optimistic state
      setOrders(prev => prev.map(o => 
        o.id === orderId 
          ? { ...o, productionStatus: 'completed' }
          : o
      ));
    }
  }
}
```

### Var i koden
- Fil: `src/contexts/OrdersContext.tsx`
- Funktion: `updateTruckStatus` (efter rad 1120)

---

## Åtgärd 2: Realtidsuppdateringar

### Problemet i detalj
- Ingen prenumeration på Postgres changes
- Om någon annan ändrar data syns det inte förrän man laddar om sidan

### Lösning
Lägg till Supabase realtime channel i OrdersProvider:

```typescript
// In OrdersProvider useEffect, add realtime subscription
useEffect(() => {
  if (!user) return;
  
  const channel = supabase
    .channel('orders-realtime')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'orders',
      },
      () => {
        // Refetch on any order change
        fetchOrders();
      }
    )
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'object_trucks',
      },
      () => {
        // Refetch on truck status changes
        fetchOrders();
      }
    )
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'truck_step_status',
      },
      () => {
        // Refetch on step status changes
        fetchOrders();
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}, [user, fetchOrders]);
```

### Krävs även: Aktivera realtime på tabellerna
SQL-migration behövs:

```sql
-- Enable realtime for relevant tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
ALTER PUBLICATION supabase_realtime ADD TABLE public.object_trucks;
ALTER PUBLICATION supabase_realtime ADD TABLE public.truck_step_status;
```

### Var i koden
- Fil: `src/contexts/OrdersContext.tsx`
- Lägg till ny `useEffect` efter rad 377

---

## Tekniska ändringar

### Fil 1: src/contexts/OrdersContext.tsx

| Ändring | Plats |
|---------|-------|
| Lägg till auto-complete logik | I `updateTruckStatus()` efter rad 1120 |
| Lägg till realtime subscription | Ny `useEffect` efter rad 377 |
| Importera inget extra | Supabase redan importerad |

### Fil 2: SQL Migration

| Ändring | Effekt |
|---------|--------|
| Aktivera realtime på 3 tabeller | Gör att ändringar pushes till klienter |

---

## Översikt

```
┌──────────────────────────────────────────────────────────────┐
│                      FÖRE (Nuvarande)                        │
├──────────────────────────────────────────────────────────────┤
│  Arbetskort klart → truck.status = 'completed'               │
│  ❌ Ingen check om alla trucks är klara                      │
│  ❌ Ingen realtime - måste ladda om sidan                    │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│                      EFTER (Med fix)                         │
├──────────────────────────────────────────────────────────────┤
│  Arbetskort klart → truck.status = 'completed'               │
│  ✅ Check: Alla trucks klara? → order.status = 'completed'   │
│  ✅ Realtime: Ändringar syns direkt utan refresh             │
└──────────────────────────────────────────────────────────────┘
```

---

## Testplan

1. **Automatisk orderstatus:**
   - Skapa en order med ett objekt och ett arbetskort
   - Lägg till behandlingssteg
   - Markera alla steg som klara
   - Verifiera att arbetskortet blir "Klart"
   - Verifiera att orderns status ändras till "Avslutad"

2. **Realtidsuppdateringar:**
   - Öppna samma order i två flikar
   - Ändra status i en flik
   - Verifiera att ändringen syns i den andra fliken inom 1-2 sekunder

---

## Resultat efter implementation

- Orderstatus sätts automatiskt till "Avslutad" när alla arbetskort är klara
- Ändringar i produktionsvy och orderdetaljer visas i realtid utan siduppdatering
- Produktionsarbetare ser korrekta statusar direkt
