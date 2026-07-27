import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Course } from "./courses";

export type Recommendation = { course: Course; reason: string; score: number };

const COURSE_COLS =
  "id, slug, title, description, category, level, target_band, duration_hours, thumbnail_url, teacher_name, popularity, student_count, rating, is_trending, created_at";

export const getRecommendations = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { limit?: number } | undefined) => d ?? {})
  .handler(async ({ data, context }): Promise<Recommendation[]> => {
    const { supabase, userId } = context;
    const limit = data.limit ?? 6;

    const [{ data: enrolls }, { data: views }, { data: courses, error }] = await Promise.all([
      supabase.from("enrollments").select("course_id, progress, courses(category, target_band, teacher_name)").eq("user_id", userId),
      supabase
        .from("course_views")
        .select("course_id, viewed_at, courses(category, target_band, teacher_name)")
        .eq("user_id", userId)
        .order("viewed_at", { ascending: false })
        .limit(40),
      supabase.from("courses").select(COURSE_COLS).eq("is_published", true),
    ]);
    if (error) throw error;

    const enrolledIds = new Set((enrolls ?? []).map((e) => e.course_id));
    type Rel = { category?: string | null; target_band?: number | null; teacher_name?: string | null } | null;

    const catScore = new Map<string, number>();
    const teacherScore = new Map<string, number>();
    const bands: number[] = [];

    const bump = (m: Map<string, number>, k: string | null | undefined, v: number) => {
      if (!k) return;
      m.set(k, (m.get(k) ?? 0) + v);
    };

    for (const e of enrolls ?? []) {
      const c = e.courses as Rel;
      bump(catScore, c?.category, 3);
      bump(teacherScore, c?.teacher_name, 2);
      if (c?.target_band) bands.push(Number(c.target_band));
    }
    (views ?? []).forEach((v, i) => {
      const c = v.courses as Rel;
      const w = i < 10 ? 2 : 1;
      bump(catScore, c?.category, w);
      bump(teacherScore, c?.teacher_name, w / 2);
      if (c?.target_band) bands.push(Number(c.target_band));
    });

    const avgBand = bands.length ? bands.reduce((s, b) => s + b, 0) / bands.length : null;
    const recentViewedIds = new Set((views ?? []).slice(0, 10).map((v) => v.course_id));

    const scored = ((courses ?? []) as Course[])
      .filter((c) => !enrolledIds.has(c.id))
      .map((c) => {
        let score = Number(c.rating ?? 0) * 0.6 + Math.min(c.popularity ?? 0, 100) / 100;
        const reasons: string[] = [];

        const cs = catScore.get(c.category) ?? 0;
        if (cs > 0) {
          score += cs * 1.5;
          reasons.push(`matches your ${c.category.replace("_", " ")} focus`);
        }
        const ts = teacherScore.get(c.teacher_name) ?? 0;
        if (ts > 0) {
          score += ts;
          reasons.push(`more from ${c.teacher_name}`);
        }
        if (avgBand && c.target_band) {
          const diff = Math.abs(Number(c.target_band) - avgBand);
          score += Math.max(0, 2 - diff);
          if (diff <= 0.5) reasons.push(`aimed at Band ${c.target_band}`);
        }
        if (recentViewedIds.has(c.id)) {
          score += 4;
          reasons.unshift("you viewed this recently");
        }
        if (c.is_trending) score += 0.5;

        return {
          course: c,
          score,
          reason: reasons[0] ? reasons[0][0].toUpperCase() + reasons[0].slice(1) : "Popular with learners like you",
        };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    return scored;
  });
