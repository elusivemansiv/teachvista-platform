import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { buildTrends, type TrendPoint } from "./teacher-analytics";

export type TeacherCourseAnalytics = {
  id: string;
  slug: string;
  title: string;
  category: string;
  is_published: boolean;
  views_count: number;
  student_count: number;
  rating: number;
  last_uploaded_at: string;
  avg_progress: number;
  completed_count: number;
};

export type { TrendPoint };

export type TeacherCourseDetail = {
  course: {
    id: string;
    slug: string;
    title: string;
    description: string;
    category: string;
    level: string;
    target_band: number | null;
    duration_hours: number;
    thumbnail_url: string | null;
    is_published: boolean;
    views_count: number;
    student_count: number;
    rating: number;
    created_at: string;
    last_uploaded_at: string;
  };
  lessons: { id: string; title: string; ordering: number; duration_min: number; completions: number }[];
  stats: { enrollments: number; active: number; completed: number; avg_progress: number; views: number };
  trends: TrendPoint[];
};

export const listTeacherCourseAnalytics = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<TeacherCourseAnalytics[]> => {
    const { supabase, userId } = context;
    const { data: courses, error } = await supabase
      .from("courses")
      .select("id, slug, title, category, is_published, views_count, student_count, rating, last_uploaded_at")
      .eq("teacher_id", userId)
      .order("last_uploaded_at", { ascending: false });
    if (error) throw error;
    if (!courses?.length) return [];

    const ids = courses.map((c) => c.id);
    const { data: enrolls, error: eErr } = await supabase
      .from("enrollments")
      .select("course_id, progress, status")
      .in("course_id", ids);
    if (eErr) throw eErr;

    return courses.map((c) => {
      const rows = (enrolls ?? []).filter((e) => e.course_id === c.id);
      const avg = rows.length ? rows.reduce((s, r) => s + (r.progress ?? 0), 0) / rows.length : 0;
      const completed = rows.filter((r) => r.status === "completed").length;
      return {
        ...c,
        category: c.category as string,
        avg_progress: Math.round(avg),
        completed_count: completed,
      };
    });
  });

export const getTeacherTrends = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { days?: number; courseId?: string } | undefined) => d ?? {})
  .handler(async ({ data, context }): Promise<TrendPoint[]> => {
    const { supabase, userId } = context;
    const { data: courses, error } = await supabase.from("courses").select("id").eq("teacher_id", userId);
    if (error) throw error;
    const ids = (courses ?? []).map((c) => c.id).filter((id) => !data.courseId || id === data.courseId);
    return buildTrends(supabase, ids, data.days ?? 30);
  });

export const getTeacherCourseDetail = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { courseId: string }) => d)
  .handler(async ({ data, context }): Promise<TeacherCourseDetail | null> => {
    const { supabase, userId } = context;
    const { data: course, error } = await supabase
      .from("courses")
      .select(
        "id, slug, title, description, category, level, target_band, duration_hours, thumbnail_url, is_published, views_count, student_count, rating, created_at, last_uploaded_at",
      )
      .eq("id", data.courseId)
      .eq("teacher_id", userId)
      .maybeSingle();
    if (error) throw error;
    if (!course) return null;

    const [{ data: lessons }, { data: enrolls }, { data: progress }] = await Promise.all([
      supabase.from("lessons").select("id, title, ordering, duration_min").eq("course_id", course.id).order("ordering"),
      supabase.from("enrollments").select("progress, status").eq("course_id", course.id),
      supabase.from("lesson_progress").select("lesson_id").eq("course_id", course.id),
    ]);

    const rows = enrolls ?? [];
    const avg = rows.length ? rows.reduce((s, r) => s + (r.progress ?? 0), 0) / rows.length : 0;

    const trends = await buildTrends(supabase, [course.id], 30);

    return {
      course: {
        ...course,
        category: course.category as string,
        level: course.level as string,
        target_band: course.target_band === null ? null : Number(course.target_band),
      },
      lessons: (lessons ?? []).map((l) => ({
        ...l,
        completions: (progress ?? []).filter((p) => p.lesson_id === l.id).length,
      })),
      stats: {
        enrollments: rows.length,
        active: rows.filter((r) => r.status === "active").length,
        completed: rows.filter((r) => r.status === "completed").length,
        avg_progress: Math.round(avg),
        views: course.views_count,
      },
      trends,
    };
  });
