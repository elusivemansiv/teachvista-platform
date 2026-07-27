import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Suspense } from "react";
import { listMyEnrollmentsDetailed } from "@/lib/enrollments.functions";
import { getRecommendations } from "@/lib/recommendations.functions";
import { AppShell } from "@/components/AppShell";
import { CourseCard } from "@/components/CourseCard";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { CATEGORIES, categoryMeta } from "@/lib/courses";
import { Target, Flame, Trophy, Calendar, PlayCircle } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard")({
  beforeLoad: ({ context }) => {
    if ((context as { role?: string }).role === "teacher") {
      throw redirect({ to: "/teacher" });
    }
  },
  head: () => ({
    meta: [
      { title: "Your dashboard — BandPath" },
      { name: "description", content: "Continue your IELTS learning, track band progress and take mock tests on your BandPath dashboard." },
    ],
  }),
  component: () => (
    <AppShell>
      <Suspense fallback={<div className="text-muted-foreground">Loading dashboard…</div>}>
        <Dashboard />
      </Suspense>
    </AppShell>
  ),
});

function Dashboard() {
  const fetchEnrollments = useServerFn(listMyEnrollmentsDetailed);
  const fetchRecommendations = useServerFn(getRecommendations);
  const { data: enrollments } = useSuspenseQuery({
    queryKey: ["my-enrollments"],
    queryFn: () => fetchEnrollments(),
  });
  const { data: recommended } = useSuspenseQuery({
    queryKey: ["recommendations"],
    queryFn: () => fetchRecommendations({ data: { limit: 6 } }),
  });

  const active = enrollments.filter((e) => e.status !== "completed").slice(0, 3);
  const completed = enrollments.filter((e) => e.status === "completed").length;
  const avgProgress = enrollments.length
    ? Math.round(enrollments.reduce((s, e) => s + e.progress, 0) / enrollments.length)
    : 0;

  const skills = [
    { name: "Listening", band: 6.5, target: 7.5, color: "from-blue-500 to-indigo-500" },
    { name: "Reading", band: 7.0, target: 7.5, color: "from-orange-400 to-rose-400" },
    { name: "Writing", band: 6.0, target: 7.0, color: "from-purple-500 to-blue-500" },
    { name: "Speaking", band: 6.5, target: 7.0, color: "from-cyan-500 to-blue-500" },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div className="rounded-3xl bg-gradient-to-br from-primary to-primary/80 p-6 text-primary-foreground shadow-lg md:p-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl font-extrabold">Welcome back 👋</h1>
            <p className="mt-1 text-primary-foreground/90">
              {enrollments.length
                ? `You're enrolled in ${enrollments.length} course${enrollments.length === 1 ? "" : "s"} · ${avgProgress}% average progress.`
                : "Pick a course to get started."}
            </p>
          </div>
          <div className="flex gap-3">
            <Stat icon={<Flame className="h-4 w-4" />} k={`${enrollments.length} enrolled`} />
            <Stat icon={<Target className="h-4 w-4" />} k={`${avgProgress}% avg`} />
            <Stat icon={<Trophy className="h-4 w-4" />} k={`${completed} completed`} />
          </div>
        </div>
      </div>

      <section>
        <div className="mb-4 flex items-end justify-between">
          <h2 className="font-display text-xl font-bold">Continue learning</h2>
          <Link to="/my-courses" className="text-sm font-semibold text-primary hover:underline">View all →</Link>
        </div>
        {active.length ? (
          <div className="grid gap-5 md:grid-cols-3">
            {active.map((e) => {
              const meta = categoryMeta(e.course.category);
              const next = e.nextLesson;
              return (
                <div key={e.id} className="overflow-hidden rounded-3xl border border-border bg-card">
                  <div className={`aspect-video bg-gradient-to-br ${meta.color}`}>
                    {e.course.thumbnail_url && <img src={e.course.thumbnail_url} alt="" className="h-full w-full object-cover opacity-90" />}
                  </div>
                  <div className="p-5">
                    <h3 className="line-clamp-1 font-semibold">{e.course.title}</h3>
                    <div className="mt-3">
                      <Progress value={e.progress} className="h-2" />
                      <div className="mt-1 flex justify-between text-xs text-muted-foreground">
                        <span>{e.completedLessons}/{e.totalLessons} lessons</span>
                        <span className="line-clamp-1 max-w-[55%] text-right">{next ? `Next: ${next.title}` : "All done"}</span>
                      </div>
                    </div>
                    <Link to="/learn/$slug" params={{ slug: e.course.slug }} search={{ lesson: next?.id ?? undefined }}>
                      <Button className="mt-4 w-full rounded-full" variant="secondary">
                        <PlayCircle className="mr-1 h-4 w-4" /> {next ? `Resume · Lesson ${next.ordering}` : "Review"}
                      </Button>
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="rounded-3xl border border-dashed border-border bg-card p-8 text-center">
            <p className="text-muted-foreground">You haven't enrolled in any course yet.</p>
            <Link to="/browse"><Button className="mt-3 rounded-full">Browse courses</Button></Link>
          </div>
        )}
      </section>

      <section className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="rounded-3xl border border-border bg-card p-6">
          <h2 className="font-display text-xl font-bold">Your band progress</h2>
          <div className="mt-5 space-y-5">
            {skills.map((s) => (
              <div key={s.name}>
                <div className="mb-1.5 flex justify-between text-sm">
                  <span className="font-semibold">{s.name}</span>
                  <span className="text-muted-foreground">
                    <span className="font-bold text-foreground">{s.band}</span> / target {s.target}
                  </span>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full bg-secondary">
                  <div className={`h-full rounded-full bg-gradient-to-r ${s.color}`} style={{ width: `${(s.band / 9) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-3xl border border-border bg-card p-6">
          <h2 className="flex items-center gap-2 font-display text-xl font-bold">
            <Calendar className="h-5 w-5 text-primary" /> Upcoming mock tests
          </h2>
          <ul className="mt-4 space-y-3 text-sm">
            {[
              { d: "Sat", n: "Full Academic Mock #4" },
              { d: "Tue", n: "Listening Section 3 drill" },
              { d: "Fri", n: "Writing Task 2 timed" },
            ].map((m) => (
              <li key={m.n} className="flex items-center gap-3 rounded-2xl bg-secondary p-3">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-accent-soft font-bold text-accent-foreground">
                  {m.d}
                </div>
                <div className="font-medium">{m.n}</div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section>
        <div className="mb-4 flex items-end justify-between">
          <div>
            <h2 className="font-display text-xl font-bold">Picked for you</h2>
            <p className="text-sm text-muted-foreground">Based on the courses you're taking and recently viewed.</p>
          </div>
          <div className="hidden gap-2 md:flex">
            {CATEGORIES.slice(0, 5).map((c) => (
              <Link
                key={c.value}
                to="/browse"
                search={{ category: c.value }}
                className="rounded-full bg-secondary px-3 py-1 text-xs font-semibold hover:bg-primary hover:text-primary-foreground"
              >
                {c.label}
              </Link>
            ))}
          </div>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {recommended.map((r) => (
            <div key={r.course.id} className="flex flex-col gap-2">
              <CourseCard course={r.course} />
              <span className="self-start rounded-full bg-accent-soft px-3 py-1 text-xs font-semibold text-accent-foreground">
                {r.reason}
              </span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function Stat({ icon, k }: { icon: React.ReactNode; k: string }) {
  return (
    <div className="flex items-center gap-2 rounded-full bg-white/15 px-3 py-1.5 text-sm font-semibold ring-1 ring-white/20">
      {icon} {k}
    </div>
  );
}
