-- Create price_list table
CREATE TABLE public.price_list (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  part_number text NOT NULL UNIQUE,
  description text NOT NULL DEFAULT '',
  price numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.price_list ENABLE ROW LEVEL SECURITY;

-- SELECT: All authenticated users can read
CREATE POLICY "Authenticated users can read price_list"
  ON public.price_list FOR SELECT TO authenticated
  USING (true);

-- INSERT: Admin or redigera can insert
CREATE POLICY "Editors can insert price_list"
  ON public.price_list FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'redigera'::app_role));

-- UPDATE: Admin or redigera can update
CREATE POLICY "Editors can update price_list"
  ON public.price_list FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'redigera'::app_role));

-- DELETE: Only admin can delete
CREATE POLICY "Admins can delete price_list"
  ON public.price_list FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Trigger for updated_at
CREATE TRIGGER update_price_list_updated_at
  BEFORE UPDATE ON public.price_list
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();