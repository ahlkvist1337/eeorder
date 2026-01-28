-- Skapa tabell för stegstatushistorik
CREATE TABLE public.step_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  step_id UUID NOT NULL,
  step_name TEXT NOT NULL,
  from_status step_status NOT NULL,
  to_status step_status NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Aktivera RLS
ALTER TABLE public.step_status_history ENABLE ROW LEVEL SECURITY;

-- Policy för alla operationer (ingen auth)
CREATE POLICY "Allow all operations on step_status_history"
ON public.step_status_history FOR ALL USING (true) WITH CHECK (true);