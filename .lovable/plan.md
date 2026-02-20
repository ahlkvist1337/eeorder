
# Projektkoll – Sammanfattning

## Vad som fungerar bra

Applikationen är välstrukturerad och har en solid grund:
- Databaslagret (OrdersContext) är komplex men välorganiserat med optimistisk uppdatering och debounce-logik för realtid
- RLS-policyer är genomtänkta och konsekventa
- Responsiv design för både desktop och mobil finns på de flesta sidor
- Produktionsskärmen med DnD-sortering fungerar korrekt
- Rollbaserad åtkomst är konsekvent implementerad

---

## Problem & förbättringsförslag

### 1. Döda kod / oanvändbar komponent

**`src/components/NavLink.tsx`** är en wrapper för `react-router-dom`s `NavLink`, men används **ingenstans** i projektet. `Layout.tsx` använder istället direkt `<Link>`. Filen kan tas bort.

### 2. Bugg: `useAuth()` anropas felaktigt inuti en eventhandler i Layout

I `src/components/Layout.tsx` rad 36–38 finns detta:
```typescript
const handleSignOut = async () => {
  const { signOut } = useAuth();  // ← FEL! Hooks kan inte anropas inuti funktioner
  await signOut();
```
Detta bryter mot React hooks-reglerna. Det kompilerar och verkar funka eftersom `signOut` definieras korrekt på rad 95 (`const { signOut } = useAuth();`), men den defekta `handleSignOut`-funktionen existerar och kan potentiellt orsaka problem. Den oanvända `handleSignOut`-funktionen bör tas bort – `handleSignOutClick` (rad 97–100) är den korrekta versionen.

### 3. Inkonsekvent lösenordskravsbeskrivning i AdminPanel

I `src/pages/AdminPanel.tsx` visas `"Minst 6 tecken"` som placeholder för lösenordsfältet (rad 398), men `create-user` edge function kräver **minst 8 tecken** efter den senaste säkerhetsförbättringen. Detta är ett UI-fel som kan förvirra admins.

**Fix:** Ändra placeholder och ev. valideringsfeedback till "Minst 8 tecken".

### 4. `is_active`-flaggan blockerar inte inloggning

I `AdminPanel` kan admin inaktivera en användare (`is_active = false` i `profiles`-tabellen), men autentiseringen i `AuthContext` kontrollerar **aldrig** denna flagga. En inaktiverad användare kan alltså fortfarande logga in och använda systemet fullt ut.

För att åtgärda detta korrekt behövs en kontroll i `AuthContext`s `onAuthStateChange` – om `profile.is_active === false`, kör `signOut()` direkt.

### 5. `useProductionStats` gör dubbla databas-fetcher

`useProductionStats.ts` hämtar `orders` separat (`supabase.from('orders').select('id, planned_end')`), trots att `OrdersContext` redan har alla ordrar i minnet. Statistiksidan importerar dessutom `useOrders()` direkt **och** `useProductionStats()` – data hämtas alltså från databasen två gånger för ordrarna.

**Fix:** Skicka in de redan laddade ordrarna som parameter till `useProductionStats`, eller refaktorera den så att den tar emot `orders: Order[]` som input istället för att hämta på nytt.

### 6. `handleDelete` i OrderDetails använder `confirm()` (native browser dialog)

`confirm('Är du säker...')` på rad 169 ger en ful och blockerande browser-dialog. Applikationen har redan `AlertDialog` från Radix UI. Konsekvensvärdet för att ta bort en hel order är högt – detta bör ersättas med ett riktig `AlertDialog`.

### 7. Historik-sektionen i OrderDetails visar dubbletter

Historikkortet "Historik per arbetskort" på OrderDetails (rad 444–536) kombinerar `truckStatusHistory` (steg-statusändringar) och `truckLifecycleEvents`. Problemet är att step-events kan dyka upp **i båda listorna** – en `step_started/step_completed`-händelse loggas både i `truck_status_history` OCH i `truck_lifecycle_events` (om lifecycle events också skrivs för steg). Beroende på implementationen kan samma händelse visas dubbelt i UI:t. Bör ses över och dedupliceras.

### 8. `fetchOrders` vid varje liten statusuppdatering

I `updateProductionStatus` och `updateBillingStatus` (rad 875 resp. 886 i OrdersContext) anropas `fetchOrders()` – en fullständig re-fetch av **alla** ordrar från databasen. Jämfört med `updateTruckStatus` och `updateTruckStepStatus` som gör optimistisk lokal uppdatering. Dessa bör uppgraderas till optimistisk uppdatering + `fetchOrders` i bakgrunden för bättre UX.

### 9. Sortering av ordrar i OrdersTable: ordernummer sorteras som text

I `OrdersTable` sorteras ordernummer som strängar (rad 88–89). Om ordernummer är numeriska (t.ex. "1000", "999", "1001") sorteras de fel: "1000" < "999" när man sorterar alfabetiskt. Om ordernumren är numeriska bör sorteringen konvertera till tal.

### 10. Ingen "is_active"-check i nav-menyns länksynlighet

En inaktiverad användare (`is_active: false`) kan se alla menylänkar och sidor lika som en aktiv användare (se punkt 4). Hänger ihop med punkt 4.

---

## Tekniska åtgärder (prioritetsordning)

| Prioritet | Åtgärd | Fil |
|-----------|--------|-----|
| Hög | Fixa `is_active` blockerar inte inloggning | `AuthContext.tsx` |
| Hög | Fixa lösenordsplaceholder (6→8 tecken) | `AdminPanel.tsx` |
| Hög | Ta bort buggy `handleSignOut` i Layout | `Layout.tsx` |
| Medium | Ersätt `confirm()` med AlertDialog för borttagning av order | `OrderDetails.tsx` |
| Medium | Ta bort oanvänd `NavLink.tsx` | `NavLink.tsx` |
| Låg | Refaktorera `useProductionStats` att inte göra egen orders-fetch | `useProductionStats.ts` |
| Låg | Kontrollera/deduplicera historik-sektionen | `OrderDetails.tsx` |
| Låg | Numerisk sortering av ordernummer | `OrdersTable.tsx` |

---

## Inga allvarliga fel hittades i

- RLS-policyer (korrekt och täckande)
- Realtidslogiken (korrekt debounce)
- Exportfunktionerna (PDF, Excel, CSV)
- Produktionsskärmen och DnD-logiken
- XML-importen
- Formulärvalidering på skapandeformulär
- Edge functions (hanterar auth + validering korrekt)

