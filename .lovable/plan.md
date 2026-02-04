

# Plan: Utskrift av arbetskort med QR-kod

## Sammanfattning

Bygger en utskriftsfunktion för arbetskort - ett snyggt orienteringsblad som följer jobbet fysiskt i verkstaden. QR-koden leder direkt till ordern i systemet.

---

## Design av arbetskort (A4 utskrift)

```text
┌────────────────────────────────────────────────────────────────┐
│                                                                │
│    ╔══════════════════════════════════════════════════════╗    │
│    ║                     ARBETSKORT                       ║    │
│    ╚══════════════════════════════════════════════════════╝    │
│                                                                │
│   ┌────────────────────────────────┐   ┌──────────────────┐   │
│   │                                │   │                  │   │
│   │  #21270                        │   │    ██████████    │   │
│   │  (Arbetskort-ID, stor text)    │   │    ██  QR  ██    │   │
│   │                                │   │    ██ CODE ██    │   │
│   │  BALKBLÄSTRING                 │   │    ██████████    │   │
│   │  (Objekttyp)                   │   │                  │   │
│   │                                │   │  Skanna för att  │   │
│   │  Order: ORD-2024-0147          │   │  öppna i systemet│   │
│   │  Kund: Skaraborg Stål AB       │   │                  │   │
│   │                                │   └──────────────────┘   │
│   └────────────────────────────────┘                           │
│                                                                │
│   ─────────────────────────────────────────────────────────    │
│                                                                │
│   ARBETSMOMENT                                                 │
│                                                                │
│     1. Blästring                                               │
│     2. Sprutzink                                               │
│     3. Målning                                                 │
│     4. Torkning                                                │
│                                                                │
│   ─────────────────────────────────────────────────────────    │
│                                                                │
│           Uppdatera status genom att skanna QR-koden           │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

---

## QR-kod och URL-hantering

### QR-kod pekar till:
```
https://eeorder.lovable.app/order/{orderId}
```

### Autentiseringsflöde:
1. Användare skannar QR-kod på mobil/surfplatta
2. Om inloggad → öppnas orderdetaljer direkt
3. Om ej inloggad → redirect till login med `redirectUrl=/order/{orderId}`
4. Efter inloggning → användaren tas automatiskt till ordern

**Befintlig routing fungerar redan** - `/order/:id` finns i `App.tsx` och `ProtectedRoute` hanterar redan autentisering.

---

## Teknisk implementation

### 1. Nytt bibliotek för QR-koder

Installera `qrcode` för att generera QR som data-URL (kompatibelt med jsPDF):

```bash
npm install qrcode
npm install @types/qrcode --save-dev
```

### 2. Ny fil: `src/lib/workCardPrint.ts`

```typescript
import jsPDF from 'jspdf';
import QRCode from 'qrcode';
import type { ObjectTruck, OrderStep, Order } from '@/types/order';
import { getWorkUnitDisplayName } from '@/types/order';

interface WorkCardPrintData {
  truck: ObjectTruck;
  objectName: string;
  steps: OrderStep[];
  order: {
    id: string;
    orderNumber: string;
    customer: string;
  };
  baseUrl: string; // e.g. "https://eeorder.lovable.app"
}

export async function printWorkCard(data: WorkCardPrintData): Promise<void> {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  
  // Arbetskort ID - stor och tydlig
  const workCardId = getWorkUnitDisplayName(
    data.truck.truckNumber, 
    data.objectName, 
    data.truck.id
  );
  
  // Title
  doc.setFontSize(14);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100);
  doc.text('ARBETSKORT', pageWidth / 2, 25, { align: 'center' });
  
  // Arbetskort ID - STOR
  doc.setFontSize(36);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0);
  doc.text(workCardId, 20, 50);
  
  // Objekttyp
  doc.setFontSize(18);
  doc.setFont('helvetica', 'normal');
  doc.text(data.objectName.toUpperCase(), 20, 65);
  
  // Order och kund
  doc.setFontSize(12);
  doc.setTextColor(60);
  doc.text(`Order: ${data.order.orderNumber}`, 20, 80);
  doc.text(`Kund: ${data.order.customer}`, 20, 88);
  
  // QR-kod (höger sida)
  const orderUrl = `${data.baseUrl}/order/${data.order.id}`;
  const qrDataUrl = await QRCode.toDataURL(orderUrl, {
    width: 200,
    margin: 1,
    errorCorrectionLevel: 'M',
  });
  
  // Placera QR-kod till höger
  doc.addImage(qrDataUrl, 'PNG', pageWidth - 70, 30, 50, 50);
  
  // QR-kod text
  doc.setFontSize(8);
  doc.setTextColor(100);
  doc.text('Skanna för att öppna', pageWidth - 45, 85, { align: 'center' });
  doc.text('i systemet', pageWidth - 45, 90, { align: 'center' });
  
  // Separator
  doc.setDrawColor(200);
  doc.setLineWidth(0.5);
  doc.line(20, 105, pageWidth - 20, 105);
  
  // Arbetsmoment rubrik
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0);
  doc.text('ARBETSMOMENT', 20, 120);
  
  // Lista stegen
  doc.setFontSize(14);
  doc.setFont('helvetica', 'normal');
  let yPos = 135;
  
  data.steps.forEach((step, index) => {
    doc.text(`${index + 1}. ${step.name}`, 25, yPos);
    yPos += 12;
  });
  
  // Footer
  doc.setFontSize(9);
  doc.setTextColor(120);
  doc.text(
    'Uppdatera status genom att skanna QR-koden',
    pageWidth / 2,
    pageHeight - 20,
    { align: 'center' }
  );
  
  // Spara/öppna för utskrift
  doc.save(`arbetskort-${workCardId.replace('#', '')}.pdf`);
}
```

### 3. Utskriftsknapp i ObjectTrucksEditor

Lägg till en skrivarikon bredvid varje arbetskort:

```tsx
// I ObjectTrucksEditor.tsx

import { Printer } from 'lucide-react';
import { printWorkCard } from '@/lib/workCardPrint';

// Ny prop för att skicka med orderdata
interface ObjectTrucksEditorProps {
  // ... befintliga props
  orderInfo?: {
    id: string;
    orderNumber: string;
    customer: string;
  };
}

// I render för varje truck, efter redigera-knappen:
<Button
  variant="ghost"
  size="icon"
  className="h-6 w-6"
  onClick={async (e) => {
    e.stopPropagation();
    await printWorkCard({
      truck,
      objectName,
      steps: objectSteps,
      order: orderInfo,
      baseUrl: window.location.origin,
    });
  }}
  title="Skriv ut arbetskort"
>
  <Printer className="h-3 w-3" />
</Button>
```

### 4. Uppdatera OrderDetails.tsx

Skicka orderinfo till ObjectTrucksEditor via OrderObjectsEditor:

```tsx
// I OrderObjectsEditor - ny prop
interface OrderObjectsEditorProps {
  // ... befintliga
  orderInfo?: {
    id: string;
    orderNumber: string;
    customer: string;
  };
}

// Skicka vidare till ObjectTrucksEditor
<ObjectTrucksEditor
  // ... befintliga props
  orderInfo={orderInfo}
/>

// I OrderDetails.tsx
<OrderObjectsEditor
  // ... befintliga props
  orderInfo={{
    id: order.id,
    orderNumber: order.orderNumber,
    customer: order.customer,
  }}
/>
```

---

## Filändringar

| Fil | Ändring |
|-----|---------|
| `package.json` | Lägg till `qrcode` och `@types/qrcode` |
| `src/lib/workCardPrint.ts` | **NY FIL** - PDF-generering med QR-kod |
| `src/components/ObjectTrucksEditor.tsx` | Lägg till utskriftsknapp + ny prop för orderInfo |
| `src/components/OrderObjectsEditor.tsx` | Skicka orderInfo vidare till ObjectTrucksEditor |
| `src/pages/OrderDetails.tsx` | Skicka orderInfo till OrderObjectsEditor |

---

## Vad som INTE ingår

- ❌ Priser
- ❌ Fakturering
- ❌ Historik
- ❌ Checkboxar eller statusmarkeringar
- ❌ Manuell ifyllnad på pappret

---

## Resultat

1. **Utskriftsknapp** visas bredvid varje arbetskort
2. **Ett klick** genererar en PDF
3. **Snyggt arbetskort** med tydlig ID, objekttyp, kund och arbetsmoment
4. **QR-kod** som leder direkt till ordern i systemet
5. **Autentisering** sker automatiskt om användaren inte är inloggad

Arbetskortet blir en "vägvisare" i verkstaden - systemet är alltid källan till sanning.

