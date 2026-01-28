

# Plan: Lägg till kommentarfält vid XML-import + visa kommentar i orderöversikt

## Bakgrund

Användaren vill:
1. Kunna lägga till en kommentar direkt vid XML-import (istället för att behöva gå in på orderdetaljer efteråt)
2. Se kommentaren i orderöversikten (tabellen på startsidan)

## Lösning

### Del 1: Kommentarfält vid XML-import

Lägg till ett textfält för "Kommentar" i XML-import-formuläret, precis som det redan finns i det manuella formuläret.

**Uppdatera `src/pages/CreateOrder.tsx`:**

1. Lägg till state för XML-kommentar:
```typescript
const [xmlComment, setXmlComment] = useState('');
```

2. Lägg till kommentarfältet i XML-formuläret (efter behandlingssteg-sektionen):
```typescript
<div className="space-y-2">
  <Label htmlFor="xmlComment">Kommentar</Label>
  <Textarea
    id="xmlComment"
    value={xmlComment}
    onChange={e => setXmlComment(e.target.value)}
    placeholder="Eventuell kommentar..."
    rows={3}
  />
</div>
```

3. Inkludera kommentaren i `handleXmlSubmit`:
```typescript
const newOrder = {
  // ... befintliga fält ...
  comment: xmlComment.trim() || undefined,
};
```

4. Återställ kommentar när användaren väljer ny fil:
```typescript
onClick={() => {
  setParsedXml(null);
  setXmlSelectedSteps([]);
  setXmlComment('');
}}
```

### Del 2: Visa kommentar i orderöversikten

Lägg till en kolumn för kommentar i ordertabellen.

**Uppdatera `src/components/OrdersTable.tsx`:**

1. Lägg till en ikon-import:
```typescript
import { ArrowUpDown, AlertTriangle, MessageSquare } from 'lucide-react';
```

2. Lägg till kolumnhuvud (efter "Nästa steg"):
```typescript
<TableHead className="w-[200px]">Kommentar</TableHead>
```

3. Lägg till kolumndata i varje rad:
```typescript
<TableCell className="text-sm text-muted-foreground max-w-[200px] truncate" title={order.comment || ''}>
  {order.comment ? (
    <span className="flex items-center gap-1">
      <MessageSquare className="h-3 w-3 flex-shrink-0" />
      <span className="truncate">{order.comment}</span>
    </span>
  ) : '-'}
</TableCell>
```

## Resultat

- Användare kan skriva en kommentar direkt när de importerar XML
- Kommentaren syns i orderöversikten (trunkerad om den är lång, full text visas vid hover)
- Befintlig kommentarfunktionalitet i orderdetaljer påverkas inte

