

## Problem

Artikelrader syns inte på V2-arbetskort eftersom de filtreras med `articleRows?.filter(r => r.unitId === unit.id)` innan de skickas till utskriftsfunktionen. Artikelrader som saknar `unitId` (vilket är vanligt — fältet är valfritt) filtreras bort helt.

## Fix

### `src/components/UnitsEditor.tsx` (rad 472)

Ändra filtreringen så att artikelrader som tillhör enheten **eller** saknar `unitId` (globala rader) inkluderas:

```typescript
articleRows: articleRows?.filter(r => r.unitId === unit.id || !r.unitId),
```

Detta gör att:
- Rader kopplade till den specifika enheten visas
- Rader utan enhetskoppling (globala) visas på alla arbetskort

| Fil | Ändring |
|-----|---------|
| `src/components/UnitsEditor.tsx` | Inkludera artikelrader utan `unitId` i filtret vid utskrift |

