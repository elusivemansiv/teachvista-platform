import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Suspense } from "react";
import { listCourses } from "@/lib/courses.functions";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { CourseCard } from "@/components/CourseCard";
import { CATEGORIES, type Course } from "@/lib/courses";
import { Button } from "@/components/ui/button";
import { ArrowRight, Award, PlayCircle, Sparkles, TrendingUp, Clock } from "lucide-react";
import hero from "@/assets/hero-student.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "BandPath — Master IELTS with expert-led video courses" },
      { name: "description", content: "Structured IELTS video courses across Listening, Reading, Writing and Speaking. Popular, trending and newly uploaded lessons from expert teachers." },
      { property: "og:title", content: "BandPath — Master IELTS with expert-led video courses" },
      { property: "og:description", content: "Structured IELTS video courses across Listening, Reading, Writing and Speaking. Popular, trending and newly uploaded lessons from expert teachers." },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <Hero />
      <Suspense fallback={<div className="mx-auto max-w-7xl px-6 py-10 text-muted-foreground">Loading courses…</div>}>
        <Sections />
      </Suspense>
      <TeacherSpotlight />
      <SiteFooter />
    </div>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 -z-10 bg-gradient-to-br from-primary-soft via-background to-accent-soft" />
      <div className="mx-auto grid max-w-7xl gap-10 px-6 py-16 md:grid-cols-2 md:items-center md:py-24">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/80 px-3 py-1 text-xs font-semibold text-primary shadow-sm ring-1 ring-primary/10">
            <Sparkles className="h-3.5 w-3.5" /> New: Full mock test pack for Academic
          </span>
          <h1 className="mt-5 font-display text-4xl font-extrabold leading-[1.05] text-foreground sm:text-5xl md:text-6xl">
            Reach your target <span className="text-primary">IELTS band</span> —{" "}
            <span className="whitespace-nowrap text-accent">confidently.</span>
          </h1>
          <p className="mt-5 max-w-lg text-base text-muted-foreground sm:text-lg">
            Structured video courses, real mock tests, and daily practice from expert teachers. Built for learners of all ages, from first attempt to Band 8+.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/auth" search={{ mode: "signup" }}>
              <Button size="lg" className="rounded-full px-6 shadow-lg shadow-primary/30">
                Start free <ArrowRight className="ml-1.5 h-4 w-4" />
              </Button>
            </Link>
            <Link to="/browse">
              <Button size="lg" variant="outline" className="rounded-full border-2 px-6">
                <PlayCircle className="mr-1.5 h-4 w-4" /> Explore courses
              </Button>
            </Link>
          </div>
          <div className="mt-8 flex flex-wrap gap-6 text-sm text-muted-foreground">
            <Stat n="24k+" l="Active learners" />
            <Stat n="120+" l="Video courses" />
            <Stat n="4.9★" l="Average rating" />
          </div>
        </div>
        <div className="relative">
          <div className="relative overflow-visible rounded-[2rem] bg-white p-6 shadow-2xl shadow-primary/20 ring-1 ring-border">
            <img src={hero} alt="Student learning IELTS with laptop and headphones" width={1280} height={960} className="w-full rounded-2xl object-contain" />
            <div className="pointer-events-none absolute right-2 top-2 rotate-6 rounded-2xl bg-accent px-4 py-3 text-accent-foreground shadow-lg sm:right-4 sm:top-4">
              <div className="text-xs font-medium">Target</div>
              <div className="font-display text-2xl font-extrabold">Band 8.0</div>
            </div>
            <div className="pointer-events-none absolute bottom-2 left-2 flex items-center gap-3 rounded-2xl bg-white px-4 py-3 shadow-lg ring-1 ring-border sm:bottom-4 sm:left-4">

              <div className="grid h-10 w-10 place-items-center rounded-full bg-primary/10 text-primary">
                <Award className="h-5 w-5" />
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Certified teachers</div>
                <div className="font-semibold">40+ experts</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Stat({ n, l }: { n: string; l: string }) {
  return (
    <div>
      <div className="font-display text-2xl font-extrabold text-foreground">{n}</div>
      <div className="text-xs">{l}</div>
    </div>
  );
}

function Sections() {
  const fetchCourses = useServerFn(listCourses);
  const { data: courses } = useSuspenseQuery({
    queryKey: ["courses", "public"],
    queryFn: () => fetchCourses(),
  });

  const popular = [...courses].sort((a, b) => b.student_count - a.student_count).slice(0, 6);
  const trending = courses.filter((c) => c.is_trending).slice(0, 6);
  const newest = [...courses].sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at)).slice(0, 6);
  const forYou = [...courses].sort((a, b) => b.rating - a.rating).slice(0, 6);

  return (
    <>
      <CategoryStrip />
      <Section title="Recommended for you" icon={<Sparkles className="h-5 w-5 text-primary" />} courses={forYou} />
      <Section title="Popular courses" icon={<Award className="h-5 w-5 text-primary" />} courses={popular} />
      <Section title="Trending this week" icon={<TrendingUp className="h-5 w-5 text-accent" />} courses={trending} />
      <Section title="Newly uploaded" icon={<Clock className="h-5 w-5 text-primary" />} courses={newest} />
    </>
  );
}

function CategoryStrip() {
  return (
    <section className="mx-auto max-w-7xl px-6 pt-6">
      <h2 className="mb-4 font-display text-xl font-bold">Browse by skill</h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
        {CATEGORIES.map((c) => (
          <Link
            key={c.value}
            to="/browse"
            search={{ category: c.value }}
            className="group flex flex-col items-center gap-2 rounded-2xl border border-border bg-card p-4 text-center transition hover:-translate-y-0.5 hover:border-primary hover:shadow-md"
          >
            <div className={`grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br ${c.color} text-2xl shadow-sm`}>
              {c.emoji}
            </div>
            <span className="text-sm font-semibold">{c.label}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}

function Section({ title, icon, courses }: { title: string; icon: React.ReactNode; courses: Course[] }) {
  if (!courses.length) return null;
  return (
    <section className="mx-auto max-w-7xl px-6 pt-14">
      <div className="mb-5 flex items-center justify-between">
        <h2 className="flex items-center gap-2 font-display text-2xl font-bold">
          {icon} {title}
        </h2>
        <Link to="/browse" className="text-sm font-semibold text-primary hover:underline">
          View all →
        </Link>
      </div>
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {courses.slice(0, 3).map((c) => (
          <CourseCard key={c.id} course={c} />
        ))}
      </div>
      {courses.length > 3 && (
        <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {courses.slice(3, 6).map((c) => (
            <CourseCard key={c.id} course={c} />
          ))}
        </div>
      )}
    </section>
  );
}

function TeacherSpotlight() {
  return (
    <section className="mx-auto mt-20 max-w-7xl px-6">
      <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-primary to-primary/80 p-8 text-primary-foreground shadow-xl md:p-12">
        <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-accent/30 blur-3xl" />
        <div className="relative grid gap-8 md:grid-cols-2 md:items-center">
          <div>
            <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-semibold">For teachers</span>
            <h2 className="mt-4 font-display text-3xl font-extrabold leading-tight md:text-4xl">
              Teach IELTS. Reach thousands of learners.
            </h2>
            <p className="mt-3 max-w-md text-primary-foreground/90">
              Upload video lessons, manage your courses, and showcase your expertise on the BandPath teacher portal.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link to="/auth" search={{ mode: "signup" }}>
                <Button size="lg" variant="secondary" className="rounded-full bg-white text-primary hover:bg-white/90">
                  Become a teacher <ArrowRight className="ml-1.5 h-4 w-4" />
                </Button>
              </Link>
              <Link to="/teacher">
                <Button size="lg" variant="outline" className="rounded-full border-white/40 bg-transparent text-white hover:bg-white/10">
                  Open teacher portal
                </Button>
              </Link>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {["Upload courses", "Manage lessons", "Track students", "Grow your reach"].map((t) => (
              <div key={t} className="rounded-2xl bg-white/10 p-4 ring-1 ring-white/20 backdrop-blur">
                <div className="font-display text-lg font-bold">{t}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
