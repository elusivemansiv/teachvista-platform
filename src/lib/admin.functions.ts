import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type ModerationStatus = "pending" | "approved" | "rejected";

export type QueueLesson = {
  id: string;
  title: string;
  ordering: number;
  duration_min: number;
  status: "draft" | "scheduled" | "published";
  publish_at: string | null;
  moderation_status: ModerationStatus;
  has_draft: boolean;
};

export type QueueCourse = {
  id: string;
  slug: string;
  title: string;
  description: string;
  category: string;
  level: string;
  teacher_name: string;
  is_published: boolean;
  created_at: string;
  moderation_status: ModerationStatus;
  moderation_note: string | null;
  reviewed_at: string | null;
  lessons: QueueLesson[];
};

async function assertAdmin(context: { supabase: any; userId: string }) {
  const { data } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
  if (!data) throw new Error("Admins only");
}

const COURSE_COLS =
  "id, slug, title, description, category, level, teacher_name, is_published, created_at, moderation_status, moderation_note, reviewed_at";
const LESSON_COLS = "id, course_id, title, ordering, duration_min, status, publish_at, moderation_status, has_draft";

export const amIAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<boolean> => {
    const { data } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    return !!data;
  });

export const listModerationQueue = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { status?: ModerationStatus | "all" } | undefined) => d ?? {})
  .handler(async ({ data, context }): Promise<QueueCourse[]> => {
    await assertAdmin(context as never);
    const { supabase } = context;
    let q = supabase.from("courses").select(COURSE_COLS).order("created_at", { ascending: false });
    if (data.status && data.status !== "all") q = q.eq("moderation_status", data.status);
    const { data: courses, error } = await q;
    if (error) throw error;
    const list = (courses ?? []) as Omit<QueueCourse, "lessons">[];
    if (!list.length) return [];

    const { data: lessons } = await supabase
      .from("lessons")
      .select(LESSON_COLS)
      .in("course_id", list.map((c) => c.id))
      .order("ordering");

    return list.map((c) => ({
      ...c,
      lessons: ((lessons ?? []) as (QueueLesson & { course_id: string })[]).filter((l) => l.course_id === c.id),
    }));
  });

export const reviewCourse = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { courseId: string; status: ModerationStatus; note?: string }) => d)
  .handler(async ({ data, context }) => {
    await assertAdmin(context as never);
    const { error } = await context.supabase
      .from("courses")
      .update({
        moderation_status: data.status,
        moderation_note: data.note ?? null,
        reviewed_at: new Date().toISOString(),
        reviewed_by: context.userId,
      })
      .eq("id", data.courseId);
    if (error) throw error;
    return { ok: true };
  });

export const reviewLesson = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { lessonId: string; status: ModerationStatus }) => d)
  .handler(async ({ data, context }) => {
    await assertAdmin(context as never);
    const { error } = await context.supabase
      .from("lessons")
      .update({ moderation_status: data.status })
      .eq("id", data.lessonId);
    if (error) throw error;
    return { ok: true };
  });
