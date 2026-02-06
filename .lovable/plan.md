

# Ändring: Minimerade dokumentkategorier

## Problem
Dokumentkategorierna (Lathundar, Rutiner, Tolkningar) visas alla öppna som standard när man besöker sidan.

## Lösning
Ta bort `defaultValue`-propertyn från Accordion-komponenten så att alla kategorier startar minimerade.

## Ändring

**Fil:** `src/pages/Documents.tsx` (rad 174)

**Före:**
```tsx
<Accordion type="multiple" defaultValue={['lathundar', 'rutiner', 'tolkningar']} className="w-full">
```

**Efter:**
```tsx
<Accordion type="multiple" className="w-full">
```

## Resultat
Alla tre kategorier visas minimerade när användaren öppnar dokumentsidan. Användaren klickar på den kategori de vill öppna.

