
# Plan: Förtydliga steg vs arbetskort i objektvyn

## Problemanalys

### Nuvarande beteende
1. **Utan arbetskort**: Steg visas med status-dropdown per steg (förvirrande)
2. **Med arbetskort**: Steg visas horisontellt som kedja, status hanteras per arbetskort (korrekt)

### Problemet
- Status-dropdown på stegnivå (bild 1) skapar förväntning att stegstatus hanteras där
- Men enligt modellen är steg bara en *mall* - verklig status spåras per arbetskort
- Blandningen av två UI-mönster är förvirrande

---

## Lösning

### Ny princip

Steg på objektnivå = **definition av arbetsflöde** (ingen status)

Arbetskort = **verklig produktion** (status per steg)

### UI-förändringar

**Före (bild 1):**
```text
⋮ Maskering     [Väntande] [Väntande ▼] 🗑
⋮ Blästring     [Väntande] [Väntande ▼] 🗑
⋮ Sprutzink     [Väntande] [Väntande ▼] 🗑
```

**Efter:**
```text
Behandlingssteg:
⋮ Maskering  🗑
⋮ Blästring  🗑
⋮ Sprutzink  🗑
[Välj steg...] [+ Lägg till]

Arbetskort: Inga arbetskort
[ID (valfritt)...] [+ Lägg till]
```

### Ändringen
1. **Ta bort** status-badge och status-dropdown från `SortableStep`
2. Steg visas endast som en ordnad lista (drag-and-drop för sortering)
3. Status hanteras **endast** på arbetskortsnivå

---

## Tekniska ändringar

### 1. `SortableStep.tsx`

Ta bort:
- `StepStatusBadge`
- Status-dropdown (`Select`)
- `onStatusChange`-prop

Behåll:
- Drag-handle (för omordning)
- Stegnamn
- Ta bort-knapp

**Ny kod:**
```tsx
export function SortableStep({ step, onRemove }: SortableStepProps) {
  // ...sortable hooks...
  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-2">
      <button className="cursor-grab" {...attributes} {...listeners}>
        <GripVertical className="h-4 w-4" />
      </button>
      <span className="flex-1 text-sm">{step.name}</span>
      <Button onClick={() => onRemove(step.id)}>
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}
```

### 2. `OrderObjectsEditor.tsx`

Ta bort:
- `handleStepStatusChange`-funktionen
- Status-relaterade props till `SortableStep`

Behåll villkoret för horisontell/vertikal visning, men utan status.

### 3. `OrderStepsEditor.tsx` (legacy)

Används för unassigned steps. Ta bort status-hantering även här.

### 4. Typändringar

`OrderStep.status` behålls i typen (för bakåtkompatibilitet och legacy-data), men används inte i UI för nya objekt.

---

## Visuellt resultat

### Objektvy utan arbetskort
```text
┌─────────────────────────────────────────────────┐
│ ▼ Monteringsdetaljer              Inga arbetskort│
├─────────────────────────────────────────────────┤
│ Behandlingssteg:                                │
│ ⋮ Maskering                              🗑     │
│ ⋮ Blästring                              🗑     │
│ ⋮ Sprutzink                              🗑     │
│                                                 │
│ [Välj behandlingssteg...]  [+ Lägg till]       │
│ ─────────────────────────────────────────────── │
│ 📋 Inga arbetskort                              │
│ [ID (valfritt)...]  [+ Lägg till]              │
└─────────────────────────────────────────────────┘
```

### Objektvy med arbetskort
```text
┌─────────────────────────────────────────────────┐
│ ▼ Monteringsdetaljer   📋 1 st    1 plan • 0 klar│
├─────────────────────────────────────────────────┤
│ Steg: Maskering → Blästring → Sprutzink         │
│                                                 │
│ [Välj behandlingssteg...]  [+ Lägg till]       │
│ ─────────────────────────────────────────────── │
│ ▼ 📋 Arbetskort: 1 st • 0 klara                 │
│   #130  [Väntande ▼]  Maskering ○  Blästring ○  │
│                                                 │
│   [ID (valfritt)...]  [+ Lägg till]            │
└─────────────────────────────────────────────────┘
```

---

## Filer som ändras

| Fil | Ändring |
|-----|---------|
| `src/components/SortableStep.tsx` | Ta bort status-badge och dropdown |
| `src/components/OrderObjectsEditor.tsx` | Ta bort `handleStepStatusChange`, uppdatera props |
| `src/components/OrderStepsEditor.tsx` | Ta bort status-hantering (legacy) |

---

## Ingen databasändring

- `order_steps.status` behålls i databasen
- Befintliga värden används inte aktivt
- Nya steg skapas alltid med `status: 'pending'`

---

## Sammanfattning

| Före | Efter |
|------|-------|
| Steg har status-dropdown | Steg är bara en ordnad lista |
| Förvirrande rollfördelning | Tydlig separation: steg = mall, arbetskort = verklighet |
| Dubbel statushantering | Status endast på arbetskortsnivå |

Grundprincipen förstärks:
- **Steg** = vad som ska göras (definieras på objektnivå)
- **Arbetskort** = vad som faktiskt görs (status per enhet)
