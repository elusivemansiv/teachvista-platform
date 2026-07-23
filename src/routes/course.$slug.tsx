import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Suspense } from "react";
import { getCourseBySlug } from "@/lib/courses.functions";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Button } from "@/components/ui/button";
import { categoryMeta } from "@/lib/courses";
import { Star, Clock, Users, PlayCircle, CheckCircle2, ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/course/$slug")({
  head: ({ params }) => ({
    meta: [
      { title: `IELTS course: ${params.slug.replace(/-/g, " ")} — BandPath` },
      { name: "description", content: "Structured IELTS video course from an expert teacher on BandPath." },
      { property: "og:title", content: `IELTS course — BandPath` },
      { property: "og:description", content: "Expert-led IELTS video course." },
    ],
  }),
  component: CoursePage,
});

function CoursePage() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <Suspense fallback={<div className="mx-auto max-w-5xl px-6 py-10 text-muted-foreground">Loading…</div>}>
        <Detail />
      </Suspense>
      <SiteFooter />
    </div>
  );
}

function Detail() {
  const { slug } = Route.useParams();
  const fetchCourse = useServerFn(getCourseBySlug);
  const { data: course } = useSuspenseQuery({
    queryKey: ["course", slug],
    queryFn: () => fetchCourse({ data: { slug } }),
  });
  if (!course) throw notFound();

  const meta = categoryMeta(course.category);
  const mockLessons = Array.from({ length: 8 }).map((_, i) => ({
    title: `Lesson ${i + 1}: ${["Overview", "Core strategy", "Practice set", "Common traps", "Timing drill", "Advanced tips", "Mock section", "Review & next steps"][i]}`,
    duration: [8, 14, 22, 12, 18, 20, 30, 10][i],
  }));

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <Link to="/browse" className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to browse
      </Link>

      <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
        <div>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="rounded-full bg-primary-soft px-3 py-1 font-semibold text-primary">
              {meta.emoji} {meta.label}
            </span>
            <span className="rounded-full bg-secondary px-3 py-1 font-semibold capitalize">{course.level}</span>
            {course.target_band && (
              <span className="rounded-full bg-accent px-3 py-1 font-bold text-accent-foreground">Target Band {course.target_band}</span>
            )}
          </div>
          <h1 className="mt-3 font-display text-4xl font-extrabold leading-tight">{course.title}</h1>
          <p className="mt-3 text-lg text-muted-foreground">{course.description}</p>
          <div className="mt-4 flex flex-wrap items-center gap-5 text-sm text-muted-foreground">
            <span className="flex items-center gap-1"><Star className="h-4 w-4 fill-accent text-accent" /> {course.rating}</span>
            <span className="flex items-center gap-1"><Users className="h-4 w-4" /> {course.student_count.toLocaleString()} students</span>
            <span className="flex items-center gap-1"><Clock className="h-4 w-4" /> {course.duration_hours} hours</span>
          </div>

          <div className={`mt-8 aspect-video overflow-hidden rounded-3xl bg-gradient-to-br ${meta.color} shadow-xl`}>
            {course.thumbnail_url && (
              <img src={course.thumbnail_url} alt={course.title} className="h-full w-full object-cover opacity-90" />
            )}
          </div>

          <section className="mt-10">
            <h2 className="font-display text-2xl font-bold">What you'll learn</h2>
            <ul className="mt-4 grid gap-3 sm:grid-cols-2">
              {[
                "Core exam strategies that examiners reward",
                "Time-saving techniques for the full test",
                "Common traps and how to avoid them",
                "Model answers and worked examples",
                "Practice sets with detailed feedback",
                "A repeatable study routine",
              ].map((t) => (
                <li key={t} className="flex items-start gap-2 text-sm">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" /> {t}
                </li>
              ))}
            </ul>
          </section>

          <section className="mt-10">
            <h2 className="font-display text-2xl font-bold">Lessons</h2>
            <ol className="mt-4 divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
              {mockLessons.map((l, i) => (
                <li key={i} className="flex items-center gap-4 p-4">
                  <div className="grid h-9 w-9 place-items-center rounded-full bg-primary-soft text-primary">
                    <PlayCircle className="h-5 w-5" />
                  </div>
                  <div className="flex-1 text-sm font-medium">{l.title}</div>
                  <div className="text-xs text-muted-foreground">{l.duration} min</div>
                </li>
              ))}
            </ol>
          </section>
        </div>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-3xl border border-border bg-card p-6 shadow-lg">
            <div className="font-display text-3xl font-extrabold">Free</div>
            <div className="text-sm text-muted-foreground">Full access with your account</div>
            <Button className="mt-5 w-full rounded-full" size="lg">Enroll now</Button>
            <Button className="mt-2 w-full rounded-full" size="lg" variant="outline">Add to wishlist</Button>
            <div className="mt-6 space-y-3 text-sm">
              <Row k="Level" v={course.level} />
              <Row k="Duration" v={`${course.duration_hours} hours`} />
              <Row k="Lessons" v={`${mockLessons.length}`} />
              <Row k="Language" v="English" />
              <Row k="Certificate" v="Yes" />
            </div>
          </div>
          <div className="mt-4 rounded-3xl border border-border bg-card p-6">
            <div className="text-xs font-semibold uppercase text-muted-foreground">Instructor</div>
            <div className="mt-2 flex items-center gap-3">
              <div className="grid h-12 w-12 place-items-center rounded-full bg-gradient-to-br from-primary to-accent font-display font-bold text-white">
                {course.teacher_name.split(" ").map((n) => n[0]).slice(0, 2).join("")}
              </div>
              <div>
                <div className="font-semibold">{course.teacher_name}</div>
                <div className="text-xs text-muted-foreground">IELTS Expert</div>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between border-b border-dashed border-border pb-2 last:border-0">
      <span className="text-muted-foreground">{k}</span>
      <span className="font-semibold capitalize">{v}</span>
    </div>
  );
}
