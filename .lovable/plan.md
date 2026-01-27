

## Orderhantering för Ytbehandling - MVP

### Översikt
Ett internt ordersystem för produktionsledning av ytbehandlingsarbeten. Klassisk affärssystemsstil med fokus på enkelhet och snabbhet.

---

### 1. Orderöversikt (Startsidan)
**Huvudvyn som visar alla ordrar i en tydlig tabell**

- Tabellvy med kolumner: Ordernummer, Kund, Status, Planerat datum, Nästa steg, Faktureringsstatus
- Färgkodade statusar för snabb överblick (grönt = klar, gult = pågående, rött = avvikelse)
- Klicka på rad för att öppna orderdetaljer
- Snabbfilter för status, fakturering, datum och avvikelser
- Sortering på alla kolumner

---

### 2. Skapa Order via XML
**Import från Monitor ERP-system**

- Drag & drop-zon eller filväljare för XML-uppladdning
- Automatisk parsing av orderdata: ordernummer, kund, datum, artikelrader
- Validering: kontroll av dubbletter och obligatoriska fält
- Tydliga felmeddelanden vid problem
- Förhandsvisning av importerad data innan bekräftelse

---

### 3. Skapa Order Manuellt
**Formulär för nya ordrar**

- Ordernummer (unikt, valideras direkt)
- Kunduppgifter
- Planerat start- och slutdatum
- Val av behandlingssteg från listan
- Kommentarsfält

---

### 4. Hantera Behandlingssteg
**Flexibelt steg-system**

- Skapa egna behandlingssteg (t.ex. Sprutzink, Målning, Blästring)
- Enkel lista för att lägga till/ta bort steg
- Varje steg kan tilldelas till ordrar med egen status och tidsuppföljning

---

### 5. Orderdetaljer
**Komplett vy för en enskild order**

- All grunddata på ett ställe
- Steglista med individuell status per steg
- Statushistorik/tidslinje (alla ändringar loggas)
- Priser per steg och totalsumma
- Avvikelse-checkbox med kommentarsfält
- Snabbknappar: Ändra status, Markera fakturerad, Avbryt order

---

### 6. Statushantering
**Tydligt statusflöde**

Produktionsstatus: Skapad → Planerad → Startad → Pausad → Ankommen → Avslutad (eller Avbruten)

Faktureringsstatus: Ej klar → Klar för fakturering → Fakturerad

Alla statusändringar tidsstämplas automatiskt.

---

### 7. Statistik-Dashboard
**Enkel översikt med nyckeltal**

- Antal aktiva ordrar
- Antal avslutade ordrar
- Antal fakturerade ordrar
- Totalt värde (klar för fakturering + fakturerat)
- Jämförelse planerad vs faktisk ledtid

---

### 8. Design & Stil
**Klassiskt affärssystem**

- Grå/blå färgskala med tydliga kontraster
- Tabellbaserad layout
- Inga onödiga animationer
- Stor, läsbar text
- Tydliga knappar och ikoner

---

### Teknisk Lösning
- **Ingen inloggning** - direkt tillgång för alla
- **Lokal datalagring** (localStorage) för MVP - data sparas i webbläsaren
- **Framtida möjlighet** att lägga till backend/databas för permanent lagring

