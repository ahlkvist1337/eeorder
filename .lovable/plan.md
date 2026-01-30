
# Plan: Expanderbara artikelrader i prislistan

## Sammanfattning

Gruppera prisrader per artikelnummer i prislistan, så att varje artikel visas på en rad med möjlighet att expandera och se/redigera alla stegpriser under.

---

## Ny design

```text
┌───────────────────────────────────────────────────────────────────────────────────┐
│ Prislista                                  [Importera från ordrar] [Exportera]    │
│ 45 artiklar (127 prisrader)                                                       │
├───────────────────────────────────────────────────────────────────────────────────┤
│ 🔍 [Sök artikelnummer, benämning eller steg...                              ]     │
├───────────────────────────────────────────────────────────────────────────────────┤
│ Artikelnr ▼   │ Benämning        │ Antal steg  │ Priser              │           │
├───────────────┼──────────────────┼─────────────┼─────────────────────┼───────────┤
│ ▶ 7589450-777 │ Hjulgaffel       │ 3 steg      │ 200–450 kr          │ ✏️        │
├───────────────┼──────────────────┼─────────────┼─────────────────────┼───────────┤
│ ▼ 3903041     │ Lagerlock        │ 2 steg      │ 500–1 000 kr        │ ✏️        │
│ ┌─────────────────────────────────────────────────────────────────────────────┐   │
│ │ Steg              │ Pris        │                                           │   │
│ ├───────────────────┼─────────────┼───────────────────────────────────────────┤   │
│ │ (grundpris)       │ 1 000 kr    │ ✏️  🗑                                    │   │
│ │ Svetsning         │ 500 kr      │ ✏️  🗑                                    │   │
│ ├───────────────────┴─────────────┴───────────────────────────────────────────┤   │
│ │ [+ Lägg till stegpris]                                                      │   │
│ └─────────────────────────────────────────────────────────────────────────────┘   │
├───────────────┼──────────────────┼─────────────┼─────────────────────┼───────────┤
│ ▶ 8821234     │ Axel             │ 1 steg      │ 750 kr              │ ✏️        │
└───────────────────────────────────────────────────────────────────────────────────┘
```

---

## Funktionalitet

### Grupperad visning
- Alla prisrader med samma `part_number` grupperas till en "huvudrad"
- Huvudraden visar artikelnummer, benämning, antal steg och prisintervall (min–max)

### Expandera artikel
- Klicka på pilen (▶/▼) för att expandera
- Visar alla stegpriser för den artikeln i en undertabell
- Varje stegpris kan redigeras och tas bort individuellt

### Lägg till stegpris
- Inuti den expanderade sektionen finns knapp för att lägga till nytt stegpris
- Öppnar dialog med förifyllt artikelnummer och benämning
- Användaren fyller i stegnamn och pris

### Redigera huvudrad
- Pennikonen på huvudraden öppnar dialog för att redigera artikelnummer/benämning
- Uppdaterar alla prisrader med samma artikelnummer

---

## Tekniska ändringar

### Fil: src/pages/PriceList.tsx

| Ändring | Beskrivning |
|---------|-------------|
| Gruppera data | Ny `useMemo` som grupperar `prices` per `part_number` till objekt med alla stegpriser |
| Expanderat state | `expandedPartNumber: string | null` för att hålla koll på vilken artikel som är expanderad |
| Undertabell | Rendera stegpriser i en collapsible sektion under varje grupperad rad |
| Lägg till stegpris | Ny knapp i expanderad sektion som öppnar dialogen med förifyllt artikelnummer |

### Datastruktur (i komponenten)

```typescript
interface GroupedArticle {
  partNumber: string;
  description: string;  // Från första raden
  prices: PriceListItem[];  // Alla prisrader för denna artikel
  minPrice: number;
  maxPrice: number;
}
```

### Logik för gruppering

```typescript
const groupedPrices = useMemo(() => {
  const groups = new Map<string, GroupedArticle>();
  
  for (const item of filteredPrices) {
    const existing = groups.get(item.part_number);
    if (existing) {
      existing.prices.push(item);
      existing.minPrice = Math.min(existing.minPrice, item.price);
      existing.maxPrice = Math.max(existing.maxPrice, item.price);
    } else {
      groups.set(item.part_number, {
        partNumber: item.part_number,
        description: item.description,
        prices: [item],
        minPrice: item.price,
        maxPrice: item.price,
      });
    }
  }
  
  return Array.from(groups.values());
}, [filteredPrices]);
```

---

## Fördelar

- Renare översikt: ser direkt vilka artiklar som finns
- Enklare att hantera stegpriser: alla på samma ställe
- Prisintervall ger snabb överblick
- Samma databas och RLS-policies, ingen migration behövs
