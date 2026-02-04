

# Plan: Nytt rollsystem för verkstaden

## Översikt

Byter ut det nuvarande abstrakta rollsystemet (`admin`, `redigera`, `lasa`) mot ett verkstadsanpassat system med tre tydliga roller som speglar hur arbetet faktiskt sker.

---

## Nya roller

| Roll | Svenska namn | Syfte |
|------|--------------|-------|
| `utforare` | Utförare | Golvpersonal som rapporterar arbete |
| `produktion` | Produktion | Produktionschef som planerar flödet |
| `admin` | Admin | Full kontroll över affär och ekonomi |

---

## Behörighetsmatris

### Vad varje roll kan göra

| Funktion | Utförare | Produktion | Admin |
|----------|:--------:|:----------:|:-----:|
| **Se produktionsvyn** | ✓ | ✓ | ✓ |
| **Se ordrar och arbetskort** | ✓ | ✓ | ✓ |
| **Markera arbete som påbörjat** | ✓ | ✓ | ✓ |
| **Markera arbetsmoment klara** | ✓ | ✓ | ✓ |
| **Ändra arbetskortsstatus (Ankommen/Pausad/Klar)** | ✓ | ✓ | ✓ |
| **Skapa/redigera arbetskort** | ✗ | ✓ | ✓ |
| **Ta bort arbetskort** | ✗ | ✓ | ✓ |
| **Ändra prioritering (drag-and-drop i produktion)** | ✗ | ✓ | ✓ |
| **Skapa/redigera objekt** | ✗ | ✓ | ✓ |
| **Skapa/redigera arbetsmoment** | ✗ | ✓ | ✓ |
| **Skapa/importera ordrar** | ✗ | ✓ | ✓ |
| **Ändra planerade datum** | ✗ | ✓ | ✓ |
| **Ändra orderstatus (Aktiv/Avslutad/Avbruten)** | ✗ | ✗ | ✓ |
| **Ändra priser på artikelrader** | ✗ | ✗ | ✓ |
| **Hantera prislista** | ✗ | ✗ | ✓ |
| **Ändra faktureringsstatus** | ✗ | ✗ | ✓ |
| **Exportera fakturaunderlag** | ✗ | ✗ | ✓ |
| **Ta bort ordrar permanent** | ✗ | ✗ | ✓ |
| **Hantera användare** | ✗ | ✗ | ✓ |

---

## Teknisk implementation

### 1. Databasändringar

**Migrera `app_role` enum:**

```sql
-- Steg 1: Lägg till nya värden
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'utforare';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'produktion';

-- Steg 2: Migrera befintliga roller
-- 'lasa' → 'utforare' (minsta behörighet)
-- 'redigera' → 'produktion' (produktionschef)
-- 'admin' → 'admin' (oförändrat)

UPDATE public.user_roles 
SET role = 'utforare' 
WHERE role = 'lasa';

UPDATE public.user_roles 
SET role = 'produktion' 
WHERE role = 'redigera';

-- Steg 3: Ta bort gamla värden (kan göras senare)
-- OBS: Postgres stödjer inte direkt borttagning av enum-värden
-- De gamla värdena blir kvar men används inte
```

**Uppdatera `has_role` funktionen** för att hantera de nya rollerna.

**Uppdatera RLS-policies:**
- Utförare får UPDATE på `truck_step_status` och `object_trucks.status`
- Produktion får INSERT/UPDATE/DELETE på arbetskort, objekt, steg
- Admin behåller full access

### 2. AuthContext - Nya behörighetsflaggor

```typescript
// src/contexts/AuthContext.tsx

// Befintliga
isAdmin: boolean;       // role === 'admin'

// Nya flaggor
isProduction: boolean;  // role === 'admin' || role === 'produktion'
canManageOrders: boolean;  // isProduction - skapa/ändra ordrar
canManagePrices: boolean;  // isAdmin - hantera priser
canManageUsers: boolean;   // isAdmin - hantera användare
canReportWork: boolean;    // alla roller - rapportera arbete

// Ta bort eller byt namn på
canEdit → canManageOrders (bredare användning)
```

### 3. types/auth.ts

```typescript
// Nya roller
export type AppRole = 'admin' | 'produktion' | 'utforare';

// Nya etiketter
export const roleLabels: Record<AppRole, string> = {
  admin: 'Admin',
  produktion: 'Produktion', 
  utforare: 'Utförare',
};

// Beskrivningar för AdminPanel
export const roleDescriptions: Record<AppRole, string> = {
  admin: 'Full kontroll över ordrar, priser, fakturering och användare',
  produktion: 'Planerar produktion, skapar arbetskort, hanterar flöde',
  utforare: 'Rapporterar arbete, markerar steg som klara',
};
```

### 4. UI-anpassningar per sida

**Layout.tsx (Navigation):**
- "Ny order" visas endast för `isProduction`
- Prislista visas för alla (men redigering bara för admin)
- Admin-länken visas endast för `isAdmin`

**Index.tsx (Orderlista):**
- "Importera XML" / "Ny order" → endast `isProduction`
- Bulk-redigering → endast `isProduction`
- Faktureringsstatus → endast `isAdmin`

**OrderDetails.tsx:**
- Planerade datum → endast `isProduction`
- Orderstatus (dropdown) → endast `isAdmin`
- Faktureringsstatus → endast `isAdmin`
- Priser på artikelrader → endast `isAdmin` (visa för alla, redigera för admin)
- Avvikelse-checkbox → `isProduction`
- Ta bort order → endast `isAdmin`

**OrderObjectsEditor.tsx:**
- Lägg till objekt → endast `isProduction`
- Ta bort objekt → endast `isProduction`
- Lägg till arbetsmoment → endast `isProduction`
- Ta bort arbetsmoment → endast `isProduction`

**ObjectTrucksEditor.tsx:**
- Lägg till arbetskort → endast `isProduction`
- Ta bort arbetskort → endast `isProduction`
- Ändra arbetskortsnummer → endast `isProduction`
- Ändra arbetskortsstatus (dropdown) → alla roller
- Klicka på steg för att ändra status → alla roller
- Utskriftsknapp → alla roller

**ProductionScreen.tsx:**
- Drag-and-drop för prioritering → endast `isProduction`
- "Återställ ordning" → endast `isProduction`
- Klicka på arbetskort → alla (navigerar till order)

**PriceList.tsx:**
- Lägg till pris → endast `isAdmin`
- Redigera pris → endast `isAdmin`
- Ta bort pris → endast `isAdmin`
- Importera från ordrar → endast `isAdmin`
- Exportera Excel → alla roller

**Statistics.tsx:**
- Alla kan se statistik

**AdminPanel.tsx:**
- Endast `isAdmin` (redan skyddad via route)
- Uppdatera rollväljaren med nya roller

### 5. Edge Functions

**create-user/index.ts:**
- Uppdatera för nya roller

**manage-user/index.ts:**
- Oförändrad (admin-only redan)

---

## Fil-ändringar

| Fil | Ändring |
|-----|---------|
| `src/types/auth.ts` | Nya roller och etiketter |
| `src/contexts/AuthContext.tsx` | Nya behörighetsflaggor |
| `src/components/Layout.tsx` | Villkorlig navigation |
| `src/pages/Index.tsx` | Begränsa bulk-redigering och knappar |
| `src/pages/OrderDetails.tsx` | Rollbaserad UI |
| `src/components/OrderObjectsEditor.tsx` | Rollbaserad UI |
| `src/components/ObjectTrucksEditor.tsx` | Alla kan ändra status, bara prod kan hantera kort |
| `src/pages/ProductionScreen.tsx` | Drag-drop endast för produktion |
| `src/pages/PriceList.tsx` | Admin-only för redigering |
| `src/pages/AdminPanel.tsx` | Nya roller i dropdown |
| `supabase/functions/create-user/index.ts` | Nya roller |
| **Migration** | Uppdatera enum och migrera data |

---

## Migrationsplan för befintliga användare

| Nuvarande roll | Ny roll | Motivering |
|----------------|---------|------------|
| `admin` | `admin` | Oförändrad |
| `redigera` | `produktion` | Produktionschef |
| `lasa` | `utforare` | Golvpersonal |

---

## Förväntad användarupplevelse

**Utförare:**
- Ser produktionsvyn med arbetskort
- Klickar på steg för att markera som pågående/klart
- Kan ändra arbetskortsstatus (Ankommen → Startad → Klar)
- Ser ordrar men kan inte ändra struktur
- Knappar för att skapa/ta bort är dolda

**Produktionschef:**
- Allt utförare kan plus:
- Skapar och hanterar arbetskort
- Drar och släpper för att prioritera
- Lägger till objekt och arbetsmoment
- Skapar ordrar via import eller manuellt

**Admin:**
- Allt produktion kan plus:
- Hanterar priser och prislista
- Ändrar faktureringsstatus
- Exporterar fakturaunderlag
- Tar bort ordrar permanent
- Hanterar användarkonton

---

## Säkerhet

Alla behörighetskontroller sker på tre nivåer:

1. **UI** - Knappar och funktioner dolda
2. **Hooks/Context** - Client-side validering
3. **RLS/Edge Functions** - Server-side validering (säkerhetsbarriär)

Även om UI manipuleras skyddar RLS-policyerna databasen.

