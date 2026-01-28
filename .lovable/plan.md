
# Plan: Produktionsskarm / TV-vy (MVP)

## Oversikt

Skapa en dedikerad read-only vy for stora skarmar i produktionen som visar aktiva ordrar (Ankommen/Startad) med automatisk uppdatering.

## Anvandargranssnitt

### Layout

```text
+----------------------------------------------------------------+
| PRODUKTIONSVY                           Senast uppdaterad 15:42 |
+----------------------------------------------------------------+
|                                                                 |
|  +-------------------+  +-------------------+  +--------------+ |
|  |     20740         |  |     20741         |  |    20742    |  |
|  |    [STARTAD]      |  |   [ANKOMMEN]      |  |  [STARTAD]  |  |
|  |                   |  |                   |  |             |  |
|  | O Blastring       |  | O Blastring       |  | * Malning   |  |
|  | * Malning         |  | O Sprutzink       |  | O Lackning  |  |
|  | O Lackning        |  | O Malning         |  |             |  |
|  |                   |  |                   |  |             |  |
|  | Kund: Sparepartner|  | Kund: ABB         |  | Kund: Volvo |  |
|  +-------------------+  +-------------------+  +--------------+ |
|                                                                 |
+----------------------------------------------------------------+
```

### Orderkort

Varje orderkort visar:
- **Ordernummer** - Stor text (2xl-3xl)
- **Produktionsstatus** - Fargkodad badge (stor)
- **Behandlingssteg** - Lista med visuella markeringar:
  - Gron cirkel (fylld) = Klart
  - Gul cirkel (fylld) = Pagaende (aktuellt steg)
  - Gra cirkel (tom) = Ej startat
- **Kundnamn** - Under stegen, mindre text

### Fargkodning for steg

```text
[*] Gron fylld cirkel = Klart (completed)
[O] Gul fylld cirkel  = Pagaende (in_progress)
[ ] Gra tom cirkel    = Vantar (pending)
```

## Tekniska andringar

### 1. Skapa ny sida: `src/pages/ProductionScreen.tsx`

Huvudkomponent som:
- Filterar ordrar (endast `arrived` och `started`)
- Visar orderkort i ett responsivt grid
- Hanterar automatisk uppdatering var 30 sekund
- Visar senaste uppdateringstid
- Anvandar stor typografi och hog kontrast

```typescript
// Pseudokod
const ProductionScreen = () => {
  const { orders, refreshOrders } = useOrders();
  
  // Filtrera aktiva ordrar
  const activeOrders = orders.filter(o => 
    o.productionStatus === 'arrived' || o.productionStatus === 'started'
  );
  
  // Auto-refresh var 30 sekund
  useEffect(() => {
    const interval = setInterval(refreshOrders, 30000);
    return () => clearInterval(interval);
  }, []);
  
  return (
    <div className="min-h-screen bg-background p-8">
      {/* Header */}
      {/* Grid med orderkort */}
    </div>
  );
};
```

### 2. Skapa ny komponent: `src/components/ProductionOrderCard.tsx`

Komponent for orderkort med:
- Stor ordernummertext
- Produktionsstatusbadge (stor variant)
- Steglista med visuella statusmarkeringar
- Kompakt kundinfo

```typescript
interface ProductionOrderCardProps {
  order: Order;
}

const ProductionOrderCard = ({ order }: ProductionOrderCardProps) => {
  // Hitta aktuellt steg (forsta in_progress, eller forsta pending om inget pagaende)
  const currentStep = order.steps.find(s => s.status === 'in_progress') 
    || order.steps.find(s => s.status === 'pending');
  
  return (
    <Card className="p-6">
      {/* Ordernummer */}
      {/* Status badge */}
      {/* Steglista */}
      {/* Kundnamn */}
    </Card>
  );
};
```

### 3. Uppdatera `src/App.tsx`

Lagg till ny route:

```typescript
<Route path="/production" element={<ProductionScreen />} />
```

### 4. Uppdatera navigationen (valfritt)

Eventuellt lagga till lank i Layout.tsx (kan ocksa nas direkt via URL).

## Filstruktur

```text
src/
  pages/
    ProductionScreen.tsx      (NY)
  components/
    ProductionOrderCard.tsx   (NY)
  App.tsx                     (UPPDATERA - ny route)
  components/
    Layout.tsx                (UPPDATERA - valfri navlank)
```

## Designdetaljer

### Typografi
- Ordernummer: `text-3xl font-bold`
- Statusbadge: `text-lg px-4 py-2`
- Stegnamn: `text-xl`
- Kundnamn: `text-lg text-muted-foreground`

### Farger (ateranvand befintliga CSS-variabler)
- Startad: `--status-started` (gul)
- Ankommen: `--status-arrived` (cyan/turkos)
- Steg klart: `--status-completed` (gron)
- Steg pagaende: `--status-started` (gul)
- Steg vantar: `--muted` (gra)

### Grid-layout
- Responsivt: 1 kolumn pa smal skarm, 2-3-4 kolumner pa storre
- `grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4`
- Gap: `gap-6`

### Auto-refresh
- Intervall: 30 sekunder
- Visar "Senast uppdaterad: HH:MM:SS" i headern
- Ingen manuell uppdateringsknapp (read-only)

## Atkomst

Produktionsskarmen nas via: `/production`

Ingen autentisering kravs (enligt projektets MVP-princip med direkt atkomst).

## Ej inkluderat (utanfor MVP)

- Manuell sortering av ordrar
- Filtrering utover status
- Fullskarmsknapp
- Ljud-/visuell notifikation vid forandringar
- Historik eller tidslinjer
