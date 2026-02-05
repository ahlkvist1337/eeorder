

# Plan: Fyra förbättringar (uppdaterad)

## Sammanfattning

| Punkt | Problem | Lösning |
|-------|---------|---------|
| 1. Sidladdning vid flikbyte | React Query refetchar vid fokus | Stäng av `refetchOnWindowFocus` |
| 2. Ta bort PriceHint vid redigering | Varning vid prisinput är överflödig | Ta bort PriceHint-komponenten |
| 3. Bättre prisförklaring | Otydligt var prismatchning kommer ifrån | Visa matchtyp tydligt i PriceListBadge |
| 4. Dokumentbibliotek | Saknas | Ny sida med tre kategorier + admin-uppladdning |

---

## 1. Stoppa sidladdning vid flikbyte

### Problem
React Query har `refetchOnWindowFocus: true` som standard. När du byter till en annan flik och tillbaka triggas en ny fetch, vilket orsakar att sidan "blinkar".

### Lösning
Konfigurera QueryClient i `src/App.tsx` med:

```typescript
const [queryClient] = useState(() => new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 30000,
    },
  },
}));
```

### Fil som ändras
- `src/App.tsx`

---

## 2. Ta bort PriceHint vid redigering

### Problem
När man klickar "Redigera" på en artikelrad visas en orange varning ("Prislistan: X kr") under prisinputen. Denna är onödig eftersom `PriceListBadge` ("Prislista finns") redan finns på raden i visa-läge.

### Lösning
Ta bort:
- `PriceHint`-komponenten (rad 137-152)
- `editPriceHint` och `newRowPriceHint` states
- useEffect-hooks som uppdaterar price hints (rad 44-71)
- Alla användningar av `<PriceHint ... />` (rad 220-222, 376-378, 494, 596)

### Fil som ändras
- `src/components/ArticleRowsEditor.tsx`

---

## 3. Bättre förklaring på prismatchning i PriceListBadge

### Problem
`PriceListBadge` visar bara "Prislista finns" utan att förklara:
- Om det matchades på artikelnummer (exakt match)
- Om det matchades på beskrivning (vilken beskrivning?)

### Lösning
Uppdatera `PriceListBadge` för att visa matchtyp tydligt:

**Vid exakt artikelnummer-match:**
```
Matchat på artikelnr
```

**Vid beskrivningsmatchning:**
```
Matchat på liknande beskrivning: "Pulverlackering RAL 7035"
```

### Ändringar i PriceListBadge.tsx
- Visa matchtyp i popover-headern
- Om `matchType === 'exact_part'`: Visa "Matchat på artikelnr: {partNumber}"
- Om `matchType === 'similar_desc'`: Visa "Matchat på liknande beskrivning: {description}"

---

## 4. Dokumentbibliotek

### Ny funktionalitet
En enkel sida där alla användare kan hitta dokument (PDF/DOCX) sorterade i tre kategorier.

### Kategorier
1. **Lathundar** - Snabbguider och instruktioner
2. **Rutiner** - Arbetsrutiner och processer  
3. **Tolkningar / Förklaringar** - Förklarande dokument

### Databas (ny tabell)

```sql
CREATE TABLE public.documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('lathundar', 'rutiner', 'tolkningar')),
  file_path TEXT NOT NULL,
  file_size INTEGER,
  uploaded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS: Alla inloggade kan läsa, bara admin kan skriva/ta bort
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Alla kan läsa dokument"
  ON public.documents FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admin kan skapa dokument"
  ON public.documents FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin kan ta bort dokument"
  ON public.documents FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
```

### Storage bucket

```sql
INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', true);

CREATE POLICY "Alla kan läsa dokument-filer"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'documents');

CREATE POLICY "Admin kan ladda upp dokument"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'documents' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin kan ta bort dokument"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'documents' AND public.has_role(auth.uid(), 'admin'));
```

### Ny fil: `src/pages/Documents.tsx`

**Funktioner:**
- Lista dokument grupperade per kategori (accordion)
- Klickbara länkar för nedladdning
- Admin-sektion med uppladdning (filväljare)
- Välja kategori vid uppladdning
- Ta bort-knapp för admin

**Design:**
- Enkel layout med tre sektioner
- Varje dokument visas med filnamn, datum och nedladdningslänk
- Responsiv för mobil

### Nya filer
- `src/pages/Documents.tsx` - Dokumentbibliotekssidan
- `src/hooks/useDocuments.ts` - Hook för CRUD-operationer

### Ändrade filer
- `src/App.tsx` - Lägg till route `/documents`
- `src/components/Layout.tsx` - Lägg till nav-item "Dokument"

---

## Teknisk översikt

```text
┌─────────────────────────────────────────────────────────────┐
│                      ÄNDRINGAR                               │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  src/App.tsx                                                │
│  ├─ QueryClient config: refetchOnWindowFocus: false         │
│  └─ Ny route: /documents                                    │
│                                                             │
│  src/components/Layout.tsx                                  │
│  └─ Ny nav-item: Dokument (FileText-ikon)                   │
│                                                             │
│  src/components/ArticleRowsEditor.tsx                       │
│  └─ Ta bort PriceHint (vid redigering)                      │
│  └─ Behålla PriceListBadge (i visa-läge)                    │
│                                                             │
│  src/components/PriceListBadge.tsx                          │
│  └─ Visa matchtyp: artnr vs beskrivning                     │
│                                                             │
│  src/pages/Documents.tsx (NY)                               │
│  └─ Dokumentbibliotek med 3 kategorier                      │
│                                                             │
│  src/hooks/useDocuments.ts (NY)                             │
│  └─ Hook för hämta/ladda upp/ta bort dokument               │
│                                                             │
│  Databas                                                    │
│  ├─ Ny tabell: documents                                    │
│  └─ Ny bucket: documents (public)                           │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Testplan

1. **Flikbyte:** Öppna orderlistan, byt till annan flik, kom tillbaka - sidan ska INTE ladda om
2. **Prisvarning borta:** Redigera en artikelrad - ingen orange "Prislistan: X kr" ska visas vid prisinputen
3. **PriceListBadge kvar:** I visa-läge ska "Prislista finns" fortfarande visas på rader som har matchningar
4. **Prismatchning förklaring:** Klicka på "Prislista finns" - se tydlig text om det matchades på artikelnr eller beskrivning
5. **Dokumentbibliotek:**
   - Navigera till /documents
   - Se tre kategorier
   - (Som admin) Ladda upp en PDF till "Lathundar"
   - Ladda ner dokumentet
   - (Som admin) Ta bort dokumentet

