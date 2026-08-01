-- 1. has_role: switch to SECURITY INVOKER (all call sites check the current user's own roles,
-- and authenticated users can already read their own user_roles rows).
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

GRANT SELECT ON public.user_roles TO anon;

-- 2. Replace the directly-callable view counter with a trigger on course_views.
DROP FUNCTION IF EXISTS public.increment_course_view(uuid);

CREATE OR REPLACE FUNCTION public.course_views_increment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.courses SET views_count = views_count + 1
  WHERE id = NEW.course_id AND is_published = true;
  RETURN NULL;
END; $$;

REVOKE ALL ON FUNCTION public.course_views_increment() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS course_views_increment_trg ON public.course_views;
CREATE TRIGGER course_views_increment_trg
AFTER INSERT ON public.course_views
FOR EACH ROW EXECUTE FUNCTION public.course_views_increment();

-- 3. Ensure remaining SECURITY DEFINER routines are not API-callable.
REVOKE ALL ON FUNCTION public.publish_due_lessons() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.enrollments_student_count() FROM PUBLIC, anon, authenticated;