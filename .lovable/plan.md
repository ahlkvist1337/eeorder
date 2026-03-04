

# Manuell override av faktureringsstatus (admin)

## Vad
En admin-knapp bredvid faktureringsstatusen i OrderDetails som öppnar en dialog för att manuellt ändra billing_status på orderns enheter/objekt. Logga vem och varför.

## Ändringar

### 1. Ny komponent: `src/components/BillingStatusOverrideDialog.tsx`
- Dialog med:
  - Dropdown: "Ej klar" (`not_billable`), "Klar för fakturering" (`ready_for_billing`), "Fakturerad" (`billed`)
  - Valfritt kommentarsfält ("Varför ändrad?")
  - Bekräfta-knapp
- Props: `orderId`, `open`, `onOpenChange`, `onConfirm(newStatus, comment)`

### 2. `src/pages/OrderDetails.tsx` (rad ~798-802)
- Bredvid `BillingStatusBadge` i Faktureringsstatus-sektionen, lägg till en liten knapp "Ändra" (synlig bara för `isAdmin`)
- Klick öppnar `BillingStatusOverrideDialog`
- `onConfirm` handler:
  - Uppdaterar alla unit_objects (V2) eller object_trucks (V1) till vald `billing_status` via supabase
  - Uppdaterar lokal state via `setOrders` eller refetch
  - Loggar ändringen till `truck_lifecycle_events` med `event_type: 'billing_override'`, `note: kommentar`, `changed_by_name`
  - Toast-bekräftelse

### 3. `src/contexts/OrdersContext.tsx`
- Ny funktion `overrideOrderBillingStatus(orderId, newBillingStatus, comment)`:
  - V2: uppdaterar alla `unit_objects` + `order_units` billing_status
  - V1: uppdaterar alla `object_trucks` billing_status
  - Loggar till `truck_lifecycle_events`
  - Uppdaterar lokal state
- Exponera i context interface

### Filöversikt

| Fil | Ändring |
|-----|---------|
| `src/components/BillingStatusOverrideDialog.tsx` | Ny dialog-komponent |
| `src/pages/OrderDetails.tsx` | Admin-knapp + dialog integration (~rad 798-802) |
| `src/contexts/OrdersContext.tsx` | Ny `overrideOrderBillingStatus` funktion |

