import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";

export type Lesson = {
  id: string;
  course_id: string;
  title: string;
  ordering: number;
  duration_min: number;
  video_url: string | null;
};

function serverSupabase() {
  const url = process.env.SUPABASE_URL!;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY!;
  return createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, storage: undefined },
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization");
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
}

const LESSON_COLS = "id, course_id, title, ordering, duration_min, video_url";

export const listCourseLessons = createServerFn({ method: "GET" })
  .inputValidator((d: { courseId: string }) => d)
  .handler(async ({ data }): Promise<Lesson[]> => {
    const { data: rows, error } = await serverSupabase()
      .from("lessons")
      .select(LESSON_COLS)
      .eq("course_id", data.courseId)
      .order("ordering", { ascending: true });
    if (error) throw error;
    return (rows ?? []) as Lesson[];
  });

export type CourseLessonState = {
  lessons: Lesson[];
  completedLessonIds: string[];
  nextLessonId: string | null;
  progress: number;
};

export const getCourseLessonState = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { courseId: string }) => d)
  .handler(async ({ data, context }): Promise<CourseLessonState> => {
    const { supabase, userId } = context;
    const [{ data: lessons, error: lErr }, { data: done, error: pErr }] = await Promise.all([
      supabase.from("lessons").select(LESSON_COLS).eq("course_id", data.courseId).order("ordering"),
      supabase.from("lesson_progress").select("lesson_id").eq("user_id", userId).eq("course_id", data.courseId),
    ]);
    if (lErr) throw lErr;
    if (pErr) throw pErr;
    const list = (lessons ?? []) as Lesson[];
    const completed = new Set((done ?? []).map((r) => r.lesson_id));
    const next = list.find((l) => !completed.has(l.id)) ?? null;
    return {
      lessons: list,
      completedLessonIds: [...completed],
      nextLessonId: next?.id ?? null,
      progress: list.length ? Math.round((completed.size / list.length) * 100) : 0,
    };
  });

export const setLessonCompletion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { courseId: string; lessonId: string; completed: boolean }) => d)
  .handler(async ({ data, context }): Promise<CourseLessonState> => {
    const { supabase, userId } = context;

    if (data.completed) {
      const { error } = await supabase
        .from("lesson_progress")
        .upsert(
          { user_id: userId, course_id: data.courseId, lesson_id: data.lessonId },
          { onConflict: "user_id,lesson_id", ignoreDuplicates: true },
        );
      if (error) throw error;
    } else {
      const { error } = await supabase
        .from("lesson_progress")
        .delete()
        .eq("user_id", userId)
        .eq("lesson_id", data.lessonId);
      if (error) throw error;
    }

    const [{ data: lessons, error: lErr }, { data: done, error: pErr }] = await Promise.all([
      supabase.from("lessons").select(LESSON_COLS).eq("course_id", data.courseId).order("ordering"),
      supabase.from("lesson_progress").select("lesson_id").eq("user_id", userId).eq("course_id", data.courseId),
    ]);
    if (lErr) throw lErr;
    if (pErr) throw pErr;

    const list = (lessons ?? []) as Lesson[];
    const completed = new Set((done ?? []).map((r) => r.lesson_id));
    const next = list.find((l) => !completed.has(l.id)) ?? null;
    const progress = list.length ? Math.round((completed.size / list.length) * 100) : 0;

    const { error: eErr } = await supabase
      .from("enrollments")
      .update({
        progress,
        status: progress >= 100 ? "completed" : "active",
        last_lesson_id: next?.id ?? null,
      })
      .eq("user_id", userId)
      .eq("course_id", data.courseId);
    if (eErr) throw eErr;

    return { lessons: list, completedLessonIds: [...completed], nextLessonId: next?.id ?? null, progress };
  });
