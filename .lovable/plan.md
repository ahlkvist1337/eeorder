
# Plan: Förbättrad statistik med produktionsfokus

## Sammanfattning

Delar upp statistiksidan i två tydliga block:
1. **Affär & uppföljning** (befintligt) - ordrar, fakturering, avvikelser
2. **Produktion & flöde** (nytt) - arbetskort i realtid

Inga diagram eller trender - bara siffror som hjälper att prioritera och se problem tidigt.

---

## Nya produktionsnyckeltal

### Block A: Arbetskort just nu
| Nyckeltal | Källa | Beskrivning |
|-----------|-------|-------------|
| Pågående | `status = 'arrived' OR 'started'` | Hur mycket har vi på golvet? |
| Väntande | `status = 'waiting'` | Vad väntar på ankomst? |
| Klara idag | `lifecycle_events` med `event_type = 'completed'` och dagens datum | Vad har vi levererat idag? |

### Block B: Ålder och varningar
| Nyckeltal | Beräkning | Beskrivning |
|-----------|-----------|-------------|
| Äldsta pågående | Tid sedan äldsta `arrived`-event | "Här borde vi titta" |
| Försenade | Arbetskort där `NOW() > order.planned_end` och `status IN (arrived, started)` | Antal som passerat planerat slutdatum |

### Block C: Ledtid per arbetskort
| Nyckeltal | Beräkning | Beskrivning |
|-----------|-----------|-------------|
| Verklig ledtid (snitt) | Tid mellan `arrived`- och `completed`-events per arbetskort | Faktisk produktionstid |
| Planerad vs verklig | Jämför med order-planerade datum | Hur bra planerar vi? |

---

## Förändringar i UI

### Ny struktur

```text
┌─────────────────────────────────────────────────────────────────────┐
│ STATISTIK                                                           │
│ Översikt av orderhanteringen                                        │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│ ═══ PRODUKTION & FLÖDE ═══════════════════════════════════════════ │
│                                                                     │
│ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────────┐│
│ │ Pågående    │ │ Väntande    │ │ Klara idag  │ │ Försenade       ││
│ │ arbetskort  │ │ arbetskort  │ │             │ │ arbetskort      ││
│ │     2       │ │     7       │ │     0       │ │     0           ││
│ │             │ │             │ │             │ │ (röd om > 0)    ││
│ └─────────────┘ └─────────────┘ └─────────────┘ └─────────────────┘│
│                                                                     │
│ ┌───────────────────────────┐ ┌───────────────────────────────────┐│
│ │ Äldsta pågående           │ │ Ledtid per arbetskort (snitt)     ││
│ │ arbetskort                │ │                                   ││
│ │     < 1 dag               │ │   Verklig: 3 dagar                ││
│ │     (21270)               │ │   Planerad: 5 dagar               ││
│ └───────────────────────────┘ └───────────────────────────────────┘│
│                                                                     │
│ ═══ AFFÄR & UPPFÖLJNING ══════════════════════════════════════════ │
│                                                                     │
│ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────────┐│
│ │ Aktiva      │ │ Avslutade   │ │ Fakturerade │ │ Avvikelser      ││
│ │ ordrar      │ │ ordrar      │ │ ordrar      │ │                 ││
│ │     5       │ │    12       │ │     8       │ │     1           ││
│ └─────────────┘ └─────────────┘ └─────────────┘ └─────────────────┘│
│                                                                     │
│ (resten av befintlig statistik)                                     │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Förbättring av tomma värden
- "Verklig ledtid" visar `- (ej tillräcklig data)` istället för bara `-`
- Tydligare att data kommer när fler ordrar slutförs

### Ta bort sammanfattningskortet
- Sammanfattningen längst ner upprepar information
- Tas bort för renare vy

---

## Teknisk implementation

### 1. Ny hook: `useProductionStats`

Skapar en dedikerad hook som hämtar arbetskorts-statistik direkt från databasen för bättre prestanda:

```typescript
// src/hooks/useProductionStats.ts

interface ProductionStats {
  inProgress: number;      // arrived + started
  waiting: number;         // waiting
  completedToday: number;  // completed today via lifecycle events
  overdue: number;         // past planned_end and still active
  oldestActiveInfo: {
    days: number;
    truckNumber: string;
  } | null;
  avgLeadTimeDays: number; // from arrived to completed
}

function useProductionStats() {
  // Query 1: Count trucks by status
  const statusCounts = await supabase
    .from('object_trucks')
    .select('status');
    
  // Query 2: Completed today from lifecycle events
  const completedToday = await supabase
    .from('truck_lifecycle_events')
    .select('*')
    .eq('event_type', 'completed')
    .gte('timestamp', startOfToday);
    
  // Query 3: Oldest active truck
  const oldestActive = await supabase
    .from('truck_lifecycle_events')
    .select('truck_id, truck_number, timestamp')
    .eq('event_type', 'arrived')
    .in('truck_id', activeIds)
    .order('timestamp', { ascending: true })
    .limit(1);
    
  // Query 4: Overdue trucks
  const overdue = ... // Join with orders to check planned_end
  
  // Query 5: Lead time calculation
  const leadTimes = ... // Calculate arrived → completed times
}
```

### 2. Uppdatering av Statistics.tsx

**Nya imports och state:**
```typescript
import { useProductionStats } from '@/hooks/useProductionStats';
import { Truck, Timer, AlertCircle, Factory } from 'lucide-react';

const { 
  inProgress, 
  waiting, 
  completedToday, 
  overdue,
  oldestActiveInfo,
  avgLeadTimeDays,
  isLoading: statsLoading 
} = useProductionStats();
```

**Ny sektion före befintliga kort:**
```tsx
{/* Produktion & flöde */}
<div className="space-y-4">
  <h2 className="text-lg font-semibold text-muted-foreground">
    Produktion & flöde
  </h2>
  
  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
    <StatCard
      title="Pågående arbetskort"
      value={inProgress}
      subtitle="Ankommen + Startad"
      icon={Factory}
    />
    <StatCard
      title="Väntande arbetskort"
      value={waiting}
      icon={Timer}
    />
    <StatCard
      title="Klara idag"
      value={completedToday}
      icon={CheckCircle2}
    />
    <StatCard
      title="Försenade arbetskort"
      value={overdue}
      icon={AlertCircle}
      className={overdue > 0 ? 'border-destructive/50' : ''}
    />
  </div>
  
  <div className="grid gap-4 md:grid-cols-2">
    <Card>
      <CardHeader>
        <CardTitle>Äldsta pågående arbetskort</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold">
          {oldestActiveInfo 
            ? `${oldestActiveInfo.days} dagar` 
            : '-'}
        </div>
        {oldestActiveInfo && (
          <p className="text-sm text-muted-foreground mt-1">
            #{oldestActiveInfo.truckNumber}
          </p>
        )}
      </CardContent>
    </Card>
    
    <Card>
      <CardHeader>
        <CardTitle>Ledtid per arbetskort (snitt)</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold">
          {avgLeadTimeDays > 0 
            ? `${avgLeadTimeDays} dagar` 
            : '- (ej tillräcklig data)'}
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          Från Ankommen till Klar
        </p>
      </CardContent>
    </Card>
  </div>
</div>

<Separator className="my-6" />

{/* Affär & uppföljning - befintlig kod */}
<div className="space-y-4">
  <h2 className="text-lg font-semibold text-muted-foreground">
    Affär & uppföljning
  </h2>
  {/* ... befintliga kort ... */}
</div>
```

### 3. Ta bort sammanfattningskortet

Ta bort hela `<Card>` med `<CardTitle>Sammanfattning</CardTitle>` i slutet av sidan.

---

## Filändringar

| Fil | Ändring |
|-----|---------|
| `src/hooks/useProductionStats.ts` | **NY FIL** - Hook för arbetskorts-statistik |
| `src/pages/Statistics.tsx` | Lägg till produktionssektion, ta bort sammanfattning |

---

## Designprinciper

- **Bara siffror** - inga diagram, grafer eller trender
- **Produktionschefens verktyg** - svarar på "hur ser det ut just nu?"
- **Varningar utan larm** - försenade kort markeras diskret
- **Snabb överblick** - all viktig info synlig direkt

## Vad som INTE ingår

- Diagram per kund
- Diagram per objekt
- Trender över tid
- Prognoser
- Historisk jämförelse

Allt detta är version 2.
