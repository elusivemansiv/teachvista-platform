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

/* ---------- Cohort engagement analytics ---------- */

export type LessonEngagement = {
  lessonId: string;
  title: string;
  ordering: number;
  durationMin: number;
  reached: number;
  completed: number;
  dropOffPct: number;
  avgWatchMin: number;
};

export type WeeklyCohort = {
  week: string;
  learners: number;
  avgLessonsCompleted: number;
  avgWatchMin: number;
  retentionPct: number;
};

export type CohortAnalytics = { lessons: LessonEngagement[]; cohorts: WeeklyCohort[] };

function weekKey(d: string | Date) {
  const dt = new Date(d);
  const day = (dt.getUTCDay() + 6) % 7;
  dt.setUTCDate(dt.getUTCDate() - day);
  return dt.toISOString().slice(0, 10);
}

export const getCourseCohortAnalytics = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { courseId: string }) => d)
  .handler(async ({ data, context }): Promise<CohortAnalytics> => {
    const { supabase, userId } = context;
    const { data: course } = await supabase
      .from("courses")
      .select("id")
      .eq("id", data.courseId)
      .eq("teacher_id", userId)
      .maybeSingle();
    if (!course) return { lessons: [], cohorts: [] };

    const [{ data: lessons }, { data: progress }, { data: watch }, { data: enrolls }] = await Promise.all([
      supabase.from("lessons").select("id, title, ordering, duration_min").eq("course_id", data.courseId).order("ordering"),
      supabase.from("lesson_progress").select("lesson_id, user_id, completed_at").eq("course_id", data.courseId),
      supabase.from("lesson_watch_events").select("lesson_id, user_id, watched_seconds, occurred_at").eq("course_id", data.courseId),
      supabase.from("enrollments").select("user_id, created_at, updated_at, progress, status").eq("course_id", data.courseId),
    ]);

    const lessonRows = (lessons ?? []) as { id: string; title: string; ordering: number; duration_min: number }[];
    const progressRows = (progress ?? []) as { lesson_id: string; user_id: string }[];
    const watchRows = (watch ?? []) as { lesson_id: string; user_id: string; watched_seconds: number; occurred_at: string }[];
    const enrollRows = (enrolls ?? []) as { user_id: string; created_at: string; updated_at: string; progress: number; status: string }[];

    // per-lesson funnel
    const totalLearners = enrollRows.length;
    let prevReached = totalLearners;
    const lessonStats: LessonEngagement[] = lessonRows.map((l) => {
      const completedUsers = new Set(progressRows.filter((p) => p.lesson_id === l.id).map((p) => p.user_id));
      const watchers = watchRows.filter((w) => w.lesson_id === l.id);
      const reachedUsers = new Set([...completedUsers, ...watchers.map((w) => w.user_id)]);
      const reached = reachedUsers.size;
      const secs = watchers.reduce((s, w) => s + (w.watched_seconds ?? 0), 0);
      const uniqueWatchers = new Set(watchers.map((w) => w.user_id)).size || 1;
      const dropOff = prevReached > 0 ? Math.max(0, Math.round(((prevReached - reached) / prevReached) * 100)) : 0;
      prevReached = reached || prevReached;
      return {
        lessonId: l.id,
        title: l.title,
        ordering: l.ordering,
        durationMin: l.duration_min,
        reached,
        completed: completedUsers.size,
        dropOffPct: dropOff,
        avgWatchMin: Math.round((secs / uniqueWatchers / 60) * 10) / 10,
      };
    });

    // weekly cohorts by enrollment week
    const byWeek = new Map<string, { users: string[] }>();
    for (const e of enrollRows) {
      const k = weekKey(e.created_at);
      if (!byWeek.has(k)) byWeek.set(k, { users: [] });
      byWeek.get(k)!.users.push(e.user_id);
    }
    const twoWeeksAgo = Date.now() - 14 * 86400000;
    const cohorts: WeeklyCohort[] = [...byWeek.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([week, { users }]) => {
        const set = new Set(users);
        const lessonsDone = progressRows.filter((p) => set.has(p.user_id)).length;
        const secs = watchRows.filter((w) => set.has(w.user_id)).reduce((s, w) => s + (w.watched_seconds ?? 0), 0);
        const active = enrollRows.filter(
          (e) => set.has(e.user_id) && new Date(e.updated_at).getTime() >= twoWeeksAgo,
        ).length;
        return {
          week,
          learners: users.length,
          avgLessonsCompleted: Math.round((lessonsDone / users.length) * 10) / 10,
          avgWatchMin: Math.round((secs / users.length / 60) * 10) / 10,
          retentionPct: Math.round((active / users.length) * 100),
        };
      });

    return { lessons: lessonStats, cohorts };
  });
