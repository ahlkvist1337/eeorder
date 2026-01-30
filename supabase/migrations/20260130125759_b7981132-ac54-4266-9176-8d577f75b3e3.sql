-- Make the order-attachments bucket private
UPDATE storage.buckets 
SET public = false 
WHERE id = 'order-attachments';

-- Drop existing permissive policies
DROP POLICY IF EXISTS "Public read access for order attachments" ON storage.objects;
DROP POLICY IF EXISTS "Allow uploads to order attachments" ON storage.objects;
DROP POLICY IF EXISTS "Allow delete from order attachments" ON storage.objects;

-- Create proper RLS policies for storage

-- Authenticated users can view attachments (read-only access)
CREATE POLICY "Authenticated users can view attachments"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'order-attachments');

-- Editors can upload attachments
CREATE POLICY "Editors can upload attachments"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'order-attachments' AND
  (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'redigera'::public.app_role))
);

-- Editors can delete attachments
CREATE POLICY "Editors can delete attachments"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'order-attachments' AND
  (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'redigera'::public.app_role))
);