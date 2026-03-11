

## Problem

When an "utförare" user (like Mattias Persson) marks a treatment step as "Pågående", the object status stays at "Väntande" instead of auto-updating to "Startad".

## Root Cause

This is a **database permission issue**, not a race condition. The RLS policy on `unit_objects` requires `is_production_or_admin()` for UPDATE operations. The "utförare" role fails this check, so the auto-status update (`supabase.from('unit_objects').update({ status: 'started' })`) is **silently rejected** by the database.

The step update itself works because `unit_object_steps` has an UPDATE policy using `has_any_role()`, which includes utförare.

## Fix

### Database migration: Allow all roles to update `unit_objects` status

Change the UPDATE policy on `unit_objects` from `is_production_or_admin` to `has_any_role`, matching how `unit_object_steps` and `order_units` already work.

```sql
DROP POLICY "Production can update unit_objects" ON public.unit_objects;
CREATE POLICY "All roles can update unit_objects"
  ON public.unit_objects FOR UPDATE
  USING (has_any_role(auth.uid()));
```

This is consistent with:
- `order_units` — already uses `has_any_role` for UPDATE
- `unit_object_steps` — already uses `has_any_role` for UPDATE
- `object_trucks` (V1) — already uses `has_any_role` for UPDATE

### Also fix: Remove duplicate auto-status logic in UnitsEditor

As identified in the previous plan, `UnitsEditor.tsx` lines 164-189 duplicate auto-status logic that already exists in `OrdersContext.tsx` lines 1753-1772. The duplicate calls cause a race condition for admin/produktion users. Remove lines 164-189 so only the context handles it.

| File | Change |
|------|--------|
| DB migration | Change `unit_objects` UPDATE policy to `has_any_role` |
| `src/components/UnitsEditor.tsx` | Remove lines 164-189 (duplicate auto-status calls) |

