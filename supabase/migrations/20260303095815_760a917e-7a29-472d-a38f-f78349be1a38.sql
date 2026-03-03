
-- Fas 1: Nya tabeller för enhet-centrerad produktionsmodell

-- 1. Ny tabell: order_units (huvudenheter, t.ex. truckar)
CREATE TABLE public.order_units (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  unit_number text,
  status public.truck_status NOT NULL DEFAULT 'waiting',
  billing_status public.truck_billing_status NOT NULL DEFAULT 'not_billable',
  sort_order integer,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 2. Ny tabell: unit_objects (delar av en enhet)
CREATE TABLE public.unit_objects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id uuid NOT NULL REFERENCES public.order_units(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 3. Ny tabell: unit_object_steps (behandlingssteg per objekt i en enhet)
CREATE TABLE public.unit_object_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_object_id uuid NOT NULL REFERENCES public.unit_objects(id) ON DELETE CASCADE,
  template_id text NOT NULL,
  name text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  status public.step_status NOT NULL DEFAULT 'pending'
);

-- 4. Versionskolumn på orders
ALTER TABLE public.orders ADD COLUMN data_model_version integer NOT NULL DEFAULT 1;

-- 5. Koppling artikelrader → enheter
ALTER TABLE public.article_rows ADD COLUMN unit_id uuid REFERENCES public.order_units(id) ON DELETE SET NULL;

-- RLS: order_units
ALTER TABLE public.order_units ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read order_units"
  ON public.order_units FOR SELECT
  USING (true);

CREATE POLICY "Production can insert order_units"
  ON public.order_units FOR INSERT
  WITH CHECK (is_production_or_admin(auth.uid()));

CREATE POLICY "All roles can update order_units"
  ON public.order_units FOR UPDATE
  USING (has_any_role(auth.uid()));

CREATE POLICY "Production can delete order_units"
  ON public.order_units FOR DELETE
  USING (is_production_or_admin(auth.uid()));

-- RLS: unit_objects
ALTER TABLE public.unit_objects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read unit_objects"
  ON public.unit_objects FOR SELECT
  USING (true);

CREATE POLICY "Production can insert unit_objects"
  ON public.unit_objects FOR INSERT
  WITH CHECK (is_production_or_admin(auth.uid()));

CREATE POLICY "Production can update unit_objects"
  ON public.unit_objects FOR UPDATE
  USING (is_production_or_admin(auth.uid()));

CREATE POLICY "Production can delete unit_objects"
  ON public.unit_objects FOR DELETE
  USING (is_production_or_admin(auth.uid()));

-- RLS: unit_object_steps
ALTER TABLE public.unit_object_steps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read unit_object_steps"
  ON public.unit_object_steps FOR SELECT
  USING (true);

CREATE POLICY "Production can insert unit_object_steps"
  ON public.unit_object_steps FOR INSERT
  WITH CHECK (is_production_or_admin(auth.uid()));

CREATE POLICY "All roles can update unit_object_steps"
  ON public.unit_object_steps FOR UPDATE
  USING (has_any_role(auth.uid()));

CREATE POLICY "Production can delete unit_object_steps"
  ON public.unit_object_steps FOR DELETE
  USING (is_production_or_admin(auth.uid()));
