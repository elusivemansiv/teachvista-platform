import { createFileRoute, redirect } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useSuspenseQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Suspense, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { listModerationQueue, reviewCourse, reviewLesson, type ModerationStatus } from "@/lib/admin.functions";
import { categoryLabel } from "@/lib/courses";
import { toast } from "sonner";
import { ShieldCheck, Check, X, Clock } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin")({
  beforeLoad: ({ context }) => {
    if ((context as { role?: string }).role !== "admin") throw redirect({ to: "/dashboard" });
  },
  head: () => ({
    meta: [
      { title: "Moderation queue — BandPath admin" },
      { name: "description", content: "Review and approve teacher-submitted IELTS courses and lessons before they go live." },
      { property: "og:title", content: "Moderation queue — BandPath admin" },
      { property: "og:description", content: "Approve or reject submitted courses and lessons." },
    ],
  }),
  component: () => (
    <AppShell>
      <Suspense fallback={<div className="text-muted-foreground">Loading queue…</div>}>
        <Queue />
      </Suspense>
    </AppShell>
  ),
  errorComponent: ({ error }) => <div role="alert" className="p-8 text-destructive">{error.message}</div>,
});

const TABS: { value: ModerationStatus | "all"; label: string }[] = [
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "all", label: "All" },
];

function Queue() {
  const [tab, setTab] = useState<ModerationStatus | "all">("pending");
  const [notes, setNotes] = useState<Record<string, string>>({});
  const queryClient = useQueryClient();
  const fetchQueue = useServerFn(listModerationQueue);
  const reviewCourseFn = useServerFn(reviewCourse);
  const reviewLessonFn = useServerFn(reviewLesson);

  const { data: courses } = useSuspenseQuery({
    queryKey: ["moderation-queue", tab],
    queryFn: () => fetchQueue({ data: { status: tab } }),
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["moderation-queue"] });
    queryClient.invalidateQueries({ queryKey: ["courses", "public"] });
  };

  const courseMut = useMutation({
    mutationFn: (v: { courseId: string; status: ModerationStatus; note?: string }) => reviewCourseFn({ data: v }),
    onSuccess: (_r, v) => {
      toast.success(v.status === "approved" ? "Course approved and live" : `Course ${v.status}`);
      invalidate();
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const lessonMut = useMutation({
    mutationFn: (v: { lessonId: string; status: ModerationStatus }) => reviewLessonFn({ data: v }),
    onSuccess: () => {
      toast.success("Lesson updated");
      invalidate();
    },
    onError: (e) => toast.error((e as Error).message),
  });

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header>
        <div className="flex items-center gap-2 text-sm font-semibold text-primary">
          <ShieldCheck className="h-4 w-4" aria-hidden="true" /> Admin
        </div>
        <h1 className="mt-1 font-display text-3xl font-extrabold">Moderation queue</h1>
        <p className="mt-1 text-muted-foreground">
          Courses and lessons stay hidden from learners until you approve them.
        </p>
      </header>

      <div role="tablist" aria-label="Filter by review status" className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t.value}
            role="tab"
            aria-selected={tab === t.value}
            onClick={() => setTab(t.value)}
            className={`rounded-full px-4 py-1.5 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
              tab === t.value ? "bg-primary text-primary-foreground" : "bg-secondary hover:bg-secondary/80"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {courses.length === 0 && (
        <div className="rounded-3xl border border-dashed border-border p-12 text-center text-muted-foreground">
          Nothing here right now.
        </div>
      )}

      <ul className="space-y-5">
        {courses.map((c) => (
          <li key={c.id} className="rounded-3xl border border-border bg-card p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <StatusBadge status={c.moderation_status} />
                  <span className="rounded-full bg-secondary px-3 py-1 font-semibold">{categoryLabel(c.category)}</span>
                  <span className="rounded-full bg-secondary px-3 py-1 font-semibold capitalize">{c.level}</span>
                </div>
                <h2 className="mt-2 font-display text-xl font-bold">{c.title}</h2>
                <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{c.description}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  By {c.teacher_name} · submitted {new Date(c.created_at).toLocaleDateString()}
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  className="rounded-full"
                  disabled={courseMut.isPending || c.moderation_status === "approved"}
                  onClick={() => courseMut.mutate({ courseId: c.id, status: "approved", note: notes[c.id] })}
                >
                  <Check className="h-4 w-4" aria-hidden="true" /> Approve
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-full"
                  disabled={courseMut.isPending || c.moderation_status === "rejected"}
                  onClick={() => courseMut.mutate({ courseId: c.id, status: "rejected", note: notes[c.id] })}
                >
                  <X className="h-4 w-4" aria-hidden="true" /> Reject
                </Button>
              </div>
            </div>

            <div className="mt-4">
              <label htmlFor={`note-${c.id}`} className="text-xs font-semibold text-muted-foreground">
                Reviewer note (shared with the teacher)
              </label>
              <Textarea
                id={`note-${c.id}`}
                rows={2}
                className="mt-1"
                placeholder="Optional feedback…"
                value={notes[c.id] ?? c.moderation_note ?? ""}
                onChange={(e) => setNotes((n) => ({ ...n, [c.id]: e.target.value }))}
              />
            </div>

            <details className="mt-4">
              <summary className="cursor-pointer text-sm font-semibold">
                {c.lessons.length} lesson{c.lessons.length === 1 ? "" : "s"}
              </summary>
              <ul className="mt-3 divide-y divide-border rounded-2xl border border-border">
                {c.lessons.map((l) => (
                  <li key={l.id} className="flex flex-wrap items-center gap-3 p-3 text-sm">
                    <span className="w-6 text-muted-foreground">{l.ordering}</span>
                    <span className="flex-1">{l.title}</span>
                    {l.has_draft && (
                      <span className="rounded-full bg-accent px-2 py-0.5 text-xs font-semibold text-accent-foreground">
                        Draft edits
                      </span>
                    )}
                    <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-semibold capitalize">{l.status}</span>
                    {l.publish_at && (
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" aria-hidden="true" /> {new Date(l.publish_at).toLocaleDateString()}
                      </span>
                    )}
                    <StatusBadge status={l.moderation_status} />
                    <Button
                      size="sm"
                      variant="ghost"
                      className="rounded-full"
                      aria-label={`Approve lesson ${l.title}`}
                      disabled={lessonMut.isPending || l.moderation_status === "approved"}
                      onClick={() => lessonMut.mutate({ lessonId: l.id, status: "approved" })}
                    >
                      <Check className="h-4 w-4" aria-hidden="true" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="rounded-full"
                      aria-label={`Reject lesson ${l.title}`}
                      disabled={lessonMut.isPending || l.moderation_status === "rejected"}
                      onClick={() => lessonMut.mutate({ lessonId: l.id, status: "rejected" })}
                    >
                      <X className="h-4 w-4" aria-hidden="true" />
                    </Button>
                  </li>
                ))}
                {c.lessons.length === 0 && <li className="p-3 text-sm text-muted-foreground">No lessons yet.</li>}
              </ul>
            </details>
          </li>
        ))}
      </ul>
    </div>
  );
}

function StatusBadge({ status }: { status: ModerationStatus }) {
  const cls =
    status === "approved"
      ? "bg-emerald-100 text-emerald-800"
      : status === "rejected"
        ? "bg-destructive/10 text-destructive"
        : "bg-accent text-accent-foreground";
  return <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${cls}`}>{status}</span>;
}
