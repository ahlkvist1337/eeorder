
# Plan: Behörighetsbegränsningar för Utförare + Avvikelsesystem

## Sammanfattning

Implementerar striktare behörighetskontroller för **Utförare**-rollen och utvecklar ett fullständigt **avvikelseloggsystem** där varje inrapporterad avvikelse sparas med vem som skapade den och när.

---

## Del 1: Utförare-begränsningar

### Vad som ska begränsas för Utförare

| Funktion | Nuvarande | Nytt |
|----------|-----------|------|
| Lägga till/ändra/ta bort behandlingssteg | Tillåtet | Blockerat |
| Lägga till/ändra/ta bort objekt | Tillåtet | Blockerat |
| Sortera steg i objekt (drag-and-drop) | Tillåtet | Blockerat |
| Se statistik | Tillåtet | Blockerat |
| Se prislista | Tillåtet | Blockerat |
| Ändra/lägga till artikelrader | Tillåtet | Blockerat |
| Skriva/ändra orderkommentar | Tillåtet | Endast läsa |
| Ändra prioritering i produktionsvyn | Tillåtet | Blockerat |
| Skapa avvikelser | Begränsat | Tillåtet |

### Navigation (Layout.tsx)

Dölj följande menyalternativ för Utförare:
- **Inställningar** (behandlingssteg/objektmallar)
- **Statistik**
- **Prislista**

### OrderDetails.tsx

| Element | Utförare |
|---------|----------|
| Kommentarsfält | ReadOnly - visa text utan redigering |
| Artikelrader | ReadOnly - visa utan edit/add/delete |
| Planerade datum | ReadOnly - visa utan datumväljare |

### OrderObjectsEditor.tsx

| Element | Utförare |
|---------|----------|
| Lägg till objekt | Dolt |
| Ta bort objekt | Dolt |
| Lägg till behandlingssteg | Dolt |
| Ta bort behandlingssteg | Dolt |
| Drag-and-drop för sortering | Inaktiverat |

### ObjectTrucksEditor.tsx

| Element | Utförare |
|---------|----------|
| Lägg till arbetskort | Dolt |
| Ta bort arbetskort | Dolt |
| Redigera arbetskortsnummer | Dolt |
| Ändra arbetskortsstatus | Tillåtet |
| Klicka på steg för statusändring | Tillåtet |
| Skriva ut arbetskort | Tillåtet |

### ProductionScreen.tsx

| Element | Utförare |
|---------|----------|
| Drag-and-drop prioritering | Blockerat (endast visuellt) |
| "Återställ ordning"-knappen | Dolt |
| Klicka på kort för att navigera | Tillåtet |

---

## Del 2: Produktion kan ändra orderstatus

Produktion ska kunna ändra orderstatus (Aktiv/Avslutad/Avbruten). Nu är det endast Admin.

**Ändring i OrderDetails.tsx:**
- Ändra villkoret för orderstatus-dropdown från `isAdmin` till `isProduction`

---

## Del 3: Nytt Avvikelsesystem

### Nuvarande implementation
- Ett `has_deviation` boolean-fält
- Ett `deviation_comment` textfält  
- Överskriven vid varje sparning

### Ny implementation

Skapa en **avvikelselogg** där varje avvikelse är en separat post med:
- Tidsstämpel
- Vem som rapporterade
- Avvikelsebeskrivning

### Ny databastabell: `order_deviations`

```sql
CREATE TABLE public.order_deviations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  message text NOT NULL,
  created_by uuid NOT NULL REFERENCES auth.users(id),
  created_by_name text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.order_deviations ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read
CREATE POLICY "Authenticated users can read order_deviations"
ON public.order_deviations FOR SELECT
USING (true);

-- All roles can insert (utförare ska kunna rapportera)
CREATE POLICY "All roles can insert order_deviations"
ON public.order_deviations FOR INSERT
WITH CHECK (has_any_role(auth.uid()));

-- Production can delete (för att rensa felaktiga)
CREATE POLICY "Production can delete order_deviations"
ON public.order_deviations FOR DELETE
USING (is_production_or_admin(auth.uid()));
```

### Avvikelse-UI på OrderDetails

Ersätt nuvarande deviation-checkbox + textarea med:

```
┌─────────────────────────────────────────────────────────┐
│  ⚠️ AVVIKELSER                                          │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │ Problem med rostangrepp på undersidan.          │   │
│  │ ──────────────────────────────────────────────  │   │
│  │ Erik Nilsson • 3 feb 2026 kl 14:32              │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │ Saknas 2 st bultar på vänster sida.             │   │
│  │ ──────────────────────────────────────────────  │   │
│  │ Anna Svensson • 4 feb 2026 kl 09:15             │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │ [Beskriv avvikelsen...]                         │   │
│  │                                   [Rapportera]  │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**Funktionalitet:**
- Alla roller kan lägga till nya avvikelser
- Varje avvikelse visar meddelande + skaparens namn + tidsstämpel
- Lista sorteras med senaste överst
- `has_deviation` uppdateras automatiskt (true om det finns poster, kan behållas som snabbflagga för filtrering)

---

## Teknisk implementation

### Nya filer

| Fil | Beskrivning |
|-----|-------------|
| `src/hooks/useOrderDeviations.ts` | Hook för att hämta/skapa avvikelser |
| `src/components/OrderDeviations.tsx` | UI-komponent för avvikelselistan |

### Ändringar i befintliga filer

| Fil | Ändring |
|-----|---------|
| `src/components/Layout.tsx` | Dölj nav för Utförare (inställningar, statistik, prislista) |
| `src/pages/OrderDetails.tsx` | ReadOnly comment, rollbaserad orderstatus, ersätt deviation UI |
| `src/components/OrderObjectsEditor.tsx` | Dölj add/remove för Utförare, inaktivera drag-drop |
| `src/components/ObjectTrucksEditor.tsx` | Dölj add/remove/edit för Utförare |
| `src/components/ArticleRowsEditor.tsx` | Lägg till readOnly prop-stöd (redan finns) - använd det |
| `src/components/SortableStep.tsx` | Inaktivera drag för Utförare |
| `src/pages/ProductionScreen.tsx` | Blockera drag-and-drop för Utförare (redan implementerat) |
| **Migration** | Skapa `order_deviations` tabell |

---

## Filändringar sammanfattning

### Databas
- Ny tabell `order_deviations` med RLS-policies

### Frontend
1. `src/components/Layout.tsx` - Dölj nav-items för Utförare
2. `src/pages/OrderDetails.tsx` - ReadOnly för kommentar, isProduction för orderstatus, nytt avvikelse-UI
3. `src/components/OrderObjectsEditor.tsx` - Rollbaserade kontroller
4. `src/components/ObjectTrucksEditor.tsx` - Rollbaserade kontroller  
5. `src/components/SortableStep.tsx` - Villkorlig drag-handle
6. `src/hooks/useOrderDeviations.ts` - **NY FIL**
7. `src/components/OrderDeviations.tsx` - **NY FIL**

---

## Resultat

### För Utförare:
- Kan se produktion och ordrar
- Kan ändra arbetskortsstatus och stegstatus
- Kan rapportera avvikelser (men inte ta bort dem)
- Kan läsa kommentarer men inte ändra
- Kan INTE se statistik, prislista eller inställningar
- Kan INTE ändra objekt, steg eller artikelrader
- Kan INTE prioritera i produktionsvyn

### För Produktion:
- Allt Utförare kan + planering och struktur
- Kan nu ändra orderstatus (Aktiv/Avslutad/Avbruten)
- Kan ta bort avvikelser om de är felaktiga

### Avvikelsesystemet:
- Varje avvikelse är spårbar (vem, när, vad)
- Fungerar som ett internt kommentarsystem för problem
- Ingen data skrivs över - alla rapporter bevaras
