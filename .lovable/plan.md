
# Plan: Fixa historikvyn för arbetskort

## Identifierade problem

### 1. Flera "Arbetskort ankommet" loggas
**Orsak:** `updateTruckStatus` loggar en lifecycle-händelse varje gång funktionen anropas, utan att kontrollera om status faktiskt ändras.

**Lösning:** Lägg till en check som hoppar över loggning om nuvarande status redan är samma som ny status.

### 2. "Målning Toyota Orange" visas konstigt
**Orsak:** Detta är stegnamnet från `truck_status_history`. Det visas korrekt ("Målning Toyota Orange: Pågående/Klar") men det kommer från stegändringar, inte från arbetskortets huvudstatus.

**Förklaring:** Detta är faktiskt korrekt beteende - det visar att steget "Målning Toyota Orange" ändrades till pågående/klar. Den enda förbättringen är att tydliggöra i UI:t vad som är steg-historik vs arbetskort-historik.

### 3. Historiken uppdateras inte i realtid
**Orsak:** `updateTruckStatus` saknar optimistisk uppdatering av `truckLifecycleEvents`. Data sparas till databasen men läggs inte till i lokalt state.

**Lösning:** Lägg till optimistisk uppdatering av `truckLifecycleEvents` i `updateTruckStatus`.

---

## Teknisk implementation

### Ändring 1: Skippa duplicerade lifecycle-events

I `updateTruckStatus` (rad ~983-1103), lägg till check:

```typescript
const updateTruckStatus = useCallback(async (
  orderId: string,
  truckId: string,
  newStatus: TruckStatus
) => {
  // Find current status and object
  const order = orders.find(o => o.id === orderId);
  let objectId: string | undefined;
  let currentStatus: TruckStatus = 'waiting';
  
  for (const obj of order?.objects || []) {
    const truck = obj.trucks?.find(t => t.id === truckId);
    if (truck) {
      currentStatus = truck.status;
      objectId = obj.id;
      break;
    }
  }
  
  // Skip if no actual change - prevents duplicate history entries
  if (currentStatus === newStatus) return;
  
  // ... rest of function
```

### Ändring 2: Optimistisk uppdatering av lifecycle events

I samma funktion, uppdatera `setOrders` för att inkludera ny lifecycle event:

```typescript
// Optimistic update with quantities AND lifecycle event
setOrders(prev => prev.map(o => {
  if (o.id !== orderId) return o;
  
  const newLifecycleEvent = {
    id: crypto.randomUUID(),
    orderId,
    truckId,
    truckNumber: o.objects
      ?.flatMap(obj => obj.trucks || [])
      .find(t => t.id === truckId)?.truckNumber || '',
    eventType: newStatus as TruckLifecycleEventType,
    timestamp: new Date().toISOString(),
  };
  
  return {
    ...o,
    objects: o.objects?.map(obj => ({
      ...obj,
      receivedQuantity: obj.id === objectId 
        ? Math.max(0, obj.receivedQuantity + receivedDelta) 
        : obj.receivedQuantity,
      completedQuantity: obj.id === objectId 
        ? Math.max(0, obj.completedQuantity + completedDelta) 
        : obj.completedQuantity,
      trucks: obj.trucks?.map(t =>
        t.id === truckId ? { ...t, status: newStatus } : t
      ),
    })),
    truckLifecycleEvents: [
      ...(o.truckLifecycleEvents || []),
      newLifecycleEvent,
    ],
  };
}));
```

---

## Sammanfattning av ändringar

| Fil | Ändring |
|-----|---------|
| `src/contexts/OrdersContext.tsx` | 1. Lägg till `if (currentStatus === newStatus) return;` i `updateTruckStatus` |
| `src/contexts/OrdersContext.tsx` | 2. Lägg till optimistisk uppdatering av `truckLifecycleEvents` |

---

## Resultat

1. **Inga duplicerade "Arbetskort ankommet"** - Status loggas bara när den faktiskt ändras
2. **Historiken uppdateras direkt** - Ingen sidladdning behövs för att se ändringar
3. **Korrekt steg-historik** - "Målning Toyota Orange: Pågående" är korrekt och tydligt
