# Redesign: Admin Portal & Learner Portal

Restyle both signed-in portals with a cleaner, more polished dashboard look. No feature or data changes — same pages, same content, new visual system.

## Design direction (chosen)

- **Colors — Cloud White**: crisp white surfaces `#fafbfc`, soft gray borders `#e8ecf1`, muted slate text `#94a3b8` family, blue accent `#3b82f6`. Keeps the existing blue/orange brand accents for badges and highlights.
- **Typography — Sora + Manrope**: Sora for headings, Manrope for body. Loaded via `<link>` in the root route head, registered as `--font-display` / `--font-sans` tokens.
- **Layout — Dashboard panels**: refined sidebar + stat panels and cards, keeping the current structure but with tighter hierarchy, consistent spacing, and better mobile behavior.

## What changes

### 1. Design tokens (`src/styles.css`)
- Add Cloud White surface/border/muted tokens and map them into the shadcn semantic tokens (`--background`, `--card`, `--border`, `--muted`, etc.).
- Add `--font-display: "Sora"` and `--font-sans: "Manrope"` in `@theme`.
- Keep existing primary blue and orange accent tokens so course badges and brand elements stay consistent.

### 2. App shell (`src/components/AppShell.tsx`)
- Slimmer sidebar with clearer active-state pill, section labels, and role badge.
- Top bar: cleaner spacing, notification bell and account controls aligned right; mobile header keeps logo left / actions right (per earlier fix).
- Consistent page container: max width, generous padding, subtle page background so white cards pop.

### 3. Learner portal
- **Dashboard** (`src/routes/_authenticated/dashboard.tsx`): restyled welcome banner (softer gradient, stat chips), "Continue learning" cards with cleaner progress bars and resume buttons, band-progress panel with refined bars, "Picked for you" grid tightened.
- **My Courses** (`src/routes/_authenticated/my-courses.tsx`): polished filter tabs, course cards with clearer progress and status, better empty state.
- **Course player** (`src/routes/_authenticated/learn.$slug.tsx`): restyle lesson list, completion checkmarks, and resume banner to match the new system (keeping existing keyboard/ARIA behavior).

### 4. Admin portal
- **Admin** (`src/routes/_authenticated/admin.tsx`): restyled tab navigation, moderation queue cards with clearer status badges and action buttons, audit log table, site-settings panels.
- **Admin security** (`src/routes/_authenticated/admin-security.tsx`): scan-run history and findings list restyled with severity badges and cleaner drill-down.

### 5. Shared components
- `CourseCard`, stat cards, badges, buttons: adopt new tokens, rounded-2xl corners, softer shadows, consistent focus rings.

## Technical notes

- Fonts loaded with `<link>` tags in `src/routes/__root.tsx` head (never `@import` of a URL in CSS).
- All colors via semantic tokens in `src/styles.css` — no hardcoded color utilities.
- No database, route, or logic changes; role-based guards and all existing features stay as-is.
- Verify with screenshots of `/dashboard`, `/my-courses`, `/admin` after the restyle.
