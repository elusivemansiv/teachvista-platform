## Scope

Free enrollment (no payments). Progress tracked per enrollment. Teacher analytics computed from existing tables.

## Database

Migration adds:
- `enrollments.status` enum (`active`, `completed`, `cancelled`), default `active`
- `enrollments.last_lesson_id uuid` nullable, `enrolled_at`, `updated_at`
- `unique (user_id, course_id)`
- `courses.views_count int default 0`
- `courses.last_uploaded_at timestamptz` (defaults to `created_at`)
- RPC `increment_course_view(course_id uuid)` — SECURITY DEFINER, bumps views_count
- Trigger on `enrollments` insert → `courses.student_count = student_count + 1`

Existing `enrollments` RLS (own-only) stays. Grants added per rules.

## Server functions (`src/lib/enrollments.functions.ts`)

All `.middleware([requireSupabaseAuth])`:
- `enrollInCourse({ courseId })` — upsert enrollment, return row
- `unenroll({ courseId })` — delete
- `listMyEnrollments()` — join courses, return enrollment + course
- `updateProgress({ courseId, progress, lastLessonId? })`
- `getMyEnrollment({ courseId })` — for course page state

Teacher analytics in `src/lib/teacher.functions.ts`:
- `listTeacherCourseAnalytics()` — for `auth.uid()` teacher: courses with views_count, student_count, last_uploaded_at, avg progress from enrollments

Public: extend `courses.functions.ts` with `recordCourseView({ slug })` calling the RPC.

## Frontend

- `src/routes/course.$slug.tsx`: replace static "Enroll now" with mutation. If enrolled, show "Continue learning" + unenroll. Fire view on mount.
- New `src/routes/_authenticated/my-courses.tsx`: grid of enrolled courses, progress bars, Resume/Review buttons, filter tabs (active/completed).
- `src/routes/_authenticated/dashboard.tsx`: replace hard-coded "Continue learning" with real enrollments; show completion % and next lesson label; keep recommendations from non-enrolled courses.
- `src/routes/_authenticated/teacher.tsx`: add analytics table (course, views, enrollments, avg progress, last uploaded).
- `src/components/AppShell.tsx`: add "My Courses" to learner sidebar.

## Out of scope

Payments, real lesson playback/completion (progress is a slider updated by Resume button jump for now; next-lesson uses `lessons.ordering` + `last_lesson_id`).
