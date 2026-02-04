
Mål
- Orderns detaljvy på mobil ska aldrig kapa innehåll på höger sida.
- Pris och åtgärdsknappar ska alltid vara synliga utan att man behöver “gissa” att det finns sid-scroll.
- Inga konstiga radbrytningar som trycker ut layouten; långa texter ska brytas eller kapslas snyggt.

Varför det blir avklippt nu (rotorsak)
1) Artikelraderna renderas som en klassisk tabell med många kolumner. På mobil hamnar “Pris”, “Summa” och knapparna utanför viewporten. Det vi gjorde senast (min-w + overflow-x-auto) gör att innehållet tekniskt sett finns, men kräver horisontell scroll i en liten yta (och kan dessutom upplevas som “borta”).
2) Vi har lagt overflow-hidden på wrappern i OrderDetails för att stoppa horisontell overflow. Om någon del (t.ex. negativ marginal, långa badges/knappar) sticker ut, så blir resultatet klippning i stället för att layouten anpassar sig.
3) Det finns fler “nowrap”-ytor (whitespace-nowrap) i t.ex. steg-badges/knappar och vissa headers. En enda lång text kan då bli bredare än skärmen och pressa ut allt.

Åtgärdsstrategi (fixa det på riktigt, inte maskera)
- Ta bort horisontella “tabellproblem” genom att byta till mobilkort (card-list) i detaljvyn där det behövs.
- Eliminera källor till overflow: ta bort nowrap där det kan bli långt, lägg till break-words/whitespace-normal och se till att flexbarn har min-w-0.
- Undvika “overflow-hidden som plåster” på stora wrappers. Om vi behöver en sista säkerhetslina använder vi overflow-x-clip på en mer kontrollerad nivå (och bara efter att källorna är fixade).

Konkreta ändringar (filer)

1) src/pages/OrderDetails.tsx (sluta klippa sidan)
- Ändra yttersta innehållswrappern från:
  - `overflow-hidden max-w-full`
  till:
  - `max-w-full min-w-0` (utan overflow-hidden)
- Ändra grid-wrappers på samma sätt:
  - ta bort `overflow-hidden` där vi satt det på grid och huvudkolumnen
  - behåll/addera `min-w-0` på flex/grid-barn så de får lov att krympa
Syfte:
- Inget ska “kapas” på höger sida av en generisk overflow-hidden. Allt ska istället anpassas av layouten.

2) src/components/ArticleRowsEditor.tsx (gör pris + knappar alltid synliga på mobil)
- Implementera två renderingar:
  A) Desktop/tablet (>= sm): behåll tabellen (nuvarande) för effektiv överblick.
  B) Mobil (< sm): byt till “kort-layout” per artikelrad.
- Teknik:
  - Importera `useIsMobile` från `@/hooks/use-mobile`
  - `const isMobile = useIsMobile()`
  - `if (isMobile) return <MobileArticleRows .../>` annars tabell.
- Mobilkort-layout (per rad):
  - Visa överst: Radnr + Artikelnr (vänster), “Summa” (höger)
  - Under: Beskrivning (break-words)
  - Under: ett litet 2x2-grid med Antal/Enhet/Pris/Summa (så “Pris” alltid syns)
  - Prislista-badge under beskrivning (som idag)
  - Åtgärder (Redigera/Ta bort) som tydliga knappar inom kortet (aldrig i en “sista kolumn” utanför skärmen)
- Edit mode på mobil:
  - När man trycker Redigera: visa inputs staplade (Rad, Artikelnr, Beskrivning, Antal, Enhet, Pris)
  - “Spara” / “Avbryt” som stora knappar i kortets botten
- “Lägg till artikelrad” på mobil:
  - Antingen ett “Lägg till”-kort som expanderar till samma staplade inputs
  - (Minimerar risken att en tabellrad hamnar utanför skärmen)
- Rensa bort den senaste “table scroll”-lösningen på mobil:
  - Ta bort `min-w-[600px]`-beroendet för mobil rendering (det hör bara hemma i desktop-tabellen om alls)
  - Ta bort `-mx-4 px-4`-hack för mobil-läget (inte behövs när vi inte tabellscrollar)

Resultat:
- Priset blir alltid synligt direkt på mobil.
- Inga “knappar på höger sida som man inte ser”.

3) src/components/OrderObjectsEditor.tsx (förhindra att objekt-headrar/badges trycker ut sidan)
- Objekt-header (row 1):
  - Ta bort konstruktioner som kan skapa overflow på mobil:
    - `ml-auto` + `whitespace-nowrap` i samma flexrad kan putta ut ikoner.
  - Strukturera om så att:
    - Namn har `flex-1 min-w-0 truncate`
    - Summering antingen hamnar på rad 2 på mobil, eller får wrap/shorten utan att putta ut actions
    - Actions (penn-ikon etc) ligger i en `shrink-0`-container som aldrig hamnar utanför skärmen
- Steg-badges (row 2):
  - Byt `whitespace-nowrap` till `whitespace-normal break-words`
  - Lägg `max-w-full` så en badge aldrig kan bli bredare än kortet
Syfte:
- Inget i objekt-headern ska kunna skapa horisontell overflow eller klippning.

4) src/components/ObjectTrucksEditor.tsx (stegknappar ska aldrig kunna bli bredare än skärmen)
- Stegknapparna har idag `whitespace-nowrap`, vilket kan skapa en knapp som blir bredare än viewport om stegnamnet är långt.
- Ändra knappklasser:
  - ta bort `whitespace-nowrap`
  - lägg `whitespace-normal break-words max-w-full`
  - gärna `leading-tight` + `text-left` så fler-raders knapp ser snygg ut
- Ändra layout för stegknappar på mobil:
  - ersätt flex-wrap med en stabil grid på mobil:
    - `grid grid-cols-1 gap-2 sm:flex sm:flex-wrap sm:gap-2` (säkraste, aldrig overflow)
    - alternativt `grid-cols-2` om ni vill ha mindre scroll; men `grid-cols-1` är “bombsäker” för långa namn.
Resultat:
- Stegknappar kan aldrig trycka ut höger sida.
- Knapparna ligger alltid i skärmen och är enkla att trycka på.

5) (Endast om det fortfarande finns 1–2px “mystery overflow”) Global säkerhetslina
- Lägg en mycket försiktig CSS-säkring i src/index.css:
  - `html, body { max-width: 100%; overflow-x: clip; }`
- Detta gör vi bara om vi efter ovanstående fortfarande ser minimal horisontell overflow från tredjeparts-komponenter (popover etc).
- Viktigt: vi ska inte använda detta för att dölja riktiga layoutproblem (därför kommer detta sist).

Testplan (snabb, praktisk)
1) Öppna en order i detaljvy på mobil (360–390px bredd):
   - Artikelrader: kontrollera att “Pris” och “Summa” syns direkt utan sid-scroll
   - Åtgärdsknappar (redigera/ta bort) syns och går att trycka
2) Testa “Redigera artikelrad” på mobil:
   - Inga inputs/knappar hamnar utanför skärmen
3) Testa objekt med lång titel och långt stegnamn:
   - Inga element skapar horisontell scroll eller klippning
4) Testa bifogade filer (PDF/bild):
   - Filnamn trunceras, preview håller sig inom kortet
5) Testa på /production också snabbt (så vi inte råkar introducera overflow där via gemensamma komponenter)

Leverans (vad du ska se efter fix)
- Inget är avklippt på höger sida i orderdetaljvyn.
- Pris syns alltid i artikelrader på mobil.
- Alla knappar ligger inom skärmen och är lätta att trycka på.
