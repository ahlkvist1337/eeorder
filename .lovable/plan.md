
# Fix: Objektsteg-redigering forstor arbetskortsstatus

## Rotorsak

Alla tre problem har samma grundorsak: nar steg andras (omordning, borttagning, tillagg) kor `updateOrder` en **delete-all + re-insert** strategi for `order_steps`:

```
DELETE FROM order_steps WHERE order_id = ?
INSERT INTO order_steps (...) VALUES (...)
```

Problemet: `truck_step_status` har en **ON DELETE CASCADE** FK till `order_steps.step_id`. Sa nar alla steg raderas (aven tillfalligt) forsvinner ALLA arbetskortens stegstatusar. Nar stegen aterinfogas saknar arbetskorten sina statusar -- alla blir "pending" igen.

**Konsekvenser:**
1. **Steg-omordning**: Stegen sparas men alla arbetskortstatusar nollstalls
2. **Borttagning av steg**: Samma problem -- alla statusar forsvinner, inte bara for det borttagna steget
3. **Krav pa siduppdatering**: Den optimistiska uppdateringen i UI:t reflekterar inte forlusten av truck_step_status, sa anvandarens lokala state visar gammal data tills sidan laddas om
4. **Felmeddelande vid borttagning**: Troligen en timing-relaterad FK-constraint error under delete+reinsert

## Losning

Andra `updateOrder` i `OrdersContext.tsx` fran delete-all+reinsert till en **upsert-strategi** for steg (precis som redan anvands for objekt):

### Andring i `src/contexts/OrdersContext.tsx`

Ersatt steg-hanteringen (rad ~737-756) med:

1. **Identifiera borttagna steg**: Jamfor gamla step-IDs med nya step-IDs
2. **Radera enbart borttagna steg**: `DELETE FROM order_steps WHERE id IN (borttagna_ids)` -- detta cascade-raderar BARA de truck_step_status-rader som tillhor det borttagna steget (korrekt beteende)
3. **Upsert ovriga steg**: `UPSERT` for alla kvarvarande/nya steg -- bevarar befintliga rader och lagger till nya

```text
Fore (farlig):
  DELETE alla steg -> CASCADE raderar ALLA truck_step_status
  INSERT steg tillbaka -> truck_step_status ar borta

Efter (saker):
  Berakna borttagna = gamla IDs - nya IDs
  DELETE enbart borttagna -> CASCADE raderar BARA ratt truck_step_status
  UPSERT kvarvarande + nya -> Befintliga truck_step_status bevaras
```

4. **Rensa orphaned truck_step_status**: Nar ett steg tas bort, radera aven eventuella truck_step_status-rader som refererar till det borttagna steg-IDt (hanteras automatiskt av CASCADE)
5. **Bevara ordning**: Stegen bevaras i den ordning de skickas fran UI:t. Eftersom DB:n inte har en sort_order-kolumn for steg, och den nuvarande koden redan hanterar ordningen genom array-positionen i JavaScript, racker det att upserten bevarar ordningen konsekvent.

### Detaljerad kodskelett

```typescript
if (updates.steps !== undefined) {
  const currentOrder = orders.find(o => o.id === id);
  const oldSteps = previousSteps || currentOrder?.steps || [];
  const oldStepIds = new Set(oldSteps.map(s => s.id));
  const newStepIds = new Set(updates.steps.map(s => s.id));
  
  // Hitta borttagna steg
  const removedStepIds = [...oldStepIds].filter(sid => !newStepIds.has(sid));
  
  // Radera BARA borttagna steg (cascade tar hand om truck_step_status)
  if (removedStepIds.length > 0) {
    await supabase.from('order_steps').delete().in('id', removedStepIds);
  }
  
  // Upsert alla kvarvarande + nya steg
  if (updates.steps.length > 0) {
    await supabase.from('order_steps').upsert(
      updates.steps.map(step => ({
        id: step.id,
        order_id: id,
        template_id: step.templateId,
        name: step.name,
        status: step.status,
        object_id: step.objectId || null,
        // ... ovriga falt
      })),
      { onConflict: 'id' }
    );
  }
  
  // Status-historik och auto-status logik (behalles som idag)
}
```

### Filer som andras

1. **`src/contexts/OrdersContext.tsx`** -- Ersatt delete-all+reinsert med selektiv delete + upsert for steg (rad ~737-756)

### Vad som INTE andras
- Objekthanteringen (anvander redan upsert -- korrekt)
- Truck-hanteringen (anvander redan upsert -- korrekt)
- Optimistiska uppdateringar (fungerar redan for steg-andringar)
- Databasschemat (inga nya kolumner eller tabeller)
