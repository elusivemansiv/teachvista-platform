
# IELTS Learning Platform

A modern, responsive e-learning site focused on IELTS prep (Listening, Reading, Writing, Speaking, Vocabulary, Grammar, Mock Tests) with learner browsing/dashboard and a teacher portal mockup. Real auth + course data via Lovable Cloud; teacher upload flow is UI-only for this pass.

## Design

- Palette: vibrant blue (primary `#2563EB`), soft orange accent (`#FB923C`), white/off-white surfaces, dark slate text. Subtle blue→indigo gradients on hero and featured cards.
- Typography: Plus Jakarta Sans (headings) + Inter (body), both sans-serif, readable across ages.
- Shapes: generously rounded cards (rounded-2xl), soft shadows, engaging thumbnails, band-score badges in orange.
- Layout: dashboard-style with left sidebar nav + top search bar; hero at top of home; horizontally scrollable rails for course sections.

## Pages / Routes

- `/` — Home (public): hero (CTA: Start free, Explore courses), IELTS section categories, Popular, Trending, Newly Uploaded rails, teacher spotlight, footer.
- `/browse` — All courses with category filter chips (Listening, Reading, Writing, Speaking, Vocabulary, Grammar, Full Mock).
- `/course/$id` — Course detail: thumbnail/video preview, description, lessons list, instructor card, enroll button.
- `/auth` — Sign in / sign up (learner or teacher role selection at signup).
- `/_authenticated/dashboard` — Learner dashboard: Continue learning, Recommended for your band, Progress by skill, Upcoming mock tests.
- `/_authenticated/teacher` — Teacher portal (static UI): stats, my courses table, "Upload new course" form (mock submit → toast), profile/expertise showcase.
- `/_authenticated/teacher/upload` — Full upload form mockup (title, category, level, band target, description, thumbnail placeholder, video URL, lessons repeater).

## Data model (Lovable Cloud)

- `profiles` (id → auth.users, full_name, avatar_url, headline, bio) — trigger on signup.
- `user_roles` (user_id, role: `learner|teacher|admin`) with `has_role()` security-definer function.
- `courses` (id, teacher_id, title, slug, description, category, level, target_band, thumbnail_url, preview_video_url, is_published, popularity, created_at).
- `lessons` (id, course_id, title, order, duration_min, video_url).
- `enrollments` (user_id, course_id, progress, created_at).
- RLS: public SELECT on published courses + lessons; teachers manage own; enrollments scoped to owner. Grants per project conventions.
- Seed migration inserts a teacher demo profile + ~12 IELTS courses across categories with thumbnail URLs so the home page has content on first load.

## Auth

- Email/password only (no social unless asked later).
- Signup asks role (learner default, teacher option) → written to `user_roles`.
- Learner-only routes under `/_authenticated/`; teacher routes additionally check `has_role(user,'teacher')` in-component and redirect if not.

## Teacher portal (UI mockup)

- Uses real auth + reads teacher's own `courses` rows if any; upload form doesn't persist (shows success toast, "Coming soon: video uploads").
- Sections: overview stats (courses, students, avg rating — mocked), Courses table, Expertise showcase (subject chips), Upload CTA.

## Out of scope this pass

- Real video upload/storage, payments, reviews, messaging, certificates, quiz engine.

## Technical notes

- TanStack Start routes as above; `__root.tsx` head updated with IELTS-specific title/description; each route defines its own `head()`.
- Sidebar via shadcn `Sidebar` in `_authenticated` layout wrapper component (not the managed gate file).
- Home course rails read via public server fn using publishable key + `TO anon` SELECT policy on published courses.
- Thumbnails: generate 4–6 category hero images with imagegen; course cards use category thumbnails + colored gradient overlays with title.

