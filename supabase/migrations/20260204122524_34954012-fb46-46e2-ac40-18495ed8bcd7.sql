-- Enable realtime for relevant tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
ALTER PUBLICATION supabase_realtime ADD TABLE public.object_trucks;
ALTER PUBLICATION supabase_realtime ADD TABLE public.truck_step_status;