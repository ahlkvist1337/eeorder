
# Plan: Från truck-centrerat till arbetsenhet-centrerat system

## Status: ✅ IMPLEMENTERAT

Systemet har generaliserats från "truckar med obligatoriskt nummer" till "arbetsenheter där nummer är valfritt".

---

## Vad som har ändrats

### 1. Databas: Gör truck_number valfritt

**Nuvarande:**
```sql
object_trucks.truck_number text NOT NULL
```

**Ny:**
```sql
object_trucks.truck_number text NULL
```

**Migration:**
```sql
ALTER TABLE object_trucks ALTER COLUMN truck_number DROP NOT NULL;
```

---

### 2. Terminologiändring: "Truck" → "Arbetsenhet"

Byt ut "truck"-terminologi i användargränssnittet:

| Före | Efter |
|------|-------|
| Truckar | Arbetsenheter |
| Trucknummer | Nummer/ID |
| Inga truckar | Inga arbetsenheter |
| Lägg till truck | Lägg till arbetsenhet |

**Berörda filer:**
- `ObjectTrucksEditor.tsx` → byt etiketter
- `ProductionTruckCard.tsx` → visa nummer eller fallback
- `ProductionScreen.tsx` → byt rubriker
- `OrderDetails.tsx` → byt etiketter
- `types/order.ts` → kommentarer (typnamn behålls för bakåtkompatibilitet)

---

### 3. Visningslogik för arbetsenheter utan nummer

När trucknummer saknas behöver systemet visa något annat istället:

**Fallback-logik:**
```typescript
function getWorkUnitDisplayName(truck: ObjectTruck, objectName: string): string {
  if (truck.truckNumber) {
    return `#${truck.truckNumber}`;
  }
  // Generera stabilt ID baserat på truck.id (sista 4 tecken)
  return `${objectName} ${truck.id.slice(-4).toUpperCase()}`;
}
```

**Exempel:**
- Med trucknummer: `#135`
- Utan trucknummer: `Motorlåda A7B2` (objektnamn + kort ID)

---

### 4. ObjectTrucksEditor: Trucknummer blir valfritt

**Nuvarande:**
- Kräver att användaren skriver in trucknummer
- `disabled={!newTruckNumber.trim()}` blockerar tom input

**Ny logik:**
```typescript
// Tillåt att lägga till utan nummer
const handleAddWorkUnit = () => {
  const newTruck: ObjectTruck = {
    id: crypto.randomUUID(),
    objectId,
    truckNumber: newTruckNumber.trim() || '', // Tom sträng om inget nummer
    status: 'waiting',
    stepStatuses: objectSteps.map(step => ({...})),
  };
  onTrucksChange([...trucks, newTruck]);
  setNewTruckNumber('');
};

// Knappen ska alltid vara klickbar
<Button onClick={handleAddWorkUnit}>
  Lägg till arbetsenhet
</Button>
```

---

### 5. ProductionTruckCard: Anpassad visning

**Nuvarande rad 99-101:**
```tsx
<div className="text-4xl font-bold font-mono">
  #{truck.truckNumber}
</div>
```

**Ny logik:**
```tsx
const displayName = truck.truckNumber 
  ? `#${truck.truckNumber}` 
  : object.name.substring(0, 8);

const displayId = !truck.truckNumber 
  ? truck.id.slice(-4).toUpperCase() 
  : null;

// I JSX:
<div className="text-4xl font-bold font-mono">
  {displayName}
  {displayId && <span className="text-lg ml-2 opacity-60">{displayId}</span>}
</div>
```

---

### 6. ProductionScreen: Anpassade etiketter

**Nuvarande rad 280-285:**
```tsx
<Truck className="h-16 w-16..." />
<p>Inga aktiva truckar</p>
<p>Truckar med status "Ankommen"...</p>
```

**Ny:**
```tsx
<Package className="h-16 w-16..." />
<p>Inga aktiva arbetsenheter</p>
<p>Arbetsenheter med status "Ankommen" eller "Startad" visas här</p>
```

---

### 7. Planerat antal = antal arbetsenheter

**Nuvarande logik i OrderObjectsEditor:**
- Plan visas som manuellt input-fält
- Räknas inte automatiskt från antal truckar

**Ny automatisk beräkning:**
```typescript
// I OrderObjectsEditor eller OrderDetails
const calculatePlannedQuantity = (obj: OrderObject): number => {
  // Om truckar finns: antal truckar
  if (obj.trucks && obj.trucks.length > 0) {
    return obj.trucks.length;
  }
  // Fallback: manuellt värde
  return obj.plannedQuantity;
};
```

---

### 8. TruckTimeline och TruckLifecycleEvent

Terminologin i historiken ändras också:

**Före:**
```
Truck planerad
Truck ankommen
Truck klar
```

**Efter:**
```
Arbetsenhet planerad
Arbetsenhet ankommen
Arbetsenhet klar
```

**I types/order.ts:**
```typescript
export const truckLifecycleEventLabels: Record<TruckLifecycleEventType, string> = {
  planned: 'Arbetsenhet planerad',
  arrived: 'Arbetsenhet ankommen',
  started: 'Arbete påbörjat',
  paused: 'Pausad',
  completed: 'Arbetsenhet klar',
  step_started: 'Steg påbörjat',
  step_completed: 'Steg klart',
};
```

---

## Tekniska ändringar sammanfattat

| Fil | Ändring |
|-----|---------|
| **Migration** | `ALTER TABLE object_trucks ALTER COLUMN truck_number DROP NOT NULL` |
| `src/types/order.ts` | Uppdatera etiketter, lägg till `truckNumber?: string` |
| `src/components/ObjectTrucksEditor.tsx` | Gör trucknummer valfritt, byt etiketter |
| `src/components/ProductionTruckCard.tsx` | Fallback-visning för arbetsenheter utan nummer |
| `src/pages/ProductionScreen.tsx` | Byt terminologi |
| `src/pages/OrderDetails.tsx` | Byt terminologi i sammanfattning |
| `src/components/TruckTimeline.tsx` | Byt terminologi |

---

## Dataflöde efter ändring

```text
Order skapas
    ↓
Objekt läggs till: "Motorlåda"
    ↓
Arbetsenheter skapas:
  - #135 (med trucknummer)
  - #136 (med trucknummer)
  - Motorlåda 7A2B (utan trucknummer, reservdelar)
    ↓
Plan = 3 arbetsenheter (automatiskt)
    ↓
#135 markeras "Ankommen" → Mott = 1
Motorlåda 7A2B markeras "Ankommen" → Mott = 2
    ↓
Alla steg klara för #135 → Klar = 1, automatisk "completed"
```

---

## Vad som INTE ändras

- Databasstruktur (tabellnamn behålls: `object_trucks`, `truck_step_status`, etc.)
- TypeScript-typnamn (behålls för bakåtkompatibilitet)
- API-logik i OrdersContext
- Befintlig funktionalitet för truckar med nummer

---

## Risker och migreringsplan

**Risk:** Befintliga data med tomma trucknummer kan orsaka problem.

**Mitigering:** Innan DROP NOT NULL, verifiera att ingen befintlig rad har NULL-värden som kan skapa problem. Systemet använder `truck.truckNumber || ''` som default.

---

## Sammanfattning

Denna plan generaliserar systemet från "truckar med obligatoriskt nummer" till "arbetsenheter där nummer är valfritt". Detta gör att:

1. Reservdelar och annat arbete utan truck fungerar
2. Planerat antal beräknas automatiskt från arbetsenheter
3. Status och historik fungerar lika för alla arbetsenheter
4. Produktionsvyn visar alla arbetsenheter tydligt
5. Befintlig funktionalitet bevaras
