

# Fix: Faktureringsstatus visar fel värde

## Problem
Faktureringsstatus visas på tre ställen men bara ett av dem använder den beräknade statusen (baserad på arbetskortsdata). De andra två visar det lagrade databasvärdet som kan vara inaktuellt.

| Plats | Fil | Rad | Nuvarande | Korrekt |
|-------|-----|-----|-----------|---------|
| Orderdetalj — header-badge | `OrderDetails.tsx` | 208 | `order.billingStatus` | `calculateOrderBillingStatus(order)` |
| Ordertabell — mobilvy | `OrdersTable.tsx` | 425 | `order.billingStatus` | `calculateOrderBillingStatus(order)` |
| Ordertabell — desktopvy | `OrdersTable.tsx` | 366 | `calculateOrderBillingStatus(order)` | ✅ Redan korrekt |

Dessutom använder filtreringen (rad 73) och sorteringen (rad 117-118) i OrdersTable det lagrade värdet, vilket gör att filter/sortering inte matchar den visade badgen. Dessa bör också använda den beräknade statusen.

## Ändringar

### 1. `src/pages/OrderDetails.tsx` (rad 208)
Byt `order.billingStatus` till `calculateOrderBillingStatus(order)` i header-badgen.

### 2. `src/components/OrdersTable.tsx` (rad 73, 117-118, 425)
- **Rad 73** (filter): Byt `order.billingStatus` till `calculateOrderBillingStatus(order)`
- **Rad 117-118** (sortering): Byt `a.billingStatus`/`b.billingStatus` till beräknade värden
- **Rad 425** (mobilvy): Byt `order.billingStatus` till `calculateOrderBillingStatus(order)`

