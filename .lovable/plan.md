

## Analys

Buggen sitter i att UnitsEditor renderas **inuti** `<form>`-taggen i CreateOrder.tsx. HTML-knappar utan explicit `type="button"` defaultar till `type="submit"`, vilket betyder att varje knapptryck i UnitsEditor (t.ex. "Lagg till enhet") **samtidigt submitar formularet** och triggar `handleManualSubmit` -> `addOrder` -> redirect.

Dessutom saknar `onKeyDown`-hanteraren for Enter-tangenten (rad 599) ett `e.preventDefault()`, sa Enter i enhetsnamnfaltet ocksa submitar formularet.

## Fix

### `src/components/UnitsEditor.tsx`

Lagga till `type="button"` pa samtliga `<Button>`-element i komponenten som INTE ar avsedda att submita ett formular. Det gar alla knappar i komponenten -- ca 15 stycken:

- Rad 328, 330: Spara/Avbryt redigeringsknapp
- Rad 373: Redigera-knapp
- Rad 378: Duplicera-knapp  
- Rad 382: Expand/collapse-knapp
- Rad 392: Ta bort-enhet-knapp
- Rad 541, 555: Ta bort steg-knappar
- Rad 558: Lagg till steg-knapp
- Rad 580: Lagg till objekt-knapp
- Rad 602: Lagg till enhet-knapp
- Alla ovriga knappar i objektrader (skriv ut, ta bort objekt, statusdropdowns etc.)

Plus: Rad 599 -- lagga till `e.preventDefault()` i `onKeyDown`-hanteraren for Enter sa att Enter inte submitar formularet:
```typescript
onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddUnit(); } }}
```

### Ingen andring i CreateOrder.tsx

Formularet och `handleManualSubmit` fungerar korrekt -- problemet ar enbart att knappar i UnitsEditor triggar submit.

| Fil | Andring |
|-----|---------|
| `src/components/UnitsEditor.tsx` | `type="button"` pa alla Button-element + `e.preventDefault()` pa Enter |

