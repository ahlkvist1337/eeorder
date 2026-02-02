-- Add quantity tracking columns to order_objects
ALTER TABLE order_objects
ADD COLUMN planned_quantity integer NOT NULL DEFAULT 1,
ADD COLUMN received_quantity integer NOT NULL DEFAULT 0,
ADD COLUMN completed_quantity integer NOT NULL DEFAULT 0;