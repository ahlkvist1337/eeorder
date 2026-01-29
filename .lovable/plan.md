

# Plan: Objekthantering i Orderhanteringssystemet

## Sammanfattning
Lägga till stöd för "objekt" som en mellanliggande nivå mellan order och behandlingssteg. Ett objekt representerar en del av en order som kan följas separat med sina egna behandlingssteg.

---

## Datastruktur

**Ny hierarki:**
```text
Order
  └── Objekt (1 eller flera)
        └── Behandlingssteg (1 eller flera per objekt)
```

**Exempel:**
- Order 12345 (Kund: ACME AB)
  - Objekt A: "Ram vänster"
    - Blästring
    - Målning
  - Objekt B: "Ram höger"
    - Blästring
    - Målning
  - Objekt C: "Motorblock"
    - Sprutzink

---

## Databasändringar

### Ny tabell: `order_objects`
| Kolumn | Typ | Beskrivning |
|--------|-----|-------------|
| id | uuid | Primärnyckel |
| order_id | uuid | FK till orders |
| name | text | Namn på objektet (t.ex. "Ram vänster") |
| description | text | Valfri beskrivning |
| created_at | timestamp | Skapades |

### Ändring i `order_steps`
| Ny kolumn | Typ | Beskrivning |
|-----------|-----|-------------|
| object_id | uuid | FK till order_objects (nullable för bakåtkompatibilitet) |

**Bakåtkompatibilitet:** Befintliga order som inte har objekt kommer fortsätta fungera eftersom `object_id` är nullable.

---

## Komponentändringar

### Ny komponent: `OrderObjectsEditor.tsx`
Ersätter/utökar nuvarande `OrderStepsEditor` i OrderDetails och CreateOrder.

**Funktionalitet:**
- Lista alla objekt i ordern
- Lägga till nytt objekt (namn + valfri beskrivning)
- Redigera objektnamn
- Ta bort objekt (med bekräftelse om det har steg)
- Visa behandlingssteg per objekt (expanderbart)
- Lägga till behandlingssteg till specifikt objekt
- Samma behandlingssteg kan finnas på flera objekt (t.ex. "Målning" på både objekt A och B)

**UI-struktur:**
```text
┌─────────────────────────────────────────────────────────────┐
│ Objekt & Behandlingssteg                                    │
├─────────────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ ▼ Objekt 1: Ram vänster                        [Redigera] [Ta bort] │
│ │   ├── Blästring      [Väntande ▼]              [Ta bort] │
│ │   └── Målning        [Pågående ▼]              [Ta bort] │
│ │   [+ Lägg till steg...]                                  │
│ └─────────────────────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ ▼ Objekt 2: Ram höger                          [Redigera] [Ta bort] │
│ │   ├── Blästring      [Klar ▼]                  [Ta bort] │
│ │   └── Målning        [Väntande ▼]              [Ta bort] │
│ │   [+ Lägg till steg...]                                  │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ [+ Lägg till objekt]                                        │
└─────────────────────────────────────────────────────────────┘
```

---

## Påverkade filer

### 1. Databasmigrering
- Skapa tabell `order_objects`
- Lägg till kolumn `object_id` i `order_steps`
- RLS-policies för nya tabellen

### 2. `src/types/order.ts`
- Ny interface `OrderObject`
- Uppdatera `OrderStep` med `objectId?: string`
- Uppdatera `Order` med `objects?: OrderObject[]`

### 3. `src/contexts/OrdersContext.tsx`
- Hämta `order_objects` tillsammans med övriga data
- Uppdatera `mapDbOrderToOrder` för att inkludera objekt
- Uppdatera `addOrder` för att skapa objekt
- Uppdatera `updateOrder` för att hantera objekt och steg

### 4. Ny fil: `src/components/OrderObjectsEditor.tsx`
- Huvudkomponent för att hantera objekt och deras steg
- Ersätter `OrderStepsEditor` i detaljvy och skapande

### 5. `src/pages/OrderDetails.tsx`
- Ersätt `OrderStepsEditor` med `OrderObjectsEditor`
- Visa objekt-baserad layout för behandlingssteg

### 6. `src/pages/CreateOrder.tsx`
- Manuell skapning: lägg till möjlighet att skapa objekt och koppla steg
- XML-import: behåll befintlig logik men med möjlighet att gruppera i objekt efteråt

### 7. `src/components/OrderStepsEditor.tsx`
- Behåll men modifiera för att användas per objekt (ta emot `objectId` som prop)
- Tar bort filtret som hindrar samma stegtyp att läggas till flera gånger

---

## Implementationsdetaljer

### Bakåtkompatibilitet
- Order utan objekt kommer fortfarande fungera
- Om en order har steg men inga objekt, visas stegen på ordernivå (legacy-läge)
- Nya order uppmuntras att använda objekt men det är inte obligatoriskt

### Behandlingssteg på flera objekt
- Nuvarande begränsning (ett steg per typ per order) tas bort
- Varje objekt kan ha sina egna instanser av samma stegtyp
- Status hanteras per steg-instans, inte per stegtyp

### Auto-status för order
Befintlig logik bibehålls:
- Om ett steg startas → order blir "Startad"
- Om alla steg är klara → order blir "Avslutad"
- Nu räknas alla steg från alla objekt

---

## Framtida förbättringar (ej inkluderat nu)
- Filtrera/söka på objektnamn i produktionsvyn
- Visa objektprogress i orderöversikten
- Kopiera objekt (med steg) till annan order

