
# Plan: Kodstädning och kvalitetssäkring

## Sammanfattning

En grundlig granskning av projektet har gjorts med fokus på kodkvalitet, struktur och hållbarhet. Projektet är generellt välstrukturerat med tydlig separation mellan komponenter, hooks, contexts och sidor. Några förbättringsområden har identifierats som kan städas upp utan att ändra funktionalitet.

---

## Granskningsresultat

### Bedömning: Projektet är i gott skick

Projektet har:
- Tydlig mappstruktur (components, pages, hooks, contexts, lib, types)
- Konsekvent användning av TypeScript med tydliga typningar
- Bra separation av ansvar mellan context (OrdersContext) och hooks (useOrders)
- Konsekvent namngivning på svenska för affärslogik-termer

---

## Identifierade förbättringar

### 1. OANVÄNDA KOMPONENTER OCH FILER

| Fil | Problem | Åtgärd |
|-----|---------|--------|
| `src/components/OrderStepsEditor.tsx` | Används inte längre (steg hanteras nu via OrderObjectsEditor) | Ta bort |
| `src/components/TruckTimeline.tsx` | Importeras inte någonstans | Ta bort |

### 2. OANVÄNDA IMPORTER OCH EXPORTS

| Fil | Problem | Åtgärd |
|-----|---------|--------|
| `src/pages/OrderDetails.tsx` | Importerar `StepStatusBadge` men använder den inte | Ta bort import |
| `src/components/StatusBadge.tsx` | Exporterar `TruckStatusBadge` som inte används någonstans | Kan behållas för framtida bruk eller tas bort |
| `src/types/order.ts` | Exporterar `ObjectTemplate` interface som inte används (hook har sin egen typ) | Ta bort från types, finns redan i useObjectTemplates.ts |

### 3. DUPLICERAD TYPNING

| Plats | Problem | Åtgärd |
|-------|---------|--------|
| `src/types/order.ts` rad 40-44 | `ObjectTemplate` definieras här | Behåll endast i `useObjectTemplates.ts` |
| `src/hooks/useObjectTemplates.ts` rad 5-8 | Har sin egen `ObjectTemplate` definition | Behåll denna då den faktiskt används |

### 4. KODKVALITET

| Fil | Problem | Åtgärd |
|-----|---------|--------|
| `src/contexts/OrdersContext.tsx` rad 400 | `eslint-disable` kommentar för `@typescript-eslint/no-explicit-any` | Kan accepteras då det är för Supabase insert |

### 5. KOMPONENTSTRUKTUR - Acceptabel

Alla komponenter har tydligt avgränsade ansvarsområden:
- `OrderObjectsEditor` - hanterar objekt med inline steg och arbetskort
- `ObjectTrucksEditor` - hanterar arbetskort inom ett objekt
- `ArticleRowsEditor` - hanterar artikelrader med prislistekoppling
- `PriceListBadge` - visar prislista-matchningar

---

## Åtgärder att genomföra

### Steg 1: Ta bort oanvända filer
```
src/components/OrderStepsEditor.tsx  → Ta bort
src/components/TruckTimeline.tsx     → Ta bort
```

### Steg 2: Städa importer i OrderDetails.tsx
```typescript
// Ta bort denna rad:
import { StepStatusBadge } from '@/components/StatusBadge';
```

### Steg 3: Ta bort oanvänd typ i types/order.ts
```typescript
// Ta bort rad 40-44:
export interface ObjectTemplate {
  id: string;
  name: string;
  createdAt: string;
}
```

### Steg 4: Överväg att behålla eller ta bort
- `TruckStatusBadge` i StatusBadge.tsx - kan behållas för framtida bruk
- `StepStatusBadge` - kan behållas för framtida bruk

---

## Saker som INTE behöver ändras

### Datamodellen
Datamodellen är korrekt och väl genomtänkt:
- Order → Objects → Trucks (work cards) → StepStatuses
- Tydlig separation mellan affärsdata (ArticleRows) och produktion (Objects/Trucks)
- Historik och lifecycle-events spåras korrekt

### Hooks
Alla hooks används och har tydliga ansvarsområden:
- `useOrders` - re-export för bakåtkompatibilitet
- `usePriceList` - CRUD för prislistan
- `usePriceListLookup` - snabbsökning i prislistan
- `useTreatmentSteps` - behandlingssteg-templates
- `useObjectTemplates` - objektmallar
- `useProductionStats` - statistik för produktion
- `useOrderAttachments` - filhantering
- `useOrderDeviations` - avvikelsehantering

### Lib-filer
Alla lib-filer används:
- `invoiceExport.ts`, `invoiceExportExcel.ts`, `invoiceExportPdf.ts` - fakturaexport
- `exportExcel.ts` - prisliste-export
- `workCardPrint.ts` - utskrift av arbetskort
- `xmlParser.ts` - import från Monitor ERP
- `utils.ts` - cn() helper

### Contexts
Båda contexts är välstrukturerade:
- `AuthContext` - autentisering och rollhantering
- `OrdersContext` - all orderlogik på ett ställe

---

## Resultat efter städning

| Mått | Före | Efter |
|------|------|-------|
| Oanvända komponenter | 2 | 0 |
| Oanvända importer | 1 | 0 |
| Duplicerade typdefinitioner | 1 | 0 |
| Totalt antal filer att ta bort | 2 | - |

---

## Teknisk sammanfattning

### Filer att ta bort
1. `src/components/OrderStepsEditor.tsx`
2. `src/components/TruckTimeline.tsx`

### Filer att redigera
1. `src/pages/OrderDetails.tsx` - ta bort oanvänd import
2. `src/types/order.ts` - ta bort oanvänd ObjectTemplate interface

---

## Slutsats

Projektet är i mycket gott skick för skarp drift. De föreslagna ändringarna är minimala och handlar om att ta bort kod som inte längre används - ingen affärslogik eller funktionalitet påverkas.

Koden följer konsekventa mönster, har tydlig typning, och separationen mellan olika ansvarsområden är välgjord. Efter dessa små städningar kommer all kod som finns i projektet att ha ett tydligt syfte.
