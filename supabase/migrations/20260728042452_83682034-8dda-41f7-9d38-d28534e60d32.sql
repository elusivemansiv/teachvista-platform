-- 1. Course moderation
DO $$ BEGIN
  CREATE TYPE public.moderation_status AS ENUM ('pending','approved','rejected');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.courses
  ADD COLUMN IF NOT EXISTS moderation_status public.moderation_status NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS moderation_note text,
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS reviewed_by uuid,
  ADD COLUMN IF NOT EXISTS submitted_at timestamptz;

-- existing seeded content stays live
UPDATE public.courses SET moderation_status = 'approved', reviewed_at = now() WHERE moderation_status = 'pending';

DROP POLICY IF EXISTS "published courses public" ON public.courses;
CREATE POLICY "published approved courses public" ON public.courses
  FOR SELECT USING (is_published = true AND moderation_status = 'approved');

CREATE POLICY "admins read all courses" ON public.courses
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admins update courses" ON public.courses
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 2. Lesson drafts + scheduling
DO $$ BEGIN
  CREATE TYPE public.lesson_status AS ENUM ('draft','scheduled','published');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.lessons
  ADD COLUMN IF NOT EXISTS status public.lesson_status NOT NULL DEFAULT 'published',
  ADD COLUMN IF NOT EXISTS publish_at timestamptz,
  ADD COLUMN IF NOT EXISTS draft_title text,
  ADD COLUMN IF NOT EXISTS draft_duration_min integer,
  ADD COLUMN IF NOT EXISTS draft_video_url text,
  ADD COLUMN IF NOT EXISTS has_draft boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS moderation_status public.moderation_status NOT NULL DEFAULT 'approved',
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

DROP TRIGGER IF EXISTS lessons_set_updated_at ON public.lessons;
CREATE TRIGGER lessons_set_updated_at BEFORE UPDATE ON public.lessons
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP POLICY IF EXISTS "lessons public" ON public.lessons;
CREATE POLICY "published lessons public" ON public.lessons
  FOR SELECT USING (
    status = 'published'
    AND moderation_status = 'approved'
    AND (publish_at IS NULL OR publish_at <= now())
  );

CREATE POLICY "admins read all lessons" ON public.lessons
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admins update lessons" ON public.lessons
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- promote scheduled lessons whose time has come
CREATE OR REPLACE FUNCTION public.publish_due_lessons()
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.lessons SET status = 'published'
  WHERE status = 'scheduled' AND publish_at IS NOT NULL AND publish_at <= now();
$$;
REVOKE ALL ON FUNCTION public.publish_due_lessons() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.publish_due_lessons() TO authenticated, service_role;

-- 3. Watch events for cohort engagement analytics
CREATE TABLE IF NOT EXISTS public.lesson_watch_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  lesson_id uuid NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  watched_seconds integer NOT NULL DEFAULT 0,
  completed boolean NOT NULL DEFAULT false,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.lesson_watch_events TO authenticated;
GRANT ALL ON public.lesson_watch_events TO service_role;
ALTER TABLE public.lesson_watch_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users insert own watch events" ON public.lesson_watch_events
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "users read own watch events" ON public.lesson_watch_events
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "teachers read watch events for own courses" ON public.lesson_watch_events
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.courses c WHERE c.id = lesson_watch_events.course_id AND c.teacher_id = auth.uid())
  );

CREATE INDEX IF NOT EXISTS lesson_watch_events_course_idx ON public.lesson_watch_events (course_id, occurred_at);
CREATE INDEX IF NOT EXISTS lesson_watch_events_lesson_idx ON public.lesson_watch_events (lesson_id);