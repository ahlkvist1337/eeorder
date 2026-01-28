-- Create storage bucket for order attachments
INSERT INTO storage.buckets (id, name, public)
VALUES ('order-attachments', 'order-attachments', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public read access
CREATE POLICY "Public read access for order attachments"
ON storage.objects FOR SELECT
USING (bucket_id = 'order-attachments');

-- Allow anyone to upload (no auth in this app)
CREATE POLICY "Allow uploads to order attachments"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'order-attachments');

-- Allow delete
CREATE POLICY "Allow delete from order attachments"
ON storage.objects FOR DELETE
USING (bucket_id = 'order-attachments');

-- Create table to track order attachments
CREATE TABLE public.order_attachments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  mime_type TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.order_attachments ENABLE ROW LEVEL SECURITY;

-- Allow all operations (no auth)
CREATE POLICY "Allow all operations on order_attachments"
ON public.order_attachments
FOR ALL
USING (true)
WITH CHECK (true);