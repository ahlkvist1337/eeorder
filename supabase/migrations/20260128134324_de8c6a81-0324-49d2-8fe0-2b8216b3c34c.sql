-- Create enum types for statuses
CREATE TYPE public.production_status AS ENUM (
  'created',
  'planned',
  'started',
  'paused',
  'arrived',
  'completed',
  'cancelled'
);

CREATE TYPE public.billing_status AS ENUM (
  'not_ready',
  'ready_for_billing',
  'billed'
);

CREATE TYPE public.step_status AS ENUM (
  'pending',
  'in_progress',
  'completed'
);

-- Create treatment_step_templates table
CREATE TABLE public.treatment_step_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS but allow all operations (no auth required per user requirements)
ALTER TABLE public.treatment_step_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations on treatment_step_templates"
  ON public.treatment_step_templates
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Create orders table
CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number TEXT NOT NULL UNIQUE,
  customer TEXT NOT NULL,
  customer_reference TEXT,
  delivery_address TEXT,
  production_status public.production_status NOT NULL DEFAULT 'created',
  billing_status public.billing_status NOT NULL DEFAULT 'not_ready',
  planned_start TIMESTAMPTZ,
  planned_end TIMESTAMPTZ,
  actual_start TIMESTAMPTZ,
  actual_end TIMESTAMPTZ,
  has_deviation BOOLEAN NOT NULL DEFAULT false,
  deviation_comment TEXT,
  comment TEXT,
  total_price NUMERIC NOT NULL DEFAULT 0,
  xml_data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations on orders"
  ON public.orders
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Create order_steps table
CREATE TABLE public.order_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  template_id TEXT NOT NULL,
  name TEXT NOT NULL,
  status public.step_status NOT NULL DEFAULT 'pending',
  planned_start TIMESTAMPTZ,
  planned_end TIMESTAMPTZ,
  actual_start TIMESTAMPTZ,
  actual_end TIMESTAMPTZ,
  price NUMERIC DEFAULT 0
);

ALTER TABLE public.order_steps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations on order_steps"
  ON public.order_steps
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Create article_rows table
CREATE TABLE public.article_rows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  row_number TEXT NOT NULL,
  part_number TEXT NOT NULL,
  text TEXT NOT NULL,
  quantity NUMERIC NOT NULL DEFAULT 0,
  unit TEXT NOT NULL DEFAULT '',
  price NUMERIC NOT NULL DEFAULT 0,
  step_id TEXT
);

ALTER TABLE public.article_rows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations on article_rows"
  ON public.article_rows
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Create status_history table
CREATE TABLE public.status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  from_status public.production_status NOT NULL,
  to_status public.production_status NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.status_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations on status_history"
  ON public.status_history
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add trigger for orders updated_at
CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default treatment step templates
INSERT INTO public.treatment_step_templates (name) VALUES
  ('Blästring'),
  ('Sprutzink'),
  ('Målning');