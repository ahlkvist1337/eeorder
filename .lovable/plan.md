
# Plan: Mobil- och surfplatteanpassning

## Sammanfattning
Anpassa UI:t för att fungera perfekt på mobil och surfplatta utan att ändra något för desktop.

---

## 1. Navigation (Layout.tsx)
**Problem:** Horisontell navigation med text+ikoner får inte plats på mobil.

**Lösning:**
- Lägg till hamburger-meny (Sheet-komponent) som visas på mobil (`md:hidden`)
- Behåll befintlig horisontell navigation för desktop (`hidden md:flex`)
- Dölj användarnamn på mobil, visa bara logout-knapp
- Minska logo-storlek på mobil

---

## 2. Orderfilter (OrderFilters.tsx)
**Problem:** Sökruta (360px) + filter får inte plats på en rad på mobil.

**Lösning:**
- Sökrutan: `w-full md:w-[360px]` - full bredd på mobil
- Filter-dropdowns: Visa i en column på mobil, rad på desktop
- Lägg till `flex-col md:flex-row` för att stapla vertikalt på mobil
- Mindre filteretiketter eller dölj dem på mobil

---

## 3. Ordertabell (OrdersTable.tsx)
**Problem:** 10 kolumner i tabellen - omöjligt att visa på mobil.

**Lösning:**
- Behåll tabellen som den är för desktop (`hidden md:block`)
- Skapa mobilvy med kort-layout (`md:hidden`) som visar:
  - Ordernummer + Kund
  - Status-badges
  - Avvikelse-ikon om relevant
- Kortvy är klickbar som tabellraden

---

## 4. Orderdetaljer (OrderDetails.tsx)
**Problem:** Header med ordernummer + badges på samma rad är trångt på mobil.

**Lösning:**
- Badges under titeln på mobil: `flex-col sm:flex-row`
- Grid för sidebar: `lg:grid-cols-3` → sidebar under huvudinnehåll på mobil

---

## 5. Massredigeringsverktygsfält (BulkEditToolbar.tsx)
**Problem:** Många element på samma rad.

**Lösning:**
- Redan `flex-wrap` men kan förbättras med mindre gap på mobil
- Dropdowns: fullbredd på mobil

---

## 6. Admin-panel (AdminPanel.tsx)
**Problem:** Tabell svår på mobil.

**Lösning:**
- Samma mönster som OrdersTable: kortvy för mobil, tabell för desktop

---

## 7. Produktionsvy (ProductionScreen.tsx)
**Problem:** Header-layout och legend på samma rad.

**Lösning:**
- Redan responsiv med `flex-col lg:flex-row` - bra!
- Möjlig förbättring: Dölj delar av legend på mobil eller gör den scrollbar

---

## Teknisk implementation

### Fil 1: `src/components/Layout.tsx`
- Importera Sheet, SheetTrigger, SheetContent från ui/sheet
- Lägg till Menu-ikon från lucide-react
- Skapa mobilmeny som overlay
- Använd `hidden md:flex` för desktop-nav
- Använd `md:hidden` för hamburger-knapp

### Fil 2: `src/components/OrderFilters.tsx`
- Ändra container till `flex flex-col md:flex-row`
- Sökruta: `w-full md:w-[360px]`
- Filter-section: `flex flex-col md:flex-row` med gap-anpassning

### Fil 3: `src/components/OrdersTable.tsx`
- Lägg till wrapper med `hidden md:block` för tabellen
- Skapa ny mobilvy med kort-layout (`md:hidden`)
- Varje kort visar: ordernummer, kund, status, avvikelse

### Fil 4: `src/pages/OrderDetails.tsx`
- Header: `flex-col sm:flex-row` för badges
- Inga övriga ändringar behövs (grid är redan responsiv)

### Fil 5: `src/components/BulkEditToolbar.tsx`
- Dropdowns: `w-full md:w-[160px]`
- Bättre stacking på mobil

### Fil 6: `src/pages/AdminPanel.tsx`
- Samma mönster: kortvy för mobil, tabell för desktop

---

## Påverkar INTE desktop
Alla ändringar använder Tailwind breakpoints (`md:`, `lg:`, `sm:`) för att endast påverka mobil/surfplatta. Desktop-layouten förblir exakt som den är idag.
