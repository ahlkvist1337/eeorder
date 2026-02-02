

# Plan: Förbättringar av orderhantering efter truckimplementering

## Sammanfattning

Fyra förbättringar för att lösa irritationsmoment och anpassa systemet efter de nya trucknummerändringarna:

1. **Optimistisk uppdatering** - Sluta ladda om hela sidan efter varje ändring
2. **Behandlingssteg i rad** - Spara plats genom horisontell layout
3. **Produktionsvyn** - Visa truckar korrekt med status
4. **Historik** - Logga truckstatus-ändringar

---

## Problem 1: Sidan uppdateras hela tiden

### Orsak
Varje ändring anropar `fetchOrders()` som laddar om ALLA ordrar från databasen. Detta orsakar att komponenter omrenderas och användaren "tappar" sitt ställe.

### Lösning
Implementera **optimistisk uppdatering** - uppdatera lokal state direkt utan att hämta om alla ordrar.

```text
Före:
  Användare ändrar → Spara till DB → fetchOrders() → Hela listan uppdateras → UI flimrar

Efter:
  Användare ändrar → Uppdatera lokal state direkt → Spara till DB i bakgrunden
```

### Tekniska ändringar

**Fil: `src/contexts/OrdersContext.tsx`**

| Ändring | Beskrivning |
|---------|-------------|
| `updateOrder` | Uppdatera `orders` state lokalt istället för att anropa `fetchOrders()` |
| `updateOrderStep` | Samma optimistiska uppdatering |
| Truck-ändringar | Uppdatera lokalt när truckstatus ändras |

```typescript
// Exempel på optimistisk uppdatering
const updateOrder = async (id, updates) => {
  // Uppdatera state direkt
  setOrders(prev => prev.map(o => 
    o.id === id ? { ...o, ...updates, updatedAt: new Date().toISOString() } : o
  ));
  
  // Spara till DB i bakgrunden
  await supabase.from('orders').update(dbUpdates).eq('id', id);
  // Ingen fetchOrders() i slutet!
};
```

---

## Problem 2: Behandlingssteg tar för mycket plats

### Nuvarande layout (vertikal lista)
```text
┌──────────────────────────────────────┐
│ Monteringsdetaljer                   │
│   ● Maskering    [Väntande ▼] [🗑️]  │
│   ● Blästring    [Väntande ▼] [🗑️]  │
│   ● Sprutzink    [Väntande ▼] [🗑️]  │
└──────────────────────────────────────┘
```

### Ny layout (horisontell rad - när truckar finns)
```text
┌──────────────────────────────────────────────────────┐
│ Monteringsdetaljer           3 truckar • 1 klar      │
│ Steg: Maskering → Blästring → Sprutzink              │
│                                                      │
│ Truckar: (expanderbar)                               │
│   #108  Maskering ✓  Blästring ○  Sprutzink ○        │
└──────────────────────────────────────────────────────┘
```

### Tekniska ändringar

**Fil: `src/components/OrderObjectsEditor.tsx`**

| Ändring | Beskrivning |
|---------|-------------|
| Villkorlig layout | Om truckar finns: visa steg som horisontell rad utan status-kontroller |
| Kompakt visning | Stegen visas med pilar mellan (→) |
| Flytta fokus | Statushantering sker på trucknivå istället |

**Fil: `src/components/ObjectTrucksEditor.tsx`**

| Ändring | Beskrivning |
|---------|-------------|
| Ta bort trunkering | Visa hela stegnamnet (rad 233) |
| Flexibel layout | Använd `flex-wrap` för långa namn |

---

## Problem 3: Produktionsvyn behöver anpassas

### Nuvarande visning
Visar objekt med stegstatus, men tar inte hänsyn till truckar korrekt.

### Ny visning med truckar
```text
┌──────────────────────────────────────┐
│ 12345                                │
│ ┌──────────────────────────────────┐ │
│ │ Startad                          │ │
│ └──────────────────────────────────┘ │
│                                      │
│ 📦 Monteringsdetaljer                │
│                                      │
│    ┌─────────────────────────────┐   │
│    │        #108                 │   │  ← Stort, lättläst
│    │   Maskering ✓               │   │
│    │   Blästring ● (pågående)    │   │  ← Aktuellt steg tydligt
│    │   Sprutzink ○               │   │
│    └─────────────────────────────┘   │
│                                      │
│    ┌─────────────────────────────┐   │
│    │        #109                 │   │
│    │   ○ Maskering (väntande)    │   │
│    └─────────────────────────────┘   │
│                                      │
│    ✅ #110, #111 klara              │  ← Klara truckar kompakt
│                                      │
│ ─────────────────────────────────────│
│ Volvo                                │
│ 📅 Leveransredo: 15 feb 2026         │
└──────────────────────────────────────┘
```

### Tekniska ändringar

**Fil: `src/components/ProductionOrderCard.tsx`**

| Ändring | Beskrivning |
|---------|-------------|
| Truckkort per objekt | Visa aktiva truckar som separata kort |
| Trucknummer stort | Använd `text-2xl font-bold font-mono` |
| Stegstatus per truck | Lista stegen med status-ikoner |
| Aktuellt steg markerat | Visa vilket steg trucken är på |
| Klara truckar kompakt | Klara truckar på en rad |

Logik för att hitta "aktuellt steg" per truck:
```typescript
function getCurrentStep(truck: ObjectTruck, objectSteps: OrderStep[]) {
  // Hitta första steget som är in_progress
  const inProgress = objectSteps.find(step => {
    const status = truck.stepStatuses.find(s => s.stepId === step.id);
    return status?.status === 'in_progress';
  });
  if (inProgress) return { step: inProgress, status: 'in_progress' };
  
  // Annars hitta första pending
  const pending = objectSteps.find(step => {
    const status = truck.stepStatuses.find(s => s.stepId === step.id);
    return !status || status.status === 'pending';
  });
  if (pending) return { step: pending, status: 'pending' };
  
  return { step: null, status: 'completed' };
}
```

---

## Problem 4: Historiken loggar inte truckändringar

### Nuvarande historik
Visar endast:
- Orderstatusändringar (Skapad → Startad)
- Stegstatusändringar (Blästring: Väntande → Pågående)

### Ny historik med truckar
```text
Orderstatus              │ Truck- och steghistorik
─────────────────────────┼──────────────────────────────────────
12 feb 14:32 Skapad →    │ 12 feb 15:01 #108 Maskering: Klar
             Startad     │ 12 feb 15:05 #108 Blästring: Pågående
                         │ 12 feb 15:10 #109 Maskering: Pågående
```

### Tekniska ändringar

**Ny databastabell: `truck_status_history`**
```sql
CREATE TABLE truck_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  truck_id uuid NOT NULL REFERENCES object_trucks(id) ON DELETE CASCADE,
  truck_number text NOT NULL,
  step_id uuid NOT NULL REFERENCES order_steps(id) ON DELETE CASCADE,
  step_name text NOT NULL,
  from_status step_status NOT NULL,
  to_status step_status NOT NULL,
  timestamp timestamptz NOT NULL DEFAULT now()
);
```

**Fil: `src/types/order.ts`**
```typescript
export interface TruckStatusChange {
  id: string;
  timestamp: string;
  truckId: string;
  truckNumber: string;
  stepId: string;
  stepName: string;
  fromStatus: StepStatus;
  toStatus: StepStatus;
}

// Lägg till i Order interface
truckStatusHistory: TruckStatusChange[];
```

**Fil: `src/contexts/OrdersContext.tsx`**
- Hämta `truck_status_history` i `fetchOrders`
- Logga ändringar när truck step status ändras

**Fil: `src/pages/OrderDetails.tsx`**
- Visa truckstatushistorik i höger kolumn
- Inkludera trucknummer i visningen

---

## Sammanfattning av filer som ändras

| Fil | Typ av ändring |
|-----|----------------|
| Ny migration | Skapa `truck_status_history` tabell med RLS |
| `src/types/order.ts` | Lägg till `TruckStatusChange` interface |
| `src/contexts/OrdersContext.tsx` | Optimistisk uppdatering + logga truckhistorik |
| `src/components/OrderObjectsEditor.tsx` | Horisontell layout för steg när truckar finns |
| `src/components/ObjectTrucksEditor.tsx` | Ta bort trunkering av stegnamn |
| `src/components/ProductionOrderCard.tsx` | Visa truckar med stegstatus |
| `src/pages/OrderDetails.tsx` | Visa truckstatushistorik |

---

## Prioritetsordning

1. **Optimistisk uppdatering** - Löser det mest irriterande problemet direkt
2. **Behandlingssteg i rad** - Gör UI snyggare och mer kompakt
3. **Produktionsvyn** - Anpassa för truckar
4. **Historik** - Fullständig spårbarhet

