-- lesson_progress
CREATE TABLE public.lesson_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  lesson_id uuid NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  completed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, lesson_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lesson_progress TO authenticated;
GRANT ALL ON public.lesson_progress TO service_role;
ALTER TABLE public.lesson_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own lesson progress" ON public.lesson_progress FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "teachers read progress for own courses" ON public.lesson_progress FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.courses c WHERE c.id = lesson_progress.course_id AND c.teacher_id = auth.uid()));
CREATE INDEX lesson_progress_user_course_idx ON public.lesson_progress (user_id, course_id);

-- course_views
CREATE TABLE public.course_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  user_id uuid,
  viewed_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.course_views TO authenticated;
GRANT INSERT ON public.course_views TO anon;
GRANT ALL ON public.course_views TO service_role;
ALTER TABLE public.course_views ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone can record a view" ON public.course_views FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "users read own views" ON public.course_views FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "teachers read views for own courses" ON public.course_views FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.courses c WHERE c.id = course_views.course_id AND c.teacher_id = auth.uid()));
CREATE INDEX course_views_course_time_idx ON public.course_views (course_id, viewed_at DESC);
CREATE INDEX course_views_user_time_idx ON public.course_views (user_id, viewed_at DESC);

-- teachers manage lessons of their own courses
CREATE POLICY "teachers manage own lessons" ON public.lessons FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.courses c WHERE c.id = lessons.course_id AND c.teacher_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.courses c WHERE c.id = lessons.course_id AND c.teacher_id = auth.uid()));

-- seed 8 lessons per course that has none
INSERT INTO public.lessons (course_id, title, ordering, duration_min)
SELECT c.id,
       'Lesson ' || g.n || ': ' || (ARRAY['Overview','Core strategy','Practice set','Common traps','Timing drill','Advanced tips','Mock section','Review & next steps'])[g.n],
       g.n,
       (ARRAY[8,14,22,12,18,20,30,10])[g.n]
FROM public.courses c
CROSS JOIN generate_series(1,8) AS g(n)
WHERE NOT EXISTS (SELECT 1 FROM public.lessons l WHERE l.course_id = c.id);