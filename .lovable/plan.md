
# Plan: Automatisk generering av arbetskort från artikelrader

## Problemanalys

### Nuvarande situation
- **Artikelrader**: Importeras från XML eller läggs till manuellt. Innehåller `quantity` (antal).
- **Objekt**: Skapas manuellt, har egna behandlingssteg och arbetskort.
- **Arbetskort**: Skapas manuellt per objekt.

### Problemet
Det finns **ingen koppling** mellan artikelrader och objekt. Artikelraden "Galvtruck LWI160 omålad" med antal 3 skapar inte automatiskt 3 arbetskort.

---

## Lösning

### Steg 1: Lägg till koppling mellan artikelrad och objekt

**Ny kolumn i databasen:**
```sql
ALTER TABLE article_rows ADD COLUMN object_id uuid REFERENCES order_objects(id) ON DELETE SET NULL;
```

**Uppdaterad ArticleRow-typ:**
```typescript
export interface ArticleRow {
  id: string;
  rowNumber: string;
  partNumber: string;
  text: string;
  quantity: number;
  unit: string;
  price: number;
  stepId?: string;
  objectId?: string; // NY: Koppling till objekt
}
```

### Steg 2: Uppdatera UI för att länka artikelrader till objekt

I ArticleRowsEditor, lägg till en dropdown för att välja objekt:

```text
Rad  Artikelnr  Beskrivning              Antal  Enhet  Pris     Summa    Objekt
10   7765266    Galvtruck LWI160 omålad  3      st.    7 310 kr 21 930 kr [Motorlåda ▼]
20   7766684    Galvtruck LWI160 omålad  1      st.    7 310 kr  7 310 kr [Monteringsdetaljer ▼]
```

### Steg 3: Automatisk generering av arbetskort

När en artikelrad kopplas till ett objekt:
1. Beräkna önskat antal arbetskort från artikelradernas `quantity`
2. Jämför med befintligt antal arbetskort
3. Skapa nya arbetskort automatiskt om det saknas

**Logik:**
```typescript
function syncWorkCardsFromArticleRows(object: OrderObject, linkedArticleRows: ArticleRow[]): ObjectTruck[] {
  const targetCount = linkedArticleRows.reduce((sum, row) => sum + row.quantity, 0);
  const currentCount = object.trucks?.length || 0;
  
  if (currentCount >= targetCount) return object.trucks || [];
  
  // Skapa nya arbetskort för att nå målantal
  const newTrucks: ObjectTruck[] = [];
  for (let i = currentCount; i < targetCount; i++) {
    newTrucks.push({
      id: crypto.randomUUID(),
      objectId: object.id,
      truckNumber: '', // Inget nummer, identifieras automatiskt
      status: 'waiting',
      stepStatuses: [...] // Kopiera från objektets steg
    });
  }
  
  return [...(object.trucks || []), ...newTrucks];
}
```

### Steg 4: UI-indikation för automatisk sync

Visa hur många arbetskort som genereras automatiskt:

```text
▼ Motorlåda                           3 planerade • 0 ankomna • 0 klara
  Steg: Maskering → Blästring → Sprutzink
  
  Länkade artikelrader: 1 rad (3 st totalt)
  
  📋 Arbetskort: 3 st • 0 klara
    Motorlåda A1B2  [Väntande ▼]  Maskering ○  Blästring ○
    Motorlåda C3D4  [Väntande ▼]  Maskering ○  Blästring ○
    Motorlåda E5F6  [Väntande ▼]  Maskering ○  Blästring ○
```

---

## Tekniska ändringar

### Databasmigration

```sql
-- Lägg till koppling mellan artikelrader och objekt
ALTER TABLE article_rows 
ADD COLUMN object_id uuid REFERENCES order_objects(id) ON DELETE SET NULL;
```

### Filändringar

| Fil | Ändring |
|-----|---------|
| `src/types/order.ts` | Lägg till `objectId` i ArticleRow |
| `src/components/ArticleRowsEditor.tsx` | Lägg till objekt-dropdown per rad |
| `src/components/OrderObjectsEditor.tsx` | Visa länkade artikelrader, auto-sync arbetskort |
| `src/contexts/OrdersContext.tsx` | Uppdatera sparlogik för article_rows.object_id |
| `src/integrations/supabase/types.ts` | Auto-genereras |

### Ny hjälpfunktion

```typescript
// src/lib/workCardSync.ts
export function getLinkedArticleRows(objectId: string, articleRows: ArticleRow[]): ArticleRow[] {
  return articleRows.filter(row => row.objectId === objectId);
}

export function calculateRequiredWorkCards(articleRows: ArticleRow[]): number {
  return articleRows.reduce((sum, row) => sum + row.quantity, 0);
}

export function generateMissingWorkCards(
  object: OrderObject, 
  requiredCount: number
): ObjectTruck[] {
  const currentCount = object.trucks?.length || 0;
  if (currentCount >= requiredCount) return [];
  
  const newTrucks: ObjectTruck[] = [];
  for (let i = currentCount; i < requiredCount; i++) {
    // ... skapa nya arbetskort
  }
  return newTrucks;
}
```

---

## Flöde efter implementation

1. **Skapa order** med artikelrader (från XML eller manuellt)
2. **Skapa objekt** (t.ex. "Motorlåda")
3. **Länka artikelrad** till objekt via dropdown
4. **Arbetskort skapas automatiskt** baserat på artikelradens antal
5. **Justera manuellt** vid behov (ta bort/lägg till arbetskort)

---

## Visuellt exempel

### Före (nuvarande)
```text
Artikelrader:
  Rad 10: Galvtruck LWI160 (3 st)
  Rad 20: Galvtruck LWI160 (1 st)

Objekt:
  Motorlåda         1 planerade   <-- ??
  Monteringsdetaljer 1 planerade   <-- ??
```

### Efter (med koppling)
```text
Artikelrader:
  Rad 10: Galvtruck LWI160 (3 st) → Motorlåda
  Rad 20: Galvtruck LWI160 (1 st) → Monteringsdetaljer

Objekt:
  Motorlåda         3 planerade  ← Auto från rad 10
  Monteringsdetaljer 1 planerade  ← Auto från rad 20
```

---

## Sammanfattning

| Steg | Ändring |
|------|---------|
| 1 | Databasmigration: `article_rows.object_id` |
| 2 | UI: Objekt-dropdown i ArticleRowsEditor |
| 3 | Logik: Auto-sync arbetskort vid länkning |
| 4 | Visning: "Länkade artikelrader" i objektvy |

Grundprincipen:
- **Artikelrader** = vad som beställts (kvantitet)
- **Objekt** = vad som ska behandlas (typ + steg)
- **Arbetskort** = varje enhet i produktion (genereras automatiskt)
