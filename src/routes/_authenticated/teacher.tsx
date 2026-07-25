import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Suspense } from "react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Award, BookOpen, Eye, Star, Upload, Users } from "lucide-react";
import { CATEGORIES, categoryLabel } from "@/lib/courses";
import { listTeacherCourseAnalytics } from "@/lib/teacher.functions";

export const Route = createFileRoute("/_authenticated/teacher")({
  beforeLoad: ({ context }) => {
    if ((context as { role?: string }).role !== "teacher") {
      throw redirect({ to: "/dashboard" });
    }
  },
  head: () => ({
    meta: [
      { title: "Teacher portal — BandPath" },
      { name: "description", content: "Upload IELTS courses, manage your lessons and showcase your expertise on BandPath." },
    ],
  }),
  component: () => (
    <AppShell>
      <Suspense fallback={<div className="text-muted-foreground">Loading portal…</div>}>
        <TeacherHome />
      </Suspense>
    </AppShell>
  ),
});

function TeacherHome() {
  const fetchAnalytics = useServerFn(listTeacherCourseAnalytics);
  const { data: analytics } = useSuspenseQuery({
    queryKey: ["teacher-analytics"],
    queryFn: () => fetchAnalytics(),
  });

  const totalStudents = analytics.reduce((s, c) => s + c.student_count, 0);
  const totalViews = analytics.reduce((s, c) => s + c.views_count, 0);
  const avgRating = analytics.length
    ? (analytics.reduce((s, c) => s + Number(c.rating || 0), 0) / analytics.length).toFixed(1)
    : "—";
  const published = analytics.filter((c) => c.is_published).length;

  const stats = [
    { label: "Courses published", value: `${published}`, icon: BookOpen },
    { label: "Total students", value: totalStudents.toLocaleString(), icon: Users },
    { label: "Total views", value: totalViews.toLocaleString(), icon: Eye },
    { label: "Average rating", value: avgRating, icon: Star },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div className="grid gap-6 rounded-3xl bg-gradient-to-br from-accent via-accent to-orange-300 p-6 text-accent-foreground shadow-lg md:grid-cols-[1fr_auto] md:items-center md:p-8">
        <div>
          <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-semibold">Teacher portal</span>
          <h1 className="mt-3 font-display text-3xl font-extrabold">Share your IELTS expertise</h1>
          <p className="mt-1 max-w-lg text-accent-foreground/85">
            Upload new video courses, manage lessons, and grow your following on BandPath.
          </p>
        </div>
        <Link to="/teacher/upload">
          <Button size="lg" className="rounded-full bg-foreground text-background hover:bg-foreground/90">
            <Upload className="mr-1.5 h-4 w-4" /> Upload new course
          </Button>
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-3xl border border-border bg-card p-5">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary-soft text-primary">
              <s.icon className="h-5 w-5" />
            </div>
            <div className="mt-3 font-display text-3xl font-extrabold">{s.value}</div>
            <div className="text-sm text-muted-foreground">{s.label}</div>
          </div>
        ))}
      </div>

      <section className="rounded-3xl border border-border bg-card p-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="font-display text-xl font-bold">Course analytics</h2>
            <p className="text-sm text-muted-foreground">Views, enrollments and completion for each of your courses.</p>
          </div>
          <Link to="/teacher/upload">
            <Button size="sm" className="rounded-full">
              <Upload className="mr-1.5 h-4 w-4" /> New course
            </Button>
          </Link>
        </div>

        {analytics.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
            You haven't published any courses yet. Upload your first course to start seeing analytics.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase text-muted-foreground">
                  <th className="py-3">Course</th>
                  <th className="py-3">Category</th>
                  <th className="py-3 text-right">Views</th>
                  <th className="py-3 text-right">Enrollments</th>
                  <th className="py-3">Avg progress</th>
                  <th className="py-3 text-right">Last uploaded</th>
                  <th className="py-3 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {analytics.map((c) => (
                  <tr key={c.id}>
                    <td className="py-3 pr-4 font-semibold">
                      <Link to="/course/$slug" params={{ slug: c.slug }} className="hover:text-primary">
                        {c.title}
                      </Link>
                      {c.completed_count > 0 && (
                        <div className="text-xs font-normal text-muted-foreground">{c.completed_count} completed</div>
                      )}
                    </td>
                    <td className="py-3 text-muted-foreground">{categoryLabel(c.category)}</td>
                    <td className="py-3 text-right tabular-nums">{c.views_count.toLocaleString()}</td>
                    <td className="py-3 text-right tabular-nums">{c.student_count.toLocaleString()}</td>
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-2">
                        <Progress value={c.avg_progress} className="h-2 w-24" />
                        <span className="text-xs tabular-nums text-muted-foreground">{c.avg_progress}%</span>
                      </div>
                    </td>
                    <td className="py-3 text-right text-xs text-muted-foreground">
                      {new Date(c.last_uploaded_at).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}
                    </td>
                    <td className="py-3 text-right">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                          c.is_published ? "bg-primary-soft text-primary" : "bg-secondary text-muted-foreground"
                        }`}
                      >
                        {c.is_published ? "Published" : "Draft"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="rounded-3xl border border-border bg-card p-6">
        <h2 className="font-display text-xl font-bold">Your expertise</h2>
        <p className="text-sm text-muted-foreground">Subjects you teach — shown on your public teacher page.</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {CATEGORIES.map((c) => (
            <span key={c.value} className="rounded-full bg-primary-soft px-4 py-1.5 text-sm font-semibold text-primary">
              {c.emoji} {c.label}
            </span>
          ))}
        </div>
        <div className="mt-6 flex items-center gap-2 text-sm text-muted-foreground">
          <Award className="h-4 w-4 text-accent" /> Keep publishing to grow your rank.
        </div>
      </section>
    </div>
  );
}
