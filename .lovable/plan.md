

# Ändra: Billing-trigger kräver "Levererat" (inte bara "Klar")

## Problem
Nuvarande logik i `OrdersContext.tsx` (rad 1935) räknar `completed`, `packed` och `delivered` som "klara" statusar för att trigga `ready_for_billing`. Användaren vill att billing_status bara sätts när alla objekt i enheten är **Levererat** (`delivered`).

## Ändring

### `src/contexts/OrdersContext.tsx` (rad 1935)
Ändra `finishedObjStatuses` från `['completed', 'packed', 'delivered']` till `['delivered']`:

```typescript
const finishedObjStatuses = ['delivered'];
```

En rad. Resten av logiken (check, db-uppdatering, lokal state) förblir identisk.

| Fil | Ändring |
|-----|---------|
| `src/contexts/OrdersContext.tsx` | `finishedObjStatuses = ['delivered']` (rad 1935) |

