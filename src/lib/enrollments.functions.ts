import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Course } from "./courses";

export type EnrollmentStatus = "active" | "completed" | "cancelled";

export type EnrollmentRow = {
  id: string;
  user_id: string;
  course_id: string;
  progress: number;
  status: EnrollmentStatus;
  last_lesson_id: string | null;
  created_at: string;
  updated_at: string;
};

export type EnrollmentWithCourse = EnrollmentRow & { course: Course };

const COURSE_COLS =
  "id, slug, title, description, category, level, target_band, duration_hours, thumbnail_url, teacher_name, popularity, student_count, rating, is_trending, created_at";

export const enrollInCourse = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { courseId: string }) => d)
  .handler(async ({ data, context }): Promise<EnrollmentRow> => {
    const { supabase, userId } = context;
    const { data: row, error } = await supabase
      .from("enrollments")
      .upsert(
        { user_id: userId, course_id: data.courseId, status: "active" },
        { onConflict: "user_id,course_id", ignoreDuplicates: false },
      )
      .select("*")
      .single();
    if (error) throw error;
    return row as EnrollmentRow;
  });

export const unenroll = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { courseId: string }) => d)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("enrollments")
      .delete()
      .eq("user_id", context.userId)
      .eq("course_id", data.courseId);
    if (error) throw error;
    return { ok: true };
  });

export const getMyEnrollment = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { courseId: string }) => d)
  .handler(async ({ data, context }): Promise<EnrollmentRow | null> => {
    const { data: row, error } = await context.supabase
      .from("enrollments")
      .select("*")
      .eq("user_id", context.userId)
      .eq("course_id", data.courseId)
      .maybeSingle();
    if (error) throw error;
    return (row ?? null) as EnrollmentRow | null;
  });

export const listMyEnrollments = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<EnrollmentWithCourse[]> => {
    const { data, error } = await context.supabase
      .from("enrollments")
      .select(`*, course:courses(${COURSE_COLS})`)
      .eq("user_id", context.userId)
      .order("updated_at", { ascending: false });
    if (error) throw error;
    return (data ?? []).filter((r: { course: Course | null }) => r.course) as EnrollmentWithCourse[];
  });

export const updateProgress = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { courseId: string; progress: number; lastLessonId?: string | null }) => d)
  .handler(async ({ data, context }) => {
    const progress = Math.max(0, Math.min(100, Math.round(data.progress)));
    const status: EnrollmentStatus = progress >= 100 ? "completed" : "active";
    const { data: row, error } = await context.supabase
      .from("enrollments")
      .update({ progress, status, last_lesson_id: data.lastLessonId ?? null })
      .eq("user_id", context.userId)
      .eq("course_id", data.courseId)
      .select("*")
      .single();
    if (error) throw error;
    return row as EnrollmentRow;
  });

export type EnrollmentDetailed = EnrollmentWithCourse & {
  totalLessons: number;
  completedLessons: number;
  nextLesson: { id: string; title: string; ordering: number } | null;
};

export const listMyEnrollmentsDetailed = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<EnrollmentDetailed[]> => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("enrollments")
      .select(`*, course:courses(${COURSE_COLS})`)
      .eq("user_id", userId)
      .order("updated_at", { ascending: false });
    if (error) throw error;
    const rows = (data ?? []).filter((r: { course: Course | null }) => r.course) as EnrollmentWithCourse[];
    if (!rows.length) return [];

    const courseIds = rows.map((r) => r.course_id);
    const [{ data: lessons }, { data: done }] = await Promise.all([
      supabase.from("lessons").select("id, course_id, title, ordering").in("course_id", courseIds).order("ordering"),
      supabase.from("lesson_progress").select("lesson_id, course_id").eq("user_id", userId).in("course_id", courseIds),
    ]);

    return rows.map((r) => {
      const ls = (lessons ?? []).filter((l) => l.course_id === r.course_id);
      const completedIds = new Set((done ?? []).filter((d) => d.course_id === r.course_id).map((d) => d.lesson_id));
      const next = ls.find((l) => !completedIds.has(l.id)) ?? null;
      return {
        ...r,
        totalLessons: ls.length,
        completedLessons: completedIds.size,
        nextLesson: next ? { id: next.id, title: next.title, ordering: next.ordering } : null,
      };
    });
  });
