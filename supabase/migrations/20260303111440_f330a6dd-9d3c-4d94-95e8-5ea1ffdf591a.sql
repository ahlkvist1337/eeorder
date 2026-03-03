
-- Add status and billing_status columns to unit_objects (object-level tracking for V2)
ALTER TABLE public.unit_objects 
  ADD COLUMN status public.truck_status NOT NULL DEFAULT 'waiting',
  ADD COLUMN billing_status public.truck_billing_status NOT NULL DEFAULT 'not_billable';
