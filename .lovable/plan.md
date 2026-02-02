
# Plan: Lägg till antal på orderobjekt

## Sammanfattning

Utöka `order_objects`-tabellen med tre enkla antalskolumner som spårar var objekten befinner sig i processen:

- **planned_quantity** - Planerat antal (hur många ska levereras totalt)
- **received_quantity** - Mottaget antal (hur många har ankommit)
- **completed_quantity** - Klart antal (hur många är färdigbehandlade)

---

## Exempel på hur det fungerar

```text
Motorlåda:
  Planerat: 5
  Mottaget: 3  ← 3 har ankommit
  Klart: 2     ← 2 är färdiga

Du ser direkt:
  - 2 saknas fortfarande (5 - 3)
  - 1 är under behandling (3 - 2)
  - 2 är klara
```

---

## Ny design i objektredigeraren

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│ ▼ Motorlåda                                            [✏️] [🗑️]           │
├─────────────────────────────────────────────────────────────────────────────┤
│  Planerat: [5 ]   Mottaget: [3 ]   Klart: [2 ]         2 av 5 klara       │
├─────────────────────────────────────────────────────────────────────────────┤
│  Behandlingssteg:                                                           │
│  ● Blästring              Pågående   ▼                                      │
│  ○ Målning                Väntande   ▼                                      │
│  [Välj behandlingssteg...          ▼] [+ Lägg till]                        │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Produktionsskärmen visar framsteg

```text
┌────────────────────────────────────┐
│ 12345                              │
│ ┌────────────────────────────────┐ │
│ │ Startad                        │ │
│ └────────────────────────────────┘ │
│                                    │
│ 📦 Motorlåda         3/5 mottaget  │
│    ● Blästring       2/5 klart     │
│    ○ Målning                       │
│                                    │
│ 📦 Lagerlock         10/10 mottaget│
│    ✓ Blästring       10/10 klart   │
│    ● Målning         5/10 klart    │
└────────────────────────────────────┘
```

---

## Tekniska ändringar

### 1. Databasmigrering

Lägg till tre kolumner i `order_objects`:

```sql
ALTER TABLE order_objects
ADD COLUMN planned_quantity integer NOT NULL DEFAULT 1,
ADD COLUMN received_quantity integer NOT NULL DEFAULT 0,
ADD COLUMN completed_quantity integer NOT NULL DEFAULT 0;
```

### 2. Typuppdateringar

**Fil: `src/types/order.ts`**

Uppdatera `OrderObject`:

```typescript
export interface OrderObject {
  id: string;
  name: string;
  description?: string;
  plannedQuantity: number;    // Nytt
  receivedQuantity: number;   // Nytt
  completedQuantity: number;  // Nytt
  createdAt?: string;
}
```

### 3. Kontextuppdateringar

**Fil: `src/contexts/OrdersContext.tsx`**

- Uppdatera `DbOrderObject` interface med nya kolumner
- Uppdatera `mapDbOrderToOrder` för att mappa de nya fälten
- Uppdatera `addOrder` och `updateOrder` för att inkludera antal vid insert/upsert

### 4. UI-uppdateringar

**Fil: `src/components/OrderObjectsEditor.tsx`**

| Ändring | Beskrivning |
|---------|-------------|
| Antalinput | Lägg till tre nummerfält i objekthuvudet: Planerat, Mottaget, Klart |
| Validering | Mottaget ≤ Planerat, Klart ≤ Mottaget |
| Sammanfattning | Visa "X av Y klara" i objekthuvudet |

**Fil: `src/components/ProductionOrderCard.tsx`**

| Ändring | Beskrivning |
|---------|-------------|
| Antaldisplay | Visa mottaget/planerat och klart/planerat bredvid objektnamn |
| Visuell indikator | Färgmarkering när allt är klart (grönt) vs pågående (gult) |

---

## Dataflöde

```text
1. Användaren skapar objekt med planerat antal (default: 1)
2. När delar anländer uppdaterar man "Mottaget"
3. När delar är färdigbehandlade uppdaterar man "Klart"
4. Produktionsskärmen visar framsteg i realtid
```

---

## Vad som INTE ändras

- Orderns struktur (en order, flera objekt)
- Behandlingsstegen (kopplade till objekt)
- Status på ordern (Ankommen/Startad/Pausad etc.)
- Inga nya statusar, enbart antal

---

## Filer som ändras

| Fil | Typ av ändring |
|-----|----------------|
| Ny migration | Lägg till 3 kolumner i order_objects |
| `src/types/order.ts` | Uppdatera OrderObject interface |
| `src/contexts/OrdersContext.tsx` | Uppdatera mappning och CRUD |
| `src/components/OrderObjectsEditor.tsx` | Lägg till antalfält i UI |
| `src/components/ProductionOrderCard.tsx` | Visa antal i produktionsvyn |
