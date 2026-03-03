

# Plan: Flytta status till objektnivå i V2

## Problem

Idag sitter `status` (waiting/arrived/started/completed/packed/delivered) och `billingStatus` på **enhetsnivå** (`order_units`). Men i verkligheten ankommer objekt (t.ex. "Stora Truck Delar" och "Monteringsdetaljer") vid helt olika tillfällen — veckor emellan. Packa/Leverera måste också ske per objekt, precis som V1 hanterar det per arbetskort.

Historiken saknar också **objektnamn** och **from/to-status** (visar bara stegnamnet "Maskering" utan kontext).

## Lösning

### 1. Databas: Lägg till status-kolumner på `unit_objects`

Migration som lägger till:
- `status truck_status DEFAULT 'waiting'` på `unit_objects`
- `billing_status truck_billing_status DEFAULT 'not_billable'` på `unit_objects`

`order_units.status` och `order_units.billing_status` behålls men blir **beräknade** i koden (aggregat av sina objekt), inte manuellt satta.

### 2. Typer (`src/types/order.ts`)

Lägg till `status: TruckStatus` och `billingStatus: TruckBillingStatus` på `UnitObject`-interfacet. `OrderUnit.status` och `OrderUnit.billingStatus` blir beräknade från objekten.

### 3. Context (`OrdersContext.tsx`)

- **Ny funktion**: `updateUnitObjectStatus(orderId, unitId, objectId, newStatus)` — uppdaterar `unit_objects.status` i DB, loggar till `truck_lifecycle_events` med objektnamn.
- **Ny funktion**: `updateUnitObjectBillingStatus(orderId, unitId, objectId, newStatus)`.
- **Ändra `updateUnitStepStatus`**: Inkludera **objektnamn** i loggningen till `truck_status_history`. Auto-status-logik (steg påbörjat → objekt startat) flyttas till objektnivå.
- **Ändra `mapDbOrderToOrder`**: Hämta `status` och `billing_status` från `unit_objects`. Beräkna enhetens sammanlagda status från objekten.
- **Lifecycle-loggning**: Skicka med objektnamn i `step_name`-fältet (format: `"Objektnamn: Stegnamn"`) eller lägg till nytt fält.

### 4. UnitsEditor (`src/components/UnitsEditor.tsx`)

- **Flytta status-dropdown** från enhetsraden till varje **objektrad**. Varje objekt får sin egen status (Väntande/Ankommen/Startad/Klar/Packat/Levererat).
- **Packa/Leverera-knappar** per objekt istället för per enhet.
- **Billing-badge** per objekt.
- **Auto-status-logik**: När ett steg klickas till "Pågående" → det objektets status blir "Startad". När alla steg i ett objekt klara → objektet "Klar".
- **Enhetens status**: Visas som aggregat (t.ex. "2/3 klara") eller tas bort som manuell kontroll.
- **Nya callbacks**: `onUnitObjectStatusChange`, `onUnitObjectBillingStatusChange` i props.

### 5. Historik (`OrderDetails.tsx`)

Ändra historik-vyn till att gruppera per **objekt** (inom enheten):
```
#ABC123
  📦 Stora Truck Delar
    ● 3 mar 10:00  Ankommen                    JD
    ● 3 mar 12:03  Maskering: Pågående         JD
    ● 3 mar 14:15  Maskering: Klar             JD
    ● 3 mar 14:15  Målning: Pågående           JD
  📦 Monteringsdetaljer
    ● 28 mar 08:00  Ankommen                   AK
```

Visa `from_status → to_status` för steg (t.ex. "Maskering: Pågående → Klar" eller enklare "Maskering: Klar").

### 6. ProductionScreen / ProductionTruckCard

Uppdatera V2-korten att visa objektstatus korrekt. Varje objekt i ett kort visar sin egen status.

## Påverkade filer

| Fil | Ändring |
|-----|---------|
| Migration SQL | `ALTER TABLE unit_objects ADD COLUMN status/billing_status` |
| `src/types/order.ts` | `UnitObject` får `status` och `billingStatus` |
| `src/contexts/OrdersContext.tsx` | Nya funktioner för objektstatus, uppdaterad loggning med objektnamn |
| `src/components/UnitsEditor.tsx` | Status/packa/leverera flyttas till objektraden |
| `src/pages/OrderDetails.tsx` | Historik grupperad per objekt med tydlig from/to |
| `src/components/ProductionTruckCard.tsx` | Visa objektstatus i V2-kort |

