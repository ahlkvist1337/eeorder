# Plan: Produktionsvy fokuserad på truckar med planering och enhetlig historik

## Status: ✅ IMPLEMENTERAD

Alla planerade funktioner har implementerats:

---

## Del 1: Produktionsvy med truckkort ✅

- **ProductionTruckCard.tsx** - Nytt truckkort med:
  - Stort trucknummer överst (text-4xl)
  - Truckstatus-badge (Ankommen/Startad/Pausad)
  - Objektnamn
  - Stegstatus-lista med ikoner och aktuellt-markör
  - Diskret ordernummer och kund längst ner
  - Planerat klart-datum

---

## Del 2: Prioritering och planering ✅

- **Databaskolumn**: `sort_order` på `object_trucks`
- **Drag-and-drop**: Implementerat med @dnd-kit
- **SortableProductionTruckCard.tsx** - Wrapper för sorterbara truckkort
- **Sorteringslogik**: Manuell ordning prioriteras, sedan planerat klart-datum
- **Återställ ordning**: Knapp för att nollställa manuell sortering

---

## Del 3: Automatisk truck-klar-markering ✅

- Truck markeras automatiskt som "Klar" när alla steg är klara
- Logik implementerad i ObjectTrucksEditor.tsx

---

## Del 4: Enhetlig historik per truck ✅

- **Databastabell**: `truck_lifecycle_events` med RLS
- **TruckTimeline.tsx** - Ny komponent för samlad historik
- Eventtyper: planned, arrived, started, paused, completed, step_started, step_completed
- Svenska labels för alla eventtyper

---

## Del 5: Typer och kontext ✅

- **TruckLifecycleEvent** - Ny typ
- **TruckLifecycleEventType** - Enum för eventtyper
- **ObjectTruck.sortOrder** - Ny optional property
- **truckLifecycleEventLabels** - Svenska labels

---

## Filer som skapats/ändrats

| Fil | Status |
|-----|--------|
| `src/components/ProductionTruckCard.tsx` | ✅ Ny |
| `src/components/SortableProductionTruckCard.tsx` | ✅ Ny |
| `src/components/TruckTimeline.tsx` | ✅ Ny |
| `src/pages/ProductionScreen.tsx` | ✅ Refaktorerad |
| `src/types/order.ts` | ✅ Uppdaterad |
| `src/contexts/OrdersContext.tsx` | ✅ Uppdaterad |
| `src/components/ObjectTrucksEditor.tsx` | ✅ Uppdaterad |
| `supabase/migrations/` | ✅ Ny migration |
| `src/components/ProductionOrderCard.tsx` | ❌ Raderad (ersatt av truckkort) |

---

## Nästa steg (framtida förbättringar)

1. Integrera TruckTimeline i OrderDetails.tsx
2. Logga lifecycle-events vid statusändringar
3. Visa trucksammanfattning i orderhuvudet
