

# Plan: Produktionsvy fokuserad på truckar med planering och enhetlig historik

## Sammanfattning

Bygg vidare på det befintliga orderhanteringssystemet med följande förbättringar:

1. **Produktionsvy med truckkort** - Visa individuella truckar som egna kort istället för orderkort
2. **Prioritering och planering** - Automatisk sortering efter planerat klart-datum med möjlighet till manuell omordning
3. **Automatisk truck-klar-markering** - Trucken blir automatiskt klar när alla steg är klara
4. **Enhetlig historik per truck** - En sammanhängande tidslinje istället för separata historiklistor

---

## Del 1: Produktionsvy med truckkort

### Nuvarande struktur
```text
┌──────────────────────────────┐
│ Order 12345                  │
│ ──────────────────────────── │
│ 📦 Motorlåda                 │
│   ┌──────────────┐           │
│   │ #108         │           │
│   │ ● Blästring  │           │
│   └──────────────┘           │
└──────────────────────────────┘
```

### Ny struktur - truckar i fokus
```text
┌──────────────────────────────┐  ┌──────────────────────────────┐
│         #108                 │  │         #109                 │
│ ─────────────────────────────│  │ ─────────────────────────────│
│ 🟡 Startad                   │  │ ⬤ Ankommen                   │
│                              │  │                              │
│ 📦 Motorlåda                 │  │ 📦 Motorlåda                 │
│ ───────────────────          │  │ ───────────────────          │
│ ✓ Maskering                  │  │ ○ Maskering                  │
│ ● Blästring ← aktuellt       │  │                              │
│ ○ Sprutzink                  │  │                              │
│                              │  │                              │
│ ──────────────────────────── │  │ ──────────────────────────── │
│ 12345 • Volvo                │  │ 12345 • Volvo                │
│ Klart: 15 feb                │  │ Klart: 15 feb                │
└──────────────────────────────┘  └──────────────────────────────┘
```

### Ny komponent: `ProductionTruckCard.tsx`

```typescript
interface ProductionTruckCardProps {
  truck: ObjectTruck;
  object: OrderObject;
  order: Order;
  objectSteps: OrderStep[];
  sortOrder?: number;
}
```

| Element | Beskrivning |
|---------|-------------|
| Trucknummer | Stort och tydligt överst (`text-3xl font-bold font-mono`) |
| Truckstatus | Badge med färg (Ankommen/Startad/Pausad) |
| Objektnamn | Vad som bearbetas |
| Stegstatus | Lista med statusikoner |
| Ordernummer | Litet, diskret längst ner |
| Kund | Kort kundnamn |
| Planerat klart | Leveransdatum |

---

## Del 2: Prioritering och planering

### Databasändring

Ny kolumn för manuell prioriteringsordning:

```sql
ALTER TABLE object_trucks 
ADD COLUMN sort_order integer;

-- Index för snabb sortering
CREATE INDEX idx_object_trucks_sort_order ON object_trucks(sort_order);
```

### Sorteringslogik

```typescript
function sortTrucksForProduction(trucks: FlatTruck[]): FlatTruck[] {
  return trucks.sort((a, b) => {
    // 1. Manuell ordning först (om satt)
    if (a.sortOrder !== null && b.sortOrder !== null) {
      return a.sortOrder - b.sortOrder;
    }
    if (a.sortOrder !== null) return -1;
    if (b.sortOrder !== null) return 1;
    
    // 2. Automatisk: planerat klart-datum
    const aDate = a.order.plannedEnd || '9999-12-31';
    const bDate = b.order.plannedEnd || '9999-12-31';
    return aDate.localeCompare(bDate);
  });
}
```

### Drag-and-drop för manuell omordning

Använd befintlig `@dnd-kit` för att låta användaren dra och släppa truckkort:

```typescript
import { DndContext, closestCenter, DragEndEvent } from '@dnd-kit/core';
import { SortableContext, rectSortingStrategy, useSortable } from '@dnd-kit/sortable';

function ProductionGrid({ trucks }: { trucks: FlatTruck[] }) {
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      // Uppdatera sort_order för berörda truckar
    }
  };
  
  return (
    <DndContext onDragEnd={handleDragEnd}>
      <SortableContext items={trucks.map(t => t.truck.id)} strategy={rectSortingStrategy}>
        {trucks.map(t => (
          <SortableTruckCard key={t.truck.id} {...t} />
        ))}
      </SortableContext>
    </DndContext>
  );
}
```

---

## Del 3: Automatisk truck-klar-markering

### Befintlig logik
Truckstatus ändras manuellt via dropdown.

### Ny logik
När alla behandlingssteg för en truck är klara → sätt automatiskt `truck.status = 'completed'`.

**Uppdatering i `ObjectTrucksEditor.tsx`:**

```typescript
const handleStepStatusClick = (truckId, stepId, currentStatus) => {
  const nextStatus = cycleStatus(currentStatus);
  
  // Uppdatera stegstatus
  onTruckStepStatusChange(truckId, stepId, nextStatus);
  
  // Kontrollera om alla steg nu är klara
  const truck = trucks.find(t => t.id === truckId);
  const allStepsCompleted = objectSteps.every(step => {
    if (step.id === stepId) return nextStatus === 'completed';
    const status = truck.stepStatuses.find(s => s.stepId === step.id);
    return status?.status === 'completed';
  });
  
  if (allStepsCompleted && truck.status !== 'completed') {
    // Auto-markera trucken som klar
    onTruckStatusChange(truckId, 'completed');
  }
};
```

---

## Del 4: Enhetlig historik per truck

### Nuvarande historik
Tre separata kolumner:
- Orderstatus
- Steghistorik (manuella steg)
- Truckhistorik

### Ny historik - en tidslinje per truck

```text
Truck #108
────────────────────────────────────────────────────
12 feb 09:00    Truck planerad
12 feb 10:30    Truck ankommen
12 feb 10:45    Maskering: Pågående
12 feb 11:20    Maskering: Klar
12 feb 11:25    Blästring: Pågående
12 feb 14:00    Blästring: Klar
12 feb 14:05    Sprutzink: Pågående
12 feb 15:30    Sprutzink: Klar
12 feb 15:30    Truck klar
────────────────────────────────────────────────────
```

### Ny databastabell för trucklivscykelhändelser

```sql
CREATE TABLE truck_lifecycle_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  truck_id uuid NOT NULL REFERENCES object_trucks(id) ON DELETE CASCADE,
  truck_number text NOT NULL,
  event_type text NOT NULL CHECK (event_type IN (
    'planned', 'arrived', 'started', 'paused', 'completed',
    'step_started', 'step_completed'
  )),
  step_name text, -- För steg-events
  timestamp timestamptz NOT NULL DEFAULT now(),
  note text -- Valfri kommentar
);

-- RLS policies
ALTER TABLE truck_lifecycle_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can read truck_lifecycle_events"
  ON truck_lifecycle_events FOR SELECT USING (true);
CREATE POLICY "Editors can insert truck_lifecycle_events"
  ON truck_lifecycle_events FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'redigera'));
```

### Ny typ i `types/order.ts`

```typescript
export type TruckLifecycleEventType = 
  | 'planned'
  | 'arrived'
  | 'started'
  | 'paused'
  | 'completed'
  | 'step_started'
  | 'step_completed';

export interface TruckLifecycleEvent {
  id: string;
  truckId: string;
  truckNumber: string;
  eventType: TruckLifecycleEventType;
  stepName?: string;
  timestamp: string;
  note?: string;
}
```

### Ny komponent: `TruckTimeline.tsx`

```typescript
function TruckTimeline({ events }: { events: TruckLifecycleEvent[] }) {
  const sortedEvents = [...events].sort((a, b) => 
    new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );
  
  return (
    <div className="space-y-2">
      {sortedEvents.map(event => (
        <div key={event.id} className="flex items-center gap-3 text-sm">
          <span className="text-muted-foreground w-24">
            {format(new Date(event.timestamp), 'd MMM HH:mm', { locale: sv })}
          </span>
          <EventIcon type={event.eventType} />
          <span>{getEventLabel(event)}</span>
        </div>
      ))}
    </div>
  );
}

function getEventLabel(event: TruckLifecycleEvent): string {
  switch (event.eventType) {
    case 'planned': return 'Truck planerad';
    case 'arrived': return 'Truck ankommen';
    case 'started': return 'Arbete påbörjat';
    case 'paused': return 'Pausad';
    case 'completed': return 'Truck klar';
    case 'step_started': return `${event.stepName}: Pågående`;
    case 'step_completed': return `${event.stepName}: Klar`;
  }
}
```

---

## Del 5: Ordervy och orderöversikt

### Orderöversikt - befintlig förbättring
Redan implementerat: sökning på trucknummer fungerar.

### Orderdetalj - ny sammanfattning

Lägg till trucksammanfattning i orderhuvudet:

```text
┌────────────────────────────────────────────────────────────────┐
│ Order 12345                                                    │
│ Volvo • Kundreferens ABC-123                                  │
│                                                                │
│ Truckar: 5 planerade • 3 ankomna • 1 klar                     │
│ ─────────────────────────────────────────────────────────────  │
│ Objekt: Motorlåda (3 st) • Lagerlock (2 st)                   │
└────────────────────────────────────────────────────────────────┘
```

---

## Filer som skapas/ändras

| Fil | Typ |
|-----|-----|
| **Ny migration** | Lägg till `sort_order` i `object_trucks`, skapa `truck_lifecycle_events` |
| `src/types/order.ts` | Lägg till `TruckLifecycleEvent`, `sortOrder` i `ObjectTruck` |
| `src/components/ProductionTruckCard.tsx` | **Ny** - Truckkort för produktionsvyn |
| `src/components/TruckTimeline.tsx` | **Ny** - Enhetlig historiktidslinje |
| `src/pages/ProductionScreen.tsx` | Refaktorera till truck-centrerad vy med drag-and-drop |
| `src/contexts/OrdersContext.tsx` | Lägg till händelseloggning, uppdatera `updateTruckStatus` |
| `src/components/ObjectTrucksEditor.tsx` | Automatisk klar-markering |
| `src/pages/OrderDetails.tsx` | Visa trucksammanfattning och tidslinje per truck |

---

## Logik för automatisk statusändring

### Truck planerad
När truck skapas → logga `planned`

### Truck ankommen
När `truck.status` ändras till `arrived` → logga `arrived`

### Steg pågående/klar
När `truck_step_status.status` ändras → logga `step_started` eller `step_completed`

### Truck klar (automatiskt)
```typescript
// I updateTruckStepStatus
const allCompleted = objectSteps.every(step => {
  const status = truck.stepStatuses.find(s => s.stepId === step.id);
  if (step.id === stepId) return newStatus === 'completed';
  return status?.status === 'completed';
});

if (allCompleted && truck.status !== 'completed') {
  await updateTruckStatus(orderId, truckId, 'completed');
  await logLifecycleEvent(orderId, truckId, truckNumber, 'completed');
}
```

---

## Sammanfattning av förbättringar

| Område | Före | Efter |
|--------|------|-------|
| Produktionsvy | Orderkort med truckar inuti | Individuella truckkort |
| Prioritering | Ingen | Auto efter datum + manuell drag-drop |
| Truck klar | Manuell markering | Automatisk när alla steg klara |
| Historik | Tre separata listor | En tidslinje per truck |
| Ordervy | Visar objekt och steg | + Trucksammanfattning |

---

## Bakåtkompatibilitet

- Befintliga ordrar utan truckar fungerar som idag
- Befintlig historik bevaras (migration ändrar inte befintlig data)
- Produktionsvyn faller tillbaka till orderkort om inga truckar finns

