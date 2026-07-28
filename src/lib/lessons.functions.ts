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

/* ---------- Teacher: drafts & scheduled publishing ---------- */

export type LessonStatus = "draft" | "scheduled" | "published";

export type TeacherLesson = Lesson & {
  status: LessonStatus;
  publish_at: string | null;
  has_draft: boolean;
  draft_title: string | null;
  draft_duration_min: number | null;
  draft_video_url: string | null;
  moderation_status: "pending" | "approved" | "rejected";
  updated_at: string;
};

const TEACHER_LESSON_COLS =
  "id, course_id, title, ordering, duration_min, video_url, status, publish_at, has_draft, draft_title, draft_duration_min, draft_video_url, moderation_status, updated_at";

async function assertOwnsCourse(supabase: any, userId: string, courseId: string) {
  const { data } = await supabase.from("courses").select("id").eq("id", courseId).eq("teacher_id", userId).maybeSingle();
  if (!data) throw new Error("You do not own this course");
}

export const listTeacherLessons = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { courseId: string }) => d)
  .handler(async ({ data, context }): Promise<TeacherLesson[]> => {
    await assertOwnsCourse(context.supabase, context.userId, data.courseId);
    const { data: rows, error } = await context.supabase
      .from("lessons")
      .select(TEACHER_LESSON_COLS)
      .eq("course_id", data.courseId)
      .order("ordering");
    if (error) throw error;
    return (rows ?? []) as TeacherLesson[];
  });

/** Saves pending edits without touching what learners currently see. */
export const saveLessonDraft = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { lessonId: string; courseId: string; title: string; durationMin: number; videoUrl?: string | null }) => d)
  .handler(async ({ data, context }) => {
    await assertOwnsCourse(context.supabase, context.userId, data.courseId);
    const { error } = await context.supabase
      .from("lessons")
      .update({
        draft_title: data.title,
        draft_duration_min: Math.max(1, Math.round(data.durationMin)),
        draft_video_url: data.videoUrl ?? null,
        has_draft: true,
      })
      .eq("id", data.lessonId)
      .eq("course_id", data.courseId);
    if (error) throw error;
    return { ok: true };
  });

export const discardLessonDraft = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { lessonId: string; courseId: string }) => d)
  .handler(async ({ data, context }) => {
    await assertOwnsCourse(context.supabase, context.userId, data.courseId);
    const { error } = await context.supabase
      .from("lessons")
      .update({ has_draft: false, draft_title: null, draft_duration_min: null, draft_video_url: null })
      .eq("id", data.lessonId)
      .eq("course_id", data.courseId);
    if (error) throw error;
    return { ok: true };
  });

/** Applies the draft live now, or schedules it for a future date. */
export const publishLessonDraft = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { lessonId: string; courseId: string; publishAt?: string | null }) => d)
  .handler(async ({ data, context }) => {
    await assertOwnsCourse(context.supabase, context.userId, data.courseId);
    const { data: row, error: rErr } = await context.supabase
      .from("lessons")
      .select(TEACHER_LESSON_COLS)
      .eq("id", data.lessonId)
      .eq("course_id", data.courseId)
      .maybeSingle();
    if (rErr) throw rErr;
    if (!row) throw new Error("Lesson not found");
    const l = row as TeacherLesson;

    const patch: Record<string, unknown> = {
      title: l.has_draft && l.draft_title ? l.draft_title : l.title,
      duration_min: l.has_draft && l.draft_duration_min ? l.draft_duration_min : l.duration_min,
      video_url: l.has_draft ? l.draft_video_url : l.video_url,
      has_draft: false,
      draft_title: null,
      draft_duration_min: null,
      draft_video_url: null,
    };

    if (data.publishAt && new Date(data.publishAt).getTime() > Date.now()) {
      patch.status = "scheduled";
      patch.publish_at = data.publishAt;
    } else {
      patch.status = "published";
      patch.publish_at = null;
    }

    const { error } = await context.supabase.from("lessons").update(patch).eq("id", data.lessonId);
    if (error) throw error;
    return { ok: true, scheduled: patch.status === "scheduled" };
  });

export const unpublishLesson = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { lessonId: string; courseId: string }) => d)
  .handler(async ({ data, context }) => {
    await assertOwnsCourse(context.supabase, context.userId, data.courseId);
    const { error } = await context.supabase
      .from("lessons")
      .update({ status: "draft", publish_at: null })
      .eq("id", data.lessonId)
      .eq("course_id", data.courseId);
    if (error) throw error;
    return { ok: true };
  });

/* ---------- Learner: watch telemetry ---------- */

export const recordLessonWatch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { courseId: string; lessonId: string; watchedSeconds: number; completed?: boolean }) => d)
  .handler(async ({ data, context }) => {
    if (data.watchedSeconds <= 0) return { ok: true };
    const { error } = await context.supabase.from("lesson_watch_events").insert({
      user_id: context.userId,
      course_id: data.courseId,
      lesson_id: data.lessonId,
      watched_seconds: Math.min(60 * 60 * 6, Math.round(data.watchedSeconds)),
      completed: !!data.completed,
    });
    if (error) throw error;
    return { ok: true };
  });
