
# Plan: Fixa "#Okänt" för äldsta pågående arbetskort

## Problem

Statistiksidan visar "#Okänt" för äldsta pågående arbetskort trots att arbetskortet har ett nummer (21270).

**Orsak**: Koden hämtar `truck_number` från `truck_lifecycle_events`-tabellen, men det fältet är tomt/null. Det korrekta numret finns i `object_trucks`-tabellen.

## Lösning

Uppdatera `useProductionStats.ts` för att hämta `truck_number` från `object_trucks` istället för från lifecycle events.

## Teknisk ändring

I `src/hooks/useProductionStats.ts`, rad 80-87:

**Före:**
```typescript
if (arrivedEventsForActive.length > 0) {
  const oldest = arrivedEventsForActive[0];
  const days = differenceInDays(now, new Date(oldest.timestamp));
  oldestActiveInfo = {
    days,
    truckNumber: oldest.truck_number || 'Okänt'  // ← Hämtar från events
  };
}
```

**Efter:**
```typescript
if (arrivedEventsForActive.length > 0) {
  const oldest = arrivedEventsForActive[0];
  const days = differenceInDays(now, new Date(oldest.timestamp));
  
  // Hämta truck_number från object_trucks istället
  const truck = trucks.find(t => t.id === oldest.truck_id);
  
  oldestActiveInfo = {
    days,
    truckNumber: truck?.truck_number || 'Okänt'  // ← Hämtar från trucks
  };
}
```

## Filändringar

| Fil | Ändring |
|-----|---------|
| `src/hooks/useProductionStats.ts` | Hämta truck_number från trucks-arrayen istället för events |

## Resultat

Efter ändringen kommer kortet att visa:
- "< 1 dag" 
- "#21270" (istället för "#Okänt")
