DROP POLICY IF EXISTS "profiles are viewable by everyone" ON public.profiles;

CREATE POLICY "users read own profile" ON public.profiles FOR SELECT TO authenticated
USING (auth.uid() = id);

CREATE POLICY "admins read profiles" ON public.profiles FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));