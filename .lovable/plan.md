

# Automation: Alla moment tillbaka till Ventande -> Arbetskort till Ankommen

## Vad

Nar ett moment klickas tillbaka till "Vantande" (fran "Pagaende"), och **alla andra moment** pa arbetskortet ocksa ar "Vantande", ska arbetskortet automatiskt aterstallas till status "Ankommen" (om det for narvarande ar "Startad" eller "Pausad").

Detta ar den omvanda logiken till den befintliga automationen som satter arbetskortet till "Startad" nar ett moment borjar.

## Andringar

### `src/components/ObjectTrucksEditor.tsx`

I funktionen `handleStepStatusClick` laggs en ny kontroll till i **bada grenarna** (med och utan `onTruckStepStatusChange`):

**Gren 1 (rad 114-135, med callbacks):** Efter den befintliga logiken for `in_progress` och `completed`, lagg till:
```typescript
if (truck && nextStatus === 'pending') {
  const allOthersPending = objectSteps.every(step => {
    if (step.id === stepId) return true; // detta steg blir just 'pending'
    const s = truck.stepStatuses.find(ss => ss.stepId === step.id);
    return !s || s.status === 'pending';
  });
  if (allOthersPending && (truck.status === 'started' || truck.status === 'paused')) {
    if (onTruckStatusChange) {
      onTruckStatusChange(truckId, 'arrived');
    }
  }
}
```

**Gren 2 (rad 137-168, lokal uppdatering):** Samma logik men direkt pa `updatedTruck`:
```typescript
if (nextStatus === 'pending') {
  const allPending = objectSteps.every(step => {
    if (step.id === stepId) return true;
    const s = updatedTruck.stepStatuses.find(ss => ss.stepId === step.id);
    return !s || s.status === 'pending';
  });
  if (allPending && (updatedTruck.status === 'started' || updatedTruck.status === 'paused')) {
    updatedTruck.status = 'arrived';
  }
}
```

Ingen annan fil behover andras. Logiken foljer exakt samma monster som de befintliga automationerna i samma funktion.

