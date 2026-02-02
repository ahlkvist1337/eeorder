
# Plan: Arbetskort-centrerat produktionssystem

## Sammanfattning

Systemet fungerar idag bra men har kvar terminologi och vissa koncept som skapar förvirring. Denna plan rensar upp terminologin och förtydligar rollfördelningen mellan **Order** (affär) och **Arbetskort** (produktion).

---

## Nuläge

### Vad som redan fungerar korrekt

| Komponent | Status |
|-----------|--------|
| `ObjectTruck` som arbetsenhet | Fungerar |
| Valfritt trucknummer | Implementerat (truck_number nullable) |
| Stegstatus per arbetsenhet | Fungerar |
| Automatisk "klar" när alla steg klara | Fungerar |
| Produktionsvy visar arbetsenheter | Fungerar |
| Historik per arbetsenhet | Fungerar |
| Fallback-identifiering utan trucknummer | Fungerar |

### Vad som behöver förfinas

| Problem | Åtgärd |
|---------|--------|
| "Truck"-terminologi överallt i kod och UI | Byt till "Arbetskort" |
| Orderstatus (ProductionStatus) har för många val | Begränsa till back-office |
| Objektets quantity-fält (Plan/Mott/Klart) är manuella | Beräkna automatiskt från arbetskort |
| Otydlig rollfördelning Order vs Arbetskort | Förtydliga i UI |

---

## Del 1: Terminologiändring

### UI-texter att ändra

| Nuvarande | Ny text |
|-----------|---------|
| Arbetsenheter | Arbetskort |
| Arbetsenhet | Arbetskort |
| Lägg till arbetsenhet | Lägg till arbetskort |
| Inga arbetsenheter | Inga arbetskort |
| Historik per arbetsenhet | Historik per arbetskort |
| Arbetsenheter med status... | Arbetskort med status... |

### Berörda filer

- `src/types/order.ts` - Etiketter
- `src/components/ObjectTrucksEditor.tsx` - UI-texter
- `src/components/ProductionTruckCard.tsx` - Rubriker
- `src/pages/ProductionScreen.tsx` - Rubriker och meddelanden
- `src/pages/OrderDetails.tsx` - Sammanfattning och historik
- `src/components/TruckTimeline.tsx` - Tidslinje-etiketter

### Exempel på ändring i types/order.ts

```typescript
// Nuvarande
export const truckLifecycleEventLabels: Record<TruckLifecycleEventType, string> = {
  planned: 'Arbetsenhet planerad',
  arrived: 'Arbetsenhet ankommen',
  ...
};

// Ny
export const truckLifecycleEventLabels: Record<TruckLifecycleEventType, string> = {
  planned: 'Arbetskort planerat',
  arrived: 'Arbetskort ankommet',
  started: 'Arbete påbörjat',
  paused: 'Pausat',
  completed: 'Arbetskort klart',
  step_started: 'Steg påbörjat',
  step_completed: 'Steg klart',
};
```

---

## Del 2: Orderstatus renodlas till back-office

### Nuvarande ProductionStatus

```typescript
export type ProductionStatus = 
  | 'created'      // Skapad
  | 'started'      // Startad ← produktionslogik, bör bort
  | 'paused'       // Pausad ← produktionslogik, bör bort
  | 'arrived'      // Ankommen ← produktionslogik, bör bort
  | 'completed'    // Avslutad
  | 'cancelled';   // Avbruten
```

### Förenklad ProductionStatus (administrativ)

```typescript
export type OrderStatus = 
  | 'active'       // Aktiv (ny order, arbete pågår)
  | 'completed'    // Avslutad
  | 'cancelled';   // Avbruten
```

### Migreringsplan

1. Lägg till `active` som ny status
2. Mappa befintliga `created`, `started`, `paused`, `arrived` → `active`
3. Behåll `completed` och `cancelled`
4. Uppdatera UI för att endast visa tre val

### Databasmigration

```sql
-- Konsolidera produktionsstatus till administrativ
UPDATE orders 
SET production_status = 'active'
WHERE production_status IN ('created', 'started', 'paused', 'arrived');
```

---

## Del 3: Automatisk beräkning av Plan/Mott/Klart

### Nuvarande problem

Objektets quantity-fält (plannedQuantity, receivedQuantity, completedQuantity) är manuellt inmatade och kan komma ur synk med arbetskortsdata.

### Ny beräkningslogik

```typescript
// I OrderObjectsEditor eller OrderDetails
function calculateObjectQuantities(obj: OrderObject): {
  planned: number;
  received: number;
  completed: number;
} {
  const trucks = obj.trucks || [];
  
  return {
    planned: trucks.length,
    received: trucks.filter(t => 
      t.status === 'arrived' || 
      t.status === 'started' || 
      t.status === 'paused' || 
      t.status === 'completed'
    ).length,
    completed: trucks.filter(t => t.status === 'completed').length,
  };
}
```

### UI-ändring

Istället för manuella input-fält visar vi beräknade värden:

```text
Före:
[Plan: ___] [Mott: ___] [Klart: ___]

Efter:
Arbetskort: 3 planerade • 2 ankomna • 1 klart
```

---

## Del 4: Förtydliga Order vs Arbetskort i UI

### Orderdetaljvy

Strukturera om för att tydliggöra:

```text
┌─────────────────────────────────────────────────┐
│ ORDER 12345                                     │
│ Kund: Volvo AB • Referens: REF-001             │
│                                                 │
│ [Aktiv ▼]  [Klar för fakturering ▼]            │
├─────────────────────────────────────────────────┤
│ OBJEKT & ARBETSKORT                             │
│                                                 │
│ ▼ Motorlåda                                     │
│   Steg: Blästring → Lackering → Montering       │
│   Arbetskort:                                   │
│   ┌──────────────────────────────────────────┐  │
│   │ #135  [Ankommen ▼] [Blästring ●] [Lack ○]│  │
│   │ #136  [Väntande ▼] [Blästring ○] [Lack ○]│  │
│   │ Reserv A7B2 [Klar ▼] [✓] [✓] [✓]         │  │
│   └──────────────────────────────────────────┘  │
│   Sammanfattning: 3 planerade • 2 ankomna • 1 klar│
└─────────────────────────────────────────────────┘
```

### Produktionsvy

Behålls som idag - visar endast arbetskort, inte ordrar:

```text
┌───────────┐ ┌───────────┐ ┌───────────┐
│ #135      │ │ #136      │ │ Reserv    │
│ Motorlåda │ │ Motorlåda │ │ A7B2      │
│ [Blästr ●]│ │ [Väntar] │ │ [Klar ✓] │
│ [Lack ○] │ │           │ │           │
│ 12345     │ │ 12345     │ │ 12345     │
│ Volvo     │ │ Volvo     │ │ Volvo     │
└───────────┘ └───────────┘ └───────────┘
```

---

## Del 5: Filändringar i detalj

### 1. `src/types/order.ts`

**Ändringar:**
- Byt `ProductionStatus` till `OrderStatus` med endast `active`, `completed`, `cancelled`
- Uppdatera alla labels till "Arbetskort"
- Lägg till hjälpfunktion för quantity-beräkning

### 2. `src/components/ObjectTrucksEditor.tsx`

**Ändringar:**
- Byt alla "arbetsenhet"-texter till "arbetskort"
- Byt placeholder från "Nummer (valfritt)..." till "Arbetskort-ID (valfritt)..."

### 3. `src/components/OrderObjectsEditor.tsx`

**Ändringar:**
- Ta bort manuella quantity-inputfält
- Visa beräknad sammanfattning istället
- Byt "Truck"-ikon mot "ClipboardList" eller liknande

### 4. `src/pages/ProductionScreen.tsx`

**Ändringar:**
- Byt rubriker till "Arbetskort"
- Behåll funktionalitet

### 5. `src/pages/OrderDetails.tsx`

**Ändringar:**
- Uppdatera arbetskortssammanfattning
- Byt historikrubrik
- Uppdatera produktionsstatus-dropdown till 3 val

### 6. `src/components/TruckTimeline.tsx`

**Ändringar:**
- Byt rubrik till "Tidslinje för arbetskort"

### 7. `src/contexts/OrdersContext.tsx`

**Ändringar:**
- Hantera mappning av gamla statusar till `active`

---

## Migreringar

### Databasmigration

```sql
-- 1. Konsolidera status
UPDATE orders 
SET production_status = 'active'
WHERE production_status IN ('created', 'started', 'paused', 'arrived');
```

### Inga strukturella databasändringar

Tabellnamn (`object_trucks`, `truck_step_status`, etc.) behålls för bakåtkompatibilitet.

---

## Validering efter implementation

1. **Skapa nytt arbetskort utan nummer** → Visas som "Objektnamn XXXX"
2. **Skapa arbetskort med nummer** → Visas som "#123"
3. **Ändra arbetskortsstatus** → Objektets sammanfattning uppdateras automatiskt
4. **Alla steg klara** → Arbetskort markeras automatiskt som klart
5. **Produktionsvyn** → Visar endast ankomna/startade arbetskort
6. **Orderstatus** → Endast 3 val: Aktiv, Avslutad, Avbruten

---

## Vad som INTE ändras

- Databasstruktur (tabellnamn behålls)
- TypeScript-typnamn i kod (behålls för bakåtkompatibilitet)
- Befintlig steglogik
- Befintlig historikloggning
- Fakturaexport

---

## Sammanfattning

| Område | Ändring |
|--------|---------|
| Terminologi | "Arbetsenhet" → "Arbetskort" |
| Orderstatus | 6 val → 3 val (aktiv/avslutad/avbruten) |
| Quantity | Manuell → Automatisk beräkning |
| Rollfördelning | Tydligare separation Order/Arbetskort |

Grundprincipen:
- **Order = affär och administration**
- **Arbetskort = verklighet i verkstaden**

