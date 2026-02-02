-- Add sort_order column for manual prioritization
ALTER TABLE object_trucks 
ADD COLUMN sort_order integer;

-- Index for fast sorting
CREATE INDEX idx_object_trucks_sort_order ON object_trucks(sort_order);

-- Create truck lifecycle events table for unified history
CREATE TABLE truck_lifecycle_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  truck_id uuid NOT NULL REFERENCES object_trucks(id) ON DELETE CASCADE,
  truck_number text NOT NULL,
  event_type text NOT NULL CHECK (event_type IN (
    'planned', 'arrived', 'started', 'paused', 'completed',
    'step_started', 'step_completed'
  )),
  step_name text,
  timestamp timestamptz NOT NULL DEFAULT now(),
  note text
);

-- Enable RLS
ALTER TABLE truck_lifecycle_events ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Authenticated users can read truck_lifecycle_events"
  ON truck_lifecycle_events FOR SELECT USING (true);

CREATE POLICY "Editors can insert truck_lifecycle_events"
  ON truck_lifecycle_events FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'redigera'::app_role));

-- Index for fast lookup by truck
CREATE INDEX idx_truck_lifecycle_events_truck_id ON truck_lifecycle_events(truck_id);
CREATE INDEX idx_truck_lifecycle_events_order_id ON truck_lifecycle_events(order_id);