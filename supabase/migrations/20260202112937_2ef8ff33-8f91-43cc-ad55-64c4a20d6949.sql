-- Make truck_number optional for work units without truck numbers
ALTER TABLE object_trucks ALTER COLUMN truck_number DROP NOT NULL;

-- Also update truck_lifecycle_events to allow null truck_number
ALTER TABLE truck_lifecycle_events ALTER COLUMN truck_number DROP NOT NULL;