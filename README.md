# Anxiety Esports — full project (Phases 1–4 merged)

This is the complete, merged codebase across all phases built so far:
foundation (schema/RLS/auth scaffolding) → Phase 2 (auth + homepage) → Phase 3
(manager dashboard, match wizard, MatchMapCard, OCR route) → Phase 4 (player,
admin, request-meeting, stub coach/staff, plus bug fixes).

## Setup

```bash
npm install
```

Create `.env.local` in the project root:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
GOOGLE_API_KEY=your-gemini-api-key
```

Run the three migrations in `supabase/migrations/` **in order** via the
Supabase SQL editor (or CLI): `0001` → `0002` → `0003`.

```bash
npm run dev
```

## What's implemented

- Auth (login, apply, apply/status), middleware-based role/status routing
- Public homepage (hero, roster carousel, results teaser)
- Manager dashboard: overview, calendar, 4-step match creation wizard
  (map drag-reorder, OCR scoreboard upload), roster management, match detail
- Player dashboard: overview, calendar (timeline), tasks, stats (Recharts),
  profile
- Admin dashboard: overview, applications queue (approve/reject)
- Shared: notification bell (Realtime), request-meeting page
- Coach/staff dashboards: stubs only

## Known gaps / TODOs

- **OCR route (`app/api/ocr/scoreboard/route.ts`) does not reuse the Discord
  bot's existing Tesseract/Google Vision + Gemini/Groq pipeline.** It's a
  fresh Gemini-2.5-Flash-only implementation, which conflicts with the
  original "reuse, don't rewrite" preference. Still waiting on the bot repo
  URL to fix this properly.
- The match wizard's `player_stats` insert uses a placeholder `user_id`
  (the manager's own id) for every parsed scoreboard row — no IGN-to-
  roster-member matching yet.
- Not built yet: `/dashboard/manager/matches` (list page),
  `/dashboard/manager/matches/[id]/edit`, `/dashboard/admin/users`,
  `/dashboard/admin/rosters`, `/dashboard/admin/calendar`, coach dashboard,
  staff dashboard, chat/DM system, achievements UI.
- Avatar upload is URL-input only — no Supabase Storage upload flow yet.
- `app/layout.tsx` has `suppressHydrationWarning` on `<html>` to silence a
  hydration warning caused by a browser extension injecting a `hydrated`
  class — not an app bug, safe to leave as-is.

## Bootstrapping your first admin (required, manual step)

There is a chicken-and-egg problem by design: only an admin can approve
applications and promote other users, but nobody starts out as admin. The
`/dashboard/admin/applications` approve flow now runs through a server
action (`app/dashboard/(shell)/admin/applications/actions.ts`) using the
service-role key specifically so approvals always work once *an* admin
exists — but that first admin has to be set by hand, once, directly in the
database:

1. Sign up normally through `/apply` (pick any role — it doesn't matter,
   you're about to override it).
2. In the Supabase dashboard, go to **Table Editor → users**, find your row,
   and set `role = admin` and `status = approved` manually.
3. Log back in (or refresh) — you'll land in `/dashboard/admin` and can
   approve every subsequent application normally from the UI from then on.

If you ever see someone stuck being redirected back to `/apply/status`
after an admin "approved" them, check the Supabase logs for the
`approveApplication` server action — it now returns and surfaces a real
error via toast instead of failing silently, so this should be visible in
the UI now rather than mysterious.

## Discord sign-in setup (required, manual step)

The "Continue with Discord" button on `/login` calls
`supabase.auth.signInWithOAuth({ provider: 'discord' })`, but Discord has to
be enabled as an OAuth provider in your Supabase project before it'll work:

1. In the [Discord Developer Portal](https://discord.com/developers/applications),
   create an application → **OAuth2** → add a redirect URL:
   `https://<your-project-ref>.supabase.co/auth/v1/callback`
2. Copy the Discord **Client ID** and **Client Secret**.
3. In the Supabase dashboard: **Authentication → Providers → Discord** →
   paste in the Client ID/Secret → enable the provider.
4. In **Authentication → URL Configuration**, make sure your site's
   `/auth/callback` URL (e.g. `http://localhost:3000/auth/callback` for
   local dev, plus your production URL) is in the allowed redirect list.

Note: a brand-new Discord sign-in creates a `users`/`applications` row the
same way email signup does (via the `handle_new_user` trigger), but with
`role = null` since there's no application form data attached to an OAuth
sign-in. They'll land on `/apply/status` showing a pending application with
no role — an admin will need to set their role manually in
`/dashboard/admin/users` (or extend `/apply/status` with a "complete your
profile" step) since there's no role-selection UI in the OAuth flow yet.

## Toast notifications

All form errors and key success states now surface via toast (using
`sonner`, wired up in `app/layout.tsx`) in addition to any inline error
text that was already there — `lib/toast.ts` is the shared wrapper
(`toast.error`, `toast.success`, `toast.info`). Covered: login, apply
(including the duplicate-email case below), applications approve/reject,
match creation, meeting requests, profile edits, task creation, roster
creation, admin calendar, user role/suspend actions, and chat.

## Known signup behavior: duplicate email

Supabase Auth intentionally does **not** return an error when you sign up
with an email that's already registered and confirmed — this prevents
attackers from using the signup form to enumerate which emails have
accounts. The `/apply` page now detects this the documented way (checking
`data.user.identities` for an empty array on an otherwise-successful
response) and shows a toast + inline error telling the person to log in
instead.
