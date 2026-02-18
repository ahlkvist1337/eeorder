
# Förenkla matchningslogiken – matcha enbart på modellbeteckning

## Problem

Nuvarande logik kräver **två saker** för träff:
1. Modelltoken (t.ex. `SWE120`) matchar ✓
2. Minst 1 kategoriord (t.ex. `Galvtruck`) matchar ✓

Men om prislistans beskrivning är formulerad lite annorlunda och inte delar kategoriord med söktermen, missar vi giltiga träffar. Dessutom är det onödigt komplext – modellbeteckningen räcker.

## Lösning

Ta bort kravet på kategoriords-överlapp helt. Om beskrivningen innehåller ett modelltoken (bokstäver + siffror, t.ex. `SWE120`, `LWE200`):

- Kräv att minst ett modelltoken matchar i prislistans beskrivning → träff
- Inget krav på kategoriord alls

Om beskrivningen **inte** innehåller något modelltoken (t.ex. "Galvtruck Målad") → returnera inga förslag (för vagt, för mycket brus).

### Ny algoritm

```text
1. Extrahera modell-tokens = ord med BÅDE bokstäver och siffror (SWE120, LWE200, EC25)
2. Om inga modell-tokens finns → returnera [] (beskrivningen är för generell)
3. För varje rad i prislistan:
   - Om prislistans beskrivning innehåller minst ett av modell-tokens → TRÄFF
4. Returnera alla priser för matchande artikelnummer
```

### Effekt

| Sökt beskrivning | Modell-token | Prislistans rad | Resultat |
|---|---|---|---|
| Galvtruck SWE120 Omålad | SWE120 | Galvtruck SWE120 Omålad | ✅ Träff |
| Galvtruck SWE120 Omålad | SWE120 | Galvtruck LWE200 Omålad | ❌ Ingen träff |
| Galvtruck SWE120 Omålad | SWE120 | SWE120 Lackerad RAL9005 | ✅ Träff |
| Galvtruck Omålad | *(inga)* | — | ❌ Inga förslag (för vagt) |

### Kod

**Fil:** `src/hooks/usePriceListLookup.ts` – steg 2 i `findAllMatches`

```typescript
// Modelltoken = ord med BÅDE bokstäver och siffror
const isModelToken = (w: string) => /[a-zåäö]/i.test(w) && /\d/.test(w);
const descWords = description.toLowerCase().split(/\s+/).filter(w => w.length > 1);
const modelTokens = descWords.filter(isModelToken);

// Om inga modelltoken → hoppa över (för generell beskrivning)
if (modelTokens.length === 0) return [];

const matchingPartNumbers = new Set<string>();

prices.forEach(p => {
  const priceWords = p.description.toLowerCase().split(/\s+/);
  // Kräv att minst ett modelltoken finns i prislistans beskrivning
  const modelMatch = modelTokens.some(t => priceWords.includes(t));
  if (modelMatch) {
    matchingPartNumbers.add(p.part_number);
  }
});
```

## Filer som ändras

- `src/hooks/usePriceListLookup.ts` – ersätt steg 2-logiken (rad 60–110)
