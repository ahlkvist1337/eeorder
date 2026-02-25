
-- 1. Extend truck_status enum with packed and delivered
ALTER TYPE truck_status ADD VALUE IF NOT EXISTS 'packed';
ALTER TYPE truck_status ADD VALUE IF NOT EXISTS 'delivered';

-- 2. Create truck_billing_status enum
CREATE TYPE truck_billing_status AS ENUM ('not_billable', 'ready_for_billing', 'billed');

-- 3. Add billing_status column to object_trucks
ALTER TABLE object_trucks ADD COLUMN billing_status truck_billing_status NOT NULL DEFAULT 'not_billable';

-- 4. Create invoice_exports table
CREATE TABLE invoice_exports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  export_id text NOT NULL,
  exported_at timestamptz NOT NULL DEFAULT now(),
  exported_by uuid NOT NULL,
  total_amount numeric NOT NULL DEFAULT 0
);

-- 5. Create invoice_export_items table
CREATE TABLE invoice_export_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_export_id uuid NOT NULL REFERENCES invoice_exports(id) ON DELETE CASCADE,
  order_id uuid NOT NULL REFERENCES orders(id),
  truck_id uuid NOT NULL REFERENCES object_trucks(id),
  article_row_id uuid REFERENCES article_rows(id),
  billed_quantity numeric NOT NULL,
  billed_amount numeric NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 6. Enable RLS on new tables
ALTER TABLE invoice_exports ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_export_items ENABLE ROW LEVEL SECURITY;

-- 7. RLS policies for invoice_exports
CREATE POLICY "Authenticated users can read invoice_exports"
  ON invoice_exports FOR SELECT
  USING (true);

CREATE POLICY "Production can insert invoice_exports"
  ON invoice_exports FOR INSERT
  WITH CHECK (is_production_or_admin(auth.uid()));

-- 8. RLS policies for invoice_export_items
CREATE POLICY "Authenticated users can read invoice_export_items"
  ON invoice_export_items FOR SELECT
  USING (true);

CREATE POLICY "Production can insert invoice_export_items"
  ON invoice_export_items FOR INSERT
  WITH CHECK (is_production_or_admin(auth.uid()));

-- 9. Index for looking up previously billed amounts per article row
CREATE INDEX idx_invoice_export_items_article_row ON invoice_export_items(article_row_id);
CREATE INDEX idx_invoice_export_items_truck ON invoice_export_items(truck_id);
