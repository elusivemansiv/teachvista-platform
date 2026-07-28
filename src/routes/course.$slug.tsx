import { createFileRoute, Link, notFound, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useSuspenseQuery, useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Suspense, useEffect } from "react";
import { getCourseBySlug, recordCourseView, recordMyCourseView } from "@/lib/courses.functions";
import { listCourseLessons } from "@/lib/lessons.functions";
import { enrollInCourse, getMyEnrollment, unenroll } from "@/lib/enrollments.functions";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { categoryMeta } from "@/lib/courses";
import { toast } from "sonner";
import { Star, Clock, Users, PlayCircle, CheckCircle2, ArrowLeft, Eye } from "lucide-react";

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
      <main id="main-content">
        <Suspense fallback={<div className="mx-auto max-w-5xl px-6 py-10 text-muted-foreground">Loading…</div>}>
          <Detail />
        </Suspense>
      </main>
      <SiteFooter />
    </div>
  );
}

function Detail() {
  const { slug } = Route.useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const fetchCourse = useServerFn(getCourseBySlug);
  const fetchEnrollment = useServerFn(getMyEnrollment);
  const enrollFn = useServerFn(enrollInCourse);
  const unenrollFn = useServerFn(unenroll);
  const recordView = useServerFn(recordCourseView);
  const recordMyView = useServerFn(recordMyCourseView);
  const fetchLessons = useServerFn(listCourseLessons);

  const { data: course } = useSuspenseQuery({
    queryKey: ["course", slug],
    queryFn: () => fetchCourse({ data: { slug } }),
  });
  if (!course) throw notFound();

  // fire-and-forget view increment (attributed to the user when signed in)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: sess } = await supabase.auth.getSession();
      if (cancelled) return;
      const fn = sess.session
        ? recordMyView({ data: { courseId: course.id } })
        : recordView({ data: { courseId: course.id } });
      fn.catch(() => {});
    })();
    return () => {
      cancelled = true;
    };
  }, [course.id, recordView, recordMyView]);

  const { data: lessons = [] } = useQuery({
    queryKey: ["lessons", course.id],
    queryFn: () => fetchLessons({ data: { courseId: course.id } }),
  });

  // Only fetch enrollment when signed in
  const { data: enrollment } = useQuery({
    queryKey: ["enrollment", course.id],
    queryFn: async () => {
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) return null;
      return fetchEnrollment({ data: { courseId: course.id } });
    },
  });

  const enrollMut = useMutation({
    mutationFn: async () => {
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) {
        router.navigate({ to: "/auth", search: { mode: "signin" } });
        throw new Error("Sign in required");
      }
      return enrollFn({ data: { courseId: course.id } });
    },
    onSuccess: () => {
      toast.success("Enrolled — happy learning!");
      queryClient.invalidateQueries({ queryKey: ["enrollment", course.id] });
      queryClient.invalidateQueries({ queryKey: ["my-enrollments"] });
    },
    onError: (e) => {
      if ((e as Error).message !== "Sign in required") toast.error((e as Error).message);
    },
  });

  const unenrollMut = useMutation({
    mutationFn: () => unenrollFn({ data: { courseId: course.id } }),
    onSuccess: () => {
      toast.success("Unenrolled");
      queryClient.invalidateQueries({ queryKey: ["enrollment", course.id] });
      queryClient.invalidateQueries({ queryKey: ["my-enrollments"] });
    },
  });

  const meta = categoryMeta(course.category);
  const isEnrolled = !!enrollment;

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <Link to="/browse" className="mb-6 inline-flex items-center gap-1 rounded-md text-sm text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back to browse
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
            <span className="flex items-center gap-1"><span className="sr-only">Rating</span><Star className="h-4 w-4 fill-accent text-accent" aria-hidden="true" /> {course.rating}</span>
            <span className="flex items-center gap-1"><Users className="h-4 w-4" aria-hidden="true" /> {course.student_count.toLocaleString()} students</span>
            <span className="flex items-center gap-1"><Clock className="h-4 w-4" aria-hidden="true" /> {course.duration_hours} hours</span>
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
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" /> {t}
                </li>
              ))}
            </ul>
          </section>

          <section className="mt-10">
            <h2 className="font-display text-2xl font-bold">Lessons</h2>
            <ol className="mt-4 divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card" aria-label="Course lessons">
              {lessons.map((l) => (
                <li key={l.id} className="flex items-center gap-4 p-4">
                  <div className="grid h-9 w-9 place-items-center rounded-full bg-primary-soft text-primary">
                    <PlayCircle className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <div className="flex-1 text-sm font-medium">{l.title}</div>
                  <div className="text-xs text-muted-foreground">{l.duration_min} min</div>
                </li>
              ))}
              {lessons.length === 0 && (
                <li className="p-4 text-sm text-muted-foreground">Lessons are being prepared.</li>
              )}
            </ol>
          </section>
        </div>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-3xl border border-border bg-card p-6 shadow-lg" aria-live="polite">
            <div className="font-display text-3xl font-extrabold">Free</div>
            <div className="text-sm text-muted-foreground">Full access with your account</div>

            {isEnrolled ? (
              <>
                <div className="mt-4">
                  <div className="mb-1 flex justify-between text-xs">
                    <span className="font-semibold">Your progress</span>
                    <span className="text-muted-foreground">{enrollment.progress}%</span>
                  </div>
                  <Progress value={enrollment.progress} aria-label={`Your progress: ${enrollment.progress} percent`} className="h-2" />
                </div>
                <Link to="/learn/$slug" params={{ slug: course.slug }} search={{ lesson: undefined }}>
                  <Button className="mt-5 w-full rounded-full" size="lg">
                    {enrollment.status === "completed" ? "Review course" : "Continue learning"}
                    <span className="sr-only"> — {course.title}</span>
                  </Button>
                </Link>
                <Button
                  className="mt-2 w-full rounded-full"
                  size="lg"
                  variant="outline"
                  disabled={unenrollMut.isPending}
                  aria-label={`Unenroll from ${course.title}`}
                  onClick={() => unenrollMut.mutate()}
                >
                  {unenrollMut.isPending ? "Removing…" : "Unenroll"}
                </Button>
              </>
            ) : (
              <>
                <Button
                  className="mt-5 w-full rounded-full"
                  size="lg"
                  disabled={enrollMut.isPending}
                  aria-label={`Enroll in ${course.title}`}
                  onClick={() => enrollMut.mutate()}
                >
                  {enrollMut.isPending ? "Enrolling…" : "Enroll now"}
                </Button>
                <Button className="mt-2 w-full rounded-full" size="lg" variant="outline" aria-label={`Add ${course.title} to wishlist`}>Add to wishlist</Button>
              </>
            )}

            <div className="mt-6 space-y-3 text-sm">
              <Row k="Level" v={course.level} />
              <Row k="Duration" v={`${course.duration_hours} hours`} />
              <Row k="Lessons" v={`${lessons.length}`} />
              <Row k="Language" v="English" />
              <Row k="Certificate" v="Yes" />
              <Row k="Views" v={`${course.student_count.toLocaleString()}+ learners`} icon={<Eye className="h-3.5 w-3.5" aria-hidden="true" />} />
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

function Row({ k, v, icon }: { k: string; v: string; icon?: React.ReactNode }) {
  return (
    <div className="flex justify-between border-b border-dashed border-border pb-2 last:border-0">
      <span className="flex items-center gap-1.5 text-muted-foreground">{icon}{k}</span>
      <span className="font-semibold capitalize">{v}</span>
    </div>
  );
}
