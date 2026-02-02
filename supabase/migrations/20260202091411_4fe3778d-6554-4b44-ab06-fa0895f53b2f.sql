-- Create truck_status_history table to log truck step status changes
CREATE TABLE public.truck_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  truck_id uuid NOT NULL REFERENCES public.object_trucks(id) ON DELETE CASCADE,
  truck_number text NOT NULL,
  step_id uuid NOT NULL REFERENCES public.order_steps(id) ON DELETE CASCADE,
  step_name text NOT NULL,
  from_status step_status NOT NULL,
  to_status step_status NOT NULL,
  timestamp timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.truck_status_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Authenticated users can read truck_status_history"
ON public.truck_status_history
FOR SELECT
USING (true);

CREATE POLICY "Editors can insert truck_status_history"
ON public.truck_status_history
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'redigera'::app_role));

-- Create index for faster queries
CREATE INDEX idx_truck_status_history_order_id ON public.truck_status_history(order_id);
CREATE INDEX idx_truck_status_history_truck_id ON public.truck_status_history(truck_id);