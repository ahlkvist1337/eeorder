
# Plan: Separera Helt Klara Ordrar till Egen Flik

## Sammanfattning
Skapa ett fliksystem på orderöversikten där "Aktuella ordrar" och "Orderhistorik" separeras. Ordrar med produktionsstatus "Avslutad" OCH faktureringsstatus "Fakturerad" flyttas automatiskt till historikfliken.

---

## Lösningsöversikt

### Flikar
1. **Aktuella ordrar** (standard) - Alla ordrar som INTE är helt klara
2. **Orderhistorik** - Ordrar med `productionStatus === 'completed'` OCH `billingStatus === 'billed'`

### Funktionalitet per flik
| Funktion | Aktuella ordrar | Orderhistorik |
|----------|-----------------|---------------|
| Sökfunktion | Ja | Ja |
| Statusfilter | Ja | Nej |
| Faktureringsfilter | Ja | Nej |
| Avvikelsefilter | Ja | Nej |
| Massredigering | Ja | Nej |

---

## Implementation

### Fil: `src/pages/Index.tsx`

1. **Lägg till Tabs-komponenten** från shadcn/ui
2. **Separera ordrar i två listor:**
   - `activeOrders` = ordrar där INTE (productionStatus === 'completed' OCH billingStatus === 'billed')
   - `archivedOrders` = ordrar där productionStatus === 'completed' OCH billingStatus === 'billed'

3. **Skapa två flikar:**
   - "Aktuella ordrar" med antal i parentes
   - "Orderhistorik" med antal i parentes

4. **Aktuella ordrar-fliken:**
   - Visar befintliga OrderFilters med alla filter
   - Visar BulkEditToolbar
   - Visar OrdersTable med activeOrders

5. **Orderhistorik-fliken:**
   - Visar endast sökfält (ingen full OrderFilters-komponent)
   - Inget BulkEditToolbar
   - Visar OrdersTable med archivedOrders (utan filter)

### Logik för orderseparering
```typescript
// I Index.tsx
const activeOrders = useMemo(() => 
  orders.filter(o => 
    !(o.productionStatus === 'completed' && o.billingStatus === 'billed')
  ), [orders]
);

const archivedOrders = useMemo(() => 
  orders.filter(o => 
    o.productionStatus === 'completed' && o.billingStatus === 'billed'
  ), [orders]
);
```

### UI-struktur
```
┌─────────────────────────────────────────────────────────────┐
│  Orderöversikt                      [Importera XML] [Ny order] │
│  X ordrar totalt                                              │
├─────────────────────────────────────────────────────────────┤
│  [Aktuella ordrar (25)]  [Orderhistorik (12)]                │
├─────────────────────────────────────────────────────────────┤
│  AKTUELLA:                                                   │
│  [Sökfält............] [Status ▼] [Fakturering ▼] [Avvikelse▼]│
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ Ordertabell med aktiva ordrar                           │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                              │
│  HISTORIK:                                                   │
│  [Sökfält..............................................]     │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ Ordertabell med arkiverade ordrar                       │ │
│  └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

---

## Ändringar per fil

### 1. `src/pages/Index.tsx`
- Importera `Tabs, TabsList, TabsTrigger, TabsContent` från `@/components/ui/tabs`
- Importera `useMemo` från React
- Lägg till `archiveSearchQuery` state för sökfältet i historikfliken
- Skapa `activeOrders` och `archivedOrders` med useMemo
- Wrap innehållet i Tabs-komponenten
- Flytta filter och tabell till TabsContent för "active"
- Skapa enkel sökvy för TabsContent "archive"

### 2. `src/components/OrdersTable.tsx`
- Lägg till ny prop `showFilters?: boolean` (default true)
- När `showFilters === false`, visa bara sök-funktionen internt
- Alternativt: Skapa en ny enkel tabell-prop eller skicka redan filtrerade ordrar

**Enklare approach:** Skicka redan filtrerade ordrar till OrdersTable och hantera filtrering i Index.tsx. OrdersTable behöver inga ändringar om vi filtrerar ordrar före vi skickar dem.

---

## Mobilvänligt
Tabs-komponenten från shadcn är redan responsiv och fungerar bra på mobil. Fliknamnen kommer att visas horisontellt och scrollas vid behov.

---

## Sammanfattning av påverkade filer
| Fil | Ändring |
|-----|---------|
| `src/pages/Index.tsx` | Lägg till fliksystem, separera ordrar, separat sökning för historik |
