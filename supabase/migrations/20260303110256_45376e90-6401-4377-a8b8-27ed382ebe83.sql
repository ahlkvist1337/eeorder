-- Remove FK constraints that prevent V2 unit IDs from being stored in shared history tables

ALTER TABLE truck_lifecycle_events 
  DROP CONSTRAINT IF EXISTS truck_lifecycle_events_truck_id_fkey;

ALTER TABLE truck_status_history 
  DROP CONSTRAINT IF EXISTS truck_status_history_truck_id_fkey;

ALTER TABLE truck_status_history 
  DROP CONSTRAINT IF EXISTS truck_status_history_step_id_fkey;