

# Plan: Stegbaserade priser med fritext + Import

## Sammanfattning

Utöka prislistan med ett valfritt fritextfält för "steg/behandling" så att samma artikel kan ha olika priser för t.ex. blästring, sprutzink och målning. Lägg till import-funktion för att hämta befintlig data från ordrar.

---

## Ny datamodell

```text
┌─────────────────────────────────────────────────────────────────┐
│ price_list (uppdaterad)                                         │
├─────────────────────────────────────────────────────────────────┤
│ id           │ uuid        │ PK                                 │
│ part_number  │ text        │ Artikelnummer                      │
│ description  │ text        │ Benämning                          │
│ step_name    │ text        │ Steg/behandling (fritext, valfritt)│
│ price        │ numeric     │ Pris                               │
│ created_at   │ timestamptz │ Skapad                             │
│ updated_at   │ timestamptz │ Uppdaterad                         │
└─────────────────────────────────────────────────────────────────┘
```

**Unik constraint:** `(part_number, step_name)` - samma artikel kan ha olika priser för olika steg.

---

## Exempel på data

| Artikelnr | Benämning | Steg | Pris |
|-----------|-----------|------|------|
| 7589450-777 | Hjulgaffel | Blästring | 200 kr |
| 7589450-777 | Hjulgaffel | Sprutzink | 350 kr |
| 7589450-777 | Hjulgaffel | Målning | 450 kr |
| 3903041 | Lagerlock | — | 1 000 kr |
| 3903041 | Lagerlock | Svetsning | 500 kr |

---

## Ny design av prislistesidan

```text
┌──────────────────────────────────────────────────────────────────────────┐
│ Prislista                                [Importera från ordrar] [Excel] │
│ 127 prisrader                                                            │
├──────────────────────────────────────────────────────────────────────────┤
│ 🔍 [Sök artikelnummer, benämning eller steg...                      ]    │
├──────────────────────────────────────────────────────────────────────────┤
│ Artikelnr ▼   │ Benämning        │ Steg          │ Pris        │         │
├───────────────┼──────────────────┼───────────────┼─────────────┼─────────┤
│ 7589450-777   │ Hjulgaffel       │ Blästring     │ 200 kr      │ ✏️ 🗑   │
│ 7589450-777   │ Hjulgaffel       │ Sprutzink     │ 350 kr      │ ✏️ 🗑   │
│ 7589450-777   │ Hjulgaffel       │ Målning       │ 450 kr      │ ✏️ 🗑   │
│ 3903041       │ Lagerlock        │ —             │ 1 000 kr    │ ✏️ 🗑   │
├───────────────┴──────────────────┴───────────────┴─────────────┴─────────┤
│ [+ Lägg till ny prisrad]                                                 │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## Lägg till/Redigera dialog

Fritextfält för steg (inte dropdown):

```text
┌─────────────────────────────────────┐
│ Lägg till prisrad                   │
├─────────────────────────────────────┤
│ Artikelnummer                       │
│ [7589450-777                     ]  │
│                                     │
│ Benämning                           │
│ [Hjulgaffel                      ]  │
│                                     │
│ Steg (valfritt)                     │
│ [Blästring                       ]  │  ← Fritext, inte dropdown
│                                     │
│ Pris (kr)                           │
│ [200                             ]  │
│                                     │
│         [Avbryt]  [Lägg till]       │
└─────────────────────────────────────┘
```

---

## Import-funktion

**Knapp:** "Importera från ordrar"

1. Hämtar alla unika `(part_number, text, price)` från `article_rows`
2. Visar dialog: "Hittade 87 unika prisrader i befintliga ordrar. Importera?"
3. Infogar i `price_list` (hoppar över dubbletter)
4. Visar resultat: "67 nya prisrader importerade"

---

## Tekniska ändringar

### 1. Databas-migration

```sql
-- Lägg till step_name kolumn
ALTER TABLE public.price_list 
  ADD COLUMN step_name text DEFAULT NULL;

-- Ta bort gamla unika constraint
ALTER TABLE public.price_list 
  DROP CONSTRAINT IF EXISTS price_list_part_number_key;

-- Ny unik constraint på (part_number, step_name)
CREATE UNIQUE INDEX price_list_part_number_step_unique 
  ON public.price_list (part_number, COALESCE(step_name, ''));
```

### 2. Filer som ändras

| Fil | Ändring |
|-----|---------|
| `src/hooks/usePriceList.ts` | Lägg till `step_name` i interface och queries, ny `importFromOrders()` funktion |
| `src/pages/PriceList.tsx` | Ny "Steg"-kolumn, fritextfält i dialog, import-knapp med bekräftelse |
| `src/lib/exportExcel.ts` | Inkludera steg i CSV-exporten |

---

## Orderflödet påverkas INTE

- Prislistan förblir fristående referensinformation
- `article_rows` i ordrar ändras inte
- Orderskapande fungerar precis som förut

