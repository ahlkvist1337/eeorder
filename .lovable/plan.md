
# Plan: Tre förbättringar

## Sammanfattning

| Punkt | Problem | Lösning |
|-------|---------|---------|
| 1. Sidnummer i PDF | Fakturaunderlag saknar sidnumrering | Lägg till "Sida X av Y" i sidfot |
| 2. Stora stegknappar på desktop | min-h-[44px] och stor padding är för stora | Minska storlek på desktop, behåll mobilvänligt |
| 3. Dubletter "Aktiv" i filter | 4 statusar visar alla "Aktiv" | Visa endast unika statusar i dropdown |

---

## 1. Lägg till sidnummer i PDF-export

### Problem
PDF-export av fakturaunderlag har ingen sidnumrering, vilket gör det svårt att navigera i längre dokument.

### Lösning
Lägg till "Sida X av Y" i sidfoten på varje sida efter att dokumentet är färdigt.

### Ändringar i src/lib/invoiceExportPdf.ts

```typescript
// After all content is added, loop through pages and add page numbers
const pageCount = doc.getNumberOfPages();
for (let i = 1; i <= pageCount; i++) {
  doc.setPage(i);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(128);
  doc.text(
    `Sida ${i} av ${pageCount}`,
    pageWidth / 2,
    doc.internal.pageSize.getHeight() - 10,
    { align: 'center' }
  );
}
```

---

## 2. Minska storlek på stegknappar (desktop)

### Problem
Stegknapparna i arbetskort har `min-h-[44px]` och `py-2 px-4` vilket är bra för mobil men onödigt stort på desktop.

### Nuvarande kod (rad 259-267)
```typescript
className={cn(
  'px-4 py-2 rounded-md text-sm font-medium transition-colors hover:opacity-80 min-h-[44px] whitespace-normal break-words text-left leading-tight max-w-full',
  colors.bg,
  colors.text
)}
```

### Lösning
Använd responsiva klasser: mindre padding och höjd på desktop, behåll 44px på mobil för touch.

```typescript
className={cn(
  'px-3 py-1.5 sm:px-2 sm:py-1 rounded-md text-sm font-medium transition-colors hover:opacity-80 min-h-[44px] sm:min-h-0 whitespace-normal break-words text-left leading-tight max-w-full',
  colors.bg,
  colors.text
)}
```

### Fil som ändras
- `src/components/ObjectTrucksEditor.tsx`

---

## 3. Ta bort dubletter i statusfilter

### Problem
`productionStatusLabels` mappar 4 olika statusar (`created`, `arrived`, `started`, `paused`) till samma text "Aktiv", vilket skapar 4 identiska "Aktiv"-alternativ i dropdown.

```typescript
// Nuvarande kod i OrderFilters.tsx rad 93-95:
{Object.entries(productionStatusLabels).map(([value, label]) => (
  <SelectItem key={value} value={value}>{label}</SelectItem>
))}
```

### Lösning
Använd `orderAdminStatusLabels` istället som bara har 3 unika värden:
- `created` → "Aktiv"
- `completed` → "Avslutad"
- `cancelled` → "Avbruten"

### Ändringar i src/components/OrderFilters.tsx

```typescript
// Ändra import (rad 11)
import { orderAdminStatusLabels, billingStatusLabels } from '@/types/order';
import type { OrderAdminStatus, BillingStatus } from '@/types/order';

// Uppdatera interface (rad 15)
productionStatus: OrderAdminStatus | 'all';

// Uppdatera handler (rad 28-29)
productionStatus: value as OrderAdminStatus | 'all',

// Byt ut loop (rad 93-95)
{Object.entries(orderAdminStatusLabels).map(([value, label]) => (
  <SelectItem key={value} value={value}>{label}</SelectItem>
))}
```

### Behöver även uppdatera typen i gränssnittet
- `src/pages/Index.tsx` - uppdatera filter state type

---

## Teknisk översikt

```text
┌─────────────────────────────────────────────────────────────┐
│                      ÄNDRINGAR                               │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  src/lib/invoiceExportPdf.ts                                │
│  └─ Lägg till sidnummer i sidfot efter innehåll             │
│                                                             │
│  src/components/ObjectTrucksEditor.tsx                      │
│  └─ Minska padding/höjd på stegknappar för desktop          │
│                                                             │
│  src/components/OrderFilters.tsx                            │
│  └─ Byt productionStatusLabels → orderAdminStatusLabels     │
│                                                             │
│  src/pages/Index.tsx                                        │
│  └─ Uppdatera filter type till OrderAdminStatus             │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Testplan

1. **Sidnummer PDF**: Exportera fakturaunderlag med flera ordrar → kontrollera att "Sida 1 av X" visas i sidfoten på varje sida
2. **Stegknappar**: Öppna en order på desktop → stegknapparna ska vara kompaktare; på mobil ska de fortfarande vara touchvänliga
3. **Statusfilter**: Öppna orderöversikten → statusfiltret ska visa "Alla statusar", "Aktiv", "Avslutad", "Avbruten" (inga dubletter)
