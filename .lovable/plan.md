
## Målet
Fixa “Tredje gången gilt”: när du väljer ett behandlingssteg i rullistan för ett objekt och klickar **Lägg till** ska steget faktiskt sparas och ligga kvar på objektet.

## Vad som faktiskt är fel (root cause)
Problemet sitter inte (primärt) i dropdownen längre – det sitter i hur vi **sparar till databasen** i `updateOrder(...)`.

Just nu händer detta när du lägger till ett steg i ett objekt i orderdetaljvyn:

1. `OrderObjectsEditor` lägger till steget i listan och anropar `onStepsChange(newSteps)`
2. `OrderDetails` anropar `updateOrder(orderId, { objects: ..., steps: newSteps })`
3. `updateOrder` gör:
   - `DELETE FROM order_steps WHERE order_id = ...`
   - `INSERT INTO order_steps (...)` (inkl. det nya steget med `object_id`)
   - **sedan**: `DELETE FROM order_objects WHERE order_id = ...`
   - `INSERT INTO order_objects (...)`

Eftersom `order_steps.object_id` har **ON DELETE CASCADE** mot `order_objects`, så raderas alla steg som pekar på objektet när objekten tas bort – alltså raderas ditt nyligen insatta steg igen. Efter `fetchOrders()` ser du att inget har “lagts till”.

Dessutom gör `OrderDetails` idag att objekt- och steguppdateringar kan skickas i **osynk** (två separata callbacks), vilket ökar risken för att vi sparar “fel kombination” (gamla objekt + nya steg, etc).

## Lösning (vad vi ändrar)
Vi gör sparlogiken robust så att:
- Vi **aldrig** mass-raderar `order_objects` vid “vanliga” uppdateringar (t.ex. lägga till steg eller byta namn på objekt).
- När både objekt och steg sparas samtidigt, sker det i rätt ordning så att vi inte råkar trigga cascade-delete på nyinsatta steg.
- `OrderDetails` sparar **en konsekvent** (objects+steps) snapshot, gärna batchat/debouncat.

---

## Ändringar vi kommer göra (konkret)

### 1) Fixa `updateOrder` i `src/contexts/OrdersContext.tsx`
**Nuvarande fel:** “delete-all-objects + insert” gör att steps i objekt försvinner pga cascade.

**Ny strategi:**
- När `updates.objects` finns:
  1. Hämta `currentOrder` från context (finns redan).
  2. Räkna ut diff:
     - `removedObjectIds = currentOrder.objects ids som inte finns i updates.objects`
     - `upsertObjects = updates.objects` (alla som ska finnas kvar / uppdateras)
  3. **Upsert** objekten istället för delete-all:
     - `supabase.from('order_objects').upsert([...], { onConflict: 'id' })`
     - Detta uppdaterar namn/description utan att radera rader => inga cascade deletes.
  4. Om det finns borttagna objekt:
     - (valfritt men korrekt) radera borttagna objekt med `.delete().in('id', removedObjectIds)`  
       - OBS: detta kommer radera tillhörande steps via cascade, vilket är önskat när objekt tas bort.

- När `updates.steps` finns:
  - Vi kan fortsätta med “delete all steps + insert”, men:
    - Om `updates.objects` också finns: kör objekt-upsert (och ev. objekt-delete) **innan** vi insertar steps.
    - Då finns objekten kvar när vi skapar steps, och vi raderar inte objekten efteråt.

**Resultat:** steg som läggs till på objekt ligger kvar efter save + refresh.

---

### 2) Fixa hur `OrderDetails` skickar objects/steps till save (src/pages/OrderDetails.tsx)
**Nuvarande problem:** `OrderObjectsEditor` har två separata callbacks, och `OrderDetails` skickar ibland “order.objects + newSteps” respektive “newObjects + order.steps”. Det kan bli osynk/race.

**Ny strategi i OrderDetails:**
- Inför lokal “draft state”:
  - `const [draftObjects, setDraftObjects] = useState(order.objects || [])`
  - `const [draftSteps, setDraftSteps] = useState(order.steps)`
- Synka draft när order laddas/ändras.
- Skicka `draftObjects` + `draftSteps` in i `OrderObjectsEditor` (istället för direkt `order.objects/order.steps`).
- När editor ändrar något:
  - uppdatera draft state
  - kör en **debouncad** save (t.ex. 150–300ms) som alltid skickar *senaste* `{ objects: draftObjects, steps: draftSteps }` i en och samma `updateOrder(...)`.

**Extra:** Om `updateOrder` misslyckas visar vi en tydlig `toast.error(...)` istället för att bara logga i console, så du direkt ser om något inte sparats.

---

### 3) Stabilitet i dropdownen (src/components/OrderObjectsEditor.tsx)
Detta är sekundärt till den riktiga buggen ovan, men vi gör det stabilt:
- Se till att Select är konsekvent “controlled” (undvika uncontrolled/controlled-varningen):
  - använd alltid en string som `value` (t.ex. `selectedTemplates[obj.id] ?? ''`) istället för `undefined`.
- Sätt `type="button"` på “Lägg till”-knappen för att framtidssäkra om komponenten skulle hamna i en `<form>`.

---

## Filer som ändras
1. `src/contexts/OrdersContext.tsx`  
   - Byt ut objekt-hanteringen i `updateOrder` från “delete all + insert” till diff + upsert (+ delete removed).
   - Säkerställ ordning: objects först, steps sen (när båda uppdateras).

2. `src/pages/OrderDetails.tsx`  
   - Inför draft state för `objects/steps`.
   - Debounce/batch save till `updateOrder`.
   - Tydliga toasts vid fel.

3. `src/components/OrderObjectsEditor.tsx`  
   - Stabil controlled Select value.
   - `type="button"` på Add-knapp.

---

## Testplan (som jag kommer köra efter ändringen)
1. Öppna order `/order/d10ee...` (din nuvarande).
2. Välj objekt → välj behandlingssteg i dropdown → klicka **Lägg till**.
   - Förväntat: steget visas direkt i listan och ligger kvar efter att sidan uppdaterar data.
3. Uppdatera sidan (hard refresh).
   - Förväntat: steget finns kvar på objektet.
4. Lägg till samma behandlingssteg på ett annat objekt.
   - Förväntat: fungerar (dubbletter tillåtna mellan objekt).
5. Byt namn på ett objekt.
   - Förväntat: alla dess steg ligger kvar.
6. Ta bort ett objekt (om du har rätt behörighet).
   - Förväntat: objektet tas bort och dess steg försvinner.

---

## Varför detta kommer lösa det “på riktigt”
Vi tar bort den underliggande orsaken (cascade-delete pga fel sparordning + delete-all objects) och gör sparningen deterministisk, istället för att försöka “lappa” UI-staten i dropdownen. Det gör att funktionen blir stabil även när du gör flera ändringar snabbt.
