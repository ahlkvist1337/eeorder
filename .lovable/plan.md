
# Effektivare faktureringsflode

## Problem idag
1. **Manuellt steg**: Back-office maste ga in i varje order och manuellt saetta arbetskort till "Klar for fakturering" -- for manga klick
2. **Proportionell berakning ar vilseledande**: Belopp beraknas fran antal arbetskort, men det ar artikelraderna som har de faktiska beloppen

## Losning: Tva andringar

### 1. Auto-status: Levererat = Klar for fakturering

Nar ett arbetskort markeras som "Levererat" satts `billingStatus` automatiskt till `ready_for_billing`. Det manuella steget forsvinner helt.

**Andring i:**
- `ObjectTrucksEditor.tsx` -- nar "Leverera"-knappen klickas, satt aven billingStatus
- `OrdersContext.tsx` -- i `updateTruckStatus`, nar status blir `delivered`, satt aven billing_status till `ready_for_billing` i samma databasanrop

Ta bort billing-status-dropdownen fran arbetskorts-raden (den som visas nar status ar "delivered") -- den behovs inte langre.

### 2. Faktureringsvy med artikelrader

Lagg till en tredje flik **"Fakturering"** i orderlistan (bredvid "Aktuella ordrar" och "Orderhistorik"). Denna vy visar:

```text
+--------------------------------------------------+
| Fakturering (3 ordrar redo)                       |
+--------------------------------------------------+
| [Markera alla] [Exportera faktura]                |
+--------------------------------------------------+
| Order ON-2024-001 | Kund AB                       |
|   Art.nr  | Beskrivning      | Antal | Pris  | Att fakturera |
|   12345   | Behandling X     |    10 |  500  |     5 (50%)   |
|   67890   | Transport        |     1 | 2000  |     1 (100%)  |
|   Levererade kort: #135, #136 (2 av 4)           |
|   Delsumma: 4 500 kr                              |
|   [ ] Markera for fakturering                     |
+--------------------------------------------------+
| Order ON-2024-002 | Kund CD                       |
|   ...                                             |
+--------------------------------------------------+
```

**Vad vyn visar per order:**
- Ordernummer, kund, referens
- Artikelrader med beraknad kvantitet att fakturera (baserat pa andel levererade arbetskort)
- **Redigerbara belopp**: back-office kan justera "Att fakturera"-kvantiteten per artikelrad innan export
- Vilka arbetskort som ar levererade
- Tidigare fakturerat belopp (avraknat automatiskt)

**Villkor for att synas:** Minst ett arbetskort med `billingStatus = 'ready_for_billing'`

**Export-flode:**
1. Markera ordrar att fakturera (eller "Markera alla")
2. Justera kvantiteter vid behov
3. Klicka "Exportera" -- oppnar befintlig InvoiceExportDialog men med de justerade beloppen
4. Vid export markeras berorda arbetskort som `billed`

### Filer som andras

1. **`src/contexts/OrdersContext.tsx`** -- I `updateTruckStatus`: nar status = `delivered`, satt aven `billing_status = 'ready_for_billing'`
2. **`src/components/ObjectTrucksEditor.tsx`** -- Ta bort billing-status-dropdownen (visas ej langre nar delivered)
3. **`src/pages/Index.tsx`** -- Lagg till en tredje flik "Fakturering"
4. **`src/components/InvoicingTab.tsx`** (ny fil) -- Faktureringsvy-komponent med:
   - Lista ordrar med `ready_for_billing`-arbetskort
   - Visa artikelrader per order med beraknad och redigerbar kvantitet
   - Markering och export
5. **`src/components/InvoiceExportDialog.tsx`** -- Acceptera valfria overridna kvantiteter fran faktureringsvy
6. **`src/lib/invoiceExport.ts`** -- Stod for manuellt justerade kvantiteter (override av proportionell berakning)

### Vad som INTE andras
- Databasschema -- inga nya tabeller behovs
- Befintlig faktura-export-logik (PDF/Excel) -- fungerar som forut
- `invoice_exports` och `invoice_export_items` -- sparar fortfarande historik
- Arbetskortets produktionsflode (steg, status, packa)
