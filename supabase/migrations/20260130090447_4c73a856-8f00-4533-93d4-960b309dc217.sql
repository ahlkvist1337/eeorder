-- Lägg till step_name kolumn
ALTER TABLE public.price_list 
  ADD COLUMN step_name text DEFAULT NULL;

-- Ta bort gamla unika constraint på part_number
ALTER TABLE public.price_list 
  DROP CONSTRAINT IF EXISTS price_list_part_number_key;

-- Ny unik constraint på (part_number, step_name)
-- Använder COALESCE för att hantera NULL som tom sträng
CREATE UNIQUE INDEX price_list_part_number_step_unique 
  ON public.price_list (part_number, COALESCE(step_name, ''));