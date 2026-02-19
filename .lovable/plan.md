
# Automatisk statusuppdatering till "Startad" vid momentpåbörjande

## Vad ska hända

När en användare klickar på ett moment (behandlingssteg) och det byter status till "Pågående" (`in_progress`), ska arbetskortet automatiskt sätta sin status till **Startad** – oavsett om kortet är i "Väntande" eller "Ankommen" läge.

Flödet blir:
- Väntande → klickar moment → **Startad** (hoppar över Ankommen)
- Ankommen → klickar moment → **Startad**
- Startad → klickar moment → **Startad** (ingen förändring av kortstatus)
- Pausad → klickar moment → **Startad** (återupptas)

## Var i koden ändringen sker

**Fil:** `src/components/ObjectTrucksEditor.tsx`

I funktionen `handleStepStatusClick` (rad 102–150) finns idag redan logik som automatiskt sätter status till `completed` när alla steg är klara. Samma mönster används för att lägga till `started`-logik.

### Nuläge (förenklat)

```typescript
// Idag: hanterar bara auto-completed
if (nextStatus === 'completed') {
  // kontrollera om alla steg är klara → sätt truck-status till 'completed'
}
```

### Nytt beteende

```typescript
// Nytt: om ett steg sätts till in_progress och kortet inte är started/completed
if (nextStatus === 'in_progress') {
  const truckStatus = truck.status;
  if (truckStatus === 'waiting' || truckStatus === 'arrived' || truckStatus === 'paused') {
    onTruckStatusChange(truckId, 'started');
  }
}

// Befintlig: om ett steg sätts till completed och alla steg klara
if (nextStatus === 'completed') {
  // ... existerande logik ...
}
```

Ändringen görs på **två ställen** i funktionen – dels i grenen som använder `onTruckStepStatusChange` (callback till OrdersContext, raden som sparar till databasen), dels i den lokala uppdateringsgrenen (när callback saknas, t.ex. vid skapande av ny order).

## Filer som ändras

- `src/components/ObjectTrucksEditor.tsx` – lägg till auto-`started` logik i `handleStepStatusClick`

## Ingen databasändring krävs

Statusändringen för arbetskortet går redan via `onTruckStatusChange` som i sin tur anropar `OrdersContext` och sparar till databasen via upsert-logiken – samma väg som används när man manuellt ändrar status.
