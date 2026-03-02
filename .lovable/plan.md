

# Forbattra prisimport fran ordrar (upsert istallet for insert-only)

## Problem idag

1. **0-kr priser uppdateras aldrig**: Om en prisrad redan finns med pris 0 kr (grundpris) och du andrar priset i en order, hoppar importen over raden eftersom artikelnumret redan finns i prislistan.
2. **Dubbletter vid namnbyte**: Om du andrar step_name fran null (grundpris) till t.ex. "Malning", ser importen att `part_number|` (med tomt steg) inte langre finns och skapar en ny rad med grundpris -- nu finns samma artikelnummer tva ganger.

## Losning

Andra `importFromOrders` i `src/hooks/usePriceList.ts` fran **enbart insert** till **upsert-logik**:

### Ny logik

1. Hamta alla artikelrader fran ordrar (som idag), sorterade med senaste order forst
2. Hamta alla befintliga prisrader inklusive `id` och `price`
3. For varje unikt artikelnummer fran ordrarna:
   - **Finns INTE i prislistan** -> INSERT (som idag)
   - **Finns i prislistan med step_name = null OCH orderns pris ar hogre** -> UPDATE priset till det nya vardet
   - **Finns i prislistan med step_name = null OCH orderns pris ar lagre/lika** -> Skippa (behall befintligt pris)
   - **Finns i prislistan men BARA med step_name (ej null)** -> INSERT en ny grundpris-rad (step_name = null)

4. Returnera tydlig sammanfattning: `X nya, Y uppdaterade av Z totalt`

### Andring i en fil

**`src/hooks/usePriceList.ts`** -- `importFromOrders`-funktionen:

```typescript
const importFromOrders = async (): Promise<{ total: number; imported: number; updated: number }> => {
  // Hamta artikelrader + orderns created_at
  const { data: articleRows, error: fetchError } = await supabase
    .from('article_rows')
    .select('part_number, text, price, orders(created_at)');

  // ... felhantering som idag ...

  // Hamta befintliga prisrader MED id och price
  const { data: existingPrices } = await supabase
    .from('price_list')
    .select('id, part_number, step_name, price');

  // Bygg map: part_number -> grundpris-rad (step_name = null)
  const existingBasePrice = new Map();
  for (const p of existingPrices || []) {
    if (!p.step_name) {
      existingBasePrice.set(p.part_number, { id: p.id, price: p.price });
    }
  }

  // Deduplicera ordrar -- senaste forst (som idag)
  // ...

  const toInsert = [];
  const toUpdate = [];

  for (const [pn, row] of latestPerPartNumber) {
    const existing = existingBasePrice.get(pn);
    if (!existing) {
      // Ny rad -- insert
      toInsert.push(row);
    } else if (row.price > existing.price) {
      // Befintlig rad med lagre pris -- uppdatera
      toUpdate.push({ id: existing.id, price: row.price, description: row.description });
    }
    // Annars: befintligt pris ar hogre/lika -- skippa
  }

  // INSERT nya rader
  if (toInsert.length > 0) {
    await supabase.from('price_list').insert(
      toInsert.map(r => ({ part_number: r.part_number, description: r.description, price: r.price, step_name: null }))
    );
  }

  // UPDATE befintliga rader med hogre pris
  for (const upd of toUpdate) {
    await supabase.from('price_list').update({ price: upd.price, description: upd.description }).eq('id', upd.id);
  }

  toast({ title: `${toInsert.length} nya, ${toUpdate.length} uppdaterade prisrader` });
  return { total, imported: toInsert.length, updated: toUpdate.length };
};
```

### Sammanfattning
- En fil andras: `src/hooks/usePriceList.ts`
- Returtypen utvidgas med `updated: number`
- Anropande komponenter (PriceList.tsx) uppdateras for att visa det nya meddelandet
- Inga databasandringar -- anvander befintliga tabeller

