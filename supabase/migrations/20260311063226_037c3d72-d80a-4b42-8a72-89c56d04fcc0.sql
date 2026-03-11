DROP POLICY "Production can update unit_objects" ON public.unit_objects;
CREATE POLICY "All roles can update unit_objects"
  ON public.unit_objects FOR UPDATE
  USING (has_any_role(auth.uid()));