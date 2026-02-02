
# Plan: Dela upp Orderstatus och Truckstatus

## Sammanfattning

Separera administrativa statusar (ordernivå) från produktionsstatusar (trucknivå) för att spegla verkligheten i verkstaden.

---

## Nuvarande problem

| Nivå | Nuvarande användning | Problem |
|------|---------------------|---------|
| Order | `productionStatus`: arrived/started/paused/completed | Används både för back-office och produktion |
| Truck | Endast stegstatus (pending/in_progress/completed) | Saknar ankomst, paus och trucköversiktsstatus |

---

## Ny struktur

```text
┌────────────────────────────────────────────────────────────────────────────────┐
│                              ORDER (Back-office)                               │
│ ──────────────────────────────────────────────────────────────────────────────│
│  Orderstatus: Skapad → Avslutad → Avbruten                                    │
│  Faktureringsstatus: Ej klar → Klar för fakturering → Fakturerad              │
│                                                                                │
│  (Används för: Administrativ uppföljning, fakturering, orderhistorik)         │
└────────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌────────────────────────────────────────────────────────────────────────────────┐
│                         TRUCK (Produktionens sanning)                          │
│ ──────────────────────────────────────────────────────────────────────────────│
│  Truckstatus: Väntande → Ankommen → Startad → Pausad → Klar                   │
│                                                                                │
│  + Stegstatus per truck: pending → in_progress → completed                    │
│                                                                                │
│  (Används för: Produktionsskärm, verkstadsöversikt, vad som faktiskt händer)  │
└────────────────────────────────────────────────────────────────────────────────┘
```

---

## Nya typer

### Truckstatus (ny)

```typescript
export type TruckStatus = 
  | 'waiting'     // Väntande (inte anlänt ännu)
  | 'arrived'     // Ankommen
  | 'started'     // Arbete påbörjat
  | 'paused'      // Pausad
  | 'completed';  // Klar
```

### Förenklad orderstatus (ändring)

```typescript
export type OrderStatus = 
  | 'created'     // Skapad (ny order)
  | 'completed'   // Avslutad (allt klart, redo för arkiv)
  | 'cancelled';  // Avbruten
```

**Not:** Befintliga värden `arrived`, `started`, `paused` på ordernivå kommer **migreras till trucknivå** eller behållas för bakåtkompatibilitet.

---

## Databasändringar

### 1. Lägg till `status` i `object_trucks`

```sql
-- Lägg till truckstatus-kolumn
ALTER TABLE object_trucks 
ADD COLUMN status text NOT NULL DEFAULT 'waiting'
CHECK (status IN ('waiting', 'arrived', 'started', 'paused', 'completed'));

-- Index för snabb filtrering
CREATE INDEX idx_object_trucks_status ON object_trucks(status);
```

### 2. Behåll befintliga ordrar (bakåtkompatibilitet)

Ingen befintlig data raderas. Ordrar utan truckar fungerar som idag.

---

## UI-ändringar

### Produktionsskärmen (truckfokus)

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ 🏭 Produktionsvy                            Uppdaterad: 14:32:15             │
├──────────────────────────────────────────────────────────────────────────────┤
│ Status: [Ankommen] [Startad] [Pausad]   Steg: ○ Väntande ● Pågående ✓ Klar  │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────────────────┐  ┌─────────────────────────────┐           │
│  │ Order 12345                 │  │ Order 12346                 │           │
│  │ ─────────────────────────── │  │ ─────────────────────────── │           │
│  │                             │  │                             │           │
│  │ 📦 Motorlåda                │  │ 📦 Lagerlock                │           │
│  │                             │  │                             │           │
│  │   ┌───────────────────┐     │  │   ┌───────────────────┐     │           │
│  │   │     #108          │     │  │   │     #205          │     │           │
│  │   │ ⬤ Ankommen        │     │  │   │ 🟡 Startad        │     │           │
│  │   │ ● Blästring       │     │  │   │ ✓ Blästring       │     │           │
│  │   └───────────────────┘     │  │   │ ● Målning         │     │           │
│  │                             │  │   └───────────────────┘     │           │
│  │   ┌───────────────────┐     │  │                             │           │
│  │   │     #109          │     │  │   ✅ #203, #204 klara      │           │
│  │   │ 🟡 Startad        │     │  │                             │           │
│  │   │ ● Målning         │     │  │                             │           │
│  │   └───────────────────┘     │  └─────────────────────────────┘           │
│  │                             │                                             │
│  │ ⏸️ Pausade: #107            │                                             │
│  │ ✅ Klara: #105, #106        │                                             │
│  └─────────────────────────────┘                                             │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

**Filtrering baseras på truckstatus:**
- Visa truckar med status: `arrived`, `started`, `paused`
- Gruppera per order och objekt

### Orderdetalj (truckkontroll)

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│ Objekt & Behandlingssteg                                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│ ▼ Motorlåda                           3 truckar • 1 klar                    │
│                                                                             │
│   Steg: Maskering → Blästring → Sprutzink                                   │
│                                                                             │
│   ▼ Truckar:                                                                │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │ #108   [Ankommen ▼]  Maskering ✓  Blästring ●  Sprutzink ○          │   │
│   │ #109   [Startad ▼]   Maskering ✓  Blästring ✓  Sprutzink ●          │   │
│   │ #110   [Klar ▼]      Maskering ✓  Blästring ✓  Sprutzink ✓          │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│   [+ Lägg till truck]                                                       │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Orderöversikt (administrativt fokus)

```text
┌────────────────────────────────────────────────────────────────────────────────┐
│ Ordernr  │ Kund      │ Orderstatus │ Truckar             │ Fakturering        │
├──────────┼───────────┼─────────────┼─────────────────────┼────────────────────┤
│ 12345    │ Volvo     │ Skapad      │ 3 (2 startade)      │ Ej klar            │
│ 12346    │ Scania    │ Avslutad    │ 2 (2 klara)         │ Klar för fakt.     │
└────────────────────────────────────────────────────────────────────────────────┘
```

---

## Filer som ändras

| Fil | Typ av ändring |
|-----|----------------|
| Ny migration | Lägg till `status` kolumn i `object_trucks` |
| `src/types/order.ts` | Lägg till `TruckStatus`, uppdatera `ObjectTruck` |
| `src/contexts/OrdersContext.tsx` | Hantera truckstatus i CRUD-operationer |
| `src/components/ObjectTrucksEditor.tsx` | Lägg till dropdown för truckstatus |
| `src/components/ProductionOrderCard.tsx` | Visa truckstatus, filtrera på trucknivå |
| `src/pages/ProductionScreen.tsx` | Filtrera ordrar baserat på truckstatus |
| `src/components/OrdersTable.tsx` | Visa truckstatus-sammanfattning |
| `src/components/StatusBadge.tsx` | Lägg till `TruckStatusBadge` |

---

## Logik för produktionsvyn

```typescript
// Visa order om den har minst en aktiv truck
function hasActiveTrucks(order: Order): boolean {
  const allTrucks = (order.objects || []).flatMap(obj => obj.trucks || []);
  return allTrucks.some(truck => 
    truck.status === 'arrived' || 
    truck.status === 'started' || 
    truck.status === 'paused'
  );
}

// Gruppera truckar per status
const arrivedTrucks = allTrucks.filter(t => t.status === 'arrived');
const startedTrucks = allTrucks.filter(t => t.status === 'started');
const pausedTrucks = allTrucks.filter(t => t.status === 'paused');
const completedTrucks = allTrucks.filter(t => t.status === 'completed');
```

---

## Bakåtkompatibilitet

- **Ordrar utan truckar**: Fungerar som idag med orderstatus
- **Befintlig orderstatus**: Behålls men används endast administrativt
- **Befintliga truckar**: Får defaultstatus `waiting`
- **Inga destruktiva ändringar**: Allt befintligt data bevaras

---

## Migreringslogik

För befintliga truckar som har stegstatus:

```sql
-- Sätt truckstatus baserat på stegstatus
UPDATE object_trucks ot
SET status = CASE
  WHEN EXISTS (
    SELECT 1 FROM truck_step_status tss 
    WHERE tss.truck_id = ot.id AND tss.status = 'completed'
    AND NOT EXISTS (
      SELECT 1 FROM truck_step_status tss2 
      WHERE tss2.truck_id = ot.id AND tss2.status != 'completed'
    )
  ) THEN 'completed'
  WHEN EXISTS (
    SELECT 1 FROM truck_step_status tss 
    WHERE tss.truck_id = ot.id 
    AND tss.status IN ('in_progress', 'completed')
  ) THEN 'started'
  ELSE 'waiting'
END;
```

---

## Sammanfattning

| Ansvar | Nivå | Status | Användning |
|--------|------|--------|------------|
| Administration | Order | Skapad/Avslutad/Avbruten | Back-office, fakturering |
| Fakturering | Order | Ej klar/Klar/Fakturerad | Back-office |
| Produktion | Truck | Väntande/Ankommen/Startad/Pausad/Klar | Produktionsvy, verkstad |
| Behandling | Truck per steg | Väntande/Pågående/Klar | Detaljerad arbetsstatus |

