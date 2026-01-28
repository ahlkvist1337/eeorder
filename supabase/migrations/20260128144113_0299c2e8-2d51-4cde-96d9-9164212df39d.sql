-- 1. Skapa rolltyp
CREATE TYPE public.app_role AS ENUM ('admin', 'redigera', 'lasa');

-- 2. Skapa profiles-tabell
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  is_active BOOLEAN DEFAULT true NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- 3. Skapa user_roles-tabell
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);

-- 4. Skapa security definer-funktion
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- 5. Skapa trigger för automatisk profilskapande
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 6. RLS för profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update profiles"
  ON public.profiles FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

-- 7. RLS för user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own roles"
  ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all roles"
  ON public.user_roles FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- 8. Uppdatera RLS på orders (ta bort gammal policy först)
DROP POLICY IF EXISTS "Allow all operations on orders" ON public.orders;

CREATE POLICY "Authenticated users can read orders"
  ON public.orders FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Editors can insert orders"
  ON public.orders FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'redigera')
  );

CREATE POLICY "Editors can update orders"
  ON public.orders FOR UPDATE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'redigera')
  );

CREATE POLICY "Admins can delete orders"
  ON public.orders FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 9. Uppdatera RLS på order_steps
DROP POLICY IF EXISTS "Allow all operations on order_steps" ON public.order_steps;

CREATE POLICY "Authenticated users can read order_steps"
  ON public.order_steps FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Editors can insert order_steps"
  ON public.order_steps FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'redigera')
  );

CREATE POLICY "Editors can update order_steps"
  ON public.order_steps FOR UPDATE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'redigera')
  );

CREATE POLICY "Admins can delete order_steps"
  ON public.order_steps FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 10. Uppdatera RLS på article_rows
DROP POLICY IF EXISTS "Allow all operations on article_rows" ON public.article_rows;

CREATE POLICY "Authenticated users can read article_rows"
  ON public.article_rows FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Editors can insert article_rows"
  ON public.article_rows FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'redigera')
  );

CREATE POLICY "Editors can update article_rows"
  ON public.article_rows FOR UPDATE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'redigera')
  );

CREATE POLICY "Admins can delete article_rows"
  ON public.article_rows FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 11. Uppdatera RLS på status_history
DROP POLICY IF EXISTS "Allow all operations on status_history" ON public.status_history;

CREATE POLICY "Authenticated users can read status_history"
  ON public.status_history FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Editors can insert status_history"
  ON public.status_history FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'redigera')
  );

-- 12. Uppdatera RLS på step_status_history
DROP POLICY IF EXISTS "Allow all operations on step_status_history" ON public.step_status_history;

CREATE POLICY "Authenticated users can read step_status_history"
  ON public.step_status_history FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Editors can insert step_status_history"
  ON public.step_status_history FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'redigera')
  );

-- 13. Uppdatera RLS på treatment_step_templates
DROP POLICY IF EXISTS "Allow all operations on treatment_step_templates" ON public.treatment_step_templates;

CREATE POLICY "Authenticated users can read treatment_step_templates"
  ON public.treatment_step_templates FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Editors can insert treatment_step_templates"
  ON public.treatment_step_templates FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'redigera')
  );

CREATE POLICY "Editors can update treatment_step_templates"
  ON public.treatment_step_templates FOR UPDATE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'redigera')
  );

CREATE POLICY "Admins can delete treatment_step_templates"
  ON public.treatment_step_templates FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 14. Uppdatera RLS på order_attachments
DROP POLICY IF EXISTS "Allow all operations on order_attachments" ON public.order_attachments;

CREATE POLICY "Authenticated users can read order_attachments"
  ON public.order_attachments FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Editors can insert order_attachments"
  ON public.order_attachments FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'redigera')
  );

CREATE POLICY "Editors can update order_attachments"
  ON public.order_attachments FOR UPDATE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'redigera')
  );

CREATE POLICY "Admins can delete order_attachments"
  ON public.order_attachments FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));