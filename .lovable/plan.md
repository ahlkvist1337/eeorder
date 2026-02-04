

# Plan: Mobiloptimering för produktionsgolvet

## Sammanfattning

En genomgående optimering av mobilupplevelsen för produktionsarbetarna, med fokus på:
- Större klickytor och knappar
- Bättre texthantering (inga avklippta texter)
- Snabbare åtkomst till viktiga funktioner
- Tydligare visuell hierarki

---

## Identifierade problem

### 1. Produktionsvyn (ProductionScreen.tsx)

| Problem | Beskrivning |
|---------|-------------|
| Header tar för mycket plats | Logo + titel + legend + tid tar upp ~150px på mobil |
| Kort-layout ok | Arbetskorten ser bra ut men kan optimeras |
| Steg-knappar för små | Behandlingsstegen är svåra att klicka på |

### 2. Layout/Navigation (Layout.tsx)

| Problem | Beskrivning |
|---------|-------------|
| Mobilmeny visar bara ikoner | Menyn visar ikoner i en rad istället för tydliga rader med text |
| Logout-knapp liten | Svår att träffa på mobil |

### 3. OrderDetails.tsx - Mobilvy

| Problem | Beskrivning |
|---------|-------------|
| Leveransadress avklippt | Adressen bryts och visar "691..." istället för hela postnumret |
| Arbetskort-raden för trång | Mycket information på liten yta |
| Steg-knappar för små | Behandlingsstegen är små och svåra att klicka |

### 4. ObjectTrucksEditor.tsx - Arbetskort

| Problem | Beskrivning |
|---------|-------------|
| Rad-layout för kompakt | Allt på en rad gör det svårt att klicka rätt |
| Stegknappar för små | 'px-1.5 py-0' ger väldigt små klickytor |
| Ikoner för små | h-5 w-5 är svårt att träffa |

---

## Tekniska ändringar

### Fil 1: src/components/Layout.tsx

**Mobilmeny förbättring:**
```typescript
// Ändra NavLinks för mobilmeny - visa text + större klickytor
const NavLinks = ({ onClick, isMobile }: { onClick?: () => void; isMobile?: boolean }) => (
  <>
    {visibleNavItems.map(item => {
      const Icon = item.icon;
      const isActive = location.pathname === item.to;
      return (
        <Link
          key={item.to}
          to={item.to}
          onClick={onClick}
          className={cn(
            isMobile 
              ? 'flex items-center gap-3 px-3 py-3 rounded-md transition-colors text-base'  // Större klickyta på mobil
              : 'flex items-center justify-center p-2 rounded-sm transition-colors',
            isActive
              ? 'bg-sidebar-accent text-sidebar-accent-foreground'
              : 'text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
          )}
          title={item.label}
        >
          <Icon className={isMobile ? "h-5 w-5" : "h-5 w-5"} />
          {isMobile && <span>{item.label}</span>}
        </Link>
      );
    })}
    // ... admin link på samma sätt
  </>
);
```

### Fil 2: src/pages/ProductionScreen.tsx

**Kompaktare header på mobil:**
```typescript
// Ändra header för att ta mindre plats på mobil
<header className="flex flex-col gap-3 mb-4 lg:mb-6">
  {/* Rad 1: Logo + Titel + Tid */}
  <div className="flex items-center justify-between">
    <div className="flex items-center gap-2">
      <img src={eeLogo} alt="EE" className="h-10 lg:h-16 w-auto" />
      <h1 className="text-xl lg:text-4xl font-bold">Produktion</h1>
    </div>
    <span className="text-sm lg:text-lg text-muted-foreground">
      {format(lastUpdated, 'HH:mm', { locale: sv })}
    </span>
  </div>
  
  {/* Rad 2: Status-legend - endast på desktop */}
  <div className="hidden lg:flex flex-wrap items-center gap-4 text-sm">
    // ... legend
  </div>
</header>
```

### Fil 3: src/components/ProductionTruckCard.tsx

**Större steg-knappar på mobil:**
```typescript
// Ändra step progress för större klickytor
<div 
  key={step.id}
  className={cn(
    'flex items-center gap-2 text-sm py-2 px-3 rounded-md transition-colors', // Ökad padding
    isCurrent && 'bg-muted/50'
  )}
>
```

### Fil 4: src/components/ObjectTrucksEditor.tsx

**Bättre mobil-layout för arbetskort:**
```typescript
// Ändra truck row för bättre mobil-upplevelse
<div key={truck.id} className="flex flex-col sm:flex-row sm:items-center gap-2 py-2 px-2 rounded bg-muted/30">
  {/* Rad 1 på mobil: ID + Status */}
  <div className="flex items-center gap-2">
    <span className="font-mono font-bold text-sm min-w-[60px]">
      {getWorkUnitDisplayName(truck.truckNumber, objectName, truck.id)}
    </span>
    <Select value={truck.status} onValueChange={...}>
      <SelectTrigger className={cn('h-8 w-28 text-sm', truckStatusColors[truck.status])}>
        // ...
      </SelectTrigger>
    </Select>
  </div>
  
  {/* Rad 2 på mobil: Steg-knappar */}
  <div className="flex items-center gap-1 flex-1 flex-wrap">
    {objectSteps.map(step => (
      <button
        className={cn(
          'px-2.5 py-1.5 rounded text-xs font-medium min-h-[32px]', // Större knappar
          // ...
        )}
      >
      // ...
      </button>
    ))}
  </div>
  
  {/* Rad 3 på mobil: Åtgärder */}
  <div className="flex items-center gap-1">
    // Knappar med h-8 w-8 istället för h-5 w-5
  </div>
</div>
```

### Fil 5: src/pages/OrderDetails.tsx

**Bättre texthantering:**
```typescript
// Leveransadress - word-break för långa adresser
{order.deliveryAddress && (
  <div className="sm:col-span-2">
    <Label className="text-xs sm:text-sm text-muted-foreground">Leveransadress</Label>
    <p className="font-medium text-sm sm:text-base break-words whitespace-normal">
      {order.deliveryAddress}
    </p>
  </div>
)}
```

---

## Översikt av ändringar

| Fil | Ändring |
|-----|---------|
| `src/components/Layout.tsx` | Mobilmeny med text + större klickytor |
| `src/pages/ProductionScreen.tsx` | Kompaktare header på mobil, göm legend |
| `src/components/ProductionTruckCard.tsx` | Större padding på steg-rader |
| `src/components/ObjectTrucksEditor.tsx` | Responsiv layout med flex-col på mobil, större knappar |
| `src/pages/OrderDetails.tsx` | word-break på adresser, bättre responsiv layout |

---

## Designprinciper som följs

1. **44px minimum touch target** - Alla interaktiva element får minst 44px klickyta
2. **Tydlig visuell hierarki** - Viktigast information först
3. **Ingen horisontell scroll** - Allt ska passa inom skärmen
4. **Läsbar text** - Inget avklipps mitt i ord/nummer
5. **Snabb åtkomst** - Färre klick till viktiga funktioner

---

## Resultat

- Produktionsarbetare kan snabbt ändra status på arbetskort
- Inga texter som avbryts mitt i ord
- Större knappar som är lätta att träffa med fingret
- Kompaktare layout som visar mer information utan scrollning
- Tydlig navigation med text på mobil

