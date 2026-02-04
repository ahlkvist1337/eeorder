
# Plan: Kompaktare objekt/steg med arbetskort i fokus

## Sammanfattning

Omstrukturerar UI:n för objekt och behandlingssteg så att arbetskortet blir det primära fokuset. Objektet blir mer av en rubrik/gruppering med behandlingssteg visade kompakt inline, medan arbetskorten är synliga från start och kan kollapsas vid behov.

---

## Nuvarande vs Nytt

| Aspekt | Nuvarande | Nytt |
|--------|-----------|------|
| **Objekt** | Stort collapsible block med header och content | Kompakt rubrikrad med steg inline |
| **Behandlingssteg** | Vertikal lista, tar mycket plats | Horisontella badges/chips, kompakt |
| **Arbetskort** | Gömd under "Arbetskort" collapse, stängt som default | Synligt direkt, öppet som default |
| **Hierarki** | Objekt → Steg → Arbetskort (nedåt) | Objekt (rubrik) → Arbetskort (primärt) med steg inline |

---

## Ny layout per objekt

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  ▾ MOTORHUV        [Målning] [SPZ] [Kontroll]    3 arbetskort • 1 klar  [✎][🗑]  │
├──────────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────────────────────┐ │
│  │ #135  [Ankommen ▾]   Målning ✓  SPZ ●  Kontroll ○           [✎][🖨][🗑] │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
│  ┌─────────────────────────────────────────────────────────────────────────┐ │
│  │ #136  [Väntande ▾]   Målning ○  SPZ ○  Kontroll ○           [✎][🖨][🗑] │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
│  ┌─────────────────────────────────────────────────────────────────────────┐ │
│  │ Motor A3F2  [Klar ▾]   Målning ✓  SPZ ✓  Kontroll ✓          [✎][🖨][🗑] │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│  [+ Lägg till arbetskort]                                                    │
│                                                                              │
│  ▸ Redigera steg...                   ← Dold section för att lägga till steg │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## Designprinciper

### 1. Objekthuvudet blir kompaktare
- Objektnamn + behandlingssteg som små chips (horisontellt)
- Sammanfattning av arbetskort ("3 st • 1 klar") i slutet
- Collapse-knapp för att dölja arbetskorten (inte objektet)

### 2. Arbetskorten synliga från start
- `isExpanded` default = `true` (öppet från start)
- Varje arbetskort är en kompakt rad med:
  - ID/namn (font-mono, bold)
  - Status-dropdown
  - Steg-badges inline
  - Åtgärdsknappar (edit, print, delete)

### 3. Steg-redigeringen gömd
- "Redigera steg..." knapp som expanderar till steg-lista
- Endast för production users
- Förhindrar att steg-listan tar plats i det dagliga arbetet

### 4. Kompaktare spacing
- Mindre padding, tightare gap
- Borders istället för bakgrundsfärger för separation
- Arbetskort-rader med minimal höjd

---

## Teknisk implementation

### ObjectTrucksEditor.tsx - Omstrukturering

**Ändring 1: Default expanded**
```typescript
// Ändra från false till true
const [isExpanded, setIsExpanded] = useState(true);
```

**Ändring 2: Kompaktare layout**
- Ta bort extra border-t och pt-3 mt-3
- Integrera direkt i objekt-innehållet
- Arbetskort-listan direkt synlig

### OrderObjectsEditor.tsx - Ny struktur

**Ändring 1: Kompaktare objekt-header**
- Flytta behandlingssteg till header som chips/badges
- Ta bort CollapsibleContent för steg
- Arbetskorten hamnar direkt under header

**Ändring 2: Steg i header**
```tsx
<div className="flex items-center gap-2 p-2 bg-muted/30 rounded-t-md">
  <Button variant="ghost" size="sm" onClick={toggle}>
    {isExpanded ? <ChevronDown /> : <ChevronRight />}
  </Button>
  <span className="font-medium">{obj.name}</span>
  
  {/* Behandlingssteg som kompakta chips */}
  <div className="flex gap-1 flex-1 flex-wrap">
    {objectSteps.map(step => (
      <Badge key={step.id} variant="outline" className="text-xs py-0 h-5">
        {step.name}
      </Badge>
    ))}
  </div>
  
  {/* Sammanfattning + actions */}
  <span className="text-xs text-muted-foreground">
    {trucks.length} kort • {completed} klar
  </span>
  {/* Edit/delete buttons */}
</div>
```

**Ändring 3: "Redigera steg" collapse**
```tsx
{/* Dold sektion för steg-hantering */}
{isProduction && (
  <Collapsible>
    <CollapsibleTrigger asChild>
      <Button variant="ghost" size="sm" className="text-xs">
        <Settings className="h-3 w-3 mr-1" />
        Redigera steg...
      </Button>
    </CollapsibleTrigger>
    <CollapsibleContent>
      {/* Steg-lista med drag-drop */}
    </CollapsibleContent>
  </Collapsible>
)}
```

### SortableStep.tsx - Kompaktare

Minska padding och storlek:
```tsx
className="flex items-center gap-1 bg-background rounded py-0.5"
```

---

## Filändringar

| Fil | Ändring |
|-----|---------|
| `src/components/OrderObjectsEditor.tsx` | Ny layout med steg i header, arbetskort primärt |
| `src/components/ObjectTrucksEditor.tsx` | Default expanded, ta bort extra wrapper |
| `src/components/SortableStep.tsx` | Kompaktare styling |

---

## Mobil-anpassning

- På mobil wrappas steg-chips till ny rad
- Arbetskort-raderna stackas vertikalt vid behov
- Åtgärdsknappar förblir kompakta

---

## Resultat

1. **Arbetskorten i fokus** - Synliga direkt när man öppnar en order
2. **Kompaktare objekt** - Behandlingssteg tar inte extra vertikalt utrymme
3. **Snabbare överblick** - Ser alla arbetskort och deras status direkt
4. **Flexibelt** - Kan kollapsa arbetskorten om man vill fokusera på annat
5. **Steg-redigering gömd** - Finns men stör inte det dagliga arbetet
