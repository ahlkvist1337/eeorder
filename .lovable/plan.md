

# Plan: Fixa orderhämtning efter inloggning

## Problem

OrdersContext hämtar ordrar vid mount, men vid den tidpunkten är användaren inte ännu autentiserad. När RLS är aktiverat returneras inga ordrar till oautentiserade användare. Efter inloggning uppdateras inte OrdersContext automatiskt.

## Lösning

Uppdatera OrdersContext att lyssna på autentiseringsstatus och hämta ordrar endast när en autentiserad användare finns.

## Teknisk implementation

### Uppdatera `src/contexts/OrdersContext.tsx`

1. Importera `useAuth` från AuthContext
2. Lägg till beroende på `user` från auth
3. Hämta ordrar endast när användare är inloggad
4. Rensa ordrar när användare loggar ut

```typescript
// Lägg till import
import { useAuth } from '@/contexts/AuthContext';

// I OrdersProvider-komponenten
export function OrdersProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // ... fetchOrders förblir oförändrad ...

  useEffect(() => {
    if (user) {
      // Användare inloggad - hämta ordrar
      fetchOrders();
    } else {
      // Ingen användare - rensa ordrar
      setOrders([]);
      setIsLoading(false);
    }
  }, [user, fetchOrders]);
  
  // ... resten av koden ...
}
```

## Varför detta fungerar

- OrdersContext reagerar nu på förändringar i autentiseringsstatus
- När användaren loggar in triggas `fetchOrders()` automatiskt
- RLS tillåter nu hämtningen eftersom användaren är autentiserad
- Vid utloggning rensas orderdata för säkerhets skull

## Bonus: Tilldela admin-roll

Jag behöver också köra INSERT för att ge order.ee@outlook.com admin-rättigheter:

```sql
INSERT INTO public.user_roles (user_id, role)
VALUES ('724860f9-c850-44f9-9dfd-6de1f58a8820', 'admin');
```

