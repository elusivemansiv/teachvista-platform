import { createFileRoute, Link, useNavigate, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CATEGORIES } from "@/lib/courses";
import { ArrowLeft, ImagePlus, Plus, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/teacher/upload")({
  head: () => ({
    meta: [
      { title: "Upload course — BandPath teacher portal" },
      { name: "description", content: "Create and upload a new IELTS video course on BandPath." },
    ],
  }),
  component: () => (
    <AppShell>
      <UploadForm />
    </AppShell>
  ),
});

type Lesson = { title: string; duration: string };

function UploadForm() {
  const navigate = useNavigate();
  const [lessons, setLessons] = useState<Lesson[]>([{ title: "", duration: "10" }]);
  const [saving, setSaving] = useState(false);

  function updateLesson(i: number, patch: Partial<Lesson>) {
    setLessons((prev) => prev.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      toast.success("Draft saved — real video uploads coming soon.");
      navigate({ to: "/teacher" });
    }, 700);
  }

  return (
    <div className="mx-auto max-w-3xl">
      <Link to="/teacher" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to teacher portal
      </Link>
      <h1 className="font-display text-3xl font-extrabold">Upload a new course</h1>
      <p className="mt-1 text-muted-foreground">Fill in the details, add lessons, and publish when ready.</p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-6">
        <div className="rounded-3xl border border-border bg-card p-6">
          <h2 className="font-display text-lg font-bold">Course details</h2>
          <div className="mt-4 grid gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="title">Course title</Label>
              <Input id="title" placeholder="e.g. IELTS Writing Task 2: Band 8 Framework" required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="desc">Description</Label>
              <Textarea id="desc" rows={4} placeholder="What will students learn and achieve?" required />
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label>Category</Label>
                <Select defaultValue="writing">
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c.value} value={c.value}>{c.emoji} {c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Level</Label>
                <Select defaultValue="intermediate">
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="beginner">Beginner</SelectItem>
                    <SelectItem value="intermediate">Intermediate</SelectItem>
                    <SelectItem value="advanced">Advanced</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="band">Target band</Label>
                <Input id="band" type="number" step="0.5" min="4" max="9" defaultValue="7.5" />
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-border bg-card p-6">
          <h2 className="font-display text-lg font-bold">Cover thumbnail</h2>
          <label className="mt-4 flex aspect-[16/6] cursor-pointer items-center justify-center rounded-2xl border-2 border-dashed border-border bg-secondary/40 text-muted-foreground transition hover:border-primary hover:text-primary">
            <div className="text-center">
              <ImagePlus className="mx-auto h-8 w-8" />
              <div className="mt-2 text-sm font-semibold">Click to upload thumbnail</div>
              <div className="text-xs">JPG or PNG, 1600×900 recommended</div>
            </div>
            <input type="file" accept="image/*" className="hidden" />
          </label>
        </div>

        <div className="rounded-3xl border border-border bg-card p-6">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-bold">Lessons</h2>
            <Button type="button" variant="secondary" size="sm" className="rounded-full" onClick={() => setLessons((p) => [...p, { title: "", duration: "10" }])}>
              <Plus className="h-4 w-4" /> Add lesson
            </Button>
          </div>
          <ol className="mt-4 space-y-3">
            {lessons.map((l, i) => (
              <li key={i} className="flex flex-col gap-2 rounded-2xl border border-border bg-secondary/40 p-3 sm:flex-row sm:items-center">
                <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary text-sm font-bold text-primary-foreground">{i + 1}</div>
                <Input placeholder="Lesson title" value={l.title} onChange={(e) => updateLesson(i, { title: e.target.value })} className="flex-1" />
                <Input placeholder="min" type="number" value={l.duration} onChange={(e) => updateLesson(i, { duration: e.target.value })} className="sm:w-24" />
                <Button type="button" variant="ghost" size="icon" onClick={() => setLessons((p) => p.filter((_, idx) => idx !== i))}>
                  <Trash2 className="h-4 w-4 text-muted-foreground" />
                </Button>
              </li>
            ))}
          </ol>
        </div>

        <div className="flex flex-wrap justify-end gap-2">
          <Link to="/teacher"><Button type="button" variant="ghost" className="rounded-full">Cancel</Button></Link>
          <Button type="submit" disabled={saving} className="rounded-full">
            <Upload className="h-4 w-4" /> {saving ? "Saving…" : "Save draft"}
          </Button>
        </div>
      </form>
    </div>
  );
}
