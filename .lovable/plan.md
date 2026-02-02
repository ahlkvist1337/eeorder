
# Plan: Fixa XML-import av ordrar

## Identifierade problem

### Problem 1: Foreign key-fel vid skapande av arbetskort
**Rotorsak:** I `addOrder` skapas `truck_step_status` (rad 413-427) **innan** `order_steps` skapas (rad 437-453). Detta orsakar ett "foreign key constraint violation" eftersom `truck_step_status.step_id` refererar till `order_steps.id`.

**Konsekvens:** 
- Ordern skapas framgångsrikt
- Objekt och trucks skapas framgångsrikt
- truck_step_status misslyckas → exception kastas
- Steps och article rows skapas aldrig
- Användaren ser "kunde inte skapa ordern" men ordern finns redan i databasen

### Problem 2: Datum parsas inte korrekt från XML
**Rotorsak:** XML-parsern läser `orderDate` och `deliveryDate` som råtext från XML-filen. Dessa datum skickas direkt till databasen utan formatkonvertering.

Monitor ERP kan använda olika datumformat som kanske inte är kompatibla med PostgreSQL `timestamp with time zone`.

---

## Lösning

### Fix 1: Ändra ordningen i addOrder

Flytta insättning av `order_steps` **FÖRE** insättning av `truck_step_status`:

```text
Nuvarande ordning:
1. orders ✓
2. order_objects ✓
3. object_trucks ✓
4. truck_step_status ❌ (step_id finns inte ännu)
5. order_steps (körs aldrig)
6. article_rows (körs aldrig)

Ny ordning:
1. orders
2. order_objects
3. order_steps ← FLYTTA UPP
4. object_trucks
5. truck_step_status ← Nu finns step_id
6. article_rows
```

### Fix 2: Normalisera datumformat

Skapa en hjälpfunktion som konverterar datum från XML till ISO 8601-format:

```typescript
function normalizeDate(dateString: string | undefined): string | null {
  if (!dateString) return null;
  
  // Försök tolka olika format
  const date = new Date(dateString);
  if (!isNaN(date.getTime())) {
    return date.toISOString();
  }
  
  // Om det inte går att tolka, returnera null
  return null;
}
```

Använd denna i `handleXmlSubmit` för att normalisera `plannedStart` och `plannedEnd`.

---

## Filändringar

| Fil | Ändring |
|-----|---------|
| `src/contexts/OrdersContext.tsx` | I `addOrder`: Flytta insättning av `order_steps` före `object_trucks` och `truck_step_status` |
| `src/pages/CreateOrder.tsx` | I `handleXmlSubmit`: Lägg till datumnormalisering för `plannedStart` och `plannedEnd` |
| `src/lib/xmlParser.ts` | (Valfritt) Förbättra datumparsning för att hantera fler format |

---

## Tekniska detaljer

### Ändring i OrdersContext.tsx (addOrder-funktionen)

Nuvarande struktur (rad 384-472):
```text
1. Insert order (352-380)
2. Insert objects if any (386-398)
3. Insert trucks for each object (401-428)
   - Inkluderar truck_step_status (413-427) ← PROBLEM
4. Insert steps if any (437-453)
5. Insert article rows if any (457-471)
```

Ny struktur:
```text
1. Insert order
2. Insert objects if any
3. Insert steps if any ← FLYTTA UPP
4. Insert trucks for each object
   - Inkluderar truck_step_status ← Nu fungerar FK
5. Insert article rows if any
```

### Ändring i CreateOrder.tsx (handleXmlSubmit)

Lägg till normalisering innan order skapas:
```typescript
// Normalisera datum från XML
const normalizeDate = (dateStr: string | undefined): string | undefined => {
  if (!dateStr) return undefined;
  const date = new Date(dateStr);
  return !isNaN(date.getTime()) ? date.toISOString() : undefined;
};

const newOrder = {
  // ...
  plannedStart: normalizeDate(parsedXml.orderDate),
  plannedEnd: normalizeDate(parsedXml.deliveryDate),
  // ...
};
```

---

## Resultat efter fix

| Scenario | Före | Efter |
|----------|------|-------|
| XML-import med objekt + steg + arbetskort | Order skapas utan steg/artiklar | Komplett order skapas |
| Datum från XML | Kan misslyckas beroende på format | Normaliseras till ISO 8601 |
| Felhantering | Vilseledande "kunde inte skapa" | Korrekt beteende eller tydligt fel |
