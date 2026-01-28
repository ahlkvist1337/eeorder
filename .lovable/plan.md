

# Plan: Bulkandring i orderversikten (MVP)

## Oversikt

Implementera en funktion for att markera flera ordrar i orderoversikten och utfora massandringar pa tre enkla falt: produktionsstatus, faktureringsstatus och avvikelse (Ja/Nej).

## Anvandargranssnitt

### Selektionssystem i tabellen

1. **Ny kolumn for kryssrutor**
   - Lagg till en kryssrutekolumn langst till vanster i tabellen
   - Rubrikrad far en "markera alla"-kryssruta som valjer/avvaljer alla synliga (filtrerade) ordrar
   - Varje orderrad far en egen kryssruta
   - Klick pa kryssrutan ska INTE navigera till orderdetaljer (stoppa eventpropagering)

2. **Visuell indikering**
   - Markerade rader far en tydlig bakgrundsmarkering
   - Antal markerade ordrar visas tydligt i sidans header

### Bulkandringspanel

En verktygsfalt som visas NOR minst en order ar markerad:

```text
+------------------------------------------------------------------+
| [3 ordrar markerade]  [Produktionsstatus v] [Fakturering v]      |
|                       [Avvikelse: Ja/Nej]   [Rensa markering]    |
+------------------------------------------------------------------+
```

Panelen innehaller:
- Text som visar antal markerade ordrar
- Dropdown for produktionsstatus
- Dropdown for faktureringsstatus  
- Ja/Nej-knappar for avvikelse
- Knapp for att rensa markeringar

### Bekraftelsdialog

Nar anvandaren valjer ett nytt varde i nagon dropdown visas en bekraftelsedialog:

```text
+-----------------------------------------------+
|  Andra produktionsstatus                      |
|                                               |
|  Du ar pa vag att andra produktionsstatus     |
|  till "Startad" for 3 ordrar.                 |
|                                               |
|  [Avbryt]                [Genomfor andring]   |
+-----------------------------------------------+
```

## Tekniska andringar

### 1. Skapa ny komponent: `BulkEditToolbar.tsx`

Ny komponent som visar:
- Antal markerade ordrar
- Dropdowns for produktionsstatus och faktureringsstatus
- Knappar for avvikelse Ja/Nej
- Knapp for att rensa markering

### 2. Skapa ny komponent: `BulkEditConfirmDialog.tsx`

Bekraftelsedialog som visar:
- Vilken andring som ska goras
- Hur manga ordrar som paverkas
- Bekrafta/Avbryt-knappar

### 3. Uppdatera `OrdersContext.tsx`

Lagg till en ny funktion for bulkuppdatering:

```typescript
bulkUpdateOrders: (
  orderIds: string[], 
  updates: {
    productionStatus?: ProductionStatus;
    billingStatus?: BillingStatus;
    hasDeviation?: boolean;
  }
) => Promise<void>
```

Denna funktion:
- Uppdaterar alla valda ordrar i en batch
- For produktionsstatus: skapar statushistorik for varje order
- Anropar `refreshOrders()` efter andringen

### 4. Uppdatera `OrdersTable.tsx`

Andringar:
- Lagg till state for `selectedOrderIds: Set<string>`
- Lagg till kryssrutekolumn i tabellhuvud och rader
- Stoppa navigation vid klick pa kryssruta
- Skicka `selectedOrderIds` och `onSelectionChange` som props till foraldern

### 5. Uppdatera `Index.tsx`

Andringar:
- Hantera state for markerade ordrar
- Visa `BulkEditToolbar` nar minst en order ar markerad
- Hantera bekraftelsedialog
- Anropa `bulkUpdateOrders` vid bekraftad andring

## Filstruktur

```text
src/
  components/
    BulkEditToolbar.tsx      (NY)
    BulkEditConfirmDialog.tsx (NY)
    OrdersTable.tsx          (UPPDATERA)
  contexts/
    OrdersContext.tsx        (UPPDATERA)
  pages/
    Index.tsx                (UPPDATERA)
```

## Ej inkluderat (enligt MVP-specifikation)

- Andring av stegstatus per steg
- Andring av datum/tider per steg
- Andring av priser eller ekonomiska varden
- Andring av avvikelsekommentarer eller annan fritext

