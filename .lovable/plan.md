

# Plan: PDF-forhandsvisning och stegstatushistorik

## Oversikt

Implementera tva funktioner:
1. PDF-forhandsvisning i filbilagor - visa PDF-filer direkt i en inbaddad visare
2. Statushistorik for behandlingssteg - spara och visa nar steg byter status

## Del 1: PDF-forhandsvisning

### Anvandargranssnitt

PDF-filer visas med en inbaddad forhandsvisning istallet for en generisk filikon:

```text
+---------------------------+
|  [PDF Forhandsvisning]    |
|  +---------+              |
|  |  PDF    |  filnamn.pdf |
|  |  ikon   |  150 KB      |
|  +---------+  [Ladda ner] [Ta bort]
+---------------------------+
```

Nar anvandaren klickar pa PDF-forhandsvisningen oppnas PDF:en i fullskarm eller i en modal.

### Tekniska andringar

**Uppdatera `OrderAttachments.tsx`:**
- Lagg till en `isPdf(mimeType)` hjalpfunktion
- For PDF-filer: visa en miniatyr med PDF-ikon och mojlighet att oppna i ny flik
- Alternativt: lagg till en "Forhandsvisa"-knapp som oppnar PDF i en iframe/modal

## Del 2: Statushistorik for behandlingssteg

### Databasschema

Skapa en ny tabell for att spara stegstatusandringar:

```sql
CREATE TABLE public.step_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  step_id UUID NOT NULL,
  step_name TEXT NOT NULL,
  from_status step_status NOT NULL,
  to_status step_status NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);
```

### Anvandargranssnitt

Visa stegstatushistorik pa hoger sida av orderstatushistoriken i ett kompakt format:

```text
+---------------------------------------------------------------+
| Statushistorik                                                |
|                                         Steghistorik          |
| 28 jan 2026 15:11  [Skapad] -> [Startad]   Blastring: Klar   |
| 28 jan 2026 14:51  [Planerad] -> [Startad] Malning: Pagaende  |
+---------------------------------------------------------------+
```

Formatet blir kompakt med stegnamn + ny status pa samma rad, utan pilar for stegen.

### Tekniska andringar

**1. Skapa databasmigrering**
- Ny tabell `step_status_history` med RLS-policy

**2. Uppdatera types (`src/types/order.ts`)**
- Lagg till `StepStatusChange` interface
- Utoka `Order` med `stepStatusHistory: StepStatusChange[]`

**3. Uppdatera `OrdersContext.tsx`**
- Hamta `step_status_history` tillsammans med annan orderdata
- Nar ett steg byter status via `updateOrderStep` eller `updateOrder` (steps), logga andringen

**4. Uppdatera `OrderDetails.tsx`**
- Visa stegstatushistorik pa hoger sida av befintlig statushistorik
- Anvand tvaspalt-layout inom statushistorik-kortet
- Kompakt visning: `{stepName}: {newStatus}`

**5. Skapa `StepStatusBadge` (redan finns)**
- Ateranvand befintlig komponent for att visa stegstatus

## Filstruktur

```text
supabase/
  migrations/
    XXXXX_step_status_history.sql  (NY)

src/
  types/
    order.ts                       (UPPDATERA)
  contexts/
    OrdersContext.tsx              (UPPDATERA)
  components/
    OrderAttachments.tsx           (UPPDATERA)
  pages/
    OrderDetails.tsx               (UPPDATERA)
```

## Teknisk detaljplan

### Steg 1: Databasmigrering
```sql
-- Skapa tabell for stegstatushistorik
CREATE TABLE public.step_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL,
  step_id UUID NOT NULL,
  step_name TEXT NOT NULL,
  from_status step_status NOT NULL,
  to_status step_status NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Aktivera RLS
ALTER TABLE public.step_status_history ENABLE ROW LEVEL SECURITY;

-- Policy for alla operationer (ingen auth)
CREATE POLICY "Allow all operations on step_status_history"
ON public.step_status_history FOR ALL USING (true) WITH CHECK (true);
```

### Steg 2: Typdefinitioner
```typescript
// Ny typ i types/order.ts
interface StepStatusChange {
  id: string;
  timestamp: string;
  stepId: string;
  stepName: string;
  fromStatus: StepStatus;
  toStatus: StepStatus;
}

// Utoka Order interface
interface Order {
  // ...befintliga falt
  stepStatusHistory: StepStatusChange[];
}
```

### Steg 3: Context-uppdateringar
- Hamta `step_status_history` i `fetchOrders()`
- I `updateOrderStep()`: om status andras, lagg till i historiktabellen
- I `updateOrder()` (nar steps uppdateras): jamfor gamla och nya steg, logga statusandringar

### Steg 4: PDF-forhandsvisning
```typescript
const isPdf = (mimeType: string) => mimeType === 'application/pdf';

// I renderingen:
{isPdf(attachment.mime_type) ? (
  <a href={url} target="_blank" className="...">
    <FileText className="h-6 w-6 text-red-600" />
    <span className="text-xs">PDF</span>
  </a>
) : isImage(attachment.mime_type) ? (
  // befintlig bildforhandsvisning
) : (
  // generisk filikon
)}
```

### Steg 5: UI for steghistorik
Visa steghistorik i en separat sektion till hoger om orderhistoriken, alternativt som en egen lista under orderhistoriken med kompakt formatering.

