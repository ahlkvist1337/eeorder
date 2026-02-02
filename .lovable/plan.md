
# Plan: Fixa "Nästa steg" genom att skapa truck_step_status-poster

## Problemanalys

Jag har undersökt databasen och hittat rotorsaken:

### Vad som händer
1. När ett arbetskort läggs till i UI:t, genereras `stepStatuses` korrekt i minnet
2. När användaren ändrar arbetskortets status (t.ex. till "Ankommen"), uppdateras **endast `object_trucks`-tabellen**
3. **`truck_step_status`-posterna skapas aldrig** i databasen för detta arbetskort
4. `getNextStep` hittar arbetskort med status "arrived", men deras `stepStatuses`-array är tom (ingen data i DB)

### Databas-bevis
För order 21345:
- Arbetskort finns i `object_trucks` med status `waiting` (inte ens "arrived" - kan vara synkfel)
- `truck_step_status`-tabellen har **inga poster** för detta arbetskort
- Steget "Målning" finns i `order_steps` med rätt `object_id`

---

## Lösning

### Ändring 1: Skapa truck_step_status vid första status-ändring

När arbetskortets status ändras från "waiting" till något annat (t.ex. "arrived"), ska `truck_step_status`-poster skapas automatiskt om de saknas.

**I `updateTruckStatus`-funktionen:**
```typescript
// Efter att ha uppdaterat truck status...
// Säkerställ att truck_step_status-poster finns för detta arbetskort
const objectSteps = order.steps.filter(s => s.objectId === objectId);
if (objectSteps.length > 0) {
  const truck = obj.trucks?.find(t => t.id === truckId);
  if (truck && truck.stepStatuses.length === 0) {
    // Skapa step statuses i databasen
    const stepStatuses = objectSteps.map(step => ({
      id: crypto.randomUUID(),
      truck_id: truckId,
      step_id: step.id,
      status: 'pending',
    }));
    await supabase.from('truck_step_status').insert(stepStatuses);
  }
}
```

### Ändring 2: Uppdatera getNextStep för fallback

Lägg till fallback-logik som letar efter objektets steg om inga `stepStatuses` finns:

```typescript
const getNextStep = (order: Order): string => {
  // ... befintlig logik ...
  
  // Fallback: Om arbetskort finns men inga stepStatuses, 
  // visa objektets första steg som "Nästa"
  const activeTrucks = (order.objects || [])
    .flatMap(obj => (obj.trucks || [])
      .filter(t => t.status === 'arrived' || t.status === 'started')
      .map(t => ({ truck: t, objectId: obj.id }))
    );
  
  if (activeTrucks.length > 0) {
    // Hitta första steget för första aktiva arbetskortet
    const firstActive = activeTrucks[0];
    const objectStep = order.steps.find(s => s.objectId === firstActive.objectId);
    if (objectStep) {
      return `Nästa: ${objectStep.name}`;
    }
  }
  
  return '-';
};
```

---

## Filändringar

| Fil | Ändring |
|-----|---------|
| `src/contexts/OrdersContext.tsx` | I `updateTruckStatus`: Skapa `truck_step_status`-poster automatiskt om de saknas |
| `src/components/OrdersTable.tsx` | I `getNextStep`: Lägg till fallback för att hitta objektets steg om `stepStatuses` är tom |

---

## Resultat efter fix

| Ordernr | Arbetskort | Nästa steg (före) | Nästa steg (efter) |
|---------|------------|-------------------|-------------------|
| 21345 | Toyota Parts (Ankommen) | - | Nästa: Målning |
