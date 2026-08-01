import { createFileRoute, redirect, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useRef, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { listTeacherCourseAnalytics } from "@/lib/teacher.functions";
import { bulkCreateLessons } from "@/lib/bulk-lessons.functions";
import { downloadCsvTemplate, parseBulkLessonCsv, type BulkLessonRow } from "@/lib/bulk-lessons";
import { UPLOAD_RULES, formatBytes, validateUpload } from "@/lib/uploads";
import { toast } from "sonner";
import { Download, FileSpreadsheet, Upload, AlertTriangle } from "lucide-react";

export const Route = createFileRoute("/_authenticated/teacher/bulk")({
  beforeLoad: ({ context }) => {
    if ((context as { role?: string }).role !== "teacher") throw redirect({ to: "/dashboard" });
  },
  head: () => ({
    meta: [
      { title: "Bulk lesson upload — BandPath teacher portal" },
      {
        name: "description",
        content: "Upload a CSV to add many IELTS lessons and modules to a course at once, then submit it for moderation.",
      },
      { property: "og:title", content: "Bulk lesson upload — BandPath" },
      { property: "og:description", content: "Add multiple lessons and modules in one go with a CSV template." },
    ],
  }),
  component: () => (
    <AppShell>
      <BulkUpload />
    </AppShell>
  ),
  errorComponent: ({ error }) => <div role="alert" className="p-8 text-destructive">{error.message}</div>,
});

function BulkUpload() {
  const queryClient = useQueryClient();
  const fetchCourses = useServerFn(listTeacherCourseAnalytics);
  const createFn = useServerFn(bulkCreateLessons);
  const fileRef = useRef<HTMLInputElement>(null);

  const [courseId, setCourseId] = useState<string>("");
  const [raw, setRaw] = useState("");
  const [submitForReview, setSubmitForReview] = useState(true);

  const { data: courses = [] } = useQuery({
    queryKey: ["teacher", "analytics"],
    queryFn: () => fetchCourses(),
  });

  const parsed = useMemo(() => (raw.trim() ? parseBulkLessonCsv(raw) : { rows: [] as BulkLessonRow[], errors: [] }), [raw]);

  const grouped = useMemo(() => {
    const map = new Map<string, BulkLessonRow[]>();
    for (const r of parsed.rows) {
      if (!map.has(r.module)) map.set(r.module, []);
      map.get(r.module)!.push(r);
    }
    return [...map.entries()];
  }, [parsed.rows]);

  const mutation = useMutation({
    mutationFn: () => createFn({ data: { courseId, rows: parsed.rows, submitForReview } }),
    onSuccess: (r) => {
      toast.success(
        `${r.created} lesson${r.created === 1 ? "" : "s"} imported${r.submitted ? " and submitted for review" : ""}.`,
      );
      setRaw("");
      if (fileRef.current) fileRef.current.value = "";
      queryClient.invalidateQueries({ queryKey: ["teacher"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const check = validateUpload("csv", { name: file.name, size: file.size, type: file.type });
    if (!check.ok) {
      toast.error(check.error);
      e.target.value = "";
      return;
    }
    setRaw(await file.text());
  }

  const canSubmit = !!courseId && parsed.rows.length > 0 && !mutation.isPending;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <header>
        <div className="flex items-center gap-2 text-sm font-semibold text-primary">
          <FileSpreadsheet className="h-4 w-4" aria-hidden="true" /> Teacher portal
        </div>
        <h1 className="mt-1 font-display text-3xl font-extrabold">Bulk lesson upload</h1>
        <p className="mt-1 text-muted-foreground">
          Add every module and lesson for a course in one pass, then send the whole thing to moderation.
        </p>
      </header>

      <section className="rounded-3xl border border-border bg-card p-6">
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <Label htmlFor="bulk-course">Course</Label>
            <Select value={courseId} onValueChange={setCourseId}>
              <SelectTrigger id="bulk-course" className="mt-1.5">
                <SelectValue placeholder="Choose a course…" />
              </SelectTrigger>
              <SelectContent>
                {courses.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {courses.length === 0 && (
              <p className="mt-2 text-xs text-muted-foreground">
                No courses yet — <Link to="/teacher/upload" className="font-semibold text-primary hover:underline">create one first</Link>.
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="bulk-file">CSV file</Label>
            <input
              ref={fileRef}
              id="bulk-file"
              type="file"
              accept=".csv,text/csv"
              onChange={onFile}
              className="mt-1.5 block w-full rounded-xl border border-border bg-background px-3 py-2 text-sm file:mr-3 file:rounded-full file:border-0 file:bg-secondary file:px-3 file:py-1.5 file:text-sm file:font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            <Button variant="ghost" size="sm" className="mt-2 rounded-full" onClick={downloadCsvTemplate}>
              <Download className="h-4 w-4" aria-hidden="true" /> Download CSV template
            </Button>
          </div>
        </div>

        <div className="mt-5">
          <Label htmlFor="bulk-raw">Or paste CSV</Label>
          <Textarea
            id="bulk-raw"
            rows={6}
            className="mt-1.5 font-mono text-xs"
            placeholder="module,title,duration_min,video_url"
            value={raw}
            onChange={(e) => setRaw(e.target.value)}
          />
          <p className="mt-2 text-xs text-muted-foreground">
            Columns: <code>module</code>, <code>title</code> (required), <code>duration_min</code>, <code>video_url</code>.
          </p>
        </div>

        <label className="mt-5 flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={submitForReview}
            onChange={(e) => setSubmitForReview(e.target.checked)}
            className="h-4 w-4 rounded border-border"
          />
          Submit the course for moderation after importing
        </label>

        <Button className="mt-5 rounded-full" disabled={!canSubmit} onClick={() => mutation.mutate()}>
          <Upload className="h-4 w-4" aria-hidden="true" />
          {mutation.isPending ? "Importing…" : `Import ${parsed.rows.length || ""} lesson${parsed.rows.length === 1 ? "" : "s"}`}
        </Button>
      </section>

      {parsed.errors.length > 0 && (
        <div role="alert" className="rounded-3xl border border-destructive/40 bg-destructive/5 p-5">
          <p className="flex items-center gap-2 font-semibold text-destructive">
            <AlertTriangle className="h-4 w-4" aria-hidden="true" /> {parsed.errors.length} row problem
            {parsed.errors.length === 1 ? "" : "s"} skipped
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-destructive">
            {parsed.errors.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        </div>
      )}

      {grouped.length > 0 && (
        <section className="rounded-3xl border border-border bg-card p-6">
          <h2 className="font-display text-xl font-bold">Preview</h2>
          <p className="text-sm text-muted-foreground">
            {parsed.rows.length} lessons across {grouped.length} module{grouped.length === 1 ? "" : "s"}.
          </p>
          <div className="mt-4 space-y-4">
            {grouped.map(([mod, rows]) => (
              <div key={mod}>
                <h3 className="text-sm font-bold">{mod}</h3>
                <ul className="mt-2 divide-y divide-border rounded-2xl border border-border">
                  {rows.map((r, i) => (
                    <li key={`${mod}-${i}`} className="flex items-center gap-3 p-3 text-sm">
                      <span className="flex-1">{r.title}</span>
                      <span className="text-xs text-muted-foreground">{r.durationMin} min</span>
                      {r.videoUrl && (
                        <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-semibold">video</span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
