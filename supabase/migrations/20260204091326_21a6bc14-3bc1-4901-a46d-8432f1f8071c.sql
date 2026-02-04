-- Create order_deviations table for tracking deviations with timestamps and user info
CREATE TABLE public.order_deviations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  message text NOT NULL,
  created_by uuid NOT NULL,
  created_by_name text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.order_deviations ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read deviations
CREATE POLICY "Authenticated users can read order_deviations"
ON public.order_deviations FOR SELECT
USING (true);

-- All roles can insert deviations (utförare need to report)
CREATE POLICY "All roles can insert order_deviations"
ON public.order_deviations FOR INSERT
WITH CHECK (has_any_role(auth.uid()));

-- Production can delete (to remove incorrect entries)
CREATE POLICY "Production can delete order_deviations"
ON public.order_deviations FOR DELETE
USING (is_production_or_admin(auth.uid()));