/** Shared upload validation rules for teacher-supplied files (client + server). */

export type UploadKind = "video" | "thumbnail" | "csv";

export type UploadRule = {
  label: string;
  maxBytes: number;
  mimeTypes: string[];
  extensions: string[];
};

export const UPLOAD_RULES: Record<UploadKind, UploadRule> = {
  video: {
    label: "Lesson video",
    maxBytes: 2 * 1024 * 1024 * 1024, // 2 GB
    mimeTypes: ["video/mp4", "video/webm", "video/quicktime"],
    extensions: [".mp4", ".webm", ".mov"],
  },
  thumbnail: {
    label: "Course thumbnail",
    maxBytes: 5 * 1024 * 1024, // 5 MB
    mimeTypes: ["image/jpeg", "image/png", "image/webp"],
    extensions: [".jpg", ".jpeg", ".png", ".webp"],
  },
  csv: {
    label: "Lesson CSV",
    maxBytes: 2 * 1024 * 1024, // 2 MB
    mimeTypes: ["text/csv", "application/csv", "text/plain", "application/vnd.ms-excel", ""],
    extensions: [".csv", ".txt"],
  },
};

export function formatBytes(bytes: number): string {
  if (bytes >= 1024 ** 3) return `${(bytes / 1024 ** 3).toFixed(bytes % 1024 ** 3 === 0 ? 0 : 1)} GB`;
  if (bytes >= 1024 ** 2) return `${Math.round(bytes / 1024 ** 2)} MB`;
  return `${Math.round(bytes / 1024)} KB`;
}

export function extensionOf(fileName: string): string {
  const i = fileName.lastIndexOf(".");
  return i === -1 ? "" : fileName.slice(i).toLowerCase();
}

/** Strips directory traversal and unsafe characters so the name is storage-safe. */
export function safeFileName(fileName: string): string {
  const base = fileName.split(/[\\/]/).pop() ?? "file";
  return base.replace(/[^a-zA-Z0-9._-]/g, "-").replace(/-{2,}/g, "-").slice(-120) || "file";
}

export type UploadCandidate = { name: string; size: number; type: string };

export type UploadValidation = { ok: true; fileName: string } | { ok: false; error: string };

export function validateUpload(kind: UploadKind, file: UploadCandidate): UploadValidation {
  const rule = UPLOAD_RULES[kind];
  const name = safeFileName(file.name);
  const ext = extensionOf(name);

  if (!ext || !rule.extensions.includes(ext)) {
    return { ok: false, error: `${rule.label}: "${ext || "no extension"}" is not allowed. Use ${rule.extensions.join(", ")}.` };
  }
  const mime = (file.type || "").toLowerCase().split(";")[0]!.trim();
  if (!rule.mimeTypes.includes(mime)) {
    return { ok: false, error: `${rule.label}: file type "${mime || "unknown"}" is not allowed.` };
  }
  if (!Number.isFinite(file.size) || file.size <= 0) {
    return { ok: false, error: `${rule.label}: the file appears to be empty.` };
  }
  if (file.size > rule.maxBytes) {
    return { ok: false, error: `${rule.label}: ${formatBytes(file.size)} exceeds the ${formatBytes(rule.maxBytes)} limit.` };
  }
  return { ok: true, fileName: name };
}

export const COURSE_MEDIA_BUCKET = "course-media";

/** Storage path is namespaced per teacher so storage policies can enforce ownership. */
export function courseMediaPath(userId: string, courseId: string, kind: UploadKind, fileName: string): string {
  return `${userId}/${courseId}/${kind}/${Date.now()}-${safeFileName(fileName)}`;
}
