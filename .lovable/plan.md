

# Visa/dölj lösenord på inloggningssidan

## Ändring

Lägg till en ögon-ikon-knapp i lösenordsfältet på `src/pages/Login.tsx` som växlar mellan `type="password"` och `type="text"`.

## Teknisk detalj

**Fil:** `src/pages/Login.tsx`

1. Lägg till state: `const [showPassword, setShowPassword] = useState(false)`
2. Importera `Eye` och `EyeOff` från lucide-react
3. Wrappa Input i en `relative`-div och lägg till en toggle-knapp till höger i fältet
4. Byt `type="password"` till `type={showPassword ? 'text' : 'password'}`

```tsx
<div className="relative">
  <Input
    id="password"
    type={showPassword ? 'text' : 'password'}
    ...
  />
  <button
    type="button"
    onClick={() => setShowPassword(!showPassword)}
    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
    tabIndex={-1}
  >
    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
  </button>
</div>
```

