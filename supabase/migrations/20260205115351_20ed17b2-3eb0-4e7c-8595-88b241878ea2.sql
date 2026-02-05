-- Skapa dokument-tabell för dokumentbiblioteket
CREATE TABLE public.documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('lathundar', 'rutiner', 'tolkningar')),
  file_path TEXT NOT NULL,
  file_size INTEGER,
  uploaded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS: Alla inloggade kan läsa, bara admin kan skriva/ta bort
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Alla kan läsa dokument"
  ON public.documents FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admin kan skapa dokument"
  ON public.documents FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin kan ta bort dokument"
  ON public.documents FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Skapa storage bucket för dokument
INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', true);

-- RLS-policies för storage
CREATE POLICY "Alla kan läsa dokument-filer"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'documents');

CREATE POLICY "Admin kan ladda upp dokument"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'documents' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin kan ta bort dokument"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'documents' AND public.has_role(auth.uid(), 'admin'));