

# Plan: Uppdatera Produktionsvyn för Objekt-hierarkin

## Sammanfattning
Uppdatera ProductionOrderCard för att visa ordrar med deras objekt och tillhörande behandlingssteg på ett tydligt, hierarkiskt sätt. Korten ska visa objektnamn som rubriker med sina steg under, samt hantera bakåtkompatibilitet för äldre ordrar utan objekt.

---

## Nuläge

**ProductionOrderCard** visar idag:
```
┌─────────────────────────────────────┐
│ 21210                               │
│ ┌──────────┐                        │
│ │ Ankommen │                        │
│ └──────────┘                        │
│                                     │
│ ○ Målning RAL7040                   │  ← Platt lista, inget objektnamn
│                                     │
│ ─────────────────────────────       │
│ Kund AB                             │
│ 📅 Leveransredo: 15 feb 2026        │
└─────────────────────────────────────┘
```

**Data i databasen:**
- Order 21210 har objekt "Stora Truck Delar" med steg "Målning RAL7040"
- Order 21330 har steg utan objekt (legacy)

---

## Ny design

```text
┌───────────────────────────────────────────┐
│ 21210                                     │
│ ┌──────────┐                              │
│ │ Ankommen │                              │
│ └──────────┘                              │
│                                           │
│ ▸ Stora Truck Delar                       │  ← Objektnamn som rubrik
│   ○ Målning RAL7040                       │  ← Steg indenterat under objekt
│   ● Blästring                             │
│                                           │
│ ▸ Motorblock                              │  ← Annat objekt
│   ◉ Sprutzink                             │
│                                           │
│ ─────────────────────────────────         │
│ Kund AB                                   │
│ 📅 Leveransredo: 15 feb 2026              │
└───────────────────────────────────────────┘
```

**För ordrar utan objekt (bakåtkompatibilitet):**
```text
│ ○ Maskering                               │  ← Steg utan objekt visas direkt
│ ● Blästring                               │
│ ○ Sprutzink                               │
```

---

## Filer att ändra

| Fil | Ändring |
|-----|---------|
| `src/components/ProductionOrderCard.tsx` | Gruppera steg per objekt, visa objektnamn som rubriker |
| `src/pages/ProductionScreen.tsx` | Uppdatera legend för att inkludera objektsymbol |

---

## Detaljerade ändringar

### 1. ProductionOrderCard.tsx

**Logik för att gruppera steg:**
```typescript
// Gruppera steg per objekt
const stepsWithObject = order.steps.filter(s => s.objectId);
const stepsWithoutObject = order.steps.filter(s => !s.objectId);

// Skapa map: objectId -> steg[]
const stepsByObject = new Map<string, OrderStep[]>();
stepsWithObject.forEach(step => {
  const list = stepsByObject.get(step.objectId!) || [];
  list.push(step);
  stepsByObject.set(step.objectId!, list);
});

// Hämta objektinfo från order.objects
const objectsWithSteps = (order.objects || []).filter(obj => 
  stepsByObject.has(obj.id)
);
```

**Ny renderingsstruktur:**
```tsx
<CardContent>
  {/* Steg utan objekt (legacy / bakåtkompatibilitet) */}
  {stepsWithoutObject.length > 0 && (
    <div className="space-y-2 mb-4">
      {stepsWithoutObject.map(step => (
        <StepRow key={step.id} step={step} />
      ))}
    </div>
  )}

  {/* Objekt med sina steg */}
  {objectsWithSteps.map(obj => (
    <div key={obj.id} className="mb-4">
      {/* Objektnamn som rubrik */}
      <div className="flex items-center gap-2 mb-2">
        <Box className="h-4 w-4 text-muted-foreground" />
        <span className="font-semibold text-foreground">{obj.name}</span>
      </div>
      
      {/* Steg för detta objekt, indenterade */}
      <div className="pl-6 space-y-2">
        {stepsByObject.get(obj.id)?.map(step => (
          <StepRow key={step.id} step={step} />
        ))}
      </div>
    </div>
  ))}
</CardContent>
```

**Extrahera StepRow som återanvändbar komponent:**
```tsx
function StepRow({ step }: { step: OrderStep }) {
  return (
    <div className="flex items-center gap-3">
      <div
        className={cn(
          'w-4 h-4 rounded-full ring-2 flex-shrink-0',
          stepStatusIcons[step.status].bg,
          stepStatusIcons[step.status].ring
        )}
      />
      <span
        className={cn(
          'text-lg',
          step.status === 'completed' && 'text-muted-foreground line-through',
          step.status === 'in_progress' && 'font-semibold text-foreground',
          step.status === 'pending' && 'text-muted-foreground'
        )}
      >
        {step.name}
      </span>
    </div>
  );
}
```

### 2. ProductionScreen.tsx - Uppdatera legend

Lägg till objekt-ikon i legenden:

```tsx
{/* Existing legend items */}
<span className="text-muted-foreground ml-2">Objekt:</span>
<div className="flex items-center gap-1">
  <Box className="h-3 w-3 text-muted-foreground" />
  <span className="text-xs">Orderobjekt</span>
</div>
```

---

## Visuella förbättringar

1. **Objektrubrik:**
   - Ikon: `Box` från lucide-react
   - Font: `font-semibold`, normal storlek
   - Färg: `text-foreground`

2. **Indenterade steg:**
   - Vänsterpadding: `pl-6` (24px)
   - Mindre stegindikator: `w-4 h-4` istället för `w-5 h-5`
   - Mindre text: `text-lg` istället för `text-xl`

3. **Avklarade steg:**
   - Lägg till `line-through` för `completed` steg för extra tydlighet

4. **Tomt objekttillstånd:**
   - Om ett objekt finns men har inga steg ännu, visa det ändå med "(inga steg)" text

---

## Testfall

1. Order med objekt och steg (21210) - ska visa objektnamn + indenterade steg
2. Order utan objekt (21330) - ska visa steg direkt (bakåtkompatibilitet)
3. Order med flera objekt - ska gruppera korrekt
4. Objekt utan steg - ska fortfarande visas
5. Blandning av steg med och utan objekt - ska hantera båda

