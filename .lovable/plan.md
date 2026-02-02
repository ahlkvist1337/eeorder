

# Plan: Prislistans medvetenhet i artikelradseditor

## Sammanfattning

Lägger till diskret prislistajämförelse i ArticleRowsEditor som visas **endast när priset skiljer sig** - utan att störa arbetsflödet eller blockera sparande.

---

## Hur det fungerar

### Bakgrundslogik (tyst)
När användaren redigerar eller lägger till en artikelrad:
1. Systemet söker i prislistan efter:
   - **Exakt match på artikelnummer** (stark träff)
   - **Liknande benämning** (svag träff, enkel ordmatchning)
2. Om träff hittas med **annat pris** → visa diskret notis
3. Om samma pris eller ingen träff → inget visas

### UI-placering
Notisen visas direkt **under prisfältet** i redigeringsläge - inte som popup eller modal.

```text
┌────────────────────────────────────────────────────────────────┐
│ Rad │ Artikelnr │ Beskrivning    │ Antal │ Enhet │ Pris       │
├─────┼───────────┼────────────────┼───────┼───────┼────────────┤
│ [1] │ [ABC123 ] │ [Blästring   ] │ [2  ] │ [st.] │ [1 500   ] │
│     │           │                │       │       │ ⚠ Pris i   │
│     │           │                │       │       │ prislistan:│
│     │           │                │       │       │ 1 250 kr   │
│     │           │                │       │       │ [Använd]   │
└─────┴───────────┴────────────────┴───────┴───────┴────────────┘
```

### Åtgärder från notisen (ett klick)
1. **"Använd"** - Ersätter priset med prislistans värde
2. **Ignorera** - Stäng notisen och fortsätt (inget klick krävs)

---

## Vad som INTE händer

- Ingen blockering av sparande
- Inget krav på beslut
- Ingen automatisk prisändring
- Inga popup-dialoger eller modaler
- Ingen "smart" gissning av liknande artiklar

---

## Teknisk implementation

### 1. Ny hook: `usePriceListLookup`
Skapar en lätt hook som:
- Hämtar prislistan en gång vid mount
- Exponerar en `findMatch(partNumber, description)` funktion
- Returnerar bästa träff med pris och matchtyp

```typescript
// src/hooks/usePriceListLookup.ts

interface PriceMatch {
  price: number;
  partNumber: string;
  description: string;
  matchType: 'exact_part' | 'similar_desc';
}

function usePriceListLookup() {
  const [prices, setPrices] = useState<PriceListItem[]>([]);
  
  // Hämta prislistan en gång
  useEffect(() => {
    supabase
      .from('price_list')
      .select('*')
      .then(({ data }) => setPrices(data || []));
  }, []);
  
  const findMatch = useCallback((partNumber: string, description: string): PriceMatch | null => {
    // 1. Exakt artikelnummer-match (stark)
    const exactMatch = prices.find(p => 
      p.part_number.trim().toLowerCase() === partNumber.trim().toLowerCase()
    );
    if (exactMatch) {
      return { 
        price: exactMatch.price, 
        partNumber: exactMatch.part_number,
        description: exactMatch.description,
        matchType: 'exact_part' 
      };
    }
    
    // 2. Enkel ordmatchning på beskrivning (svag)
    // Matcha om minst 2 ord överlappar
    const descWords = description.toLowerCase().split(/\s+/).filter(w => w.length > 2);
    const matches = prices.filter(p => {
      const priceWords = p.description.toLowerCase().split(/\s+/);
      const overlap = descWords.filter(w => priceWords.includes(w));
      return overlap.length >= 2;
    });
    
    if (matches.length > 0) {
      // Ta den senast uppdaterade
      const best = matches.sort((a, b) => 
        new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
      )[0];
      return { 
        price: best.price, 
        partNumber: best.part_number,
        description: best.description,
        matchType: 'similar_desc' 
      };
    }
    
    return null;
  }, [prices]);
  
  return { findMatch, isReady: prices.length > 0 };
}
```

### 2. Uppdatering av ArticleRowsEditor

Lägg till prislistematchning i redigeringsläge:

**Nya imports och state:**
```typescript
import { usePriceListLookup } from '@/hooks/usePriceListLookup';

// Inuti komponenten:
const { findMatch } = usePriceListLookup();
const [priceHint, setPriceHint] = useState<{
  match: PriceMatch;
  currentPrice: number;
} | null>(null);
```

**I redigeringsläge - under prisfältet:**
```tsx
{/* Visa prishintar endast om prislistan har annat pris */}
{priceHint && priceHint.match.price !== priceHint.currentPrice && (
  <div className="flex items-center gap-2 text-xs text-amber-600 mt-1">
    <span>
      Prislistan: {priceHint.match.price.toLocaleString('sv-SE')} kr
      {priceHint.match.matchType === 'similar_desc' && ' (liknande)'}
    </span>
    <Button 
      variant="link" 
      size="sm" 
      className="h-auto p-0 text-xs"
      onClick={() => {
        setEditForm({ ...editForm, price: priceHint.match.price });
        setPriceHint(null);
      }}
    >
      Använd
    </Button>
  </div>
)}
```

**Uppdatera prishinten vid ändringar:**
```typescript
// I useEffect eller onChange för artikelnummer/beskrivning/pris:
useEffect(() => {
  if (!editingRowId) {
    setPriceHint(null);
    return;
  }
  
  const match = findMatch(editForm.partNumber || '', editForm.text || '');
  if (match && match.price !== editForm.price) {
    setPriceHint({ match, currentPrice: editForm.price || 0 });
  } else {
    setPriceHint(null);
  }
}, [editForm.partNumber, editForm.text, editForm.price, editingRowId, findMatch]);
```

### 3. Samma logik för "Lägg till ny rad"

Samma prishintar visas även när användaren lägger till en ny rad:

```tsx
// I "isAdding" raden, under prisfältet:
{newRowPriceHint && newRowPriceHint.match.price !== (newRow.price || 0) && (
  <div className="flex items-center gap-2 text-xs text-amber-600 mt-1">
    <span>Prislistan: {newRowPriceHint.match.price.toLocaleString('sv-SE')} kr</span>
    <Button 
      variant="link" 
      size="sm" 
      className="h-auto p-0 text-xs"
      onClick={() => setNewRow({ ...newRow, price: newRowPriceHint.match.price })}
    >
      Använd
    </Button>
  </div>
)}
```

---

## Filändringar

| Fil | Ändring |
|-----|---------|
| `src/hooks/usePriceListLookup.ts` | **NY FIL** - Lätt hook för prislistamatchning |
| `src/components/ArticleRowsEditor.tsx` | Lägg till prishintar under prisfältet vid redigering/tillägg |

---

## Visuell design

Notisen är:
- **Diskret** - Liten text i dämpad färg (amber/gul)
- **Icke-blockerande** - Användaren kan ignorera den helt
- **Direkt placerad** - Under prisfältet, inte någon annanstans
- **Enkel att agera på** - Ett klick för att använda priset

```text
Prislistan: 1 250 kr [Använd]
```

Ingen röd varning. Ingen modal. Inget som stoppar flödet.

---

## Matchningslogik (förnuftig nivå)

| Matchtyp | Kriterium | Visning |
|----------|-----------|---------|
| Exakt artikelnummer | `part_number` matchar exakt (case-insensitive) | Visa alltid om pris skiljer |
| Liknande beskrivning | Minst 2 ord gemensamma (>2 bokstäver) | Visa med "(liknande)" |

**Aldrig:**
- Automatisk prisändring
- "Vi tror detta är samma sak"
- Tvingande val

