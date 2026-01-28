

# Plan: Inloggning och Användarhantering (MVP)

## Översikt

Implementera ett komplett autentiseringssystem med tre roller (Admin/Redigera/Läsa) som skyddar hela applikationen och möjliggör användarhantering via en adminpanel.

## Databasschema

### Nya tabeller och typer

```text
+------------------+          +------------------+          +------------------+
|   auth.users     |          |    profiles      |          |   user_roles     |
| (Supabase Auth)  |          |                  |          |                  |
+------------------+          +------------------+          +------------------+
| id (uuid) PK     |<-------->| id (uuid) PK/FK  |<-------->| id (uuid) PK     |
| email            |          | email            |          | user_id (uuid)FK |
| ...              |          | full_name        |          | role (app_role)  |
+------------------+          | is_active        |          +------------------+
                              | created_at       |
                              +------------------+
```

### SQL-migrering

**1. Skapa rolltyp:**
```sql
CREATE TYPE public.app_role AS ENUM ('admin', 'redigera', 'lasa');
```

**2. Skapa profiles-tabell:**
```sql
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  is_active BOOLEAN DEFAULT true NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);
```

**3. Skapa user_roles-tabell:**
```sql
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);
```

**4. Skapa security definer-funktion:**
```sql
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;
```

**5. Skapa trigger för automatisk profilskapande:**
```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

**6. RLS-policies för profiles:**
```sql
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Användare kan se sin egen profil
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

-- Admins kan se alla profiler
CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- Admins kan uppdatera profiler
CREATE POLICY "Admins can update profiles"
  ON public.profiles FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));
```

**7. RLS-policies för user_roles:**
```sql
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Användare kan se sina egna roller
CREATE POLICY "Users can view own roles"
  ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id);

-- Admins kan hantera alla roller
CREATE POLICY "Admins can manage all roles"
  ON public.user_roles FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));
```

**8. Uppdatera befintliga tabellers RLS:**

För tabeller som `orders`, `order_steps`, `article_rows`, etc:
```sql
-- Alla inloggade kan läsa
CREATE POLICY "Authenticated users can read orders"
  ON public.orders FOR SELECT
  TO authenticated
  USING (true);

-- Endast admin och redigera kan skapa/uppdatera
CREATE POLICY "Editors can modify orders"
  ON public.orders FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'redigera')
  );

CREATE POLICY "Editors can update orders"
  ON public.orders FOR UPDATE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'redigera')
  );

-- Endast admin kan ta bort
CREATE POLICY "Admins can delete orders"
  ON public.orders FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
```

## Nya komponenter

### Filstruktur

```text
src/
  contexts/
    AuthContext.tsx           (NY)
  hooks/
    useAuth.ts                (NY)
  pages/
    Login.tsx                 (NY)
    AdminPanel.tsx            (NY)
  components/
    ProtectedRoute.tsx        (NY)
    UserRoleBadge.tsx         (NY)
  types/
    auth.ts                   (NY)
```

### AuthContext (`src/contexts/AuthContext.tsx`)

Hanterar autentiseringstillstånd och rollinformation:

```typescript
interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  roles: AppRole[];
  isLoading: boolean;
  isAdmin: boolean;
  canEdit: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}
```

Funktionalitet:
- Lyssnar på `onAuthStateChange` för att uppdatera användartillstånd
- Hämtar profil och roller vid inloggning
- Tillhandahåller bekväma flaggor (`isAdmin`, `canEdit`)

### Login-sida (`src/pages/Login.tsx`)

Enkel inloggningsformulär:
- Email och lösenord
- Felmeddelanden vid misslyckad inloggning
- Ingen registrering (användare skapas av admin)
- Automatisk omdirigering efter inloggning

### ProtectedRoute (`src/components/ProtectedRoute.tsx`)

Wrapper-komponent som:
- Visar laddningsindikator medan auth kontrolleras
- Omdirigerar till `/login` om ej inloggad
- Kontrollerar om användare är aktiv (`is_active`)
- Kan kräva specifik roll (valfritt)

### AdminPanel (`src/pages/AdminPanel.tsx`)

Enkel adminpanel med:
- Lista över alla användare med roll och status
- Skapa ny användare (email, namn, roll)
- Ändra användarroll
- Aktivera/inaktivera användare
- Endast tillgänglig för admin-användare

```text
+--------------------------------------------------+
| ANVÄNDARHANTERING                                |
+--------------------------------------------------+
| [+ Skapa användare]                              |
|                                                  |
| Namn           | Email          | Roll   | Aktiv |
| -------------- | -------------- | ------ | ----- |
| Anna Andersson | anna@firma.se  | Admin  |  ✓    |
| Bengt Bengtsson| bengt@firma.se | Redige.|  ✓    |
| Carl Carlsson  | carl@firma.se  | Läsa   |  ✗    |
|                                                  |
+--------------------------------------------------+
```

## Uppdateringar i befintliga filer

### `src/App.tsx`

- Wrap hela appen med `AuthProvider`
- Lägg till `/login` och `/admin` routes
- Wrap alla befintliga routes med `ProtectedRoute`

```typescript
<AuthProvider>
  <Routes>
    <Route path="/login" element={<Login />} />
    <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
    <Route path="/admin" element={<ProtectedRoute requiredRole="admin"><AdminPanel /></ProtectedRoute>} />
    {/* ... övriga routes */}
  </Routes>
</AuthProvider>
```

### `src/components/Layout.tsx`

- Lägg till adminlänk (endast synlig för admins)
- Lägg till utloggningsknapp
- Visa inloggad användares namn/email

```text
+-------------------------------------------------------+
| Orderhantering    | Ordrar | Ny order | ... | Admin | [Anna] [Logga ut] |
+-------------------------------------------------------+
```

### `src/contexts/OrdersContext.tsx`

- Inget behöver ändras i context-logiken
- RLS-policies i databasen hanterar behörighetskontroll

### UI-anpassningar baserat på roll

**För "Läsa"-användare:**
- Dölja "Ny order"-knapp
- Dölja redigeringsikoner i orderlistan
- Skrivskydda formulärfält i orderdetaljer
- Dölja bulk-redigeringsverktygsfältet

**Implementation:**
```typescript
// I komponenter som behöver rollkontroll
const { canEdit } = useAuth();

{canEdit && (
  <Button>Ny order</Button>
)}
```

## Autentiseringskonfiguration

Aktivera auto-bekräftelse av e-post (inget bekräftelsemail behövs):

```toml
# supabase/config.toml
[auth]
enable_signup = false  # Endast admin skapar användare

[auth.email]
enable_confirmations = false
```

## Teknisk detaljplan

### Steg 1: Databasmigrering
1. Skapa `app_role` enum
2. Skapa `profiles` tabell med RLS
3. Skapa `user_roles` tabell med RLS
4. Skapa `has_role` security definer-funktion
5. Skapa trigger för automatisk profilskapande
6. Uppdatera RLS på befintliga tabeller (`orders`, `order_steps`, etc.)

### Steg 2: Skapa auth-infrastruktur
1. Skapa `src/types/auth.ts` med typdefinitioner
2. Skapa `src/contexts/AuthContext.tsx`
3. Skapa `src/hooks/useAuth.ts`
4. Skapa `src/components/ProtectedRoute.tsx`

### Steg 3: Skapa sidor
1. Skapa `src/pages/Login.tsx`
2. Skapa `src/pages/AdminPanel.tsx`

### Steg 4: Integrera i app
1. Uppdatera `src/App.tsx` med AuthProvider och routes
2. Uppdatera `src/components/Layout.tsx` med admin-länk och utloggning
3. Uppdatera relevanta komponenter för rollbaserad visning

### Steg 5: Skapa första admin-användare
1. Dokumentera hur man skapar första admin via SQL
2. Alternativt: edge function för initial setup

## Rollbaserade behörigheter (sammanfattning)

| Funktion | Admin | Redigera | Läsa |
|----------|-------|----------|------|
| Se ordrar | ✓ | ✓ | ✓ |
| Skapa order | ✓ | ✓ | ✗ |
| Redigera order | ✓ | ✓ | ✗ |
| Ändra status | ✓ | ✓ | ✗ |
| Ta bort order | ✓ | ✗ | ✗ |
| Produktionsvy | ✓ | ✓ | ✓ |
| Adminpanel | ✓ | ✗ | ✗ |
| Hantera användare | ✓ | ✗ | ✗ |

## Framtida utbyggnad (ej MVP)

Strukturen stödjer framtida utbyggnad:
- **Kundinloggning**: Lägg till `customer_id` i profiles, skapa RLS-policy som begränsar till egna ordrar
- **Per-kund-begränsning**: Utöka has_role med kundkoppling
- **External read-only**: Ny roll `extern` med begränsad läsbehörighet

