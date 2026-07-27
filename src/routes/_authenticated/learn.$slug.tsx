import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useSuspenseQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Suspense, useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { getCourseBySlug } from "@/lib/courses.functions";
import { getCourseLessonState, setLessonCompletion } from "@/lib/lessons.functions";
import { categoryMeta } from "@/lib/courses";
import { CheckCircle2, Circle, PlayCircle, ArrowLeft, Clock } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/learn/$slug")({
  beforeLoad: ({ context }) => {
    if ((context as { role?: string }).role === "teacher") throw redirect({ to: "/teacher" });
  },
  validateSearch: (s: Record<string, unknown>) => ({ lesson: typeof s.lesson === "string" ? s.lesson : undefined }),
  head: () => ({
    meta: [
      { title: "Continue learning — BandPath" },
      { name: "description", content: "Work through your IELTS course lesson by lesson and track completion." },
    ],
  }),
  component: () => (
    <AppShell>
      <Suspense fallback={<div className="text-muted-foreground">Loading lessons…</div>}>
        <Learn />
      </Suspense>
    </AppShell>
  ),
  errorComponent: ({ error }) => <div role="alert" className="p-8 text-destructive">{error.message}</div>,
  notFoundComponent: () => <div className="p-8">Course not found.</div>,
});

function Learn() {
  const { slug } = Route.useParams();
  const { lesson: lessonParam } = Route.useSearch();
  const queryClient = useQueryClient();
  const fetchCourse = useServerFn(getCourseBySlug);
  const fetchState = useServerFn(getCourseLessonState);
  const toggleFn = useServerFn(setLessonCompletion);

  const { data: course } = useSuspenseQuery({
    queryKey: ["course", slug],
    queryFn: () => fetchCourse({ data: { slug } }),
  });

  const courseId = course?.id ?? "";
  const { data: state } = useSuspenseQuery({
    queryKey: ["lesson-state", courseId],
    queryFn: () => fetchState({ data: { courseId } }),
  });

  const [selected, setSelected] = useState<string | null>(lessonParam ?? null);
  useEffect(() => {
    setSelected((cur) => cur ?? lessonParam ?? state.nextLessonId ?? state.lessons[0]?.id ?? null);
  }, [lessonParam, state.nextLessonId, state.lessons]);

  const toggle = useMutation({
    mutationFn: (v: { lessonId: string; completed: boolean }) =>
      toggleFn({ data: { courseId, lessonId: v.lessonId, completed: v.completed } }),
    onSuccess: (res) => {
      queryClient.setQueryData(["lesson-state", courseId], res);
      queryClient.invalidateQueries({ queryKey: ["my-enrollments"] });
      queryClient.invalidateQueries({ queryKey: ["enrollment", courseId] });
      if (res.progress >= 100) toast.success("Course completed 🎉");
    },
  });

  if (!course) return <div>Course not found.</div>;
  const meta = categoryMeta(course.category);
  const completed = new Set(state.completedLessonIds);
  const current = state.lessons.find((l) => l.id === selected) ?? state.lessons[0] ?? null;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <Link to="/my-courses" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to my courses
      </Link>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-5">
          <div className={`aspect-video overflow-hidden rounded-3xl bg-gradient-to-br ${meta.color}`}>
            {course.thumbnail_url && <img src={course.thumbnail_url} alt="" className="h-full w-full object-cover opacity-90" />}
          </div>
          <div>
            <div className="text-xs font-semibold uppercase text-muted-foreground">{course.title}</div>
            <h1 className="mt-1 font-display text-2xl font-extrabold">{current?.title ?? "No lessons yet"}</h1>
            {current && (
              <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" /> {current.duration_min} min
              </p>
            )}
          </div>
          {current && (
            <Button
              size="lg"
              className="rounded-full"
              disabled={toggle.isPending}
              onClick={() => toggle.mutate({ lessonId: current.id, completed: !completed.has(current.id) })}
            >
              {completed.has(current.id) ? "Mark as not completed" : "Mark lesson complete"}
            </Button>
          )}
        </div>

        <aside className="rounded-3xl border border-border bg-card p-5 lg:sticky lg:top-24 lg:self-start">
          <div className="flex items-center justify-between text-sm">
            <span className="font-semibold">Course progress</span>
            <span className="text-muted-foreground">{state.progress}%</span>
          </div>
          <Progress value={state.progress} className="mt-2 h-2" />
          <p className="mt-1 text-xs text-muted-foreground">
            {completed.size} of {state.lessons.length} lessons completed
          </p>
          <ol className="mt-4 divide-y divide-border">
            {state.lessons.map((l) => {
              const isDone = completed.has(l.id);
              const isCurrent = current?.id === l.id;
              return (
                <li key={l.id}>
                  <button
                    type="button"
                    onClick={() => setSelected(l.id)}
                    className={`flex w-full items-center gap-3 py-3 text-left text-sm ${isCurrent ? "font-semibold text-primary" : ""}`}
                  >
                    <span onClick={(e) => { e.stopPropagation(); toggle.mutate({ lessonId: l.id, completed: !isDone }); }}>
                      {isDone ? (
                        <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                      ) : (
                        <Circle className="h-5 w-5 text-muted-foreground" />
                      )}
                    </span>
                    <span className="flex-1 line-clamp-1">{l.title}</span>
                    {isCurrent && <PlayCircle className="h-4 w-4" />}
                    <span className="text-xs text-muted-foreground">{l.duration_min}m</span>
                  </button>
                </li>
              );
            })}
          </ol>
        </aside>
      </div>
    </div>
  );
}
