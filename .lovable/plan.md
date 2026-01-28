

## Flytta datalagring till molnet (Supabase)

### Bakgrund

Applikationen sparar nu all data lokalt i webbläsaren (`localStorage`). Detta innebär att:
- Varje dator/webbläsare har sin egen data
- Data kan försvinna om webbläsarhistoriken rensas
- Användare kan inte dela ordrar mellan enheter

### Lösning

Aktivera **Lovable Cloud** med Supabase-databas för permanent molnlagring.

---

### Vad som kommer att ske

```text
+------------------+        +------------------+
|  Webbläsare A    |        |  Webbläsare B    |
|  (localStorage)  |        |  (localStorage)  |
+--------+---------+        +--------+---------+
         |                           |
         v                           v
+------------------------------------------------+
|              Supabase Databas                  |
|                  (molnet)                      |
|  +------------+  +------------------------+   |
|  |   orders   |  |   treatment_steps      |   |
|  +------------+  +------------------------+   |
+------------------------------------------------+
```

---

### Steg 1: Aktivera Lovable Cloud

Jag kommer att sätta upp Supabase-integration via Lovable Cloud (inget externt konto behövs).

### Steg 2: Skapa databastabeller

| Tabell | Kolumner |
|--------|----------|
| `orders` | id, order_number, customer, customer_reference, delivery_address, production_status, billing_status, planned_start, planned_end, actual_start, actual_end, has_deviation, deviation_comment, comment, total_price, xml_data, created_at, updated_at |
| `order_steps` | id, order_id (FK), template_id, name, status, planned_start, planned_end, actual_start, actual_end, price |
| `article_rows` | id, order_id (FK), row_number, part_number, text, quantity, unit, price, step_id |
| `status_history` | id, order_id (FK), from_status, to_status, timestamp |
| `treatment_step_templates` | id, name, created_at |

### Steg 3: Uppdatera applikationskoden

- Ersätta localStorage-logik med Supabase-anrop
- Lägga till realtidssynkronisering (valfritt)
- Behålla befintlig TypeScript-struktur

---

### Förväntade ändringar

| Fil | Åtgärd |
|-----|--------|
| Supabase-tabeller | Skapa 5 nya tabeller med relationer |
| `src/integrations/supabase/` | Auto-genererade typer för tabellerna |
| `src/contexts/OrdersContext.tsx` | Byta från localStorage till Supabase |
| `src/hooks/useTreatmentSteps.ts` | Byta från localStorage till Supabase |

---

### Innan jag börjar

Jag behöver aktivera Lovable Cloud för ditt projekt. När du godkänner planen kommer jag att:

1. Aktivera Cloud-integrationen
2. Skapa databastabellerna
3. Uppdatera koden för molnlagring

