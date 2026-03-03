

# Plan: V2 UnitsEditor med full statushantering (som V1)

## Sammanfattning

Ombyggnad av `UnitsEditor` så att den fungerar exakt som V1:s `ObjectTrucksEditor` — med klickbara stegstatusar, automatiska statusövergångar, namnbyte, duplicering och utskrift av arbetskort.

## Vad som ändras

### 1. Nya context-funktioner i `OrdersContext.tsx`

Tre nya funktioner som gör individuella uppdateringar (inte delete-and-recreate):

- **`updateUnitStatus(orderId, unitId, newStatus)`** — Uppdaterar `order_units.status`. Optimistisk uppdatering. Auto-sätter `billing_status = 'ready_for_billing'` vid leverans. Auto-slutför ordern om alla enheter är klara/packade/levererade.
- **`updateUnitStepStatus(orderId, unitId, stepId, newStatus, stepName)`** — Uppdaterar `unit_object_steps.status`. Optimistisk uppdatering.
- **`updateUnitBillingStatus(orderId, unitId, newStatus)`** — Uppdaterar `order_units.billing_status`. Optimistisk uppdatering.

Dessa speglar exakt v1-funktionerna `updateTruckStatus`, `updateTruckStepStatus`, `updateTruckBillingStatus`.

### 2. Ombyggd `UnitsEditor.tsx`

Ny layout per enhet som liknar `ObjectTrucksEditor`:

**Per enhet (en rad):**
- Enhetsnamn (klickbar för inline-redigering med penna-ikon)
- Status-dropdown (Väntande → Ankommen → Startad → ... → Levererad)
- Klickbara steg-badges per objekt (pending ○ → in_progress ● → completed ✓), grupperade per objektnamn
- Pack/Leverera-knappar (visas vid rätt status)
- Faktureringsbadge (visas vid levererad)
- Skriv ut-knapp, duplicera-knapp, ta bort-knapp

**Auto-statuslogik (exakt som v1):**
- Steg klickas till `in_progress` → enhet sätts till `started` (om `waiting`/`arrived`/`paused`)
- Alla steg `completed` → enhet sätts till `completed`
- Alla steg tillbaka till `pending` → enhet sätts till `arrived` (om `started`/`paused`)

**Nya props:**
```typescript
interface UnitsEditorProps {
  units: OrderUnit[];
  onUnitsChange: (units: OrderUnit[]) => void;
  onUnitStatusChange?: (unitId: string, status: TruckStatus) => void;
  onUnitStepStatusChange?: (unitId: string, stepId: string, status: StepStatus) => void;
  onUnitBillingStatusChange?: (unitId: string, status: TruckBillingStatus) => void;
  orderInfo?: { id: string; orderNumber: string; customer: string; };
}
```

**Duplicera enhet:** Kopierar alla objekt och steg till ny enhet med tomt enhetsnummer. Nya UUID:er genereras.

### 3. Arbetskort-utskrift (`workCardPrint.ts`)

Ny funktion `printWorkCardV2` som tar en `OrderUnit` och genererar PDF med:
- Enhetsnummer som stor rubrik
- Alla objekt listade med sina steg
- QR-kod till ordern
- Artikelrader kopplade till enheten (via `unit_id`)

### 4. Integration i `OrderDetails.tsx`

Koppla nya callbacks från context till `UnitsEditor`:
```typescript
<UnitsEditor
  units={order.units || []}
  onUnitsChange={...}
  onUnitStatusChange={(unitId, status) => updateUnitStatus(order.id, unitId, status)}
  onUnitStepStatusChange={(unitId, stepId, status) => updateUnitStepStatus(order.id, unitId, stepId, status, ...)}
  onUnitBillingStatusChange={(unitId, status) => updateUnitBillingStatus(order.id, unitId, status)}
  orderInfo={{ id: order.id, orderNumber: order.orderNumber, customer: order.customer }}
/>
```

## Påverkade filer

| Fil | Ändring |
|-----|---------|
| `src/contexts/OrdersContext.tsx` | 3 nya funktioner + context type |
| `src/components/UnitsEditor.tsx` | Total ombyggnad med statushantering |
| `src/pages/OrderDetails.tsx` | Koppla nya callbacks |
| `src/lib/workCardPrint.ts` | Ny `printWorkCardV2` |

