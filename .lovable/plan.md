
# Plan: Fixa truckstatus-sparning och Plan/Mott/Klart-automatisering

## Problem 1: Truckstatus sparas inte till databasen

### Orsak
När truckstatus ändras i dropdown (rad 263-273 i `ObjectTrucksEditor.tsx`) anropas `onTruckStatusChange` om den finns, annars uppdateras bara lokal state via `onTrucksChange`. 

Men i `OrderObjectsEditor.tsx` (rad 505-514) skickas **inte** `onTruckStatusChange` som prop:

```tsx
<ObjectTrucksEditor
  trucks={obj.trucks || []}
  objectId={obj.id}
  objectSteps={objectSteps}
  onTrucksChange={(newTrucks) => {
    onObjectsChange(objects.map(o =>
      o.id === obj.id ? { ...o, trucks: newTrucks } : o
    ));
  }}
  // SAKNAS: onTruckStatusChange och onTruckStepStatusChange
/>
```

Dessutom i `OrdersContext.tsx` rad 664-671 upsertas truckar **utan status**:

```tsx
await supabase.from('object_trucks').upsert(
  obj.trucks.map(t => ({
    id: t.id,
    object_id: obj.id,
    truck_number: t.truckNumber,  // SAKNAR: status: t.status
  })),
  { onConflict: 'id' }
);
```

### Lösning
1. Lägg till `status` i truck-upsert i `OrdersContext.tsx`
2. Skicka `onTruckStatusChange` och `onTruckStepStatusChange` från `OrderObjectsEditor.tsx`
3. Uppdatera `OrderDetails.tsx` för att koppla dessa callbacks till context

---

## Problem 2: Plan/Mott/Klart uppdateras inte automatiskt

### Nuvarande beteende
Fälten är manuella input-fält:
- **Plan**: Användaren skriver antal
- **Mott**: Användaren skriver antal
- **Klart**: Användaren skriver antal

### Önskat beteende enligt användarens beskrivning
- **Plan**: Ska tas från orderrader (artikelrader) - automatiskt
- **Mott**: Öka när truck markeras "Ankommen" - automatiskt
- **Klart**: Öka när truck markeras "Klar" - automatiskt

### Problemanalys
Just nu finns ingen koppling mellan:
- Artikelrader och objekt (artikelrader har `stepId` men inte `objectId`)
- Truckstatus och kvantiteter

### Lösning
1. Automatisera **Mott** och **Klart** baserat på truckstatus:
   - När truck ändras till `arrived`: öka `receivedQuantity` med 1
   - När truck ändras till `completed`: öka `completedQuantity` med 1
   - Vid ändring tillbaka: minska motsvarande

2. **Plan** behåll manuellt tills dess att artikelrader kopplas till objekt (kräver större datamodellsändring)

---

## Tekniska ändringar

### Fil 1: `src/contexts/OrdersContext.tsx`

**Rad 664-671** - Lägg till `status` i truck-upsert:

```typescript
await supabase.from('object_trucks').upsert(
  obj.trucks.map(t => ({
    id: t.id,
    object_id: obj.id,
    truck_number: t.truckNumber,
    status: t.status,  // LÄGG TILL
    sort_order: t.sortOrder ?? null,  // LÄGG TILL
  })),
  { onConflict: 'id' }
);
```

**Rad 930-954** - Uppdatera `updateTruckStatus` för att automatiskt justera Mott/Klart:

```typescript
const updateTruckStatus = useCallback(async (
  orderId: string,
  truckId: string,
  newStatus: TruckStatus
) => {
  // Hitta nuvarande status och objekt
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
  
  // Beräkna kvantitetsändringar
  let receivedDelta = 0;
  let completedDelta = 0;
  
  // Mott: öka när arrived, minska när tillbaka till waiting
  if (newStatus === 'arrived' && currentStatus === 'waiting') receivedDelta = 1;
  if (currentStatus === 'arrived' && newStatus === 'waiting') receivedDelta = -1;
  
  // Klart: öka när completed, minska när tillbaka från completed
  if (newStatus === 'completed' && currentStatus !== 'completed') completedDelta = 1;
  if (currentStatus === 'completed' && newStatus !== 'completed') completedDelta = -1;
  
  // Optimistisk uppdatering med kvantiteter
  setOrders(prev => prev.map(o => {
    if (o.id !== orderId) return o;
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
    };
  }));

  // Uppdatera truck status i DB
  await supabase.from('object_trucks').update({ status: newStatus }).eq('id', truckId);
  
  // Uppdatera objekt-kvantiteter i DB
  if (objectId && (receivedDelta !== 0 || completedDelta !== 0)) {
    const obj = order?.objects?.find(o => o.id === objectId);
    if (obj) {
      await supabase.from('order_objects').update({
        received_quantity: Math.max(0, obj.receivedQuantity + receivedDelta),
        completed_quantity: Math.max(0, obj.completedQuantity + completedDelta),
      }).eq('id', objectId);
    }
  }
}, [orders]);
```

---

### Fil 2: `src/components/OrderObjectsEditor.tsx`

**Nya props och callback**:

Lägg till nya props i interface och skicka vidare till `ObjectTrucksEditor`:

```typescript
interface OrderObjectsEditorProps {
  objects: OrderObject[];
  steps: OrderStep[];
  onObjectsChange: (objects: OrderObject[]) => void;
  onStepsChange: (steps: OrderStep[]) => void;
  onTruckStatusChange?: (truckId: string, status: TruckStatus) => void;  // NY
  onTruckStepStatusChange?: (truckId: string, stepId: string, status: StepStatus) => void;  // NY
}
```

**Rad 505-514** - Skicka callbacks till `ObjectTrucksEditor`:

```tsx
<ObjectTrucksEditor
  trucks={obj.trucks || []}
  objectId={obj.id}
  objectSteps={objectSteps}
  onTrucksChange={(newTrucks) => {
    onObjectsChange(objects.map(o =>
      o.id === obj.id ? { ...o, trucks: newTrucks } : o
    ));
  }}
  onTruckStatusChange={onTruckStatusChange}
  onTruckStepStatusChange={onTruckStepStatusChange}
/>
```

---

### Fil 3: `src/pages/OrderDetails.tsx`

**Importera och använd context-funktioner**:

```typescript
const { 
  getOrderById, 
  updateOrder, 
  updateProductionStatus, 
  updateBillingStatus,
  updateOrderStep,
  updateTruckStatus,      // LÄGG TILL
  updateTruckStepStatus,  // LÄGG TILL
  deleteOrder,
  isLoading 
} = useOrders();
```

**Skapa callbacks och skicka till OrderObjectsEditor**:

```tsx
const handleTruckStatusChange = async (truckId: string, status: TruckStatus) => {
  await updateTruckStatus(order.id, truckId, status);
};

const handleTruckStepStatusChange = async (
  truckId: string, 
  stepId: string, 
  status: StepStatus
) => {
  // Hitta truckNumber och stepName för historikloggning
  const truck = (order.objects || [])
    .flatMap(o => o.trucks || [])
    .find(t => t.id === truckId);
  const step = order.steps.find(s => s.id === stepId);
  
  if (truck && step) {
    await updateTruckStepStatus(
      order.id, 
      truckId, 
      stepId, 
      status, 
      truck.truckNumber, 
      step.name
    );
  }
};

// I JSX:
<OrderObjectsEditor
  objects={order.objects || []}
  steps={order.steps}
  onObjectsChange={(newObjects) => handleObjectsAndStepsChange(newObjects, order.steps)}
  onStepsChange={(newSteps) => handleObjectsAndStepsChange(order.objects || [], newSteps)}
  onTruckStatusChange={handleTruckStatusChange}
  onTruckStepStatusChange={handleTruckStepStatusChange}
/>
```

---

## Sammanfattning

| Problem | Lösning | Fil |
|---------|---------|-----|
| Truckstatus sparas inte | Lägg till `status` i upsert | OrdersContext.tsx |
| Callbacks saknas | Skicka props hela vägen | OrderObjectsEditor, OrderDetails |
| Mott uppdateras inte | Auto-öka vid `arrived` | OrdersContext.tsx |
| Klart uppdateras inte | Auto-öka vid `completed` | OrdersContext.tsx |
| Plan uppdateras inte | Behåll manuellt (kräver datamodellsändring) | - |

---

## Flöde efter fix

```text
Användare ändrar truck #108 till "Ankommen"
    ↓
handleTruckStatusChange(truckId, 'arrived')
    ↓
updateTruckStatus(orderId, truckId, 'arrived')
    ↓
1. Beräkna: receivedDelta = +1
2. Optimistisk uppdatering av state
3. UPDATE object_trucks SET status = 'arrived'
4. UPDATE order_objects SET received_quantity = received_quantity + 1
    ↓
UI visar: Mott: 1 (var 0)
```
