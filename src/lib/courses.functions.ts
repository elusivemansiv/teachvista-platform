import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import type { Course } from "./courses";

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

const COLUMNS =
  "id, slug, title, description, category, level, target_band, duration_hours, thumbnail_url, teacher_name, popularity, student_count, rating, is_trending, created_at";

export const listCourses = createServerFn({ method: "GET" }).handler(async (): Promise<Course[]> => {
  const { data, error } = await serverSupabase()
    .from("courses")
    .select(COLUMNS)
    .eq("is_published", true)
    .order("popularity", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Course[];
});

export const getCourseBySlug = createServerFn({ method: "GET" })
  .inputValidator((d: { slug: string }) => d)
  .handler(async ({ data }): Promise<Course | null> => {
    const { data: rows, error } = await serverSupabase()
      .from("courses")
      .select(COLUMNS)
      .eq("slug", data.slug)
      .eq("is_published", true)
      .maybeSingle();
    if (error) throw error;
    return (rows ?? null) as Course | null;
  });

export const recordCourseView = createServerFn({ method: "POST" })
  .inputValidator((d: { courseId: string }) => d)
  .handler(async ({ data }) => {
    const { error } = await serverSupabase().rpc("increment_course_view", { _course_id: data.courseId });
    if (error) throw error;
    return { ok: true };
  });
