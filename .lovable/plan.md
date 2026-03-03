

# Fix: V2 arbetskort PDF-layout

## Problem
I `printWorkCardV2Object` visas **objektnamnet** (t.ex. "STORA TRUCK DEL") som störst (36pt) och enheten som mindre text under. Användaren vill ha det tvärtom — mer likt originalformatet.

## Ändring i `src/lib/workCardPrint.ts` — `printWorkCardV2Object`

Byt ordning och storlek på rubrikerna:

1. **Enhetsnamn störst** (36pt, bold): `#6` (unitNumber)
2. **Objektnamn under** (18pt, normal): `STORA TRUCK DEL`
3. Order och kund under det (12pt, som idag)
4. Resten oförändrat — artiklar, arbetsmoment, QR-kod med objekt-parameter behålls

Konkret ändring i raderna 266-293:
```
// Unit number — BIG (was object name)
unitLabel (#6) → 36pt bold

// Object name — smaller underneath  
objectName → 18pt normal

// Order + kund — 12pt som innan
```

## Påverkade filer

| Fil | Ändring |
|-----|---------|
| `src/lib/workCardPrint.ts` | Byt ordning/storlek på enhetsnamn och objektnamn i `printWorkCardV2Object` |

