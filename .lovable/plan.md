

## Åtgärda "Order hittades inte" efter att ha skapat order

### Problemet

`useOrders` hooken har ett synkroniseringsfel mellan olika komponenter:

1. Varje komponent som anropar `useOrders()` skapar sin egen oberoende instans av state
2. När en order skapas i `CreateOrder` och vi navigerar till `OrderDetails`, har den nya sidan inte tillgång till den uppdaterade datan förrän localStorage laddats
3. Under initial rendering visar `OrderDetails` "Order hittades inte" eftersom `orders` är tom

### Lösning

Implementera en delad state-hantering genom att använda **React Context** för att dela ordrar mellan alla komponenter.

---

### Teknisk plan

#### Steg 1: Skapa en OrdersContext

Skapa en React Context som wrapprar hela appen och delar ordrar globalt.

**Ny fil: `src/contexts/OrdersContext.tsx`**
- Skapa context med Provider-komponent
- Flytta all orders-logik från `useOrders` till context
- Exportera en `useOrders` hook som använder context

#### Steg 2: Uppdatera `App.tsx`

Wrappa hela applikationen med `OrdersProvider` så att alla sidor delar samma state.

#### Steg 3: Hantera laddningstillstånd i `OrderDetails`

Visa en laddningsindikator medan orders laddas från localStorage, istället för direkt "Order hittades inte".

---

### Förväntade ändringar

| Fil | Åtgärd |
|-----|--------|
| `src/contexts/OrdersContext.tsx` | Ny fil - Context provider för orders |
| `src/hooks/useOrders.ts` | Uppdatera till att använda context |
| `src/App.tsx` | Wrappa med OrdersProvider |
| `src/pages/OrderDetails.tsx` | Lägg till laddningstillstånd |

