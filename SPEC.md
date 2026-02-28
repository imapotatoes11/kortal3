Here's the revised, comprehensive plan:

---

# kortal2 → SolidJS Port: Full Roadmap

## Overview

- **New project**: fresh SolidStart repo (not migrating in-place)
- **New Supabase database**: built from scratch with proper per-user schema and RLS from day one
- **Flask server eliminated**: all schedule logic and announcements pipeline move into SolidStart API routes
- **Schedule**: user-configurable with weekly, alternating (A/B day), and custom presets; user-editable time blocks with built-in presets as starting points

---

## What Changes vs. What Stays the Same

**Unchanged (copy verbatim):** TypeScript interfaces, pure utility functions, date parsing helpers (`parseMmDdYy`, `lastTwoWednesdays`), all Tailwind class strings, `globals.css` CSS variables, `public/` assets.

**Mechanically substituted (same logic, new API):**
- `useState` → `createSignal`, `useEffect` → `createEffect` / `onMount`, `useMemo` → `createMemo`
- `{list.map(...)}` → `<For each={list()}>` (required for Solid reactivity)
- `{cond && <Comp/>}` → `<Show when={cond}>` (preferred pattern)
- `className` → `class`, `useCallback` → plain function (not needed in Solid)

**Framework-level rewrites:** `next.config.ts` → `app.config.ts` (Vinxi), `middleware.ts` → `src/middleware.ts` (Vinxi), shadcn/Radix → Kobalte wrappers, `lucide-react` → `@phosphor-icons/solid`, `next-pwa` → `vite-plugin-pwa`, `next-themes` → custom signal store, page files (`app/protected/v2/page.tsx`) → single route files (`src/routes/protected/v2.tsx`).

**Replaced entirely:** `lib/kalepwa/fallbackSchedule.ts` (hardcoded) → `src/lib/schedule/engine.ts` (user-configurable). Flask server → SolidStart API routes + service modules.

**Net new:** Per-user database schema with RLS, `user_profiles` trigger, schedule config tables, schedule setup wizard, announcements pipeline (RSS + OpenAI), Discord error notifications.

---

## Tech Stack Mapping

| Current | New |
|---|---|
| Next.js 15 App Router | SolidStart 1.x (Vinxi/Vite) |
| React 19 | SolidJS 1.9 |
| Next.js Server Actions | SolidStart server functions (`"use server"`) |
| shadcn/ui + Radix UI | @kobalte/core + custom Tailwind wrappers |
| framer-motion | @motionone/solid |
| next-themes | Custom `createSignal` theme store |
| next-pwa | vite-plugin-pwa |
| `next/navigation` redirect | `throw redirect(url)` (SolidStart) |
| `@supabase/ssr` | `@supabase/ssr` (works with Vinxi cookies via `vinxi/http`) |
| `lucide-react` | `@phosphor-icons/solid` |
| Flask server (schedule + announcements) | SolidStart API routes |
| `feedparser` (Python) | `rss-parser` (npm) |
| `openai` (Python) | `openai` (npm) |

---

## Project Structure

```
src/
├── routes/
│   ├── index.tsx                          # Landing page
│   ├── sign-in.tsx
│   ├── sign-up.tsx
│   ├── forgot-password.tsx
│   ├── auth/
│   │   └── callback.ts                    # Supabase OAuth callback
│   ├── api/                               # HTTP endpoints (replaces Flask)
│   │   ├── schedule/
│   │   │   └── [date].ts                  # GET /api/schedule/:date
│   │   └── announcements/
│   │       ├── get.ts                     # GET /api/announcements/get
│   │       ├── browse.ts                  # GET /api/announcements/browse
│   │       └── refresh.ts                 # POST /api/announcements/refresh (cron)
│   └── protected/
│       ├── index.tsx                      # Redirect → /protected/v2
│       ├── v2.tsx                         # Main dashboard
│       ├── schedule-setup.tsx             # Schedule config wizard
│       └── reset-password.tsx
│
├── components/
│   ├── ui/                                # Kobalte-based primitives
│   │   ├── button.tsx
│   │   ├── dialog.tsx
│   │   ├── checkbox.tsx
│   │   ├── dropdown-menu.tsx
│   │   ├── tooltip.tsx
│   │   └── badge.tsx
│   └── protected/
│       ├── v2/
│       │   ├── v2-dashboard.tsx
│       │   ├── schedule-widget.tsx
│       │   ├── todos-widget.tsx
│       │   ├── events-widget.tsx
│       │   ├── exceptions-widget.tsx
│       │   └── announcements-widget.tsx
│       ├── todo/
│       │   ├── AddTodoForm.tsx
│       │   ├── EditTodoForm.tsx
│       │   └── TodoRow.tsx
│       └── schedule-exceptions/
│           └── ExceptionForm.tsx
│
├── lib/
│   ├── todo.ts                            # "use server" CRUD
│   ├── events.ts                          # "use server" CRUD (port of trutils.ts)
│   ├── schedule-exceptions.ts             # "use server" CRUD
│   ├── schedule/
│   │   ├── engine.ts                      # User-aware schedule engine
│   │   └── presets.ts                     # Built-in time block presets
│   ├── announcements/
│   │   ├── rss.ts                         # RSS feed parsing (rss-parser)
│   │   └── ai.ts                          # OpenAI summarization + relevance
│   └── supabase/
│       ├── server.ts                      # Server-side client (cookies via vinxi/http)
│       └── client.ts                      # Browser client
│
├── services/
│   └── discord.ts                         # Discord webhook (error notifications)
│
├── stores/
│   └── theme.ts                           # Dark mode (createSignal + localStorage)
│
├── middleware.ts                           # Auth session refresh + route protection
└── app.tsx                                # Root component + providers
```

---

## Database Schema (New, From Scratch)

Run all of this in the Supabase SQL editor for the new project.

### Core user tables

```sql
-- Auto-created profile on sign-up
CREATE TABLE user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    display_name TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, display_name)
  VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
```

### Per-user data tables (with RLS from day one)

```sql
CREATE TABLE todo (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    completed BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    due TIMESTAMPTZ,
    priority INTEGER NOT NULL DEFAULT 1 CHECK (priority BETWEEN 1 AND 3)
);

CREATE TABLE events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT '',
    description TEXT NOT NULL DEFAULT '',
    datetime TEXT NOT NULL,       -- 'YYYY-MM-DD' or 'YYYY-MM-DDTHH:MM'
    date_mmddyy TEXT NOT NULL,    -- 'MM-DD-YY'
    all_day BOOLEAN NOT NULL DEFAULT false,
    location TEXT NOT NULL DEFAULT ''
);

CREATE TABLE schedule_exceptions (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    date_mmddyy TEXT NOT NULL,    -- 'MM-DD-YY'
    p1 TEXT NOT NULL DEFAULT '',  -- 'HH:MM AM-HH:MM PM' time override for period 1
    p2 TEXT NOT NULL DEFAULT '',
    p3 TEXT NOT NULL DEFAULT '',
    p4 TEXT NOT NULL DEFAULT '',
    empty BOOLEAN NOT NULL DEFAULT false,
    reason TEXT NOT NULL DEFAULT ''
);

-- RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE todo ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedule_exceptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own profile" ON user_profiles FOR ALL USING (auth.uid() = id);
CREATE POLICY "own todos" ON todo FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "own events" ON events FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "own exceptions" ON schedule_exceptions FOR ALL USING (auth.uid() = user_id);
```

### Schedule configuration tables

```sql
-- One row per user; UNIQUE(user_id) enforces single config
CREATE TABLE user_schedule_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    schedule_type TEXT NOT NULL CHECK (schedule_type IN ('weekly', 'alternating', 'custom')),
    period_count INTEGER NOT NULL DEFAULT 4,
    -- Alternating only: anchor point for computing A/B day
    alt_reference_date DATE,
    alt_reference_type TEXT DEFAULT 'A' CHECK (alt_reference_type IN ('A', 'B')),
    -- Late start: automatically mark last N Wednesdays of month as late start
    late_start_wednesdays INTEGER NOT NULL DEFAULT 2,  -- set 0 to disable
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id)
);

-- Courses per period per day type
-- weekly schedule: day_type = 'default'
-- alternating schedule: day_type = 'A' or 'B'
CREATE TABLE user_periods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    config_id UUID NOT NULL REFERENCES user_schedule_config(id) ON DELETE CASCADE,
    day_type TEXT NOT NULL DEFAULT 'default',
    period_slot INTEGER NOT NULL,
    course_code TEXT NOT NULL DEFAULT '',
    course_name TEXT NOT NULL,
    teacher TEXT NOT NULL DEFAULT '',
    room TEXT NOT NULL DEFAULT '',
    is_spare BOOLEAN NOT NULL DEFAULT false
);

-- Time blocks per period per block type
-- block_type: 'regular', 'late_start', or any custom label the user names
CREATE TABLE user_time_blocks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    config_id UUID NOT NULL REFERENCES user_schedule_config(id) ON DELETE CASCADE,
    block_type TEXT NOT NULL DEFAULT 'regular',
    period_slot INTEGER NOT NULL,
    time_start TEXT NOT NULL,   -- e.g. '9:00 AM'
    time_end TEXT NOT NULL      -- e.g. '10:20 AM'
);

ALTER TABLE user_schedule_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_time_blocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own config" ON user_schedule_config FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "own periods" ON user_periods FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "own time_blocks" ON user_time_blocks FOR ALL USING (auth.uid() = user_id);
```

### Announcements table (global cache, no per-user)

```sql
CREATE TABLE announcements (
    id TEXT PRIMARY KEY,          -- RSS entry_id (URL or GUID)
    course TEXT NOT NULL,
    title TEXT NOT NULL,
    link TEXT,
    content TEXT,
    published_at TIMESTAMPTZ,
    is_relevant BOOLEAN NOT NULL DEFAULT false,
    ai_summary TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
-- All authenticated users can read; only service role can write (cron job)
CREATE POLICY "read all" ON announcements FOR SELECT USING (auth.role() = 'authenticated');
```

---

## Schedule Engine (`src/lib/schedule/engine.ts`)

Replaces `fallbackSchedule.ts` and the Flask `/schedule/get/<date>` endpoint. Runs server-side only.

**Function signature:**
```typescript
export async function getScheduleForUser(
    dateStr: string,   // 'MM-DD-YY'
    userId: string
): Promise<ScheduleResponse>
```

**Logic (direct port + extension of Flask logic):**
1. Parse `dateStr` → `Date` object (using the existing `parseMmDdYy` helper)
2. Return empty periods array for weekends (same as Flask)
3. Fetch `user_schedule_config` for the user → if none, return a "setup needed" response
4. Check `schedule_exceptions` for this date and user → if found, apply override (same logic as Flask `get_schedule_exception`)
5. Determine `blockType`:
   - If `late_start_wednesdays > 0` and today is one of the last N Wednesdays → `'late_start'` (port of `lastTwoWednesdays` helper, generalized to N)
   - Otherwise → `'regular'`
6. Determine `dayType`:
   - `'weekly'` → always `'default'`
   - `'alternating'` → count weekdays between `alt_reference_date` and today; even offset = `alt_reference_type`, odd offset = the other one
   - `'custom'` → look up from schedule_exceptions `day_type` field (or default to `'A'`)
7. Fetch `user_periods` matching `user_id + config_id + day_type`
8. Fetch `user_time_blocks` matching `user_id + config_id + block_type`
9. Merge periods + time blocks → return `ScheduleResponse`

**Built-in time block presets (`src/lib/schedule/presets.ts`):**
```typescript
export const TIME_BLOCK_PRESETS = {
  '4-period-regular':    ['9:00 AM–10:20 AM', '10:25 AM–11:40 AM', '12:40 PM–1:55 PM', '2:00 PM–3:15 PM'],
  '4-period-late-start': ['9:55 AM–10:55 AM', '11:00 AM–12:00 PM', '1:05 PM–2:10 PM',  '2:15 PM–3:15 PM'],
  '3-period-regular':    ['9:00 AM–10:50 AM', '11:00 AM–12:50 PM', '1:40 PM–3:15 PM'],
}
```
Users pick a preset → pre-fills the time block form → they can edit individual slots.

---

## Flask Server → SolidStart API Routes

All three Flask endpoints become API routes in `src/routes/api/`.

### `/api/schedule/[date].ts` (replaces `/schedule/get/<date>`)
```typescript
export async function GET({ params }) {
  // calls getScheduleForUser(params.date, session.user.id)
  // user-scoped, requires auth session
}
```

### `/api/announcements/get.ts` (replaces `/api/announcements/get`)
```typescript
export async function GET() {
  // queries announcements table: relevant (limit 20) + non_relevant (limit 10)
  // public read, no auth required
}
```

### `/api/announcements/browse.ts` (replaces `/api/announcements/browse`)
```typescript
export async function GET({ request }) {
  // ?page=N, 20 per page
  // returns announcements array + pagination metadata
}
```

### `/api/announcements/refresh.ts` (replaces `/api/announcements/refresh`)
```typescript
export async function POST({ request }) {
  // Check Authorization header against CRON_SECRET env var
  // processCourseFeeds() — iterate RSS_FEED_COURSE_* env vars, parse with rss-parser,
  //   call OpenAI (generate_course_summary equivalent), insert to Supabase
  // processSchoolFeed() — parse RSS_FEED_SCHOOL, call OpenAI (analyze_school_announcement),
  //   insert with is_relevant flag
  // On error, call sendDiscordMessage()
}
```

**New env vars (server-only, no `VITE_` prefix):**
```
SUPABASE_SERVICE_KEY        # For cron/announcements inserts bypassing RLS
OPENAI_API_KEY
DISCORD_WEBHOOK_URL         # Was hardcoded in Flask — move to env
CRON_SECRET
RSS_FEED_SCHOOL
RSS_FEED_COURSE_1
RSS_FEED_COURSE_2
...
```

**New npm deps for announcements pipeline:**
```bash
pnpm add rss-parser openai
```

---

## Schedule Setup Wizard (`src/routes/protected/schedule-setup.tsx`)

Multi-step UI, shown automatically on first dashboard load if no `user_schedule_config` exists.

| Step | What happens |
|---|---|
| 1 | Choose schedule type: **Weekly** / **Alternating A-B** / **Custom** |
| 2 | Enter courses per period (name, code, teacher, room; mark as spare) — for Alternating: two side-by-side columns (A-day / B-day) |
| 3 | Configure time blocks: pick a preset → each period's start/end time becomes editable. Add a second block type for "late start" (pre-filled from `4-period-late-start` preset if applicable) |
| 4 | (Alternating only) Set reference date + which type that date was (A or B) |
| 5 | Confirm + save → writes to `user_schedule_config`, `user_periods`, `user_time_blocks` |

Also accessible later from a settings route/panel for editing.

---

## Implementation Phases

### Phase 1 — Project setup
- `pnpm create solid@latest` (SolidStart, TypeScript, Tailwind)
- Add deps: `@supabase/supabase-js @supabase/ssr @kobalte/core @motionone/solid @phosphor-icons/solid rss-parser openai`
- Add dev deps: `vite-plugin-pwa tailwindcss-animate`
- Configure `app.config.ts` (PWA via `vite-plugin-pwa`, path aliases `@/`)
- Set up `src/lib/supabase/server.ts` and `client.ts`

### Phase 2 — Auth
- Port `middleware.ts` (session refresh + redirect unauth'd users)
- Port sign-in, sign-up, forgot-password, reset-password routes + server functions
- Port `auth/callback.ts`

### Phase 3 — Database setup
- Run all SQL from the schema section above in new Supabase project
- Set up env vars

### Phase 4 — Core CRUD server functions
- Port `lib/todo.ts` → `src/lib/todo.ts` (add `user_id` to all queries)
- Port `lib/trutils.ts` → `src/lib/events.ts` (add `user_id`)
- Port `lib/schedule-exceptions.ts` → `src/lib/schedule-exceptions.ts` (add `user_id`)
- Port event actions from `app/actions.ts` into `src/lib/events.ts`

### Phase 5 — Schedule engine
- Port `lastTwoWednesdays`, `parseMmDdYy`, `daysInMonth` helpers
- Build `src/lib/schedule/engine.ts` (user-configurable, replaces fallbackSchedule + Flask logic)
- Build `src/lib/schedule/presets.ts`
- Add `GET /api/schedule/[date].ts` API route

### Phase 6 — Announcements pipeline
- Build `src/lib/announcements/rss.ts` (rss-parser equivalent of feedparser logic)
- Build `src/lib/announcements/ai.ts` (OpenAI equivalent: `generateCourseSummary`, `analyzeSchoolAnnouncement`)
- Build `src/services/discord.ts` (sendDiscordMessage with env var URL)
- Add all three `/api/announcements/` route handlers

### Phase 7 — UI components
- Build base `components/ui/` set using Kobalte
- Port `components/protected/todo/` (React → Solid JSX, `useState` → `createSignal`)
- Port `components/protected/schedule-exceptions/`
- Port event dialog components

### Phase 8 — Dashboard
- Port `components/protected/v2/` widgets
- Port `routes/protected/v2.tsx` (main dashboard page, data loading via `createResource`)
- Dark mode store + toggle

### Phase 9 — Schedule setup wizard
- Build `routes/protected/schedule-setup.tsx` (multi-step form)
- Hook into dashboard: show wizard if no `user_schedule_config` on load

### Phase 10 — PWA + polish
- Configure `vite-plugin-pwa` in `app.config.ts`
- Port pull-to-refresh and swipe hooks
- Test on mobile

---

## Verification Checklist

1. Auth: sign-up → verify email → sign-in → sign-out → reset password
2. Data isolation: create todos as user A; sign in as user B → empty todo list
3. Todos: add, edit, complete, delete; priority ordering; bulk delete completed
4. Events: create, update, delete; today/this-week queries correct
5. Schedule setup: complete all 3 preset types end-to-end
6. Schedule display: correct courses per day type; A/B alternation from reference date; late-start time blocks
7. Schedule exceptions: add exception → verify schedule widget reflects override
8. Announcements: trigger `/api/announcements/refresh` → announcements appear in widget
9. Dark mode: toggle persists across reload
10. PWA: `pnpm build` → service worker registered; offline fallback works; installable
11. Mobile: pull-to-refresh, swipe gestures working

---

## Key Risks

1. **`@supabase/ssr` with Vinxi cookies**: SolidStart exposes cookies via `vinxi/http` (`getCookie`, `setCookie`) not Next.js's `cookies()`. Auth must be tested first before building anything else. Fallback: use `getRequestEvent().nativeEvent` to access the raw H3 event.

2. **Kobalte exit animations**: Radix uses `AnimatePresence`-style unmounting; Kobalte uses `data-closed` / `data-open` attributes. Existing `tailwindcss-animate` transitions need to target Kobalte data attributes instead of Radix.

3. **Announcements refresh authorization**: The Flask cron secret check (`is_authorized`) must be ported exactly. If using Vercel Cron, the `Authorization: Bearer <CRON_SECRET>` header pattern is the same.

4. **OpenAI model name**: Flask uses `gpt-5-nano`. Verify this model name is valid with the OpenAI API before deploying (the model naming convention may have changed).

5. **Discord webhook URL is hardcoded in Flask**: Move it to `DISCORD_WEBHOOK_URL` env var. Don't hardcode it in the new codebase.
