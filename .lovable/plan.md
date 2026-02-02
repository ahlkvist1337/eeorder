
# Plan: Bulk-export av fakturaunderlag

## Sammanfattning

Bygger ut det befintliga bulk-urvalet med möjlighet att exportera fakturaunderlag i PDF och/eller Excel för ordrar som är "Klar för fakturering".

---

## Nuvarande system (bevaras)

| Komponent | Funktion |
|-----------|----------|
| `Index.tsx` | Hanterar bulk-urval med `selectedOrderIds` |
| `BulkEditToolbar.tsx` | Visar åtgärder för valda ordrar |
| `OrdersTable.tsx` | Checkbox-urval och filtrering |
| `exportExcel.ts` | Befintlig CSV-export för prislistan |

---

## Nya komponenter och filer

### 1. Export-funktion i `BulkEditToolbar.tsx`

Lägg till en "Exportera fakturaunderlag"-knapp som:
- Endast är aktiv när **alla valda ordrar** har `billingStatus === 'ready_for_billing'`
- Öppnar en dialog för formatval

### 2. Ny dialog: `InvoiceExportDialog.tsx`

Formatval och bekräftelse:

```text
┌─────────────────────────────────────────┐
│ Exportera fakturaunderlag               │
│                                         │
│ 3 ordrar valda                          │
│ Totalt: 45 600 kr                       │
│                                         │
│ Format:                                 │
│ ☑ PDF (för granskning och utskick)      │
│ ☑ Excel (för ekonomi/import)            │
│                                         │
│        [Avbryt]  [Exportera]            │
└─────────────────────────────────────────┘
```

### 3. Ny lib: `src/lib/invoiceExport.ts`

Logik för att generera fakturaunderlag:

**Interface:**
```typescript
interface InvoiceExportOrder {
  orderNumber: string;
  customer: string;
  customerReference?: string;
  completedDate?: string;  // actualEnd eller plannedEnd
  articleRows: {
    partNumber: string;
    text: string;
    quantity: number;
    price: number;
    total: number;
  }[];
  orderTotal: number;
}

interface InvoiceExportData {
  exportId: string;           // Ex: "EXP-20260202-001"
  exportDate: string;
  orders: InvoiceExportOrder[];
  grandTotal: number;
}
```

### 4. Excel-export

Maskinvänlig enradsformat per artikelrad:

| Ordernummer | Kund | Kundreferens | Artikelnr | Benämning | Antal | Pris | Summa |
|-------------|------|--------------|-----------|-----------|-------|------|-------|
| 12345 | Volvo | REF-001 | 100-200 | Blästring motorlåda | 3 | 450 | 1350 |
| 12345 | Volvo | REF-001 | 100-201 | Lackering | 3 | 800 | 2400 |
| 12346 | Scania | SC-2024 | 100-200 | Blästring | 1 | 450 | 450 |

Sista raden innehåller totalsumma.

### 5. PDF-export med jsPDF

Installera `jspdf` och `jspdf-autotable` för tabellrendering.

**PDF-layout:**

```text
┌────────────────────────────────────────────────────┐
│                 FAKTURAUNDERLAG                     │
│                                                     │
│ Export-ID: EXP-20260202-001                        │
│ Exportdatum: 2 feb 2026                            │
│                                                     │
│ ═══════════════════════════════════════════════════│
│                                                     │
│ Order: 12345                                        │
│ Kund: Volvo AB                                      │
│ Referens: REF-001                                   │
│ Klart: 28 jan 2026                                 │
│                                                     │
│ Artikel     Benämning           Antal   Pris   Sum │
│ ─────────────────────────────────────────────────  │
│ 100-200     Blästring motorlåda    3    450  1350  │
│ 100-201     Lackering motorlåda    3    800  2400  │
│                                                     │
│                          Ordersumma:     3 750 kr   │
│                                                     │
│ ═══════════════════════════════════════════════════│
│                                                     │
│ Order: 12346                                        │
│ ...                                                 │
│                                                     │
│ ═══════════════════════════════════════════════════│
│                                                     │
│                     TOTALT: 45 600 kr              │
│                                                     │
└────────────────────────────────────────────────────┘
```

---

## Tekniska ändringar

### Nya filer

| Fil | Beskrivning |
|-----|-------------|
| `src/lib/invoiceExport.ts` | Dataförberedelse och export-ID-generering |
| `src/lib/invoiceExportPdf.ts` | PDF-generering med jsPDF |
| `src/lib/invoiceExportExcel.ts` | Excel/CSV-generering |
| `src/components/InvoiceExportDialog.tsx` | Dialog för formatval |

### Ändrade filer

| Fil | Ändring |
|-----|---------|
| `src/components/BulkEditToolbar.tsx` | Lägg till export-knapp och props |
| `src/pages/Index.tsx` | Koppla export-funktionen till state |
| `package.json` | Lägg till `jspdf` och `jspdf-autotable` |

---

## Flöde

```text
Användare markerar 3 ordrar med status "Klar för fakturering"
    ↓
Klickar "Exportera fakturaunderlag" i toolbar
    ↓
Dialog öppnas med sammanfattning och formatval
    ↓
Väljer PDF + Excel → klickar "Exportera"
    ↓
1. Generera export-ID: "EXP-20260202-001"
2. Hämta artikelrader för valda ordrar
3. Filtrera bort: trucknummer, steg, historik, kommentarer
4. Generera PDF och ladda ner
5. Generera Excel och ladda ner
    ↓
Toast: "Fakturaunderlag exporterat (3 ordrar)"
```

---

## Validering och begränsningar

**Kontroller vid export:**
1. Minst en order måste vara vald
2. Alla valda ordrar måste ha `billingStatus === 'ready_for_billing'`
3. Ordrar utan artikelrader inkluderas men markeras tydligt

**Vad som INTE inkluderas:**
- Trucknummer / arbetsenheter
- Produktionsstatus
- Behandlingssteg och historik
- Interna kommentarer
- Avvikelsedetaljer

---

## Beroenden

Nya npm-paket:
- `jspdf` - PDF-generering
- `jspdf-autotable` - Tabeller i PDF

---

## Exempeldata Excel

```csv
Export-ID;Exportdatum;Ordernummer;Kund;Kundreferens;Artikelnr;Benämning;Antal;Pris;Summa
EXP-20260202-001;2026-02-02;12345;Volvo AB;REF-001;100-200;Blästring motorlåda;3;450;1350
EXP-20260202-001;2026-02-02;12345;Volvo AB;REF-001;100-201;Lackering;3;800;2400
EXP-20260202-001;2026-02-02;12346;Scania;SC-2024;100-200;Blästring;1;450;450
;;;;;;;;TOTALT:;4200
```

---

## Sammanfattning

| Vad | Hur |
|-----|-----|
| Urval | Befintligt checkbox-system i `OrdersTable` |
| Validering | Endast "Klar för fakturering" kan exporteras |
| PDF | jsPDF med sammanfattning + per order |
| Excel | En rad per artikelrad, maskinvänlig |
| Spårbarhet | Export-ID + datum i varje fil |
| Avgränsningar | Endast ekonomiskt relevant data |
