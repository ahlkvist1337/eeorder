-- Step 2: Migrate existing roles to new role names
-- 'lasa' → 'utforare' (floor staff)
-- 'redigera' → 'produktion' (production manager)
-- 'admin' stays as 'admin'
UPDATE public.user_roles 
SET role = 'utforare' 
WHERE role = 'lasa';

UPDATE public.user_roles 
SET role = 'produktion' 
WHERE role = 'redigera';

-- New function to check if user is production or higher (admin/produktion)
CREATE OR REPLACE FUNCTION public.is_production_or_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('admin', 'produktion')
  )
$$;

-- New function to check if user has any role (utforare/produktion/admin)
CREATE OR REPLACE FUNCTION public.has_any_role(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('admin', 'produktion', 'utforare')
  )
$$;

-- Update RLS policies for truck_step_status to allow all authenticated users with roles to update
DROP POLICY IF EXISTS "Editors can update truck_step_status" ON public.truck_step_status;
CREATE POLICY "All roles can update truck_step_status" 
ON public.truck_step_status 
FOR UPDATE 
USING (public.has_any_role(auth.uid()));

-- Update RLS policies for object_trucks to allow all authenticated users with roles to update status
DROP POLICY IF EXISTS "Editors can update object_trucks" ON public.object_trucks;
CREATE POLICY "All roles can update object_trucks" 
ON public.object_trucks 
FOR UPDATE 
USING (public.has_any_role(auth.uid()));

-- Update INSERT policies for production/admin only
DROP POLICY IF EXISTS "Editors can insert object_trucks" ON public.object_trucks;
CREATE POLICY "Production can insert object_trucks" 
ON public.object_trucks 
FOR INSERT 
WITH CHECK (public.is_production_or_admin(auth.uid()));

-- Update DELETE policies for production/admin only  
DROP POLICY IF EXISTS "Admins can delete object_trucks" ON public.object_trucks;
CREATE POLICY "Production can delete object_trucks" 
ON public.object_trucks 
FOR DELETE 
USING (public.is_production_or_admin(auth.uid()));

-- Update INSERT policies for truck_step_status (production/admin only)
DROP POLICY IF EXISTS "Editors can insert truck_step_status" ON public.truck_step_status;
CREATE POLICY "Production can insert truck_step_status" 
ON public.truck_step_status 
FOR INSERT 
WITH CHECK (public.is_production_or_admin(auth.uid()));

-- Update DELETE policies for truck_step_status (production/admin only)
DROP POLICY IF EXISTS "Admins can delete truck_step_status" ON public.truck_step_status;
CREATE POLICY "Production can delete truck_step_status" 
ON public.truck_step_status 
FOR DELETE 
USING (public.is_production_or_admin(auth.uid()));

-- Update order_steps policies
DROP POLICY IF EXISTS "Editors can insert order_steps" ON public.order_steps;
CREATE POLICY "Production can insert order_steps" 
ON public.order_steps 
FOR INSERT 
WITH CHECK (public.is_production_or_admin(auth.uid()));

DROP POLICY IF EXISTS "Editors can update order_steps" ON public.order_steps;
CREATE POLICY "Production can update order_steps" 
ON public.order_steps 
FOR UPDATE 
USING (public.is_production_or_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can delete order_steps" ON public.order_steps;
CREATE POLICY "Production can delete order_steps" 
ON public.order_steps 
FOR DELETE 
USING (public.is_production_or_admin(auth.uid()));

-- Update order_objects policies
DROP POLICY IF EXISTS "Editors can insert order_objects" ON public.order_objects;
CREATE POLICY "Production can insert order_objects" 
ON public.order_objects 
FOR INSERT 
WITH CHECK (public.is_production_or_admin(auth.uid()));

DROP POLICY IF EXISTS "Editors can update order_objects" ON public.order_objects;
CREATE POLICY "Production can update order_objects" 
ON public.order_objects 
FOR UPDATE 
USING (public.is_production_or_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can delete order_objects" ON public.order_objects;
CREATE POLICY "Production can delete order_objects" 
ON public.order_objects 
FOR DELETE 
USING (public.is_production_or_admin(auth.uid()));

-- Update orders policies
DROP POLICY IF EXISTS "Editors can insert orders" ON public.orders;
CREATE POLICY "Production can insert orders" 
ON public.orders 
FOR INSERT 
WITH CHECK (public.is_production_or_admin(auth.uid()));

DROP POLICY IF EXISTS "Editors can update orders" ON public.orders;
CREATE POLICY "Production can update orders" 
ON public.orders 
FOR UPDATE 
USING (public.is_production_or_admin(auth.uid()));

-- Delete stays admin only

-- Update price_list policies (admin only for write operations)
DROP POLICY IF EXISTS "Editors can insert price_list" ON public.price_list;
CREATE POLICY "Admins can insert price_list" 
ON public.price_list 
FOR INSERT 
WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Editors can update price_list" ON public.price_list;
CREATE POLICY "Admins can update price_list" 
ON public.price_list 
FOR UPDATE 
USING (public.has_role(auth.uid(), 'admin'));

-- Update article_rows policies
DROP POLICY IF EXISTS "Editors can insert article_rows" ON public.article_rows;
CREATE POLICY "Production can insert article_rows" 
ON public.article_rows 
FOR INSERT 
WITH CHECK (public.is_production_or_admin(auth.uid()));

DROP POLICY IF EXISTS "Editors can update article_rows" ON public.article_rows;
CREATE POLICY "Production can update article_rows" 
ON public.article_rows 
FOR UPDATE 
USING (public.is_production_or_admin(auth.uid()));

-- Update object_templates policies
DROP POLICY IF EXISTS "Editors can insert object_templates" ON public.object_templates;
CREATE POLICY "Production can insert object_templates" 
ON public.object_templates 
FOR INSERT 
WITH CHECK (public.is_production_or_admin(auth.uid()));

DROP POLICY IF EXISTS "Editors can update object_templates" ON public.object_templates;
CREATE POLICY "Production can update object_templates" 
ON public.object_templates 
FOR UPDATE 
USING (public.is_production_or_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can delete object_templates" ON public.object_templates;
CREATE POLICY "Production can delete object_templates" 
ON public.object_templates 
FOR DELETE 
USING (public.is_production_or_admin(auth.uid()));

-- Update treatment_step_templates policies
DROP POLICY IF EXISTS "Editors can insert treatment_step_templates" ON public.treatment_step_templates;
CREATE POLICY "Production can insert treatment_step_templates" 
ON public.treatment_step_templates 
FOR INSERT 
WITH CHECK (public.is_production_or_admin(auth.uid()));

DROP POLICY IF EXISTS "Editors can update treatment_step_templates" ON public.treatment_step_templates;
CREATE POLICY "Production can update treatment_step_templates" 
ON public.treatment_step_templates 
FOR UPDATE 
USING (public.is_production_or_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can delete treatment_step_templates" ON public.treatment_step_templates;
CREATE POLICY "Production can delete treatment_step_templates" 
ON public.treatment_step_templates 
FOR DELETE 
USING (public.is_production_or_admin(auth.uid()));

-- Update order_attachments policies
DROP POLICY IF EXISTS "Editors can insert order_attachments" ON public.order_attachments;
CREATE POLICY "Production can insert order_attachments" 
ON public.order_attachments 
FOR INSERT 
WITH CHECK (public.is_production_or_admin(auth.uid()));

DROP POLICY IF EXISTS "Editors can update order_attachments" ON public.order_attachments;
CREATE POLICY "Production can update order_attachments" 
ON public.order_attachments 
FOR UPDATE 
USING (public.is_production_or_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can delete order_attachments" ON public.order_attachments;
CREATE POLICY "Production can delete order_attachments" 
ON public.order_attachments 
FOR DELETE 
USING (public.is_production_or_admin(auth.uid()));

-- Update history tables to allow production or all roles to insert
DROP POLICY IF EXISTS "Editors can insert status_history" ON public.status_history;
CREATE POLICY "Production can insert status_history" 
ON public.status_history 
FOR INSERT 
WITH CHECK (public.is_production_or_admin(auth.uid()));

DROP POLICY IF EXISTS "Editors can insert step_status_history" ON public.step_status_history;
CREATE POLICY "Production can insert step_status_history" 
ON public.step_status_history 
FOR INSERT 
WITH CHECK (public.is_production_or_admin(auth.uid()));

DROP POLICY IF EXISTS "Editors can insert truck_lifecycle_events" ON public.truck_lifecycle_events;
CREATE POLICY "Production can insert truck_lifecycle_events" 
ON public.truck_lifecycle_events 
FOR INSERT 
WITH CHECK (public.is_production_or_admin(auth.uid()));

DROP POLICY IF EXISTS "Editors can insert truck_status_history" ON public.truck_status_history;
CREATE POLICY "All roles can insert truck_status_history" 
ON public.truck_status_history 
FOR INSERT 
WITH CHECK (public.has_any_role(auth.uid()));