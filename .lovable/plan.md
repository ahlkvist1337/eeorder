
# Delleverans med avräkningsstöd i fakturering

## Problemet

Nuvarande fakturering exporterar ALLA artikelrader för en order. Med delleveranser behövs:
1. Exportera fakturaunderlag enbart för de arbetskort som levereras nu
2. Spara vad som redan fakturerats
3. Vid nästa fakturering: automatiskt räkna av det som redan fakturerats, så inget dubbelfaktureras

## Lösning: Proportionell avräkning via arbetskort

Artikelrader kopplas till objekt via `object_id` (redan implementerat i databasen). Varje objekt har N arbetskort. Fakturabeloppet beräknas proportionellt:

```text
Exempel:
  Artikelrad: "Gaffelvagn SWE120L" qty=5, pris=3200, totalt=16 000 kr
  Objekt har 5 arbetskort

  Delleverans 1: 3 arbetskort levererade och klara for fakturering
    -> Fakturerar: 3/5 x 16 000 = 9 600 kr
    -> Markeras som "billed"

  Delleverans 2: 2 kvarvarande arbetskort levererade
    -> Fakturerar: 2/5 x 16 000 = 6 400 kr
    -> Totalt fakturerat: 16 000 kr (stämmer!)
```

## Databasändringar

### 1. Utöka truck_status enum
```sql
ALTER TYPE truck_status ADD VALUE 'packed';
ALTER TYPE truck_status ADD VALUE 'delivered';
```

### 2. Billing-status per arbetskort
```sql
CREATE TYPE truck_billing_status AS ENUM ('not_billable', 'ready_for_billing', 'billed');
ALTER TABLE object_trucks ADD COLUMN billing_status truck_billing_status NOT NULL DEFAULT 'not_billable';
```

### 3. Spåra faktureringshistorik (för avräkning)
```sql
CREATE TABLE invoice_exports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  export_id text NOT NULL,          -- EXP-20260225-ABC
  exported_at timestamptz NOT NULL DEFAULT now(),
  exported_by uuid NOT NULL,
  total_amount numeric NOT NULL DEFAULT 0
);

CREATE TABLE invoice_export_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_export_id uuid NOT NULL REFERENCES invoice_exports(id),
  order_id uuid NOT NULL,
  truck_id uuid NOT NULL,           -- vilket arbetskort som fakturerades
  article_row_id uuid,              -- kopplad artikelrad
  billed_quantity numeric NOT NULL,  -- fakturerad andel av qty
  billed_amount numeric NOT NULL,    -- fakturerat belopp
  created_at timestamptz NOT NULL DEFAULT now()
);
```

Detta ger full spårbarhet: man kan alltid se exakt vilka arbetskort som ingick i vilken faktura.

## Fakturaexport -- nytt flöde

### Steg 1: Välj vad som ska faktureras

I stället för att välja hela ordrar, kan användaren nu:
- **Alternativ A**: Välja specifika arbetskort (de som har `billing_status = ready_for_billing`)
- **Alternativ B**: Välja en order och systemet inkluderar automatiskt alla `ready_for_billing`-kort

### Steg 2: Beräkna belopp med avräkning

För varje artikelrad kopplad till ett objekt:
```text
redan_fakturerat = SUM(billed_quantity) FROM invoice_export_items WHERE article_row_id = X
kvarvarande_qty = artikelrad.quantity - redan_fakturerat
kort_att_fakturera = antal ready_for_billing kort i detta objekt
totalt_kort = totalt antal kort i objektet
fakturera_qty = MIN(kort_att_fakturera / totalt_kort * artikelrad.quantity, kvarvarande_qty)
fakturera_belopp = fakturera_qty * artikelrad.price
```

### Steg 3: Exportera och markera

- Exportera PDF/Excel med tydlig markering "DELFAKTURA" eller "SLUTFAKTURA"
- Automatiskt markera de fakturerade arbetskorten som `billed`
- Spara i `invoice_exports` + `invoice_export_items` för historik

### Steg 4: PDF-utseende för delfaktura

PDF:n visar tydligt:
- "DELFAKTURA" eller "SLUTFAKTURA" i rubriken
- Per order: vilka arbetskort som ingår
- Per artikelrad: fakturerad mängd (inte total mängd)
- Rad "Tidigare fakturerat: X kr" om det finns
- Nettosumma för denna faktura

## Arbetskortens pack/leveransflöde

Nya statusar i UI efter att alla steg är klara:

```text
[completed] -> Knapp: "Markera packat" -> [packed]
[packed]    -> Knapp: "Markera levererat" -> [delivered]
[delivered] -> Dropdown: Fakturastatus [Klar for fakturering / Fakturerad]
```

Stora, tydliga knappar med ikoner. Packed = gul/orange badge, Delivered = grön badge.

## Översiktstabell

Ny kolumn "Leverans" i ordertabellen:
```text
| Order | Kund    | Leverans       | Fakturering       |
|-------|---------|----------------|-------------------|
| 1001  | ACME AB | 3/5 levererat  | Delvis fakturerad |
```

Orderns fakturastatus beräknas dynamiskt:
- Alla kort `billed` -> "Fakturerad"
- Några `billed` eller `ready_for_billing` -> "Delvis fakturerad"
- Inga -> "Ej klar"

## Filändringar

| Fil | Ändring |
|-----|---------|
| `src/types/order.ts` | Nya TruckStatus-värden, TruckBillingStatus, beräkningshjälpare |
| `src/contexts/OrdersContext.tsx` | Hantera packed/delivered/billing_status, fetch invoice_exports |
| `src/components/OrderObjectsEditor.tsx` | Pack/leverans-knappar per arbetskort |
| `src/components/ProductionTruckCard.tsx` | Pack/leverans i produktionsvyn |
| `src/components/StatusBadge.tsx` | Badges för packed, delivered, billing |
| `src/components/OrdersTable.tsx` | Leverans-kolumn, beräknad fakturastatus |
| `src/components/InvoiceExportDialog.tsx` | Nytt flöde: välj kort, visa avräkning, del/slutfaktura |
| `src/lib/invoiceExport.ts` | Proportionell beräkning med avräkning |
| `src/lib/invoiceExportPdf.ts` | Del/slutfaktura-layout |
| `src/lib/invoiceExportExcel.ts` | Inkludera fakturerad mängd, inte total |
| Migration | Nya enum-värden, billing_status kolumn, invoice_exports tabeller |
