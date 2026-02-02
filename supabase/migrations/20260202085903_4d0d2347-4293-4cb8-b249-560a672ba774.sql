-- Create table for trucks linked to order objects
CREATE TABLE public.object_trucks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  object_id uuid NOT NULL REFERENCES public.order_objects(id) ON DELETE CASCADE,
  truck_number text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Create table for truck step status
CREATE TABLE public.truck_step_status (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  truck_id uuid NOT NULL REFERENCES public.object_trucks(id) ON DELETE CASCADE,
  step_id uuid NOT NULL REFERENCES public.order_steps(id) ON DELETE CASCADE,
  status public.step_status NOT NULL DEFAULT 'pending',
  actual_start timestamptz,
  actual_end timestamptz,
  UNIQUE(truck_id, step_id)
);

-- Enable RLS on object_trucks
ALTER TABLE public.object_trucks ENABLE ROW LEVEL SECURITY;

-- RLS policies for object_trucks
CREATE POLICY "Authenticated users can read object_trucks"
ON public.object_trucks
FOR SELECT
USING (true);

CREATE POLICY "Editors can insert object_trucks"
ON public.object_trucks
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'redigera'::app_role));

CREATE POLICY "Editors can update object_trucks"
ON public.object_trucks
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'redigera'::app_role));

CREATE POLICY "Admins can delete object_trucks"
ON public.object_trucks
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Enable RLS on truck_step_status
ALTER TABLE public.truck_step_status ENABLE ROW LEVEL SECURITY;

-- RLS policies for truck_step_status
CREATE POLICY "Authenticated users can read truck_step_status"
ON public.truck_step_status
FOR SELECT
USING (true);

CREATE POLICY "Editors can insert truck_step_status"
ON public.truck_step_status
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'redigera'::app_role));

CREATE POLICY "Editors can update truck_step_status"
ON public.truck_step_status
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'redigera'::app_role));

CREATE POLICY "Admins can delete truck_step_status"
ON public.truck_step_status
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));