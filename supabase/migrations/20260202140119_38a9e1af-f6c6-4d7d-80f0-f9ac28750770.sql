-- Add instructions column to orders table
ALTER TABLE orders ADD COLUMN instructions jsonb DEFAULT '[]'::jsonb;