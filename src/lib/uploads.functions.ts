import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { COURSE_MEDIA_BUCKET, courseMediaPath, validateUpload, type UploadKind } from "@/lib/uploads";

export type UploadSlot = { bucket: string; path: string; expiresIn: number };

/**
 * Server-side gate for teacher file uploads: re-validates MIME type and size,
 * verifies the caller owns the course, and only then hands back a scoped
 * storage path inside the teacher's own folder.
 */
export const requestUploadSlot = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { courseId: string; kind: UploadKind; fileName: string; size: number; mimeType: string }) => d)
  .handler(async ({ data, context }): Promise<UploadSlot> => {
    const { supabase, userId } = context;

    const check = validateUpload(data.kind, { name: data.fileName, size: data.size, type: data.mimeType });
    if (!check.ok) throw new Error(check.error);

    const { data: course } = await supabase
      .from("courses")
      .select("id")
      .eq("id", data.courseId)
      .eq("teacher_id", userId)
      .maybeSingle();
    if (!course) throw new Error("You do not own this course");

    return {
      bucket: COURSE_MEDIA_BUCKET,
      path: courseMediaPath(userId, data.courseId, data.kind, check.fileName),
      expiresIn: 900,
    };
  });
