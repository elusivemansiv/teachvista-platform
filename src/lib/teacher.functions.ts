import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

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
