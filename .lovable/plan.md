

# Bevara flik- och filterval vid navigering

## Problem
Alla filterval, aktiv flik och soktext lagras i komponentens lokala `useState`. Nar du navigerar till en order och sedan tillbaka monteras `Index`-komponenten om fran scratch -- allt nollstalls till standardvarden (flik "active", status "created", etc.).

## Losning
Spara flik och filter i URL:ens query-parametrar (`useSearchParams` fran react-router-dom). Da bevaras de nar du navigerar tillbaka med webbläsarens bakåtknapp eller via länk.

### Vad som sparas i URL:en
- `tab` -- aktiv flik (active / invoicing / archive)
- `status` -- produktionsstatusfilter
- `billing` -- faktureringsfilter
- `deviation` -- avvikelsefilter
- `q` -- soktext (aktuella ordrar)
- `aq` -- soktext (arkiv)

Exempel-URL: `/?tab=archive&q=ABC123`

### Andring i en fil

**`src/pages/Index.tsx`**:

1. Ersatt `useState` for `searchQuery`, `archiveSearchQuery`, `filters` och tab-valet med `useSearchParams`
2. Skriv hjalpfunktioner som laser/skriver query-params
3. Tabs-komponenten anvander `value` + `onValueChange` istallet for `defaultValue`
4. Nar en anvandare klickar pa en order (Link till `/order/:id`) bevaras query-params automatiskt i webblasarhistoriken -- nar anvandaren trycker "tillbaka" atergar de till samma URL med samma filter

### Exempel pa hur det fungerar

```text
1. Anvandaren valjer fliken "Orderhistorik" och soker pa "ABC"
   -> URL andras till /?tab=archive&aq=ABC

2. Anvandaren klickar pa en order
   -> Navigerar till /order/123

3. Anvandaren trycker "tillbaka" i webblasaren
   -> Atergar till /?tab=archive&aq=ABC
   -> Fliken "Orderhistorik" visas med sokningen "ABC" kvar
```

### Teknisk detalj

```typescript
// Ersatt useState med useSearchParams
const [searchParams, setSearchParams] = useSearchParams();

const activeTab = searchParams.get('tab') || 'active';
const searchQuery = searchParams.get('q') || '';
const archiveSearchQuery = searchParams.get('aq') || '';

const filters = {
  productionStatus: (searchParams.get('status') || 'created') as OrderAdminStatus | 'all',
  billingStatus: (searchParams.get('billing') || 'all') as BillingStatus | 'all',
  hasDeviation: searchParams.get('deviation') === null ? null : searchParams.get('deviation') === 'yes',
};

// Uppdatera params utan att ersatta alla -- bevarar ovriga params
const updateParam = (key: string, value: string | null) => {
  setSearchParams(prev => {
    if (value === null || value === '') prev.delete(key);
    else prev.set(key, value);
    return prev;
  }, { replace: true });
};
```

### Vad som INTE andras
- OrderFilters-komponenten (tar emot samma props som idag)
- OrdersTable (oforandrad)
- Databaslogik eller API-anrop
- Realtidsuppdateringar

