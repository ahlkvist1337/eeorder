-- Create object_templates table for predefined object names
CREATE TABLE public.object_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.object_templates ENABLE ROW LEVEL SECURITY;

-- RLS policies matching treatment_step_templates
CREATE POLICY "Authenticated users can read object_templates"
ON public.object_templates
FOR SELECT
USING (true);

CREATE POLICY "Editors can insert object_templates"
ON public.object_templates
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'redigera'::app_role));

CREATE POLICY "Editors can update object_templates"
ON public.object_templates
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'redigera'::app_role));

CREATE POLICY "Admins can delete object_templates"
ON public.object_templates
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));