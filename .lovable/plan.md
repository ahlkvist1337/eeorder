

# Ta bort informationstexten "Beräknas från arbetskorten"

En enkel ändring i `src/pages/OrderDetails.tsx` (rad 576-579):

- Ta bort `<span>`-elementet med texten "Beräknas från arbetskorten"
- Behåll `BillingStatusBadge` som visar den beräknade statusen
- Ta även bort det omslutande `<div className="flex items-center gap-2">` eftersom det bara innehåller badgen efter ändringen

**Före:**
```tsx
<div className="flex items-center gap-2">
  <BillingStatusBadge status={calculateOrderBillingStatus(order)} />
  <span className="text-xs text-muted-foreground">Beräknas från arbetskorten</span>
</div>
```

**Efter:**
```tsx
<BillingStatusBadge status={calculateOrderBillingStatus(order)} />
```

