
# Granskningsrapport: Implementation av truckfokuserat orderhanteringssystem

## Sammanfattning

Jag har granskat systemet mot dina krav. Majoriteten är implementerat korrekt, men det finns **3 saker som saknas eller inte fungerar helt enligt önskemålet**.

---

## Checklista: Vad som är klart

| Krav | Status | Kommentar |
|------|--------|-----------|
| Produktionsvyn visar truckar, inte orderkort | ✅ Klart | `ProductionTruckCard.tsx` med trucknummer, objekt, steg, status |
| Trucknummer tydligt och stort | ✅ Klart | `text-4xl font-bold font-mono` |
| Objekt visas på kortet | ✅ Klart | Box-ikon + objektnamn |
| Aktuellt behandlingssteg markeras | ✅ Klart | Pil (←) pekar på aktuellt steg |
| Status visas (ankommen/startad/pausad) | ✅ Klart | Färgkodad badge |
| Ordernummer visas diskret | ✅ Klart | Längst ned på kortet, liten text |
| Endast ankomna + startade truckar visas | ✅ Klart | Filtrerar på `arrived` och `started` |
| Pausade truckar visas separat | ✅ Klart | Egen sektion högst upp |
| Prioritering efter planerat klart-datum | ✅ Klart | Sortering på `order.plannedEnd` |
| Drag-and-drop för manuell ordning | ✅ Klart | `@dnd-kit` implementerat |
| Manuell ordning sparas | ✅ Klart | `sort_order` kolumn i DB |
| Återställ ordning-knapp | ✅ Klart | Visar när manuell sortering finns |
| Truck blir "Klar" automatiskt | ✅ Klart | När alla steg är klara i `ObjectTrucksEditor` |
| Stegstatus per truck | ✅ Klart | `truck_step_status` tabell |
| Truckstatus sparas till DB | ✅ Klart | `updateTruckStatus` i context |
| Mott ökar vid "Ankommen" | ✅ Klart | `receivedDelta` logik i context |
| Klart ökar vid "Klar" | ✅ Klart | `completedDelta` logik i context |
| Orderöversikt sökbar på trucknummer | ✅ Klart | Söker i `allTruckNumbers` |
| Truckkolumn i tabellen | ✅ Klart | Visar antal + aktiva/klara |
| TruckTimeline-komponent finns | ✅ Klart | Färdig komponent |
| `truck_lifecycle_events` tabell | ✅ Klart | Finns i DB med RLS |

---

## Vad som SAKNAS eller behöver fixas

### 1. TruckTimeline visas INTE i OrderDetails

**Problem:** Komponenten `TruckTimeline` är skapad men används inte. Historiken i orderdetaljer visar fortfarande tre separata kolumner (Orderstatus, Steghistorik, Truckhistorik) istället för en samlad tidslinje per truck.

**Ditt krav:**
> I stället för separata historiker ska det finnas en tidslinje per truck som visar vad som hänt i rätt ordning

**Nuvarande implementering (rad 413-476 i OrderDetails.tsx):**
```
┌─────────────┬─────────────┬─────────────┐
│ Orderstatus │ Steghistorik│ Truckhistorik│
└─────────────┴─────────────┴─────────────┘
```

**Önskat:**
```
Truck #108
────────────────────────────
12 feb 09:00  Truck planerad
12 feb 10:30  Truck ankommen
12 feb 10:45  Maskering: Pågående
12 feb 11:20  Maskering: Klar
...
```

**Fix:** Integrera `TruckTimeline` och hämta/logga events till `truck_lifecycle_events`.

---

### 2. Lifecycle-events LOGGAS INTE

**Problem:** Tabellen `truck_lifecycle_events` finns men inget skrivs till den. När truckstatus ändras loggas ingenting till tidslinjen.

**Nuvarande:** `updateTruckStatus` uppdaterar bara `object_trucks.status` - den loggar inte till `truck_lifecycle_events`.

**Fix:** Lägg till INSERT till `truck_lifecycle_events` i `updateTruckStatus`:

```typescript
await supabase.from('truck_lifecycle_events').insert({
  order_id: orderId,
  truck_id: truckId,
  truck_number: truckNumber,
  event_type: newStatus, // 'arrived', 'started', 'completed', etc.
});
```

---

### 3. Ordervyn visar INTE trucksammanfattning i huvudet

**Ditt krav:**
> Ordervyn ska visa hur många truckar som är planerade, ankomna och klara.

**Nuvarande:** OrderDetails visar inte någon sammanfattning i orderhuvudet. Informationen finns i `OrdersTable` men inte i `OrderDetails`.

**Önskat (i orderhuvudet):**
```
Order 12345
Volvo • Kundreferens ABC-123

Truckar: 5 planerade • 3 ankomna • 1 klar
```

**Fix:** Lägg till trucksammanfattning efter kundinfo i OrderDetails.tsx.

---

## Krav som fungerar men kan förbättras

### Orderstatus - Back-office separation

**Nuvarande:** `productionStatus` har fortfarande `arrived`, `started`, `paused` som alternativ i dropdown.

**Ditt krav:**
> Orderstatus ska inte användas operativt, utan endast för back-office: startad, klar för fakturering, fakturerad

**Rekommendation:** Begränsa orderstatus-dropdown till endast: `created`, `completed`, `cancelled`. Operativa statusar (`arrived`, `started`, `paused`) bör endast finnas på trucknivå.

---

## Sammanfattning av åtgärder

| Prioritet | Åtgärd | Omfattning |
|-----------|--------|------------|
| 🔴 Hög | Integrera TruckTimeline i OrderDetails | Ersätt nuvarande 3-kolumn historik |
| 🔴 Hög | Logga lifecycle-events vid statusändringar | Uppdatera `updateTruckStatus` |
| 🟡 Medium | Lägg till trucksammanfattning i orderhuvud | Ny sektion i OrderDetails |
| 🟢 Låg | Begränsa orderstatus till administrativa val | UI-ändring i dropdown |

---

## Slutsats

Systemet har **17 av 20 krav implementerade korrekt**. De tre kvarvarande problemen är:

1. TruckTimeline-komponenten används inte
2. Lifecycle-events loggas inte
3. Trucksammanfattning saknas i orderhuvudet

Ska jag implementera dessa tre åtgärder?
