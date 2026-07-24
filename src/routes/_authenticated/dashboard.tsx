import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Suspense } from "react";
import { listCourses } from "@/lib/courses.functions";
import { AppShell } from "@/components/AppShell";
import { CourseCard } from "@/components/CourseCard";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { CATEGORIES } from "@/lib/courses";
import { Target, Flame, Trophy, Calendar } from "lucide-react";

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
  const fetchCourses = useServerFn(listCourses);
  const { data: courses } = useSuspenseQuery({
    queryKey: ["courses", "public"],
    queryFn: () => fetchCourses(),
  });
  const continueLearning = courses.slice(0, 3);
  const recommended = [...courses].sort((a, b) => b.rating - a.rating).slice(0, 6);

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
            <p className="mt-1 text-primary-foreground/90">You're 4 lessons away from a 7-day streak.</p>
          </div>
          <div className="flex gap-3">
            <Stat icon={<Flame className="h-4 w-4" />} k="6-day streak" />
            <Stat icon={<Target className="h-4 w-4" />} k="Target 7.5" />
            <Stat icon={<Trophy className="h-4 w-4" />} k="12 lessons done" />
          </div>
        </div>
      </div>

      <section>
        <h2 className="mb-4 font-display text-xl font-bold">Continue learning</h2>
        <div className="grid gap-5 md:grid-cols-3">
          {continueLearning.map((c, i) => (
            <div key={c.id} className="overflow-hidden rounded-3xl border border-border bg-card">
              <div className="aspect-video bg-secondary">
                {c.thumbnail_url && <img src={c.thumbnail_url} alt="" className="h-full w-full object-cover" />}
              </div>
              <div className="p-5">
                <h3 className="line-clamp-1 font-semibold">{c.title}</h3>
                <div className="mt-3">
                  <Progress value={[42, 68, 15][i]} className="h-2" />
                  <div className="mt-1 text-xs text-muted-foreground">{[42, 68, 15][i]}% complete</div>
                </div>
                <Link to="/course/$slug" params={{ slug: c.slug }}>
                  <Button className="mt-4 w-full rounded-full" variant="secondary">Resume</Button>
                </Link>
              </div>
            </div>
          ))}
        </div>
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
          <h2 className="font-display text-xl font-bold">Recommended for your target band</h2>
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
          {recommended.map((c) => (
            <CourseCard key={c.id} course={c} />
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
