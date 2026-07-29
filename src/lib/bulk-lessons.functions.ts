import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { BulkLessonRow } from "./bulk-lessons";

export const bulkCreateLessons = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { courseId: string; rows: BulkLessonRow[]; submitForReview: boolean }) => d)
  .handler(async ({ data, context }): Promise<{ created: number; submitted: boolean }> => {
    const { supabase, userId } = context;
    const { data: course } = await supabase
      .from("courses")
      .select("id, title")
      .eq("id", data.courseId)
      .eq("teacher_id", userId)
      .maybeSingle();
    if (!course) throw new Error("You do not own this course");
    if (!data.rows.length) throw new Error("No lessons to import");

    const { data: existing } = await supabase
      .from("lessons")
      .select("ordering")
      .eq("course_id", data.courseId)
      .order("ordering", { ascending: false })
      .limit(1);
    let ordering = (existing?.[0]?.ordering ?? 0) as number;

    const payload = data.rows.map((r) => ({
      course_id: data.courseId,
      title: r.module ? `${r.module} · ${r.title}` : r.title,
      ordering: ++ordering,
      duration_min: Math.max(1, Math.round(r.durationMin)),
      video_url: r.videoUrl,
      status: "draft" as const,
      moderation_status: "pending" as const,
    }));

    const { error } = await supabase.from("lessons").insert(payload);
    if (error) throw error;

    if (data.submitForReview) {
      const { error: cErr } = await supabase
        .from("courses")
        .update({ moderation_status: "pending", submitted_at: new Date().toISOString() })
        .eq("id", data.courseId)
        .eq("teacher_id", userId);
      if (cErr) throw cErr;

      await supabase.from("notifications").insert({
        user_id: userId,
        type: "submitted",
        title: `Submitted for review: ${course.title}`,
        body: `${payload.length} lesson${payload.length === 1 ? "" : "s"} uploaded and sent to the moderation queue.`,
        link: `/teacher/course/${data.courseId}`,
        course_id: data.courseId,
      });
    }

    return { created: payload.length, submitted: data.submitForReview };
  });
