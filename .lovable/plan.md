

# Plan: Trucknummerhantering per objekt

## Sammanfattning

Utöka orderhanteringssystemet med trucknummer som en separat entitet kopplad till objekt. Varje objekt kan ha flera truckar, och varje truck kan ha sin egen status genom behandlingsflödet.

---

## Ny datamodell

```text
Order
  └── Objekt (t.ex. "Motorlåda")
       ├── Truck #99  (status per steg)
       ├── Truck #100 (status per steg)
       └── Truck #102 (status per steg)
```

---

## Ny design i orderdetaljer

```text
┌─────────────────────────────────────────────────────────────────────────────────┐
│ Objekt & Behandlingssteg                                                        │
├─────────────────────────────────────────────────────────────────────────────────┤
│ ▼ Motorlåda                      3 truckar • 1 klar              [✏️] [🗑️]     │
│ ┌─────────────────────────────────────────────────────────────────────────────┐ │
│ │ Behandlingssteg:                                                            │ │
│ │ ● Blästring            ○ Målning                                            │ │
│ │                                                                             │ │
│ │ ▼ Truckar:                                                                  │ │
│ │ ┌───────────────────────────────────────────────────────────────────────┐   │ │
│ │ │ #99      │ Blästring ✓  │ Målning ✓   │ ✅ Klar        [✏️] [🗑️]   │   │ │
│ │ │ #100     │ Blästring ✓  │ Målning ●   │ 🔄 Pågående    [✏️] [🗑️]   │   │ │
│ │ │ #102     │ Blästring ○  │ Målning ○   │ ⏳ Väntande    [✏️] [🗑️]   │   │ │
│ │ └───────────────────────────────────────────────────────────────────────┘   │ │
│ │ [+ Lägg till truck]                                                         │ │
│ └─────────────────────────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────────────────────────┤
│ ▶ Lagerlock                      2 truckar • 2 klara             [✏️] [🗑️]     │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## Produktionsskärmen

```text
┌──────────────────────────────────────────┐
│ 12345                                    │
│ ┌──────────────────────────────────────┐ │
│ │ Startad                              │ │
│ └──────────────────────────────────────┘ │
│                                          │
│ 📦 Motorlåda                             │
│                                          │
│    ┌────────────────────────────────┐    │
│    │        #99                     │    │  ← Stort trucknummer
│    │  ● Målning (pågående)          │    │  ← Aktuellt steg
│    └────────────────────────────────┘    │
│                                          │
│    ┌────────────────────────────────┐    │
│    │        #100                    │    │
│    │  ○ Blästring (väntande)        │    │
│    └────────────────────────────────┘    │
│                                          │
│    ✅ #102 klar                          │  ← Klara truckar kompakt
│                                          │
└──────────────────────────────────────────┘
```

---

## Sök och filter i orderöversikten

```text
┌────────────────────────────────────────────────────────────────────────────────┐
│ 🔍 [Sök ordernummer, kund, truck...                                      ]     │
├────────────────────────────────────────────────────────────────────────────────┤
│ Ordernr   │ Kund          │ Status    │ Truckar        │ ...                   │
├───────────┼───────────────┼───────────┼────────────────┼───────────────────────┤
│ 12345     │ Volvo         │ Startad   │ #99, #100, ... │                       │
│ 12346     │ Scania        │ Ankommen  │ #105, #106     │                       │
└────────────────────────────────────────────────────────────────────────────────┘
```

Sökning på "99" visar alla ordrar med truck #99.

---

## Tekniska ändringar

### 1. Ny databastabell: `object_trucks`

```sql
CREATE TABLE object_trucks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  object_id uuid NOT NULL REFERENCES order_objects(id) ON DELETE CASCADE,
  truck_number text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
```

### 2. Ny tabell för truckstatus: `truck_step_status`

Spårar varje trucks status per behandlingssteg.

```sql
CREATE TABLE truck_step_status (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  truck_id uuid NOT NULL REFERENCES object_trucks(id) ON DELETE CASCADE,
  step_id uuid NOT NULL REFERENCES order_steps(id) ON DELETE CASCADE,
  status step_status NOT NULL DEFAULT 'pending',
  actual_start timestamptz,
  actual_end timestamptz,
  UNIQUE(truck_id, step_id)
);
```

### 3. RLS-policies

Samma mönster som övriga tabeller:
- SELECT: Alla autentiserade användare
- INSERT/UPDATE: Editors och admins
- DELETE: Endast admins

---

## Typuppdateringar

### `src/types/order.ts`

```typescript
export interface ObjectTruck {
  id: string;
  objectId: string;
  truckNumber: string;
  stepStatuses: TruckStepStatus[];
  createdAt?: string;
}

export interface TruckStepStatus {
  id: string;
  truckId: string;
  stepId: string;
  status: StepStatus;
  actualStart?: string;
  actualEnd?: string;
}

// Utöka OrderObject
export interface OrderObject {
  id: string;
  name: string;
  description?: string;
  plannedQuantity: number;
  receivedQuantity: number;
  completedQuantity: number;
  trucks?: ObjectTruck[];  // Nytt
  createdAt?: string;
}
```

---

## Kontextuppdateringar

### `src/contexts/OrdersContext.tsx`

| Ändring | Beskrivning |
|---------|-------------|
| Ny interface `DbObjectTruck` | Databastypning för truckar |
| Ny interface `DbTruckStepStatus` | Databastypning för truckstegstatus |
| Uppdatera `fetchOrders` | Hämta truckar och truckstegstatus parallellt |
| Uppdatera `mapDbOrderToOrder` | Inkludera truckar i objektmappning |
| Uppdatera `addOrder` | Hantera insert av truckar och deras statusar |
| Uppdatera `updateOrder` | Upsert-strategi för truckar och statusar |
| Ny funktion `updateTruckStepStatus` | Uppdatera enskild trucks stegstatus |

---

## UI-komponenter

### Ny: `src/components/ObjectTrucksEditor.tsx`

Hanterar trucklistan inom ett objekt:
- Visa truckar i kollapsbar lista
- Lägg till/ta bort truck
- Redigera trucknummer
- Visa stegstatus per truck med klickbara statusbrickor

### Uppdatera: `src/components/OrderObjectsEditor.tsx`

| Ändring | Beskrivning |
|---------|-------------|
| Importera ObjectTrucksEditor | Integrera truckeditor |
| Visa trucksammanfattning | "3 truckar • 1 klar" i objekthuvudet |
| Kollapsbar trucksektion | Visa/dölj truckar med expanderknapp |
| Antal anpassning | Om truckar används, beräkna antal automatiskt |

### Uppdatera: `src/components/ProductionOrderCard.tsx`

| Ändring | Beskrivning |
|---------|-------------|
| Visa truckar per objekt | Lista truckar med stort trucknummer |
| Stegstatus per truck | Visa aktuellt steg för varje truck |
| Visuell gruppering | Truckar grupperade under objektnamn |
| Kompakt vy för klara | Klara truckar visas på en rad |

### Uppdatera: `src/components/OrdersTable.tsx`

| Ändring | Beskrivning |
|---------|-------------|
| Ny kolumn "Truckar" | Visa trucknummer som kommaseparerad lista |
| Utökad sökning | Inkludera trucknummer i sökfilter |

---

## Dataflöde

```text
1. Skapa objekt (t.ex. "Motorlåda")
2. Lägg till behandlingssteg (Blästring, Målning)
3. Lägg till truckar (#99, #100, #102)
   → Systemet skapar automatiskt truck_step_status för varje steg
4. Uppdatera status per truck genom behandlingen
   → Varje truck kan vara på olika steg
5. Produktionsskärmen visar exakt var varje truck befinner sig
6. Sökning på trucknummer visar rätt order
```

---

## Bakåtkompatibilitet

- Befintliga ordrar utan truckar fungerar som tidigare
- Antal-fälten (planned/received/completed) kan fortfarande användas
- Truckar är ett tillägg, inte en ersättning

---

## Filer som påverkas

| Fil | Typ av ändring |
|-----|----------------|
| Ny migration | Skapa `object_trucks` och `truck_step_status` tabeller med RLS |
| `src/types/order.ts` | Lägg till `ObjectTruck` och `TruckStepStatus` interfaces |
| `src/contexts/OrdersContext.tsx` | Uppdatera fetch, add och update för truckar |
| `src/components/ObjectTrucksEditor.tsx` | **Ny komponent** för truckhantering |
| `src/components/OrderObjectsEditor.tsx` | Integrera truckvisning och -editor |
| `src/components/ProductionOrderCard.tsx` | Visa truckar i produktionsvyn |
| `src/components/OrdersTable.tsx` | Lägg till truckkolumn och sökstöd |
| `src/components/OrderFilters.tsx` | Uppdatera söklogik för trucknummer |

---

## Fördelar

- Tydlig spårning: Exakt var varje truck befinner sig
- Flexibelt: Truckar kan läggas till/tas bort utan att ändra objekt
- Sökbart: Hitta ordrar baserat på trucknummer
- Visuellt: Stora trucknummer i produktionsvyn för snabb identifiering
- Minimalt klickande: Kollapsbar vy visar sammanfattning, detaljer vid behov

