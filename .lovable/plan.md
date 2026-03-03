

# Plan: Lägg till steg direkt från objektraden

## Problem

"Lägg till steg"-kontrollen sitter gömd bakom expand-knappen (chevron `>`). Det är inte uppenbart att man måste klicka dit.

## Lösning

Lägg till en `+`-knapp på varje objektrad (bredvid print-knappen) som togglar en inline "välj steg + lägg till"-rad direkt under objektet. Samma sak med delete-knapp per objekt. Expand-sektionen (chevron) behövs då bara för att lägga till nya **objekt**.

### Ändring i `UnitsEditor.tsx`

**Objektraden (rad 432-475)** utökas med:
- En `+`-knapp och `🗑`-knapp per objekt (bredvid `🖨`)
- Ny state `addingStepForObject` som spårar vilka objekt som visar "lägg till steg"-raden
- När `+` klickas visas en rad under objektet med step-template-dropdown + "Lägg till"-knapp

Layout:
```
📦 Motorlåda  [Maskering ○] [Målning ●]    ➕ 🖨 🗑
  └ [Välj steg... v] [+ Steg]     ← visas när ➕ klickas
```

Expand-sektionen (rad 479-536) förenklas till att bara visa "Lägg till objekt"-kontrollerna.

### Påverkade filer

| Fil | Ändring |
|-----|---------|
| `src/components/UnitsEditor.tsx` | `+`/`🗑` på objektraden, inline steg-addering |

