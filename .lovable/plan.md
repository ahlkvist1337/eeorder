

# Plan: Beräkna ledtid baserat på verklig historikdata

## Bakgrund
Idag beräknas "Genomsnittlig ledtid" baserat på **planerade datum** (`plannedStart` och `plannedEnd`), vilket inte visar den faktiska produktionstiden.

Du vill istället att ledtiden ska beräknas från **verklig historikdata** - specifikt tiden från när en order får status "Ankommen" tills den blir "Avslutad".

## Lösning

### Ändring i `src/pages/Statistics.tsx`

Uppdatera beräkningslogiken för `avgLeadTimeDays`:

1. **Filtrera avslutade ordrar** som har statushistorik
2. **För varje order**, hitta:
   - Första tidsstämpeln där `toStatus === 'arrived'` (ankomstdatum)
   - Första tidsstämpeln där `toStatus === 'completed'` (avslutningsdatum)
3. **Beräkna skillnaden** i dagar mellan dessa två tidpunkter
4. **Visa genomsnitt** av alla ordrar som har båda datapunkterna

### Kodexempel (konceptuellt)

```typescript
// Beräkna verklig ledtid från statushistorik
let avgLeadTimeDays = 0;
const ordersWithLeadTime: number[] = [];

completedOrders.forEach(order => {
  const arrivedEntry = order.statusHistory.find(h => h.toStatus === 'arrived');
  const completedEntry = order.statusHistory.find(h => h.toStatus === 'completed');
  
  if (arrivedEntry && completedEntry) {
    const arrivedDate = new Date(arrivedEntry.timestamp);
    const completedDate = new Date(completedEntry.timestamp);
    const days = Math.ceil((completedDate.getTime() - arrivedDate.getTime()) / (1000 * 60 * 60 * 24));
    if (days >= 0) {
      ordersWithLeadTime.push(days);
    }
  }
});

if (ordersWithLeadTime.length > 0) {
  avgLeadTimeDays = Math.round(
    ordersWithLeadTime.reduce((sum, d) => sum + d, 0) / ordersWithLeadTime.length
  );
}
```

### Uppdatera förklaringstexten

Ändra undertexten från:
> "Baserat på planerade datum för avslutade ordrar"

Till:
> "Baserat på verklig tid från Ankommen till Avslutad"

## Fördel

Denna förändring ger en **realistisk bild** av hur lång tid det faktiskt tar att behandla en order, baserat på verklig data istället för planer.

---

**Teknisk detalj**: Eftersom `statusHistory` redan hämtas och finns tillgänglig på varje order i `OrdersContext`, behövs inga databasändringar - endast en uppdatering av beräkningslogiken i Statistics-komponenten.

