

# Plan: Prislistesida

## Sammanfattning

Skapa en ny fristående sida för att hantera prisuppgifter. Sidan samlar alla artikelnummer, benämningar och priser på ett ställe - för uppslag, jämförelse och historik. Den påverkar inte orderflödet.

---

## Vad som ska byggas

### Ny sida: `/prices`

En tabell med följande kolumner:
- **Artikelnummer** (part_number)
- **Benämning** (text/description)  
- **Pris** (price)

### Funktioner

| Funktion | Beskrivning |
|----------|-------------|
| Visa alla | Tabell med alla prisrader, sorterbara kolumner |
| Lägg till | Manuellt lägga in nya prisrader |
| Redigera | Ändra befintliga uppgifter inline |
| Ta bort | Radera prisrader (med bekräftelse) |
| Sök/filtrera | Sökfält som filtrerar på artikelnummer och benämning |
| Exportera | Knapp för att ladda ner som Excel-fil |

---

## Datamodell

### Ny databastabell: `price_list`

```text
┌─────────────────────────────────────────────────────────────┐
│ price_list                                                  │
├─────────────────────────────────────────────────────────────┤
│ id           │ uuid        │ PK, auto-genererad             │
│ part_number  │ text        │ Artikelnummer (unikt)          │
│ description  │ text        │ Benämning/beskrivning          │
│ price        │ numeric     │ Pris                           │
│ created_at   │ timestamptz │ Skapad                         │
│ updated_at   │ timestamptz │ Senast uppdaterad              │
└─────────────────────────────────────────────────────────────┘
```

**Viktig skillnad**: Detta är en separat tabell från `article_rows` som är kopplad till ordrar. `price_list` är fristående och används endast för uppslag.

### RLS-policies

- **SELECT**: Alla inloggade användare kan läsa
- **INSERT/UPDATE**: Användare med roll `admin` eller `redigera`
- **DELETE**: Endast `admin`

---

## Filer som skapas/ändras

### Nya filer

| Fil | Beskrivning |
|-----|-------------|
| `src/pages/PriceList.tsx` | Huvudsidan med tabell, sök och CRUD |
| `src/hooks/usePriceList.ts` | Hook för datahantering mot databasen |
| `src/lib/exportExcel.ts` | Hjälpfunktion för Excel-export |

### Ändringar i befintliga filer

| Fil | Ändring |
|-----|---------|
| `src/App.tsx` | Lägg till route `/prices` |
| `src/components/Layout.tsx` | Lägg till "Prislista" i navigeringen |

---

## Tekniska detaljer

### 1. Databas-migration

```sql
CREATE TABLE public.price_list (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  part_number text NOT NULL UNIQUE,
  description text NOT NULL DEFAULT '',
  price numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.price_list ENABLE ROW LEVEL SECURITY;

-- Läsa: alla inloggade
CREATE POLICY "Authenticated users can read price_list"
  ON public.price_list FOR SELECT TO authenticated
  USING (true);

-- Skriva: admin eller redigera
CREATE POLICY "Editors can insert price_list"
  ON public.price_list FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'redigera'));

CREATE POLICY "Editors can update price_list"
  ON public.price_list FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'redigera'));

-- Radera: endast admin
CREATE POLICY "Admins can delete price_list"
  ON public.price_list FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'));

-- Trigger för updated_at
CREATE TRIGGER update_price_list_updated_at
  BEFORE UPDATE ON public.price_list
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

### 2. Hook: `usePriceList.ts`

```typescript
// Samma mönster som useTreatmentSteps.ts
// - fetchPrices() - hämta alla
// - addPrice(partNumber, description, price)
// - updatePrice(id, updates)
// - deletePrice(id)
```

### 3. Sida: `PriceList.tsx`

Struktur:
```text
┌─────────────────────────────────────────────────────────────┐
│ Prislista                                           [Excel] │
│ 45 artiklar                                                 │
├─────────────────────────────────────────────────────────────┤
│ 🔍 [Sök artikelnummer eller benämning...          ]         │
├─────────────────────────────────────────────────────────────┤
│ Artikelnr ▼    │ Benämning              │ Pris        │     │
├────────────────┼────────────────────────┼─────────────┼─────┤
│ 3903041        │ Lagerlock              │ 1 000 kr    │ ✏️🗑│
│ 7598618-002    │ Gaffelrygg             │ 850 kr      │ ✏️🗑│
│ PSP001-1       │ Artikel Special        │ 500 kr      │ ✏️🗑│
├────────────────┴────────────────────────┴─────────────┴─────┤
│ [+ Lägg till ny prisrad]                                    │
└─────────────────────────────────────────────────────────────┘
```

### 4. Excel-export

Använder **CSV-format** som öppnas i Excel (ingen extern dependency krävs):

```typescript
// src/lib/exportExcel.ts
export function exportToCsv(data: any[], filename: string) {
  const headers = ['Artikelnummer', 'Benämning', 'Pris'];
  const rows = data.map(item => [
    item.part_number,
    item.description,
    item.price
  ]);
  
  const csvContent = [headers, ...rows]
    .map(row => row.map(cell => `"${cell}"`).join(';'))
    .join('\n');
  
  // Ladda ner som .csv fil
  const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8' });
  // ... trigger download
}
```

### 5. Navigation

Lägg till i `navItems` array i `Layout.tsx`:

```typescript
{ to: '/prices', label: 'Prislista', icon: Receipt }
```

Ikon: `Receipt` från lucide-react (passar för prislistor/fakturor).

---

## Användarrättigheter

| Roll | Läsa | Lägga till | Redigera | Ta bort |
|------|------|------------|----------|---------|
| Läsa | ✅ | ❌ | ❌ | ❌ |
| Redigera | ✅ | ✅ | ✅ | ❌ |
| Admin | ✅ | ✅ | ✅ | ✅ |

---

## Vad som INTE påverkas

- **Orderflödet** - helt orört
- **article_rows** - befintlig tabell för artikelrader i ordrar
- **Orderskapande** - ingen koppling till prislistan

Prislistan är helt fristående och används endast för manuell referens.

