-- Enable realtime for new v2 tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.order_units;
ALTER PUBLICATION supabase_realtime ADD TABLE public.unit_object_steps;