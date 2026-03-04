

# Fix: Delfaktura-belopp + enhetsnamn i V2

## Problem
1. **~0 kr i export-dialog**: `InvoiceExportDialog` beräknar `totalAmount` med `order.objects` (V1-data) som är tom för V2-ordrar → ratio = 0 → belopp = 0.
2. **Enhetsnamn visar kort-ID** (t.ex. "E1B0"): `truckNumber` sätts till `u.unitNumber` som kan vara tom → `getWorkUnitDisplayName` fallback visar `id.slice(-4)`.
3. **Efter export**: `object_trucks` uppdateras, men V2 använder `unit_objects` och `order_units`.
4. **PDF-rubrik**: Visar "DELFAKTURA" men bör visa "DELFAKTURAUNDERLAG".
5. **prepareInvoiceExportData**: `allTrucks` hämtas från `order.objects` (V1) → `isPartial`-check misslyckas för V2.

## Ändringar

### 1. `src/components/InvoiceExportDialog.tsx`

**Rad 36-64 — beräkning av readyTrucks och totalAmount:**
- Lägg till V2-logik: om order är V2, räkna enheter (units) istället för trucks
- Beräkna `totalAmount` med V2-units: `readyUnits.length / allUnits.length * artikelsumma`
- Visa "Delfaktura – X av Y enheter klara (~ZZZ kr)" istället för "X arbetskort klara"

**Rad 146-157 — efter export, markera som billed:**
- V2: uppdatera `unit_objects` och `order_units` (billing_status = 'billed') istället för `object_trucks`
- Lägg till `console.log('Export: X av Y enheter, belopp: ZZZ kr, enhet-ID/namn: ABC')`

**Rad 180-188 — summary-text:**
- V2: "Delfaktura – X av Y enheter klara för fakturering (~ZZZ kr)"
- V1: behåll befintligt beteende

### 2. `src/lib/invoiceExport.ts`

**Rad 160-163 — isPartial-check i `prepareInvoiceExportData`:**
- V2: jämför `trucksToInvoice.length` mot `order.units.length` (inte `order.objects`)

**Rad 187 — truckNumbers-generering:**
- V2: använd `unit.unitNumber || 'Enhet X'` (index-baserad fallback) istället för `t.id.slice(-4)`

### 3. `src/lib/invoiceExportPdf.ts`

**Rad 13 — titel:**
- Ändra `'DELFAKTURA'` till `'DELFAKTURAUNDERLAG'`

**Rad 67-69 — enhetsvisning:**
- Ändra label från "Arbetskort" till "Enheter" vid delfaktura, visa enhetsnamn

### 4. `src/components/InvoicingTab.tsx`

**Rad 46 — unitNumber-mapping:**
- Säkerställ att `truckNumber` sätts till `u.unitNumber || \`Enhet ${index + 1}\``

**Rad 352 — visningstext:**
- Ändra till att visa enhetsnamn korrekt med fallback

### 5. `src/types/order.ts` — `getWorkUnitDisplayName`

**Rad 341-347 — fallback-logik:**
- Om `truckNumber` saknas OCH `objectName` saknas, fallback till `"Enhet"` istället för tomt + kort ID

## Filöversikt

| Fil | Ändring |
|-----|---------|
| `src/components/InvoiceExportDialog.tsx` | V2 belopp, unit counts, billed-markering, debug log |
| `src/lib/invoiceExport.ts` | V2 isPartial-check, enhetsnamn i truckNumbers |
| `src/lib/invoiceExportPdf.ts` | Rubrik "DELFAKTURAUNDERLAG", enhetstext |
| `src/components/InvoicingTab.tsx` | Unit name fallback |
| `src/types/order.ts` | `getWorkUnitDisplayName` fallback |

