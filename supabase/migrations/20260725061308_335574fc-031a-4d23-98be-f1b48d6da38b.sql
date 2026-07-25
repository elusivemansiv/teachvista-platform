
-- Enrollment status enum
DO $$ BEGIN
  CREATE TYPE public.enrollment_status AS ENUM ('active','completed','cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.enrollments
  ADD COLUMN IF NOT EXISTS status public.enrollment_status NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS last_lesson_id uuid REFERENCES public.lessons(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

ALTER TABLE public.courses
  ADD COLUMN IF NOT EXISTS views_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_uploaded_at timestamptz NOT NULL DEFAULT now();

UPDATE public.courses SET last_uploaded_at = created_at WHERE last_uploaded_at IS NULL OR last_uploaded_at = now();

-- updated_at trigger for enrollments
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS enrollments_set_updated_at ON public.enrollments;
CREATE TRIGGER enrollments_set_updated_at
BEFORE UPDATE ON public.enrollments
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- student_count trigger
CREATE OR REPLACE FUNCTION public.enrollments_student_count()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.courses SET student_count = student_count + 1 WHERE id = NEW.course_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.courses SET student_count = GREATEST(student_count - 1, 0) WHERE id = OLD.course_id;
  END IF;
  RETURN NULL;
END; $$;

DROP TRIGGER IF EXISTS enrollments_count_ins ON public.enrollments;
CREATE TRIGGER enrollments_count_ins AFTER INSERT ON public.enrollments
FOR EACH ROW EXECUTE FUNCTION public.enrollments_student_count();

DROP TRIGGER IF EXISTS enrollments_count_del ON public.enrollments;
CREATE TRIGGER enrollments_count_del AFTER DELETE ON public.enrollments
FOR EACH ROW EXECUTE FUNCTION public.enrollments_student_count();

-- View count RPC (bypasses RLS for update via SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.increment_course_view(_course_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.courses SET views_count = views_count + 1 WHERE id = _course_id AND is_published = true;
END; $$;

REVOKE ALL ON FUNCTION public.increment_course_view(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_course_view(uuid) TO anon, authenticated;
