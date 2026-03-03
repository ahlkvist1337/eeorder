

# Plan: Historik med vem som gjorde ändringen

## Problem

Historiken loggar steg-ändringar och enhetshändelser men sparar inte **vem** som gjorde ändringen. Det behövs initialer (t.ex. "JD") för varje händelse.

## Lösning

### 1. Lägg till `changed_by`-kolumn i historiktabellerna

Databasmigration som lägger till `changed_by_name text` i:
- `truck_status_history` — steg-statusändringar
- `truck_lifecycle_events` — enhetshändelser (ankomst, start, klar, packat, etc.)

Använder `text` med initialer/namn, inte FK till `auth.users`, för att undvika RLS-komplikationer och göra det enkelt att visa.

### 2. Skicka med initialer vid loggning

**`OrdersContext.tsx`**: I `updateUnitStepStatus` och `updateUnitStatus` — hämta `profile.full_name` från `useAuth()` och extrahera initialer (t.ex. "Johan Doe" → "JD"). Skicka med som `changed_by_name` vid insert.

Initials-funktion:
```
"Johan Doe" → "JD"
"Anna" → "AN"
null → "?"
```

### 3. Visa initialer i historik-tidslinjen

**`OrderDetails.tsx`**: Läs `changed_by_name` från historikdata och visa bredvid tidsstämpeln:

```
● 3 mar 12:03  Blästring: Klar  JD
```

### 4. Inkludera `changed_by_name` i fetch

**`OrdersContext.tsx`**: Uppdatera fetch-queries för `truck_status_history` och `truck_lifecycle_events` att inkludera det nya fältet, och mappa det till TypeScript-typerna.

## Påverkade filer

| Fil | Ändring |
|-----|---------|
| Migration SQL | `ALTER TABLE` — lägg till `changed_by_name text` |
| `src/contexts/OrdersContext.tsx` | Skicka initialer vid insert, fetcha fältet |
| `src/pages/OrderDetails.tsx` | Visa initialer i historik |
| `src/types/order.ts` | Lägg till `changedByName?` i historik-interfaces |

