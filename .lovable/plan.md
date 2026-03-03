

# Omstrukturering: Huvudenhet som överordnad produktionsenhet

## Bakgrund

Idag: **Order → Objekt → Arbetskort (truck) → Stegstatus**
Ett arbetskort tillhör ett enda objekt. Om en fysisk truck har flera objekttyper (Hytt, Flak) blir det separata arbetskort under varje objekt, utan direkt koppling sinsemellan.

Önskat: **Order → Huvudenhet → Objekt → Steg**
En huvudenhet (t.ex. en truck) är den överordnade produktionsenheten. Den har flera objekt (delar) kopplade till sig, och varje objekt har sina behandlingssteg. Enheten är klar när alla objekt/steg är klara. Fakturering och leverans sker per enhet.

## Designbeslut baserat på era svar

- **Artikelrader** är affärsdata kopplad till ordern, inte strukturellt drivande för att skapa enheter. Flera artikelrader kan kopplas till samma enhet. Enheter skapas manuellt.
- **Objekt** = delar av en enhet (Hytt, Flak, etc.) med egna behandlingssteg. Systemet är generiskt — inga hårdkodade "truck"-begrepp.
- **Befintlig data** behålls orörd. Nya ordrar använder den nya strukturen.

## Databasändringar

### Ny tabell: `order_units`
Ersätter `object_trucks` som den primära produktionsenheten, men tillhör ordern direkt.

```text
order_units
├── id (uuid, PK)
├── order_id (uuid, FK → orders)
├── unit_number (text, nullable) — valfritt identifieringsnummer
├── status (truck_status enum — återanvänds)
├── billing_status (truck_billing_status enum — återanvänds)
├── sort_order (int, nullable)
└── created_at (timestamptz)
```

### Ny tabell: `unit_objects`
Kopplar objekt till en enhet (istället för att objektet äger enheten).

```text
unit_objects
├── id (uuid, PK)
├── unit_id (uuid, FK → order_units)
├── name (text) — t.ex. "Hytt", "Flak"
├── description (text, nullable)
└── created_at (timestamptz)
```

### Ny tabell: `unit_object_steps`
Definierar behandlingssteg per objekt-typ inom en enhet.

```text
unit_object_steps
├── id (uuid, PK)
├── unit_object_id (uuid, FK → unit_objects)
├── template_id (text)
├── name (text)
├── sort_order (int)
└── status (step_status enum) — spåras direkt här per enhet
```

### Befintliga tabeller — behålls oförändrade
`order_objects`, `object_trucks`, `order_steps`, `truck_step_status` behålls för bakåtkompatibilitet med gamla ordrar.

### Ny kolumn: `orders.data_model_version`
`integer DEFAULT 1` — version 1 = gammal struktur, version 2 = ny struktur. Avgör vilken datamappning som används.

### Koppling artikelrader → enheter
Ny nullable-kolumn `article_rows.unit_id` (FK → order_units) för att kunna koppla artikelrader till specifika enheter i den nya modellen.

## Typändringar (`src/types/order.ts`)

Nya typer:

```typescript
interface OrderUnit {
  id: string;
  orderId: string;
  unitNumber: string;
  status: TruckStatus;       // Återanvänd befintlig enum
  billingStatus: TruckBillingStatus;
  sortOrder?: number;
  objects: UnitObject[];
  createdAt?: string;
}

interface UnitObject {
  id: string;
  unitId: string;
  name: string;
  description?: string;
  steps: UnitObjectStep[];
}

interface UnitObjectStep {
  id: string;
  unitObjectId: string;
  templateId: string;
  name: string;
  sortOrder: number;
  status: StepStatus;
}
```

`Order`-typen utökas med `units?: OrderUnit[]` och `dataModelVersion: number`.

## Påverkade filer (fas 2–4)

| Fil | Ändring |
|-----|---------|
| `src/types/order.ts` | Nya typer + hjälpfunktioner |
| `src/contexts/OrdersContext.tsx` | Dubbel datamappning (v1/v2), nya CRUD-funktioner |
| `src/components/OrderObjectsEditor.tsx` | Ny editor: UnitsEditor (enheter → objekt → steg) |
| `src/components/ObjectTrucksEditor.tsx` | Ersätts av ny komponent för v2-ordrar |
| `src/pages/CreateOrder.tsx` | Ny skapandeflöde med enheter |
| `src/pages/OrderDetails.tsx` | Visa v1 eller v2 baserat på dataModelVersion |
| `src/pages/ProductionScreen.tsx` | Hämta aktiva enheter från båda modellerna |
| `src/components/ProductionTruckCard.tsx` | Visa alla objekt/steg per enhet |
| `src/components/InvoicingTab.tsx` | Fakturering per enhet i v2 |
| `src/hooks/useProductionStats.ts` | Stödja båda tabellerna |
| `src/lib/workCardPrint.ts` | Anpassa för ny struktur |

## Fasindelning

**Fas 1: Databasschema** — Nya tabeller + version-kolumn. Inga befintliga tabeller ändras.

**Fas 2: Typer & datamappning** — Nya TypeScript-typer. OrdersContext hanterar båda versionerna vid inläsning.

**Fas 3: Skapande av ordrar (v2)** — Ny CreateOrder-vy med enhet-centrerat flöde. Befintliga ordrar visas med gammal logik.

**Fas 4: Orderdetaljer & redigering** — OrderDetails visar v1 eller v2. Ny UnitsEditor-komponent.

**Fas 5: Produktion & fakturering** — ProductionScreen och InvoicingTab stödjer båda modellerna.

## Omfattning

Detta är en stor omstrukturering som berör ~15 filer och ~4000 rader kod. Varje fas kan implementeras och verifieras separat. Rekommenderar att börja med fas 1 (databas) och fas 2 (typer) i ett första steg.

