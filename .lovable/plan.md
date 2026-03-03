

# Fix: Import skapar dubbletter av (grundpris) när stegnamn ändrats

## Problem
Importlogiken kollar bara om det finns en rad med `step_name = null` för ett artikelnummer. Om du har ändrat stegnamnet från null till t.ex. "Blästring" hittar importen ingen grundpris-rad och skapar en ny med `step_name: null` -- en dubblett.

## Lösning
Ändra kontrollen så den kollar om **någon** rad alls finns för artikelnumret (oavsett `step_name`), inte bara rader med `step_name = null`. En ny grundpris-rad skapas bara om artikelnumret inte finns överhuvudtaget i prislistan. Prisjämförelse görs mot den befintliga raden med lägst pris.

## Ändring

### `src/hooks/usePriceList.ts`
- Rad 107-113: Byt `existingBasePrice`-mappen från att bara samla `step_name = null`-rader till att samla **alla** rader per `part_number`
- Vid jämförelsen (rad 140-146): Kolla om part_number finns oavsett step_name. Om den finns och importpriset är högre, uppdatera den befintliga raden (med lägst pris). Om den inte finns alls, skapa ny grundpris-rad.

```typescript
// Bygg map: part_number -> alla befintliga rader
const existingByPartNumber = new Map<string, { id: string; price: number }[]>();
for (const p of existingPrices || []) {
  const list = existingByPartNumber.get(p.part_number) || [];
  list.push({ id: p.id, price: p.price });
  existingByPartNumber.set(p.part_number, list);
}

// Vid kontroll:
const existingList = existingByPartNumber.get(pn);
if (!existingList || existingList.length === 0) {
  toInsert.push(row); // Helt nytt artikelnummer
} else {
  // Hitta raden med lägst pris och uppdatera om orderpriset är högre
  const lowest = existingList.reduce((a, b) => a.price < b.price ? a : b);
  if (row.price > lowest.price) {
    toUpdate.push({ id: lowest.id, price: row.price, description: row.description });
  }
}
```

