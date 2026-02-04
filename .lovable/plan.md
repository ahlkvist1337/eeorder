
# Plan: Fixa ID-mismatch vid orderskapande

## Problemet

### Vad händer nu
1. Du lägger till objekt, steg och arbetskort i formuläret
2. Varje steg får ett unikt ID i frontend (t.ex. `abc-123`)
3. Arbetskorten kopplas till stegen via detta ID
4. När ordern sparas: stegen skapas i databasen **utan** att skicka med ID:t
5. Databasen genererar ETT NYTT ID (t.ex. `xyz-789`)
6. Arbetskortens status försöker referera till det gamla ID:t (`abc-123`) som inte finns
7. **Databaskrasch** → Order + Objekt skapas, men steg och arbetskort misslyckas

### Resultat
- Order finns i listan
- Objekt finns
- Steg saknas helt
- Arbetskort saknas

---

## Lösningen

Skicka med det frontend-genererade ID:t till databasen så att alla referenser stämmer.

### Ändring i OrdersContext.tsx

```typescript
// RAD 435-448: Lägg till id i step-insert

const { error: stepsError } = await supabase.from('order_steps').insert(
  order.steps.map(step => ({
    id: step.id,  // ← LÄGG TILL DENNA RAD
    order_id: orderId,
    template_id: step.templateId,
    name: step.name,
    status: step.status,
    object_id: step.objectId || null,
    planned_start: step.plannedStart || null,
    planned_end: step.plannedEnd || null,
    actual_start: step.actualStart || null,
    actual_end: step.actualEnd || null,
    price: step.price ?? null,
  }))
);
```

---

## Varför detta fungerar

| Data | Före | Efter |
|------|------|-------|
| **Objects** | Skickar med `id` ✓ | Skickar med `id` ✓ |
| **Trucks** | Skickar med `id` ✓ | Skickar med `id` ✓ |
| **Steps** | Skickar INTE med `id` ✗ | Skickar med `id` ✓ |
| **TruckStepStatus** | Refererar till frontend-ID | Fungerar nu |

---

## Teknisk sammanfattning

### Fil att ändra
`src/contexts/OrdersContext.tsx`

### Förändring
1 rad tillägg: `id: step.id` i step-insert på rad ~436

---

## Resultat

- Alla ordrar skapas komplett (order + objekt + steg + arbetskort + status)
- Inga "tomma" ordrar längre
- Felet löses vid källan istället för att städa upp efteråt
