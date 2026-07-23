import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Suspense, useMemo, useState } from "react";
import { z } from "zod";
import { listCourses } from "@/lib/courses.functions";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { CourseCard } from "@/components/CourseCard";
import { CATEGORIES } from "@/lib/courses";

const searchSchema = z.object({
  category: z.string().optional(),
  q: z.string().optional(),
});

export const Route = createFileRoute("/browse")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Browse IELTS courses — BandPath" },
      { name: "description", content: "Filter and browse IELTS video courses by skill: Listening, Reading, Writing, Speaking, Vocabulary, Grammar, and full Mock Tests." },
      { property: "og:title", content: "Browse IELTS courses — BandPath" },
      { property: "og:description", content: "All IELTS video courses in one place." },
    ],
  }),
  component: BrowsePage,
});

function BrowsePage() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <Suspense fallback={<div className="mx-auto max-w-7xl px-6 py-10 text-muted-foreground">Loading…</div>}>
        <BrowseInner />
      </Suspense>
      <SiteFooter />
    </div>
  );
}

function BrowseInner() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const [query, setQuery] = useState(search.q ?? "");
  const fetchCourses = useServerFn(listCourses);
  const { data: courses } = useSuspenseQuery({
    queryKey: ["courses", "public"],
    queryFn: () => fetchCourses(),
  });

  const filtered = useMemo(() => {
    return courses.filter((c) => {
      if (search.category && c.category !== search.category) return false;
      if (query && !`${c.title} ${c.description} ${c.teacher_name}`.toLowerCase().includes(query.toLowerCase())) return false;
      return true;
    });
  }, [courses, search.category, query]);

  return (
    <div className="mx-auto max-w-7xl px-6 py-10">
      <div className="mb-2 text-sm font-semibold text-primary">All courses</div>
      <h1 className="font-display text-4xl font-extrabold">Find your next IELTS course</h1>
      <p className="mt-2 max-w-2xl text-muted-foreground">
        Filter by IELTS skill and pick a course led by an expert teacher.
      </p>

      <div className="mt-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => navigate({ search: (s: { category?: string; q?: string }) => ({ ...s, category: undefined }) })}
            className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${
              !search.category ? "bg-primary text-primary-foreground" : "bg-secondary hover:bg-secondary/80"
            }`}
          >
            All
          </button>
          {CATEGORIES.map((c) => (
            <button
              key={c.value}
              onClick={() => navigate({ search: (s: { category?: string; q?: string }) => ({ ...s, category: c.value }) })}
              className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${
                search.category === c.value ? "bg-primary text-primary-foreground" : "bg-secondary hover:bg-secondary/80"
              }`}
            >
              {c.emoji} {c.label}
            </button>
          ))}
        </div>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search courses…"
          className="w-full rounded-full border border-border bg-card px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-primary md:w-72"
        />
      </div>

      <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((c) => (
          <CourseCard key={c.id} course={c} />
        ))}
      </div>
      {filtered.length === 0 && (
        <div className="mt-16 text-center text-muted-foreground">No courses match your filters.</div>
      )}
    </div>
  );
}
