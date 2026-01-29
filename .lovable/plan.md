

# Plan: Objektmallar och Förbättrad Objekthantering

## Sammanfattning
Skapa stöd för fördefinierade objektmallar (som behandlingsstegmallar) och fixa problemet med att lägga till steg i objekt.

---

## Problem att lösa

### 1. Kan inte lägga till steg i objekt
Tittar på koden ser jag att `handleAddStep` fungerar korrekt. Problemet kan vara att dropdown för att välja stegmall inte visas ordentligt eller att staten inte sparas. Behöver kontrollera att:
- `treatmentTemplates` laddas korrekt
- `selectedTemplates` state uppdateras

### 2. Saknar objektmallar
Idag måste man skriva objektnamn manuellt. Användaren vill kunna välja från fördefinierade objekt-mallar, precis som för behandlingssteg.

---

## Lösning

### Del 1: Databas - Ny tabell för objektmallar

```text
Tabell: object_templates
+------------+--------+-----------------------+
| Kolumn     | Typ    | Beskrivning           |
+------------+--------+-----------------------+
| id         | uuid   | Primärnyckel          |
| name       | text   | Mallnamn (t.ex. "Ram")|
| created_at | timestamp | Skapad             |
+------------+--------+-----------------------+
```

RLS-policies som matchar `treatment_step_templates`.

### Del 2: Ny hook - useObjectTemplates

Skapa `src/hooks/useObjectTemplates.ts` som speglar `useTreatmentSteps.ts`:
- `templates` - lista med alla objektmallar
- `addTemplate(name)` - lägg till ny mall
- `updateTemplate(id, name)` - uppdatera mall
- `deleteTemplate(id)` - ta bort mall

### Del 3: Uppdatera inställningssidan

Ändra `src/pages/TreatmentSteps.tsx` till att hantera **båda** typer av mallar:
- Flikar: "Behandlingssteg" | "Objekt"
- Samma UI för båda - lista med möjlighet att lägga till, redigera, ta bort

Alternativt: Byt namn på sidan till "Inställningar" eller skapa ny sida.

### Del 4: Uppdatera OrderObjectsEditor

Ändra hur objekt läggs till:
- Ersätt fritextfält med Select-dropdown som visar tillgängliga objektmallar
- Behåll möjlighet att skriva eget namn (input bredvid eller "Annan..." i dropdown)

**Ny UI för att lägga till objekt:**
```text
┌────────────────────────────────────────────────────────────┐
│ [Välj objektmall... ▼]  eller  [Eget namn...]  [Lägg till] │
└────────────────────────────────────────────────────────────┘
```

---

## Filer att ändra

| Fil | Ändring |
|-----|---------|
| **Ny migration** | Skapa `object_templates` tabell med RLS |
| `src/hooks/useObjectTemplates.ts` | **Ny fil** - hook för objektmallar |
| `src/pages/TreatmentSteps.tsx` | Lägg till flik för objektmallar |
| `src/components/OrderObjectsEditor.tsx` | Använd dropdown för att välja objektmall |
| `src/pages/CreateOrder.tsx` | Säkerställ att objektmallar kan väljas vid skapande |

---

## Detaljerade ändringar

### 1. Migration (SQL)
```sql
CREATE TABLE object_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE object_templates ENABLE ROW LEVEL SECURITY;

-- RLS policies (samma mönster som treatment_step_templates)
```

### 2. useObjectTemplates.ts
Samma struktur som `useTreatmentSteps.ts`:
- Fetcha från `object_templates`
- CRUD-funktioner
- State-hantering

### 3. TreatmentSteps.tsx → Inställningar med flikar
```text
┌─────────────────────────────────────────────────────────────┐
│  Inställningar                                              │
├─────────────────────────────────────────────────────────────┤
│  [Behandlingssteg]  [Objektmallar]                          │
├─────────────────────────────────────────────────────────────┤
│  BEHANDLINGSSTEG-FLIKEN:                                    │
│  [Nytt stegnamn.....................] [Lägg till]           │
│  ┌───────────────────────────────────────────────┐          │
│  │ Blästring                    [Redigera] [Ta bort] │      │
│  │ Målning                      [Redigera] [Ta bort] │      │
│  │ Sprutzink                    [Redigera] [Ta bort] │      │
│  └───────────────────────────────────────────────┘          │
│                                                             │
│  OBJEKTMALLAR-FLIKEN:                                       │
│  [Nytt objektnamn...................] [Lägg till]           │
│  ┌───────────────────────────────────────────────┐          │
│  │ Ram vänster                  [Redigera] [Ta bort] │      │
│  │ Ram höger                    [Redigera] [Ta bort] │      │
│  │ Motorblock                   [Redigera] [Ta bort] │      │
│  └───────────────────────────────────────────────┘          │
└─────────────────────────────────────────────────────────────┘
```

### 4. OrderObjectsEditor.tsx - Nytt gränssnitt för att lägga till objekt
```text
Befintligt (bara fritext):
[Nytt objektnamn...] [Lägg till]

Nytt (dropdown + fritext):
[Välj objektmall... ▼] [Lägg till]
--- eller ---
[Eget namn...] [Lägg till som eget]
```

**Alternativ implementation:** En Select med "Skriv eget..." som sista val som visar input-fältet.

---

## Teknisk implementation för OrderObjectsEditor

```typescript
// I OrderObjectsEditor.tsx
const { templates: objectTemplates } = useObjectTemplates();

// State för val av mall vs eget namn
const [selectedTemplateId, setSelectedTemplateId] = useState('');
const [useCustomName, setUseCustomName] = useState(false);
const [customObjectName, setCustomObjectName] = useState('');

const handleAddObject = () => {
  let name = '';
  
  if (useCustomName) {
    name = customObjectName.trim();
  } else {
    const template = objectTemplates.find(t => t.id === selectedTemplateId);
    name = template?.name || '';
  }
  
  if (!name) return;
  
  const newObject: OrderObject = {
    id: crypto.randomUUID(),
    name,
  };
  
  onObjectsChange([...objects, newObject]);
  // Reset state...
};
```

---

## Navigering

Uppdatera Layout.tsx:
- Ändra "/steps" → "Inställningar" (eller behåll "Behandlingssteg" och visa flikar inuti)

