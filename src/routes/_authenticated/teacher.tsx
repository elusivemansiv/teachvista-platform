import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Award, BookOpen, Star, Upload, Users } from "lucide-react";
import { CATEGORIES } from "@/lib/courses";

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
      <TeacherHome />
    </AppShell>
  ),
});


function TeacherHome() {
  const stats = [
    { label: "Courses published", value: "8", icon: BookOpen },
    { label: "Total students", value: "12,340", icon: Users },
    { label: "Average rating", value: "4.8", icon: Star },
    { label: "Teacher rank", value: "Top 5%", icon: Award },
  ];

  const myCourses = [
    { title: "IELTS Listening Mastery: Sections 1–4", category: "Listening", students: 4210, rating: 4.9, status: "Published" },
    { title: "Grammar for IELTS: Complex Structures", category: "Grammar", students: 1780, rating: 4.5, status: "Published" },
    { title: "Reading: True / False / Not Given", category: "Reading", students: 2340, rating: 4.8, status: "Published" },
    { title: "Speaking Coaching (new)", category: "Speaking", students: 0, rating: 0, status: "Draft" },
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
          <h2 className="font-display text-xl font-bold">My courses</h2>
          <Link to="/teacher/upload">
            <Button size="sm" className="rounded-full">
              <Upload className="mr-1.5 h-4 w-4" /> New course
            </Button>
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase text-muted-foreground">
                <th className="py-3">Course</th>
                <th className="py-3">Category</th>
                <th className="py-3 text-right">Students</th>
                <th className="py-3 text-right">Rating</th>
                <th className="py-3 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {myCourses.map((c) => (
                <tr key={c.title}>
                  <td className="py-3 pr-4 font-semibold">{c.title}</td>
                  <td className="py-3 text-muted-foreground">{c.category}</td>
                  <td className="py-3 text-right">{c.students.toLocaleString()}</td>
                  <td className="py-3 text-right">{c.rating || "—"}</td>
                  <td className="py-3 text-right">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                        c.status === "Published" ? "bg-primary-soft text-primary" : "bg-secondary text-muted-foreground"
                      }`}
                    >
                      {c.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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
      </section>
    </div>
  );
}
