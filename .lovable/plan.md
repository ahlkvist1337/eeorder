# Plan: Dela upp Orderstatus och Truckstatus

## ✅ IMPLEMENTERAD

Separering av administrativa statusar (ordernivå) från produktionsstatusar (trucknivå) för att spegla verkligheten i verkstaden.

---

## Ny struktur

```text
┌────────────────────────────────────────────────────────────────────────────────┐
│                              ORDER (Back-office)                               │
│ ──────────────────────────────────────────────────────────────────────────────│
│  Orderstatus: Skapad → Avslutad → Avbruten (administrativ uppföljning)        │
│  Faktureringsstatus: Ej klar → Klar för fakturering → Fakturerad              │
└────────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌────────────────────────────────────────────────────────────────────────────────┐
│                         TRUCK (Produktionens sanning)                          │
│ ──────────────────────────────────────────────────────────────────────────────│
│  Truckstatus: Väntande → Ankommen → Startad → Pausad → Klar                   │
│  + Stegstatus per truck: Väntande → Pågående → Klar                           │
└────────────────────────────────────────────────────────────────────────────────┘
```

---

## Genomförda ändringar

### Databasändringar
- ✅ Ny `truck_status` enum-typ med värden: `waiting`, `arrived`, `started`, `paused`, `completed`
- ✅ Ny `status` kolumn i `object_trucks` tabell
- ✅ Index för snabb filtrering på truckstatus
- ✅ Migrering av befintliga truckar baserat på stegstatus

### Typer
- ✅ Ny `TruckStatus` typ i `src/types/order.ts`
- ✅ Uppdaterad `ObjectTruck` interface med `status` fält
- ✅ Nya labels för truckstatus

### Komponenter
- ✅ `StatusBadge.tsx` - Ny `TruckStatusBadge` komponent
- ✅ `ObjectTrucksEditor.tsx` - Dropdown för truckstatus (Väntande/Ankommen/Startad/Pausad/Klar)
- ✅ `ProductionOrderCard.tsx` - Visar truckar grupperade efter status
- ✅ `ProductionScreen.tsx` - Filtrerar på truckstatus istället för orderstatus
- ✅ `OrdersTable.tsx` - Visar trucksammanfattning (antal, aktiva, klara)

### Context
- ✅ `OrdersContext.tsx` - Ny `updateTruckStatus` funktion med optimistisk uppdatering

---

## Ansvarsseparering

| Ansvar | Nivå | Status | Användning |
|--------|------|--------|------------|
| Administration | Order | Skapad/Avslutad/Avbruten | Back-office, fakturering |
| Fakturering | Order | Ej klar/Klar/Fakturerad | Back-office |
| Produktion | Truck | Väntande/Ankommen/Startad/Pausad/Klar | Produktionsvy, verkstad |
| Behandling | Truck per steg | Väntande/Pågående/Klar | Detaljerad arbetsstatus |

---

## Bakåtkompatibilitet

- ✅ Ordrar utan truckar fungerar som tidigare
- ✅ Befintlig orderstatus behålls för administrativ användning
- ✅ Befintliga truckar migrerades automatiskt till lämplig status
