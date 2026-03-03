

# Plan: Fix V2 fakturering, steg-input och status-återställning

## Problem 1: Fakturering visar fel antal
Faktureringfliken beräknar proportionellt baserat på enheter (`readyCount / totalCount * quantity`). Om 1 av 2 enheter har `billing_status = ready_for_billing` visas halva mängden. Problemet kan ligga i att billing-aggregeringen från objekt till enhet inte triggas korrekt i alla flöden (t.ex. vid leverans via `updateUnitObjectStatus` — aggregeringen sker bara om `newStatus === 'delivered'`, men om billing ändras separat kanske enheten inte uppdateras).

Dessutom har input-fältet `step="0.01"` vilket gör att pilarna ändrar med decimaler istället för heltal.

## Problem 2: Statusar återställs inte automatiskt
`updateUnitStepStatus` saknar all automation som V1 har:
- **Auto-start**: När ett steg sätts till `in_progress` → objektet bör bli `started`
- **Auto-revert**: När alla steg återgår till `pending` → objektet bör bli `arrived`  
- **Auto-complete**: När alla steg blir `completed` → objektet bör bli `completed`

`updateUnitObjectStatus` saknar omvänd logik:
- Om ett objekt går tillbaka från `completed`/`packed`/`delivered` → kontrollera om ordern ska återgå till `created` (Aktiv)
- Billing bör återställas om objektet inte längre är levererat

## Åtgärder

### 1. InvoicingTab.tsx
- Ändra `step="0.01"` till `step="1"` på input-fältet (rad 335)
- Avrunda proportionell beräkning till heltal: `Math.round(proportional)` istället för `Math.round(proportional * 100) / 100` (rad 131)

### 2. OrdersContext.tsx — `updateUnitStepStatus`
Lägg till samma automation som V1 efter steg-uppdatering:
- Hitta objektet som steget tillhör
- Om `newStatus === 'in_progress'` och objektets status är `waiting`/`arrived` → sätt objektstatus till `started`
- Om `newStatus === 'pending'` och ALLA steg i objektet nu är `pending` → sätt objektstatus till `arrived` (om det var `started`/`paused`)
- Om `newStatus === 'completed'` och ALLA steg i objektet nu är `completed` → sätt objektstatus till `completed`
- Varje objektstatusändring triggar befintlig aggregering uppåt (enhet → order)

### 3. OrdersContext.tsx — `updateUnitObjectStatus` (revert-logik)
Lägg till omvänd logik:
- Om ett objekt går **tillbaka** från `completed`/`packed`/`delivered` till `started`/`arrived`/`waiting`:
  - Kontrollera om ordern var `completed` → återställ till `created` (Aktiv)
  - Återställ objektets `billing_status` till `not_billable` om det inte längre är levererat
  - Aggregera enhetens billing nedåt

### Påverkade filer

| Fil | Ändring |
|-----|---------|
| `src/components/InvoicingTab.tsx` | `step="1"`, heltal i proportionell beräkning |
| `src/contexts/OrdersContext.tsx` | Steg-automation i `updateUnitStepStatus`, revert-logik i `updateUnitObjectStatus` |

