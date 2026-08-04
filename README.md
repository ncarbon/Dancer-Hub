# Dancer Hub

This README covers `apps/web` (Next.js) and `apps/api` (Express) — the full-stack app. A third app, `apps/mobile` (Expo/React Native), lives in this monorepo and shares code with `apps/web` via `packages/shared`.

## Contents

- [What it does](#what-it-does)
- [How to run it](#how-to-run-it)
- [Main choices](#main-choices)
- [What I'd build next](#what-id-build-next)
- [Attribution](#attribution)

## What it does

Dancer Hub is a rehearsal tool for dancers. You create a "routine" — attach audio and/or video (upload a file or record audio right in the browser), tag it with sections ("Chorus", "Bridge") and cues ("lift", "formation change") pinned to specific timestamps on a draggable timeline, then rehearse with slowed-down playback (with pitch correction), a configurable countdown delay before the music starts, and a mirror-flip for video. Routines can also be looked up on Spotify to pull in real BPM/key/artist metadata automatically.

A separate **Song Lookup** tool searches Spotify for any track, resolves its tempo through a chain of fallback sources, and suggests which partner-dance styles (salsa, bachata, hustle, etc.) tend to fit that tempo and feel — this is the app's main third-party API integration surface.

Auth is magic-link (passwordless email) via Supabase, with a handful of seeded example routines left permanently public and read-only so the app has something to look at without signing up.

**Web App full details (screenshots, project structure, extra notes) in [apps/web/README.md](apps/web/README.md).**

## How to run it

**Prerequisites**: Node 22+, pnpm 9.

```bash
pnpm install
```

**Environment** — `apps/api/.env.local`:
```bash
PORT=4000
ALLOWED_WEB_ORIGIN=http://localhost:3000
SPOTIFY_CLIENT_ID=
SPOTIFY_CLIENT_SECRET=
GETSONGBPM_API_KEY=
```
**Environment** — `apps/web/.env.local`:
```bash
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

**Run** (two terminals):
```bash
cd apps/api && npm run dev   # http://localhost:4000
pnpm dev:web                 # http://localhost:3000
```

## Main choices

- **Monorepo, one shared package.** `packages/shared` holds the DB-row-shaped TypeScript types and the tempo/style-matching logic, imported by both `apps/web` and `apps/mobile`. Kept the domain logic in one place instead of copy-pasted across two frontends.
- **A standalone Express API instead of Next.js API routes.** `apps/api` exists as its own service specifically so it's not tied to Next.js — it holds the Spotify/GetSongBPM credentials server-side and can be called by any client (web today, mobile later) without rework. This is the piece doing the actual API integration work.
- **Tempo resolution as a fallback chain, not a single call.** A lookup goes Spotify search (title/artist/art) → GetSongBPM catalog → AcousticBrainz (via MusicBrainz) → Deezer preview-clip beat-detection, falling through each time the previous source has no data, so a search rarely comes back empty. This chain is the most interesting piece of backend logic in the project.
- **Supabase for Postgres + Auth + Storage together.** One project covers the database, magic-link auth, and file storage for uploaded audio/video — avoided standing up separate infra for each so the take-home stayed focused on product logic.
- **Postgres RLS as the actual security boundary, not application code.** Routine ownership is enforced by row-level security policies, not by trusting the client — a signed-in-but-unauthorized write is rejected by the database itself regardless of what the UI does. Client-side ownership checks (hiding an edit button, redirecting to `/login`) are UX only.
- **Plain `@supabase/supabase-js`, no `@supabase/ssr` or middleware.** The whole app is client-rendered — there's no server-side session to keep warm, so the extra SSR-cookie-brokering layer wasn't worth adding. Magic-link auth uses Supabase's default implicit flow, which the browser client already parses with zero server code.
- **Hand-written SQL migrations, no ORM.** Schema changes are numbered `.sql` files applied directly — simple and inspectable at this scale.
- **Plain `useState`/`useEffect` data fetching, no React Query/SWR.** The read patterns here are simple fetch-on-mount with no complex caching/invalidation needs yet, so a data-fetching library would've been overhead without payoff.

## What I'd build next

- Finish hardening auth — custom SMTP (Supabase's shared relay has a low default rate limit, fine for dev, not for real usage) and possibly an OAuth option alongside magic link
- A-B loop practice mode (DB schema already supports it, no UI yet)
- Automated tests — currently verified manually (Playwright + a live Supabase project) during development, no test suite checked in
- CI running type-check/lint on PRs
- Real waveform rendering (currently a decorative placeholder, not actual audio analysis)
- Performance-prep checklist, ported over from the mobile app

---

## Attribution

Tempo & key catalog data is powered by [GetSongBPM](https://getsongbpm.com). Several example routines use audio from [Kevin MacLeod / Incompetech.com](https://incompetech.com), licensed [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) (credited in-app on each routine that uses it).

---

*`apps/mobile` (Expo) isn't part of this submission but is in the repo — see [apps/mobile/README.md](apps/mobile/README.md) if you're curious.*
