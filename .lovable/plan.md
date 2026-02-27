
# Forbattrad statistik med tidsfilter och prisuppfoljning

## Sammanfattning

Gor om statistiksidan med:
1. **Tidsfilter** -- valj tidsperiod (28 dagar, 3 manader, 6 manader, sedan start)
2. **Ordrar med 0-prisartiklar** -- lista over ordrar som har artikelrader med pris 0, med direktlankar

## Andringar

### 1. `src/pages/Statistics.tsx` -- Huvudandring

**Tidsfilter (ny state + UI):**
- Lagg till en `Select`-komponent langst upp med alternativ: "Senaste 28 dagarna", "Senaste 3 manaderna", "Senaste 6 manaderna", "Sedan start"
- Filtrera `orders` baserat pa `createdAt` innan alla berakningar
- Alla existerande statistikkort uppdateras automatiskt baserat pa filtrerade ordrar

**Nytt avsnitt: "Ordrar med 0-pris artiklar":**
- Nytt block under "Affar & uppfoljning"
- Kort som visar antal ordrar med minst en artikelrad dar `price === 0`
- Under kortet: en klickbar lista/tabell med ordernummer, kund och antal 0-prisrader
- Varje rad ar en `Link` till `/order/:id` sa man snabbt kan navigera dit

### 2. `src/hooks/useProductionStats.ts` -- Stod for tidsfilter

- Lagg till en valfri `dateFilter: Date | null` parameter
- Filtrera lifecycle events baserat pa datumet for att berakningarna (klara idag, ledtid etc.) stammer med vald period

### Detaljerat flode

```text
+----------------------------------+
|  Statistik                       |
|  [Senaste 28 dagarna v]          |
+----------------------------------+
|  Produktion & flode              |
|  [Pagaende] [Vantande] [Klara]   |
|  [Forsenade]                     |
|  [Aldsta pagaende] [Ledtid snitt]|
+----------------------------------+
|  Affar & uppfoljning             |
|  [Aktiva] [Avslutade] [Faktur.]  |
|  [Avvikelser]                    |
|  [Fakturerat varde] [Klar f.fakt]|
|  [Planerad ledtid]               |
+----------------------------------+
|  Prisuppfoljning                 |
|  [X ordrar med 0-pris artiklar]  |
|  +------------------------------+|
|  | Ordernr | Kund | 0-pris rader||
|  | ON-123  | ABC  | 3 st    [->]||
|  | ON-456  | DEF  | 1 st    [->]||
|  +------------------------------+|
+----------------------------------+
```

### Teknisk implementation

**Statistics.tsx:**
```typescript
const [timePeriod, setTimePeriod] = useState<string>('28d');

const filteredOrders = useMemo(() => {
  if (timePeriod === 'all') return orders;
  const now = new Date();
  const cutoff = {
    '28d': subDays(now, 28),
    '3m': subMonths(now, 3),
    '6m': subMonths(now, 6),
  }[timePeriod];
  return orders.filter(o => new Date(o.createdAt) >= cutoff!);
}, [orders, timePeriod]);

// 0-pris ordrar
const zeroPriceOrders = useMemo(() => {
  return filteredOrders
    .map(o => ({
      ...o,
      zeroPriceCount: (o.articleRows || []).filter(r => r.price === 0).length,
    }))
    .filter(o => o.zeroPriceCount > 0);
}, [filteredOrders]);
```

**useProductionStats.ts:**
- Lagg till `dateFilter` parameter for att filtrera lifecycle events och trucks baserat pa vald period

### Filer som andras
1. `src/pages/Statistics.tsx` -- tidsfilter, filtrering, 0-pris-sektion
2. `src/hooks/useProductionStats.ts` -- stod for datumfiltrering
