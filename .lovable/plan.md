# Plan: Förbättringar av orderhantering efter truckimplementering

## ✅ STATUS: IMPLEMENTERAT

Alla fyra förbättringar har implementerats:

1. ✅ **Optimistisk uppdatering** - Lokal state uppdateras direkt utan fetchOrders()
2. ✅ **Behandlingssteg i rad** - Horisontell layout med pilar när truckar finns
3. ✅ **Produktionsvyn** - Visar truckkort med stort nummer och aktuellt steg
4. ✅ **Truckhistorik** - Ny tabell `truck_status_history` med 3-kolumns visning i OrderDetails

---

## Implementerade ändringar

### 1. Optimistisk uppdatering (`src/contexts/OrdersContext.tsx`)
- `updateOrder()` uppdaterar nu lokal state direkt
- `updateTruckStepStatus()` ny funktion med optimistisk uppdatering
- Ingen flimmer vid ändringar i orderdetaljer

### 2. Horisontell layout (`src/components/OrderObjectsEditor.tsx`)
- Om truckar finns: steg visas som `Steg: Maskering → Blästring → Sprutzink`
- Om inga truckar: behåll vertikal lista med drag-drop

### 3. Produktionsvyn (`src/components/ProductionOrderCard.tsx`)
- Truckkort med stort trucknummer (#108)
- Visar aktuellt steg och status per truck
- Klara truckar visas kompakt på en rad

### 4. Truckhistorik
- Ny databastabell: `truck_status_history`
- Ny typ: `TruckStatusChange` i `src/types/order.ts`
- 3-kolumns historikvy i `src/pages/OrderDetails.tsx`
- Loggar varje truckstatus-ändring automatiskt
