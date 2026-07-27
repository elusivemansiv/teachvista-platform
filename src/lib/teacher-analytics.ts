import type { SupabaseClient } from "@supabase/supabase-js";

export type TrendPoint = { date: string; views: number; enrollments: number; completions: number };

/** Pure helper: builds a daily trend series for a set of course ids. */
export async function buildTrends(
  supabase: SupabaseClient<any, any, any>,
  courseIds: string[],
  days: number,
): Promise<TrendPoint[]> {
  if (!courseIds.length) return [];
  const since = new Date(Date.now() - (days - 1) * 86400000);
  since.setHours(0, 0, 0, 0);

  const [{ data: views }, { data: enrolls }] = await Promise.all([
    supabase.from("course_views").select("viewed_at").in("course_id", courseIds).gte("viewed_at", since.toISOString()),
    supabase.from("enrollments").select("created_at, updated_at, status").in("course_id", courseIds),
  ]);

  const key = (d: string | Date) => new Date(d).toISOString().slice(0, 10);
  const map = new Map<string, TrendPoint>();
  for (let i = 0; i < days; i++) {
    const d = new Date(since.getTime() + i * 86400000);
    map.set(key(d), { date: key(d), views: 0, enrollments: 0, completions: 0 });
  }
  for (const v of (views ?? []) as { viewed_at: string }[]) {
    const p = map.get(key(v.viewed_at));
    if (p) p.views += 1;
  }
  for (const e of (enrolls ?? []) as { created_at: string; updated_at: string; status: string }[]) {
    const p = map.get(key(e.created_at));
    if (p) p.enrollments += 1;
    if (e.status === "completed") {
      const q = map.get(key(e.updated_at));
      if (q) q.completions += 1;
    }
  }
  return [...map.values()];
}
