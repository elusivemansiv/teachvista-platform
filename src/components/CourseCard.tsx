import { Link } from "@tanstack/react-router";
import { Star, Clock, Users } from "lucide-react";
import { categoryMeta, type Course } from "@/lib/courses";

export function CourseCard({ course }: { course: Course }) {
  const meta = categoryMeta(course.category);
  return (
    <Link
      to="/course/$slug"
      params={{ slug: course.slug }}
      className="group flex w-full flex-col overflow-hidden rounded-3xl border border-border bg-card transition-all hover:-translate-y-1 hover:shadow-xl hover:shadow-primary/10"
    >
      <div className={`relative aspect-[16/10] overflow-hidden bg-gradient-to-br ${meta.color}`}>
        {course.thumbnail_url && (
          <img
            src={course.thumbnail_url}
            alt={course.title}
            loading="lazy"
            className="h-full w-full object-cover opacity-90 transition-transform duration-500 group-hover:scale-105"
          />
        )}
        <div className="absolute left-3 top-3 flex items-center gap-1 rounded-full bg-white/95 px-3 py-1 text-xs font-semibold text-foreground shadow-sm">
          <span>{meta.emoji}</span> {meta.label}
        </div>
        {course.target_band && (
          <div className="absolute right-3 top-3 rounded-full bg-accent px-3 py-1 text-xs font-bold text-accent-foreground shadow-sm">
            Band {course.target_band}
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-3 p-5">
        <h3 className="line-clamp-2 font-display text-base font-bold text-foreground group-hover:text-primary">
          {course.title}
        </h3>
        <p className="line-clamp-2 text-sm text-muted-foreground">{course.description}</p>
        <div className="mt-auto flex items-center justify-between text-xs text-muted-foreground">
          <span className="font-medium text-foreground">{course.teacher_name}</span>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <Star className="h-3.5 w-3.5 fill-accent text-accent" />
              {course.rating}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              {course.duration_hours}h
            </span>
            <span className="hidden items-center gap-1 sm:flex">
              <Users className="h-3.5 w-3.5" />
              {course.student_count.toLocaleString()}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
