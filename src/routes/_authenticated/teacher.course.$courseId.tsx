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
    </div>
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
