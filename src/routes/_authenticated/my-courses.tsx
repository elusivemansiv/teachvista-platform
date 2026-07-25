import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useSuspenseQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Suspense, useState } from "react";
import { listMyEnrollments, updateProgress, unenroll, type EnrollmentWithCourse } from "@/lib/enrollments.functions";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { categoryMeta } from "@/lib/courses";
import { PlayCircle, CheckCircle2, Trash2, BookOpen } from "lucide-react";

export const Route = createFileRoute("/_authenticated/my-courses")({
  beforeLoad: ({ context }) => {
    if ((context as { role?: string }).role === "teacher") {
      throw redirect({ to: "/teacher" });
    }
  },
  head: () => ({
    meta: [
      { title: "My courses — BandPath" },
      { name: "description", content: "Your enrolled IELTS courses with progress tracking and quick resume." },
    ],
  }),
  component: () => (
    <AppShell>
      <Suspense fallback={<div className="text-muted-foreground">Loading your courses…</div>}>
        <MyCourses />
      </Suspense>
    </AppShell>
  ),
});

function MyCourses() {
  const fetchEnrollments = useServerFn(listMyEnrollments);
  const { data } = useSuspenseQuery({
    queryKey: ["my-enrollments"],
    queryFn: () => fetchEnrollments(),
  });
  const [tab, setTab] = useState<"all" | "active" | "completed">("all");
  const filtered = data.filter((e) =>
    tab === "all" ? true : tab === "active" ? e.status !== "completed" : e.status === "completed",
  );

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="font-display text-3xl font-extrabold">My courses</h1>
        <p className="mt-1 text-muted-foreground">
          {data.length} enrolled · {data.filter((e) => e.status === "completed").length} completed
        </p>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
        <TabsList>
          <TabsTrigger value="all">All ({data.length})</TabsTrigger>
          <TabsTrigger value="active">Active ({data.filter((e) => e.status !== "completed").length})</TabsTrigger>
          <TabsTrigger value="completed">Completed ({data.filter((e) => e.status === "completed").length})</TabsTrigger>
        </TabsList>
      </Tabs>

      {filtered.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-border bg-card p-12 text-center">
          <BookOpen className="mx-auto h-10 w-10 text-muted-foreground" />
          <h3 className="mt-3 font-display text-xl font-bold">Nothing here yet</h3>
          <p className="mt-1 text-sm text-muted-foreground">Browse courses and enroll to see them here.</p>
          <Link to="/browse">
            <Button className="mt-4 rounded-full">Browse courses</Button>
          </Link>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((e) => (
            <EnrollmentCard key={e.id} enrollment={e} />
          ))}
        </div>
      )}
    </div>
  );
}

function EnrollmentCard({ enrollment }: { enrollment: EnrollmentWithCourse }) {
  const c = enrollment.course;
  const meta = categoryMeta(c.category);
  const queryClient = useQueryClient();
  const updateFn = useServerFn(updateProgress);
  const unenrollFn = useServerFn(unenroll);

  const bump = useMutation({
    mutationFn: (delta: number) =>
      updateFn({ data: { courseId: c.id, progress: Math.min(100, enrollment.progress + delta) } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["my-enrollments"] }),
  });

  const remove = useMutation({
    mutationFn: () => unenrollFn({ data: { courseId: c.id } }),
    onSuccess: () => {
      toast.success("Removed from your courses");
      queryClient.invalidateQueries({ queryKey: ["my-enrollments"] });
    },
  });

  const done = enrollment.status === "completed";
  const nextLesson = Math.min(8, Math.floor((enrollment.progress / 100) * 8) + 1);

  return (
    <div className="flex flex-col overflow-hidden rounded-3xl border border-border bg-card">
      <div className={`aspect-video bg-gradient-to-br ${meta.color}`}>
        {c.thumbnail_url && <img src={c.thumbnail_url} alt={c.title} className="h-full w-full object-cover opacity-90" />}
      </div>
      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-center gap-2 text-xs">
          <span className="rounded-full bg-primary-soft px-2.5 py-0.5 font-semibold text-primary">{meta.emoji} {meta.label}</span>
          {done && (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 font-semibold text-emerald-700">
              <CheckCircle2 className="h-3 w-3" /> Completed
            </span>
          )}
        </div>
        <h3 className="mt-2 line-clamp-2 font-semibold">{c.title}</h3>
        <div className="mt-3">
          <Progress value={enrollment.progress} className="h-2" />
          <div className="mt-1 flex justify-between text-xs text-muted-foreground">
            <span>{enrollment.progress}% complete</span>
            {!done && <span>Next: Lesson {nextLesson}</span>}
          </div>
        </div>
        <div className="mt-4 flex gap-2">
          <Button
            className="flex-1 rounded-full"
            variant={done ? "outline" : "default"}
            disabled={bump.isPending}
            onClick={() => bump.mutate(done ? 0 : 20)}
          >
            <PlayCircle className="mr-1 h-4 w-4" />
            {done ? "Review" : bump.isPending ? "…" : "Resume"}
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="rounded-full"
            disabled={remove.isPending}
            onClick={() => remove.mutate()}
            aria-label="Unenroll"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
