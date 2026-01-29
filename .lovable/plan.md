

# Plan: Fixa problemet med att lägga till behandlingssteg

## Problemanalys

Problemet är att Radix UI Select-komponenten inte fungerar korrekt med tomma strängar (`''`) som värde. När användaren väljer ett steg i dropdown-menyn och klickar "Lägg till", har Select-komponenten redan nollställt värdet innan `handleAddStep` hinner köras.

Session replay bekräftar detta:
- Användaren väljer "Målning RAL7040" 
- Dropdown visar valt värde korrekt
- Vid klick på "Lägg till" nollställs dropdown direkt till placeholder
- Steget läggs inte till

## Lösning

Ändra från att använda tomma strängar till `undefined` för omarkerat tillstånd, och justera logiken så att den hanterar state korrekt.

---

## Ändringar

### Fil: `src/components/OrderObjectsEditor.tsx`

**1. Ändra `selectedTemplates` state-hantering (rad 46):**

Från:
```typescript
const [selectedTemplates, setSelectedTemplates] = useState<Record<string, string>>({});
```

Till:
```typescript
const [selectedTemplates, setSelectedTemplates] = useState<Record<string, string | undefined>>({});
```

**2. Ändra Select-komponenten för behandlingssteg (rad 337-357):**

Från:
```tsx
<Select 
  value={selectedTemplates[obj.id] || ''} 
  onValueChange={(v) => setSelectedTemplates(prev => ({ ...prev, [obj.id]: v }))}
>
```

Till (använd `undefined` istället för tom sträng och kontrollera att värdet inte är `_clear`):
```tsx
<Select 
  value={selectedTemplates[obj.id] ?? undefined} 
  onValueChange={(v) => {
    if (v !== '_clear') {
      setSelectedTemplates(prev => ({ ...prev, [obj.id]: v }));
    }
  }}
>
```

**3. Uppdatera `handleAddStep` för att spara valt värde först (rad 122-139):**

Alternativ approach - flytta logiken så att steget skapas direkt vid val:

Ändra från nuvarande logik till att ha en mellanliggande kontroll:

```typescript
const handleAddStep = (objectId: string) => {
  const templateId = selectedTemplates[objectId];
  if (!templateId) {
    console.log('No template selected for object', objectId);
    return;
  }
  
  const template = treatmentTemplates.find(t => t.id === templateId);
  if (!template) {
    console.log('Template not found:', templateId);
    return;
  }

  const newStep: OrderStep = {
    id: crypto.randomUUID(),
    templateId: template.id,
    name: template.name,
    status: 'pending',
    objectId,
  };

  onStepsChange([...steps, newStep]);
  // Nollställ efter att steget lagts till
  setSelectedTemplates(prev => {
    const next = { ...prev };
    delete next[objectId];
    return next;
  });
};
```

**4. Uppdatera Button disabled-logik (rad 361):**

Från:
```tsx
disabled={!selectedTemplates[obj.id]}
```

Till (säkerställ korrekt kontroll):
```tsx
disabled={!selectedTemplates[obj.id] || selectedTemplates[obj.id] === ''}
```

---

## Sammanfattning

| Rad | Ändring |
|-----|---------|
| 46 | Ändra type till `Record<string, string \| undefined>` |
| 337-339 | Använd `undefined` istället för `''` och verifiera onValueChange |
| 122-139 | Förbättra `handleAddStep` med debug-loggar och korrekt nollställning |
| 361 | Uppdatera disabled-logik |

Detta fixar problemet genom att säkerställa att:
1. State hanteras korrekt med `undefined` för "inget val"
2. Select-komponenten inte råkar ut för race condition
3. Steget läggs till innan state nollställs

