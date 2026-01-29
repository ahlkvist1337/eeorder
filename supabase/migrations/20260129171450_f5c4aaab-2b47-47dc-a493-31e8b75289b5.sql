-- Create order_objects table
CREATE TABLE public.order_objects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Add object_id column to order_steps (nullable for backward compatibility)
ALTER TABLE public.order_steps ADD COLUMN object_id uuid REFERENCES public.order_objects(id) ON DELETE CASCADE;

-- Enable RLS on order_objects
ALTER TABLE public.order_objects ENABLE ROW LEVEL SECURITY;

-- RLS policies for order_objects
CREATE POLICY "Authenticated users can read order_objects"
ON public.order_objects
FOR SELECT
USING (true);

CREATE POLICY "Editors can insert order_objects"
ON public.order_objects
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'redigera'::app_role));

CREATE POLICY "Editors can update order_objects"
ON public.order_objects
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'redigera'::app_role));

CREATE POLICY "Admins can delete order_objects"
ON public.order_objects
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));