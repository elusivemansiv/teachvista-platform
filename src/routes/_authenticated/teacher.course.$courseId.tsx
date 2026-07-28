import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Suspense } from "react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { getTeacherCourseDetail } from "@/lib/teacher.functions";
import { categoryLabel } from "@/lib/courses";
import { downloadCsv, downloadPdfReport } from "@/lib/report-export";
import { ArrowLeft, Download, Eye, Users, CheckCircle2, FileText } from "lucide-react";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

export const Route = createFileRoute("/_authenticated/teacher/course/$courseId")({
  beforeLoad: ({ context }) => {
    if ((context as { role?: string }).role !== "teacher") throw redirect({ to: "/dashboard" });
  },
  head: () => ({
    meta: [
      { title: "Course analytics — BandPath teacher portal" },
      { name: "description", content: "Detailed views, enrollments, engagement trends and module breakdown for your IELTS course." },
    ],
  }),
  component: () => (
    <AppShell>
      <Suspense fallback={<div className="text-muted-foreground">Loading course…</div>}>
        <CourseDetail />
      </Suspense>
    </AppShell>
  ),
  errorComponent: ({ error }) => <div role="alert" className="p-8 text-destructive">{error.message}</div>,
  notFoundComponent: () => <div className="p-8">Course not found.</div>,
});

function CourseDetail() {
  const { courseId } = Route.useParams();
  const fetchDetail = useServerFn(getTeacherCourseDetail);
  const { data } = useSuspenseQuery({
    queryKey: ["teacher-course", courseId],
    queryFn: () => fetchDetail({ data: { courseId } }),
  });

  if (!data) {
    return (
      <div className="rounded-3xl border border-dashed border-border p-12 text-center">
        <p className="text-muted-foreground">This course doesn't exist or isn't yours.</p>
        <Link to="/teacher"><Button className="mt-4 rounded-full">Back to portal</Button></Link>
      </div>
    );
  }

  const { course, lessons, stats, trends } = data;
  const fileBase = course.slug.replace(/[^a-z0-9-]/gi, "-");

  function exportCsv() {
    downloadCsv(
      `${fileBase}-analytics.csv`,
      ["Date", "Views", "Enrollments", "Completions"],
      trends.map((t) => [t.date, t.views, t.enrollments, t.completions]),
    );
  }

  function exportPdf() {
    downloadPdfReport({
      filename: `${fileBase}-analytics.pdf`,
      title: `${course.title} — course analytics`,
      subtitle: `${categoryLabel(course.category)} · generated ${new Date().toLocaleString()}`,
      sections: [
        {
          heading: "Summary",
          headers: ["Views", "Enrollments", "Active", "Completed", "Avg progress", "Rating"],
          rows: [[stats.views, stats.enrollments, stats.active, stats.completed, `${stats.avg_progress}%`, course.rating]],
        },
        {
          heading: "Engagement trend (last 30 days)",
          headers: ["Date", "Views", "Enrollments", "Completions"],
          rows: trends.map((t) => [t.date, t.views, t.enrollments, t.completions]),
        },
        {
          heading: "Modules",
          headers: ["#", "Lesson", "Duration (min)", "Learners completed"],
          rows: lessons.map((l) => [l.ordering, l.title, l.duration_min, l.completions]),
        },
      ],
    });
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <Link to="/teacher" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to portal
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs">
            <span className="rounded-full bg-primary-soft px-3 py-1 font-semibold text-primary">{categoryLabel(course.category)}</span>
            <span className="rounded-full bg-secondary px-3 py-1 font-semibold capitalize">{course.level}</span>
            <span className={`rounded-full px-3 py-1 font-semibold ${course.is_published ? "bg-emerald-100 text-emerald-700" : "bg-secondary text-muted-foreground"}`}>
              {course.is_published ? "Published" : "Draft"}
            </span>
          </div>
          <h1 className="mt-3 font-display text-3xl font-extrabold">{course.title}</h1>
          <p className="mt-1 max-w-2xl text-muted-foreground">{course.description}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="rounded-full" onClick={exportCsv}>
            <Download className="mr-1.5 h-4 w-4" /> CSV
          </Button>
          <Button variant="outline" className="rounded-full" onClick={exportPdf}>
            <FileText className="mr-1.5 h-4 w-4" /> PDF
          </Button>
          <Link to="/course/$slug" params={{ slug: course.slug }}>
            <Button className="rounded-full">View public page</Button>
          </Link>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat icon={<Eye className="h-5 w-5" />} label="Views" value={stats.views.toLocaleString()} />
        <Stat icon={<Users className="h-5 w-5" />} label="Enrollments" value={stats.enrollments.toLocaleString()} />
        <Stat icon={<CheckCircle2 className="h-5 w-5" />} label="Completed" value={stats.completed.toLocaleString()} />
        <Stat icon={<span className="text-sm font-bold">%</span>} label="Avg progress" value={`${stats.avg_progress}%`} />
      </div>

      <section className="rounded-3xl border border-border bg-card p-6">
        <h2 className="font-display text-xl font-bold">Engagement over time</h2>
        <p className="text-sm text-muted-foreground">Daily views, enrollments and completions over the last 30 days.</p>
        <div className="mt-5 h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={trends} margin={{ left: -20, right: 8, top: 8 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="date" tickFormatter={(d: string) => d.slice(5)} fontSize={11} />
              <YAxis allowDecimals={false} fontSize={11} />
              <Tooltip />
              <Area type="monotone" dataKey="views" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.15} />
              <Area type="monotone" dataKey="enrollments" stroke="#fb923c" fill="#fb923c" fillOpacity={0.2} />
              <Area type="monotone" dataKey="completions" stroke="#10b981" fill="#10b981" fillOpacity={0.2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="rounded-3xl border border-border bg-card p-6">
        <h2 className="font-display text-xl font-bold">Modules & lessons</h2>
        <p className="text-sm text-muted-foreground">{lessons.length} lessons · {course.duration_hours}h total</p>
        <ol className="mt-4 divide-y divide-border">
          {lessons.map((l) => (
            <li key={l.id} className="flex items-center gap-4 py-3">
              <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary-soft text-sm font-bold text-primary">
                {l.ordering}
              </div>
              <div className="flex-1 text-sm font-medium">{l.title}</div>
              <div className="text-xs text-muted-foreground">{l.duration_min} min</div>
              <div className="w-40">
                <Progress value={stats.enrollments ? (l.completions / stats.enrollments) * 100 : 0} className="h-2" />
                <div className="mt-1 text-right text-xs text-muted-foreground">{l.completions} completed</div>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <LessonManager courseId={course.id} />
      <CohortSection courseId={course.id} />
    </div>
  );
}

function LessonManager({ courseId }: { courseId: string }) {
  const queryClient = useQueryClient();
  const fetchLessons = useServerFn(listTeacherLessons);
  const saveDraft = useServerFn(saveLessonDraft);
  const discardDraft = useServerFn(discardLessonDraft);
  const publishDraft = useServerFn(publishLessonDraft);
  const unpublish = useServerFn(unpublishLesson);
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState<{ title: string; durationMin: number; videoUrl: string }>({
    title: "",
    durationMin: 10,
    videoUrl: "",
  });
  const [schedule, setSchedule] = useState<Record<string, string>>({});

  const { data: lessons = [], isLoading } = useQuery({
    queryKey: ["teacher-lessons", courseId],
    queryFn: () => fetchLessons({ data: { courseId } }),
  });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["teacher-lessons", courseId] });
    queryClient.invalidateQueries({ queryKey: ["teacher-course", courseId] });
  };

  const saveMut = useMutation({
    mutationFn: (v: { lessonId: string }) =>
      saveDraft({ data: { lessonId: v.lessonId, courseId, title: form.title, durationMin: form.durationMin, videoUrl: form.videoUrl || null } }),
    onSuccess: () => {
      toast.success("Draft saved — learners still see the published version");
      setEditing(null);
      refresh();
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const publishMut = useMutation({
    mutationFn: (v: { lessonId: string; publishAt?: string | null }) =>
      publishDraft({ data: { lessonId: v.lessonId, courseId, publishAt: v.publishAt ?? null } }),
    onSuccess: (r) => {
      toast.success(r.scheduled ? "Scheduled for publishing" : "Published to learners");
      refresh();
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const discardMut = useMutation({
    mutationFn: (lessonId: string) => discardDraft({ data: { lessonId, courseId } }),
    onSuccess: () => {
      toast.success("Draft discarded");
      refresh();
    },
  });

  const unpublishMut = useMutation({
    mutationFn: (lessonId: string) => unpublish({ data: { lessonId, courseId } }),
    onSuccess: () => {
      toast.success("Lesson hidden from learners");
      refresh();
    },
  });

  return (
    <section className="rounded-3xl border border-border bg-card p-6">
      <h2 className="font-display text-xl font-bold">Drafts &amp; publishing</h2>
      <p className="text-sm text-muted-foreground">
        Edit a lesson without changing what learners currently see. Publish immediately, or schedule it for later.
      </p>
      {isLoading && <p className="mt-4 text-sm text-muted-foreground">Loading lessons…</p>}
      <ul className="mt-4 space-y-3">
        {lessons.map((l) => (
          <li key={l.id} className="rounded-2xl border border-border p-4">
            <div className="flex flex-wrap items-center gap-3">
              <span className="grid h-8 w-8 place-items-center rounded-full bg-primary-soft text-sm font-bold text-primary">
                {l.ordering}
              </span>
              <span className="flex-1 text-sm font-semibold">{l.title}</span>
              <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-semibold capitalize">{l.status}</span>
              {l.has_draft && (
                <span className="rounded-full bg-accent px-2.5 py-0.5 text-xs font-semibold text-accent-foreground">
                  Unpublished draft
                </span>
              )}
              {l.publish_at && (
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <CalendarClock className="h-3.5 w-3.5" aria-hidden="true" />
                  {new Date(l.publish_at).toLocaleString()}
                </span>
              )}
              <Button
                size="sm"
                variant="outline"
                className="rounded-full"
                aria-expanded={editing === l.id}
                onClick={() => {
                  setEditing(editing === l.id ? null : l.id);
                  setForm({
                    title: l.draft_title ?? l.title,
                    durationMin: l.draft_duration_min ?? l.duration_min,
                    videoUrl: l.draft_video_url ?? l.video_url ?? "",
                  });
                }}
              >
                {editing === l.id ? "Close" : "Edit draft"}
              </Button>
            </div>

            {editing === l.id && (
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <div className="sm:col-span-2">
                  <label htmlFor={`t-${l.id}`} className="text-xs font-semibold text-muted-foreground">Lesson title</label>
                  <Input id={`t-${l.id}`} value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
                </div>
                <div>
                  <label htmlFor={`d-${l.id}`} className="text-xs font-semibold text-muted-foreground">Duration (min)</label>
                  <Input
                    id={`d-${l.id}`}
                    type="number"
                    min={1}
                    value={form.durationMin}
                    onChange={(e) => setForm((f) => ({ ...f, durationMin: Number(e.target.value) }))}
                  />
                </div>
                <div className="sm:col-span-3">
                  <label htmlFor={`v-${l.id}`} className="text-xs font-semibold text-muted-foreground">Video URL</label>
                  <Input id={`v-${l.id}`} value={form.videoUrl} onChange={(e) => setForm((f) => ({ ...f, videoUrl: e.target.value }))} />
                </div>
                <div className="sm:col-span-3 flex flex-wrap items-end gap-3">
                  <Button className="rounded-full" disabled={saveMut.isPending} onClick={() => saveMut.mutate({ lessonId: l.id })}>
                    Save draft
                  </Button>
                  <div>
                    <label htmlFor={`s-${l.id}`} className="text-xs font-semibold text-muted-foreground">Publish at (optional)</label>
                    <Input
                      id={`s-${l.id}`}
                      type="datetime-local"
                      value={schedule[l.id] ?? ""}
                      onChange={(e) => setSchedule((s) => ({ ...s, [l.id]: e.target.value }))}
                    />
                  </div>
                  <Button
                    variant="outline"
                    className="rounded-full"
                    disabled={publishMut.isPending}
                    onClick={() =>
                      publishMut.mutate({
                        lessonId: l.id,
                        publishAt: schedule[l.id] ? new Date(schedule[l.id]).toISOString() : null,
                      })
                    }
                  >
                    {schedule[l.id] ? "Schedule" : "Publish now"}
                  </Button>
                  {l.has_draft && (
                    <Button variant="ghost" className="rounded-full" onClick={() => discardMut.mutate(l.id)}>
                      Discard draft
                    </Button>
                  )}
                  {l.status === "published" && (
                    <Button variant="ghost" className="rounded-full text-destructive" onClick={() => unpublishMut.mutate(l.id)}>
                      Unpublish
                    </Button>
                  )}
                </div>
              </div>
            )}
          </li>
        ))}
        {!isLoading && lessons.length === 0 && <li className="text-sm text-muted-foreground">No lessons yet.</li>}
      </ul>
    </section>
  );
}

function CohortSection({ courseId }: { courseId: string }) {
  const fetchCohorts = useServerFn(getCourseCohortAnalytics);
  const { data } = useQuery({
    queryKey: ["cohorts", courseId],
    queryFn: () => fetchCohorts({ data: { courseId } }),
  });
  if (!data) return null;
  const { lessons, cohorts } = data;

  return (
    <section className="rounded-3xl border border-border bg-card p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-bold">Cohort engagement</h2>
          <p className="text-sm text-muted-foreground">
            Weekly drop-off and average watch time per lesson, grouped by the week learners enrolled.
          </p>
        </div>
        <Button
          variant="outline"
          className="rounded-full"
          onClick={() =>
            downloadCsv(
              "cohort-engagement.csv",
              ["Lesson", "Reached", "Completed", "Drop-off %", "Avg watch (min)"],
              lessons.map((l) => [l.title, l.reached, l.completed, l.dropOffPct, l.avgWatchMin]),
            )
          }
        >
          <Download className="mr-1.5 h-4 w-4" aria-hidden="true" /> Export cohorts
        </Button>
      </div>

      <div className="mt-5 h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={lessons.map((l) => ({ name: `L${l.ordering}`, dropOff: l.dropOffPct, watch: l.avgWatchMin }))}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis dataKey="name" fontSize={11} />
            <YAxis fontSize={11} />
            <Tooltip />
            <Legend />
            <Bar dataKey="dropOff" name="Drop-off %" fill="#fb923c" radius={[6, 6, 0, 0]} />
            <Bar dataKey="watch" name="Avg watch (min)" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-6 overflow-x-auto">
        <table className="w-full text-sm">
          <caption className="sr-only">Per-lesson engagement</caption>
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase text-muted-foreground">
              <th scope="col" className="py-2">Lesson</th>
              <th scope="col" className="py-2">Reached</th>
              <th scope="col" className="py-2">Completed</th>
              <th scope="col" className="py-2">Drop-off</th>
              <th scope="col" className="py-2">Avg watch</th>
            </tr>
          </thead>
          <tbody>
            {lessons.map((l) => (
              <tr key={l.lessonId} className="border-b border-border/60">
                <th scope="row" className="py-2 text-left font-medium">{l.ordering}. {l.title}</th>
                <td className="py-2">{l.reached}</td>
                <td className="py-2">{l.completed}</td>
                <td className="py-2">{l.dropOffPct}%</td>
                <td className="py-2">{l.avgWatchMin} min</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-6 overflow-x-auto">
        <table className="w-full text-sm">
          <caption className="sr-only">Weekly cohorts</caption>
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase text-muted-foreground">
              <th scope="col" className="py-2">Cohort week</th>
              <th scope="col" className="py-2">Learners</th>
              <th scope="col" className="py-2">Avg lessons done</th>
              <th scope="col" className="py-2">Avg watch</th>
              <th scope="col" className="py-2">Still active</th>
            </tr>
          </thead>
          <tbody>
            {cohorts.map((c) => (
              <tr key={c.week} className="border-b border-border/60">
                <th scope="row" className="py-2 text-left font-medium">Week of {c.week}</th>
                <td className="py-2">{c.learners}</td>
                <td className="py-2">{c.avgLessonsCompleted}</td>
                <td className="py-2">{c.avgWatchMin} min</td>
                <td className="py-2">{c.retentionPct}%</td>
              </tr>
            ))}
            {cohorts.length === 0 && (
              <tr>
                <td colSpan={5} className="py-4 text-muted-foreground">No enrollments yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-3xl border border-border bg-card p-5">
      <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary-soft text-primary">{icon}</div>
      <div className="mt-3 font-display text-3xl font-extrabold">{value}</div>
      <div className="text-sm text-muted-foreground">{label}</div>
    </div>
  );
}

