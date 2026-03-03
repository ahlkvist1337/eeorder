

# Plan: Produktionsvy (per objekt), UnitsEditor-layout, och addOrder-fix

## 1. Produktionsvy — ett kort per objekt (inte per enhet)

Baserat på bilderna du visade (bild 2-4) ser det bättre ut med **ett kort per objekt** i produktionsvyn. Fördelar:

- Varje objekt har sin egen ankomst/start-tidpunkt — ett kort per objekt visar exakt vilka som är aktiva
- Kortare kort = bättre översikt i grid-layouten
- Samma logik som V1 (ett kort per arbetskort/objekt)
- Enhetsnamnet (#141) visas fortfarande stort i varje kort som gemensam identifierare

**Ändring i `ProductionScreen.tsx`**: `getActiveTrucks` itererar över `unit.objects` istället för `unit` som helhet. Varje objekt med status `arrived`/`started` blir ett eget kort. Kortet visar enhetsnumret (#141) som rubrik, objektnamnet (Motorlåda) som underrubrik, och objektets egna steg.

**Ändring i `ProductionTruckCard.tsx`**: V2-kortet renderar ett enskilt objekt med dess steg — inte alla objekt i enheten.

## 2. UnitsEditor — knappar i en rad till höger

Flytta utskrift (🖨), plus (+), och radera (🗑) knappar till **samma rad som objektnamnet**, till höger. Bort med "Klar för fakturering"-badge på objektnivå för packade/levererade objekt — fakturering hanteras på enhetsnivå.

**Layout per objekt-rad**:
```text
📦 Motorlåda  [Status ▾]  [Packa]  [Leverera]  🖨  +  🗑
   Maskering ✓   Målning RAL7040 ○
```

## 3. addOrder — skicka status/billing_status

`addOrder` i `OrdersContext.tsx` (rad 712-718) saknar `status` och `billing_status` vid insert av `unit_objects`. Dessa nya kolumner behöver skickas med.

## Påverkade filer

| Fil | Ändring |
|-----|---------|
| `src/pages/ProductionScreen.tsx` | V2: ett FlatTruck per objekt istället för per enhet |
| `src/components/ProductionTruckCard.tsx` | V2-kort: visa enskilt objekt med steg, enhetsnamn som rubrik |
| `src/components/UnitsEditor.tsx` | Flytta knappar till objektradens högerssida, ta bort billing-badge på objekt |
| `src/contexts/OrdersContext.tsx` | addOrder: inkludera `status`/`billing_status` i unit_objects insert |

