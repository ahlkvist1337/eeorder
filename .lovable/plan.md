
## Ändra standardfilter till "Aktiv"

### Vad ska ändras

I `src/pages/Index.tsx` initieras filtret idag med `productionStatus: 'all'`, vilket visar alla ordrar oavsett status. Användaren vill att standardvärdet istället ska vara `'created'` (som i UI visas som "Aktiv" och inkluderar alla aktiva produktionsstatusar: skapad, ankommen, startad, pausad).

### Nuläge

```typescript
const [filters, setFilters] = useState({
  productionStatus: 'all',   // ← visas alla statusar
  billingStatus: 'all',
  hasDeviation: null,
});
```

### Efter ändringen

```typescript
const [filters, setFilters] = useState({
  productionStatus: 'created', // ← visar bara aktiva ordrar som standard
  billingStatus: 'all',
  hasDeviation: null,
});
```

### Effekt

- Tabellen "Aktuella ordrar" visar direkt vid inladdning enbart aktiva ordrar (Aktiv-status)
- Avslutade och avbrutna ordrar döljs tills användaren manuellt väljer annan status i filtret
- "Rensa filter"-knappen återställer tillbaka till `'created'` (Aktiv) – inte `'all'`
- Arkiv-fliken påverkas inte alls

### Fil som ändras

- `src/pages/Index.tsx` – rad 28, ändra `productionStatus: 'all'` → `productionStatus: 'created'`
- `src/pages/Index.tsx` – rad 60 i `clearFilters`-funktionen i `OrderFilters`, återställ till `'created'` istället för `'all'` vid rensning

### Notering om "Rensa filter"

`clearFilters`-funktionen sitter i `src/components/OrderFilters.tsx`. Den återställer idag till `'all'`. Fråga är om "rensa filter" ska återgå till `'all'` eller `'created'`. Rimligt är att den återgår till `'created'` (aktiva) eftersom det är standardvyn – annars är det förvirrande att "rensa" leder till en annan vy än startläget. Denna ändring görs i `OrderFilters.tsx`.
