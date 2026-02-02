
# Plan: XML RowType-filtrering och instruktioner

## Sammanfattning

Implementera stöd för olika radtyper i XML-import:
- **RowType 1** → Artikelrader (nuvarande beteende)
- **RowType 4** → Instruktioner (ny sektion i Grunduppgifter)

Dessutom: Alltid tillåta sortering och borttagning av behandlingssteg på objekt.

---

## Del 1: XML-parsning med RowType

### Ändringar i `src/lib/xmlParser.ts`

Läs `RowType`-attributet från varje rad:

```text
XML-struktur:
<Row RowNumber="10" RowType="1">  → Artikelrad
<Row RowNumber="20" RowType="4">  → Instruktion
```

Filtrera raderna baserat på typ:
- RowType 1 (eller utan RowType) → `rows[]` (artikelrader)
- RowType 4 → `instructions[]` (ny array)

### Utökad `ParsedXMLOrder`-typ

```typescript
export interface ParsedXMLOrder {
  orderNumber: string;
  customer: string;
  // ... befintliga fält
  rows: ArticleRow[];
  instructions: Instruction[];  // NY
}

export interface Instruction {
  id: string;
  text: string;
  rowNumber: string;
}
```

---

## Del 2: Lagring av instruktioner

### Ny databaskolumn på orders-tabellen

```sql
ALTER TABLE orders ADD COLUMN instructions jsonb DEFAULT '[]'::jsonb;
```

### Uppdatera Order-typen

```typescript
export interface Order {
  // ... befintliga fält
  instructions?: Instruction[];
}
```

---

## Del 3: UI för instruktioner i Grunduppgifter

### OrderDetails.tsx - Ny sektion

I kortet "Grunduppgifter", lägg till en sektion under leveransadress:

```text
┌─────────────────────────────────────────────────┐
│ Grunduppgifter                                  │
├─────────────────────────────────────────────────┤
│ Kund: Elof Hansson AB                           │
│ Kundreferens: Anders                            │
│ Planerat start: 15 jan 2026                     │
│ Planerat slut: 20 jan 2026                      │
│ Leveransadress: ...                             │
│                                                 │
│ ──────────────────────────────────────────────  │
│ Instruktioner:                                  │
│   • Fraktsedel 123456              [✏️] [🗑️]   │
│   • Skickas via Schenker           [✏️] [🗑️]   │
│                                                 │
│ Kommentar: [________________]                   │
└─────────────────────────────────────────────────┘
```

### Funktionalitet

- **Visa**: Lista alla instruktioner
- **Redigera**: Klick på pennikonen → inline-redigering
- **Ta bort**: Klick på papperskorgen → radera instruktionen
- **Spara**: Ändringar sparas till databasen

---

## Del 4: CreateOrder - hantera instruktioner vid XML-import

### Visa instruktioner i förhandsgranskning

Efter artikelrader, visa instruktioner separat:

```text
Artikelrader:
  • Galvtruck LWI160 (3 st)
  • Monteringsdetaljer (1 st)

Instruktioner:
  • Fraktsedel 123456
  • Skickas via Schenker
```

### Tillåt borttagning före skapande

Användaren ska kunna ta bort instruktioner som är dubbletter eller irrelevanta innan ordern skapas.

---

## Del 5: Steg-hantering - alltid möjligt att sortera/ta bort

### Problem idag

När ett objekt har arbetskort visas stegen som en horisontell kedja utan interaktivitet:

```text
Steg: Maskering → Blästring → Sprutzink
```

### Lösning

Ändra så att steg alltid kan sorteras och tas bort, även med arbetskort:

```text
Steg:
  ⋮ Maskering  [🗑️]
  ⋮ Blästring  [🗑️]
  ⋮ Sprutzink  [🗑️]
  [Välj behandlingssteg...] [+ Lägg till]
```

### Teknisk ändring i OrderObjectsEditor.tsx

Ta bort villkoret som visar horisontell kedja när det finns arbetskort. Använd alltid den vertikala listan med DndContext för drag-and-drop.

---

## Tekniska ändringar

| Fil | Ändring |
|-----|---------|
| `src/lib/xmlParser.ts` | Filtrera på RowType, returnera `rows` och `instructions` |
| `src/types/order.ts` | Lägg till `Instruction`-interface och i `Order` |
| `supabase/migrations/...` | Lägg till `instructions` jsonb-kolumn |
| `src/contexts/OrdersContext.tsx` | Hantera instruktioner vid fetch/save |
| `src/pages/CreateOrder.tsx` | Visa instruktioner separat, tillåt borttagning |
| `src/pages/OrderDetails.tsx` | Ny "Instruktioner"-sektion i Grunduppgifter |
| `src/components/OrderObjectsEditor.tsx` | Ta bort villkor för horisontell stegvisning |

---

## Visuellt exempel

### XML-import (CreateOrder)

```text
┌─────────────────────────────────────────────────┐
│ ✓ XML-fil inläst!                               │
├─────────────────────────────────────────────────┤
│ Ordernummer: 123456                             │
│ Kund: Elof Hansson AB                           │
│                                                 │
│ Artikelrader (3 st):                            │
│   • Galvtruck LWI160 (3 st)                     │
│   • Monteringsdetaljer (1 st)                   │
│                                                 │
│ Instruktioner (2 st):                           │
│   • Fraktsedel 123456                    [🗑️]  │
│   • Skickas via Schenker                 [🗑️]  │
│                                                 │
│ [Välj annan fil]  [Skapa order]                 │
└─────────────────────────────────────────────────┘
```

### OrderDetails - Grunduppgifter

```text
┌─────────────────────────────────────────────────┐
│ Grunduppgifter                                  │
├─────────────────────────────────────────────────┤
│ ...                                             │
│                                                 │
│ Instruktioner                                   │
│ ┌─────────────────────────────────────────────┐ │
│ │ Fraktsedel 123456              [✏️] [🗑️]  │ │
│ │ Skickas via Schenker           [✏️] [🗑️]  │ │
│ └─────────────────────────────────────────────┘ │
│                                                 │
│ Kommentar                                       │
│ [________________________________]              │
└─────────────────────────────────────────────────┘
```

---

## Sammanfattning

| Funktion | Före | Efter |
|----------|------|-------|
| XML RowType 1 | Alla rader → artikelrader | Endast artikelrader |
| XML RowType 4 | Inkluderas i artikelrader | Separata instruktioner |
| Instruktioner | Finns ej | Ny redigerbar sektion |
| Steg-sortering | Endast utan arbetskort | Alltid tillgänglig |
| Steg-borttagning | Endast utan arbetskort | Alltid tillgänglig |
