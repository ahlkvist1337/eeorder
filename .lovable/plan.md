

# Uppdatera importbeskrivning i PriceList.tsx

## Problem
Texten i importdialogen (rad 567) beskriver det gamla beteendet: "hämta alla unika kombinationer... Dubbletter hoppas över." Det stämmer inte längre -- importen uppdaterar nu befintliga grundpriser om orderns pris är högre, och lägger bara till helt nya artikelnummer.

## Fix
Uppdatera texten på rad 567 i `src/pages/PriceList.tsx` till att korrekt beskriva beteendet:

**Ny text:** "Detta importerar artikelnummer och priser från befintliga ordrar. Nya artikelnummer läggs till i prislistan. Befintliga artiklar uppdateras om orderns pris är högre än det nuvarande."

### Fil som ändras
- `src/pages/PriceList.tsx` -- rad 567

