
# Plan: Fixa "Nästa steg" och kolumnnamn i orderöversikten

## Problemanalys

### Problem 1: "Nästa steg" visar fel
Funktionen `getNextStep()` i `OrdersTable.tsx` tittar på `order.steps` som är steg på ordernivå. Men i nuvarande datamodell:
- Behandlingssteg är kopplade till **objekt** (via `objectId`)
- Status spåras på **arbetskortsnivå** (via `truck.stepStatuses`)
- `order.steps[].status` uppdateras inte längre korrekt

### Problem 2: Fel kolumnrubrik
Kolumnen heter "Truckar" men ska heta **"Arbetskort"** enligt systemets terminologi.

---

## Lösning

### Ändring 1: Uppdatera `getNextStep()` för att läsa från arbetskort

Ny logik som läser från objektens arbetskort:

```typescript
const getNextStep = (order: Order): string => {
  // Samla alla stegstatusar från alla arbetskort
  const allStepStatuses = (order.objects || [])
    .flatMap(obj => (obj.trucks || [])
      .filter(t => t.status === 'arrived' || t.status === 'started')
      .flatMap(t => t.stepStatuses.map(ss => ({
        ...ss,
        stepName: order.steps.find(s => s.id === ss.stepId)?.name || 'Okänt steg'
      })))
    );
  
  // Hitta pågående steg
  const inProgress = allStepStatuses.find(ss => ss.status === 'in_progress');
  if (inProgress) return `Pågår: ${inProgress.stepName}`;
  
  // Hitta nästa väntande steg
  const pending = allStepStatuses.find(ss => ss.status === 'pending');
  if (pending) return `Nästa: ${pending.stepName}`;
  
  // Kolla om alla arbetskort är klara
  const allTrucks = (order.objects || []).flatMap(obj => obj.trucks || []);
  if (allTrucks.length > 0 && allTrucks.every(t => t.status === 'completed')) {
    return 'Alla klara';
  }
  
  return '-';
};
```

### Ändring 2: Byt kolumnrubrik från "Truckar" till "Arbetskort"

```typescript
// Rad 229
<TableHead className="w-[140px]">Arbetskort</TableHead>
```

---

## Filändringar

| Fil | Ändring |
|-----|---------|
| `src/components/OrdersTable.tsx` | Uppdatera `getNextStep()` för att läsa från arbetskort. Byt rubrik "Truckar" → "Arbetskort". |

---

## Visuellt resultat

### Före
| Nästa steg | Truckar |
|------------|---------|
| -          | 🚛 1    |

### Efter
| Nästa steg       | Arbetskort |
|------------------|------------|
| Nästa: Målning RAL7040 | 📋 1 (1 klar) |

