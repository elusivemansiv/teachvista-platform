import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Suspense, useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { listCourses } from "@/lib/courses.functions";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { CourseCard } from "@/components/CourseCard";
import { CATEGORIES } from "@/lib/courses";

const searchSchema = z.object({
  category: z.string().optional(),
  q: z.string().optional(),
  level: z.string().optional(),
  duration: z.string().optional(),
  band: z.string().optional(),
  sort: z.string().optional(),
  dir: z.enum(["asc", "desc"]).optional(),
  page: z.coerce.number().int().min(1).optional(),
});

const PAGE_SIZE = 9;

type BrowseSearch = z.infer<typeof searchSchema>;

const LEVELS = ["beginner", "intermediate", "advanced"] as const;
const DURATIONS = [
  { value: "short", label: "Under 4 h", test: (h: number) => h < 4 },
  { value: "medium", label: "4–8 h", test: (h: number) => h >= 4 && h <= 8 },
  { value: "long", label: "8 h+", test: (h: number) => h > 8 },
] as const;
const SORTS = [
  { value: "popular", label: "Most popular" },
  { value: "rating", label: "Top rated" },
  { value: "newest", label: "Newest" },
  { value: "shortest", label: "Shortest" },
] as const;


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

  const setParam = (patch: Partial<BrowseSearch>) =>
    navigate({ search: (s: BrowseSearch) => ({ ...s, page: undefined, ...patch }) });

  // Debounce the search box so results settle instead of flickering per keystroke.
  useEffect(() => {
    const current = search.q ?? "";
    if (query === current) return;
    const t = setTimeout(() => {
      navigate({
        search: (s: BrowseSearch) => ({ ...s, q: query.trim() || undefined, page: undefined }),
        replace: true,
      });
    }, 350);
    return () => clearTimeout(t);
  }, [query, search.q, navigate]);

  const filtered = useMemo(() => {
    const durTest = DURATIONS.find((d) => d.value === search.duration)?.test;
    const band = search.band ? Number(search.band) : null;
    const list = courses.filter((c) => {
      if (search.category && c.category !== search.category) return false;
      if (search.level && c.level !== search.level) return false;
      if (durTest && !durTest(Number(c.duration_hours))) return false;
      if (band && (c.target_band === null || Number(c.target_band) < band)) return false;
      if (query && !`${c.title} ${c.description} ${c.teacher_name}`.toLowerCase().includes(query.toLowerCase()))
        return false;
      return true;
    });
    const key = search.sort ?? "popular";
    const value = (c: (typeof list)[number]) =>
      key === "rating"
        ? c.rating
        : key === "newest"
          ? new Date(c.created_at).getTime()
          : key === "shortest"
            ? -c.duration_hours
            : c.popularity;
    const sign = search.dir === "asc" ? -1 : 1;
    return [...list].sort((a, b) => (value(b) - value(a)) * sign);
  }, [courses, search.category, search.level, search.duration, search.band, search.sort, search.dir, query]);

  const page = Math.max(1, search.page ?? 1);
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const pageItems = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const goToPage = (p: number) => navigate({ search: (s: BrowseSearch) => ({ ...s, page: p === 1 ? undefined : p }) });

  const activeFilters =
    Number(!!search.category) + Number(!!search.level) + Number(!!search.duration) + Number(!!search.band);

  return (
    <div className="mx-auto max-w-7xl px-6 py-10">
      <div className="mb-2 text-sm font-semibold text-primary">All courses</div>
      <h1 className="font-display text-4xl font-extrabold">Find your next IELTS course</h1>
      <p className="mt-2 max-w-2xl text-muted-foreground">
        Filter by IELTS skill, level, duration and target band to find the right course.
      </p>

      <div className="mt-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div role="group" aria-label="Filter by IELTS skill" className="flex flex-wrap gap-2">
          <FilterChip active={!search.category} onClick={() => setParam({ category: undefined })} label="All" />
          {CATEGORIES.map((c) => (
            <FilterChip
              key={c.value}
              active={search.category === c.value}
              onClick={() => setParam({ category: c.value })}
              label={`${c.emoji} ${c.label}`}
            />
          ))}
        </div>
        <div className="w-full md:w-72">
          <label htmlFor="course-search" className="sr-only">
            Search courses
          </label>
          <input
            id="course-search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search courses…"
            className="w-full rounded-full border border-border bg-card px-4 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-end gap-4 rounded-2xl border border-border bg-card p-4">
        <SelectFilter
          id="filter-level"
          label="Level"
          value={search.level ?? ""}
          onChange={(v) => setParam({ level: v || undefined })}
          options={LEVELS.map((l) => ({ value: l, label: l[0].toUpperCase() + l.slice(1) }))}
          anyLabel="Any level"
        />
        <SelectFilter
          id="filter-duration"
          label="Duration"
          value={search.duration ?? ""}
          onChange={(v) => setParam({ duration: v || undefined })}
          options={DURATIONS.map((d) => ({ value: d.value, label: d.label }))}
          anyLabel="Any length"
        />
        <SelectFilter
          id="filter-band"
          label="Target band"
          value={search.band ?? ""}
          onChange={(v) => setParam({ band: v || undefined })}
          options={["6", "6.5", "7", "7.5", "8"].map((b) => ({ value: b, label: `Band ${b}+` }))}
          anyLabel="Any band"
        />
        <SelectFilter
          id="filter-sort"
          label="Sort by"
          value={search.sort ?? "popular"}
          onChange={(v) => setParam({ sort: v })}
          options={SORTS.map((s) => ({ value: s.value, label: s.label }))}
        />
        <div className="flex flex-col gap-1">
          <span className="text-xs font-semibold text-muted-foreground">Order</span>
          <button
            type="button"
            onClick={() => setParam({ dir: search.dir === "asc" ? "desc" : "asc" })}
            aria-label={`Sort order: ${search.dir === "asc" ? "ascending" : "descending"}. Activate to switch.`}
            className="flex min-h-11 items-center gap-2 rounded-full border border-border bg-background px-4 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {search.dir === "asc" ? "Ascending" : "Descending"}
          </button>
        </div>
        {activeFilters > 0 && (
          <button
            type="button"
            onClick={() => setParam({ category: undefined, level: undefined, duration: undefined, band: undefined })}
            className="rounded-full px-3 py-2 text-sm font-semibold text-primary underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Clear {activeFilters} filter{activeFilters === 1 ? "" : "s"}
          </button>
        )}
      </div>

      <p aria-live="polite" className="mt-4 text-sm text-muted-foreground">
        {filtered.length} course{filtered.length === 1 ? "" : "s"} found
        {filtered.length > PAGE_SIZE && ` · page ${safePage} of ${pageCount}`}
      </p>

      <div className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {pageItems.map((c) => (
          <CourseCard key={c.id} course={c} />
        ))}
      </div>
      {filtered.length === 0 && (
        <div className="mt-16 text-center text-muted-foreground">No courses match your filters.</div>
      )}

      {pageCount > 1 && (
        <nav aria-label="Course results pages" className="mt-10 flex flex-wrap items-center justify-center gap-2">
          <button
            type="button"
            onClick={() => goToPage(safePage - 1)}
            disabled={safePage === 1}
            className="min-h-11 rounded-full border border-border px-4 text-sm font-semibold disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Previous
          </button>
          {Array.from({ length: pageCount }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => goToPage(p)}
              aria-current={p === safePage ? "page" : undefined}
              className={`min-h-11 min-w-11 rounded-full px-3 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                p === safePage ? "bg-primary text-primary-foreground" : "bg-secondary hover:bg-secondary/80"
              }`}
            >
              {p}
            </button>
          ))}
          <button
            type="button"
            onClick={() => goToPage(safePage + 1)}
            disabled={safePage === pageCount}
            className="min-h-11 rounded-full border border-border px-4 text-sm font-semibold disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Next
          </button>
        </nav>
      )}
    </div>
  );
}

function FilterChip({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`rounded-full px-4 py-1.5 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
        active ? "bg-primary text-primary-foreground" : "bg-secondary hover:bg-secondary/80"
      }`}
    >
      {label}
    </button>
  );
}

function SelectFilter({
  id,
  label,
  value,
  onChange,
  options,
  anyLabel,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  anyLabel?: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-xs font-semibold text-muted-foreground">
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="min-h-11 rounded-full border border-border bg-background px-4 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {anyLabel && <option value="">{anyLabel}</option>}
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}
