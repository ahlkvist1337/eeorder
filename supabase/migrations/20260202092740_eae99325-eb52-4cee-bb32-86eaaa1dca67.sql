-- Add truck-level status column for production tracking
-- This separates production status (truck) from administrative status (order)

-- Create the truck_status enum type
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'truck_status') THEN
    CREATE TYPE truck_status AS ENUM ('waiting', 'arrived', 'started', 'paused', 'completed');
  END IF;
END$$;

-- Add status column to object_trucks
ALTER TABLE object_trucks 
ADD COLUMN IF NOT EXISTS status truck_status NOT NULL DEFAULT 'waiting';

-- Create index for filtering active trucks in production view
CREATE INDEX IF NOT EXISTS idx_object_trucks_status ON object_trucks(status);

-- Update existing trucks based on their step statuses
UPDATE object_trucks ot
SET status = CASE
  -- If all steps are completed, truck is completed
  WHEN EXISTS (
    SELECT 1 FROM truck_step_status tss 
    WHERE tss.truck_id = ot.id AND tss.status = 'completed'
  ) AND NOT EXISTS (
    SELECT 1 FROM truck_step_status tss2 
    WHERE tss2.truck_id = ot.id AND tss2.status != 'completed'
  ) THEN 'completed'::truck_status
  -- If any step is in_progress, truck is started
  WHEN EXISTS (
    SELECT 1 FROM truck_step_status tss 
    WHERE tss.truck_id = ot.id 
    AND tss.status = 'in_progress'
  ) THEN 'started'::truck_status
  -- If any step is completed (but not all), truck is started
  WHEN EXISTS (
    SELECT 1 FROM truck_step_status tss 
    WHERE tss.truck_id = ot.id 
    AND tss.status = 'completed'
  ) THEN 'started'::truck_status
  -- Otherwise waiting
  ELSE 'waiting'::truck_status
END
WHERE ot.status = 'waiting';