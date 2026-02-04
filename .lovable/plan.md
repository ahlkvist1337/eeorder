
# Plan: Förbättrad prisindikator för orderartiklar

## Sammanfattning

Utvecklar prisvarningssystemet så att en diskret indikator ("Prislistan finns") visas direkt på artikelraden när artikelnummer eller benämning matchar prislistan - utan att användaren behöver redigera raden. Vid klick visas en kompakt prisöversikt med alla tillgängliga priser som speglar prislistans struktur.

---

## Nuvarande vs Nytt

| Aspekt | Nuvarande | Nytt |
|--------|-----------|------|
| **När visas prisinfo** | Endast vid redigering av prisfältet | Direkt på alla rader som matchar prislistan |
| **Vad visas** | Enskilt pris + "Använd"-knapp | Badge "Prislista finns" på raden |
| **Prisöversikt** | Inget | Popover med ALLA prisvarianter vid klick |
| **Flöde** | Måste redigera för att se | Ser direkt, klickar för detaljer |

---

## Användarflöde

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  Rad  │  Artikelnr  │  Beskrivning           │ Antal │ Enhet │  Pris  │ Summa │
├──────────────────────────────────────────────────────────────────────────────┤
│   1   │  116        │  Fingerskydd litet     │   2   │  st.  │  0 kr  │ 0 kr  │
│        ∟ [📋 Prislista finns]  ← diskret badge, alltid synlig                │
│                                                                              │
│   2   │  3903041    │  Lagerlock             │   3   │  st.  │  0 kr  │ 0 kr  │
│        ∟ [📋 Prislista finns]                                                │
│                                                                              │
│   3   │  XYZ-123    │  Okänd artikel         │   1   │  st.  │ 500 kr │ 500 kr│
│        (ingen badge - ingen match)                                           │
└──────────────────────────────────────────────────────────────────────────────┘
```

**Vid klick på "Prislista finns":**

```
┌─────────────────────────────────────────┐
│  📋 Priser i prislistan                 │
│                                         │
│  Artikelnr: 3903041 - Lagerlock         │
│  ─────────────────────────────          │
│  1:a Målning          1 500 kr  [Välj]  │
│  2:a uppåt Målning      275 kr  [Välj]  │
│                                         │
└─────────────────────────────────────────┘
```

---

## Teknisk implementation

### 1. Utöka usePriceListLookup hook

Lägg till en ny funktion `findAllMatches` som returnerar ALLA matchande priser (inte bara bästa):

```typescript
interface PriceMatch {
  price: number;
  partNumber: string;
  description: string;
  stepName: string | null;  // NY - behövs för visning
  matchType: 'exact_part' | 'similar_desc';
}

// NY funktion
findAllMatches(partNumber: string, description: string): PriceMatch[]
```

**Logik:**
1. Om artikelnumret matchar exakt → returnera alla priser för det artikelnumret
2. Annars om beskrivning matchar (≥2 ord) → returnera alla priser för matchande artiklar
3. Sortera efter step_name för konsekvent ordning

### 2. Ny komponent: PriceListBadge

Skapar en liten badge-komponent som:
- Tar emot `partNumber` och `text` som props
- Använder `findAllMatches` för att kontrollera om det finns matchningar
- Visar en diskret badge om match finns
- Vid klick öppnas en Popover med prisöversikten

```typescript
interface PriceListBadgeProps {
  partNumber: string;
  text: string;
  onSelectPrice?: (price: number) => void;  // Callback när användare väljer pris
  readOnly?: boolean;  // Om true, visa inte "Välj"-knappar
}
```

### 3. Uppdatera ArticleRowsEditor

**I visningstabellenraden (ej redigering):**
- Lägg till `<PriceListBadge>` under artikelraden
- Badge visas alltid om match finns
- Klickbar för att visa prisöversikt

**I redigeringsläge:**
- Befintlig `PriceHint` kan behållas för snabb varning
- ELLER ersätt helt med ny badge + popover

---

## Prisöversiktens design

Popover vid klick visar alla priser rakt upp och ner:

```
┌───────────────────────────────────────────┐
│  Priser i prislistan                      │
│                                           │
│  116 - Fingerskydd litet                  │
│  ─────────────────────────────────────    │
│                                           │
│  SPZ                         500 kr [Välj]│
│  (grundpris)                 500 kr [Välj]│
│                                           │
└───────────────────────────────────────────┘
```

Eller för artikel med mängdpriser:

```
┌───────────────────────────────────────────┐
│  Priser i prislistan                      │
│                                           │
│  2954145 - RIGHT ADDITIONAL FENDER        │
│  ─────────────────────────────────────    │
│                                           │
│  1:a                       1 500 kr [Välj]│
│  från 2:a                    650 kr [Välj]│
│                                           │
└───────────────────────────────────────────┘
```

---

## Filändringar

| Fil | Ändring |
|-----|---------|
| `src/hooks/usePriceListLookup.ts` | Lägg till `findAllMatches` funktion |
| `src/components/PriceListBadge.tsx` | **NY FIL** - Badge + Popover komponent |
| `src/components/ArticleRowsEditor.tsx` | Integrera PriceListBadge i tabellrader |

---

## Användargränssnitt detaljer

### Badge-design
- Liten, diskret text eller ikon
- Färg: `text-muted-foreground` eller lätt accentfärg
- Ikon: `List` eller `FileText` från lucide
- Text: "Prislista finns" eller bara ikon med tooltip

### Popover-design
- Rubrik: "Priser i prislistan"
- Artikelinfo: Artikelnr + beskrivning
- Separator
- Lista över priser:
  - Vänster: step_name (eller "(grundpris)" om null)
  - Höger: pris formaterat + "Välj"-knapp
- Ingen gruppering eller dropdown - flat lista

### Beteende
- Badge visas på ALLA rader som har matchning (inte bara vid redigering)
- Popover stängs automatiskt vid val av pris
- Vid val uppdateras radens pris direkt
- readOnly-läge: visa priserna men utan "Välj"-knappar

---

## Resultat

1. **Omedelbar överblick** - Användaren ser direkt vilka artiklar som finns i prislistan
2. **Enkel jämförelse** - Alla prisvarianter visas samtidigt utan gruppering
3. **Frivillig användning** - Priserna är informativa, inte tvingande
4. **Speglar datan** - Visar exakt vad som finns i prislistan (behandlingspriser, mängdpriser, etc.)
5. **Inte rörigt** - Diskret badge som inte stör arbetsflödet
