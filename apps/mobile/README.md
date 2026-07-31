# Dancer Hub — Mobile

Expo / React Native app for Dancer Hub — the original routine practice experience (library, practice player, timeline editor) that the web app's [Routines feature](../web/README.md) was later ported from.

This app is part of the `dancer-hub` monorepo. For root-level setup (pnpm workspaces, `apps/web`, `apps/api`, `packages/shared`), see the [repo README](../../README.md).

---

## Screenshots

| Library | Player | Timeline Editor |
|---|---|---|
| ![Routines](../../shared-assets/routines.jpg) | ![Player](../../shared-assets/player.jpg) | ![Editor](../../shared-assets/editor.jpg) |

---

## Screens

- `app/(tabs)/library.tsx` — routine list
- `app/(tabs)/player.tsx` — practice player (waveform scrub, transport, speed/pitch/delay controls, section strip, cue overlay, optional video with mirror flip)
- `app/(tabs)/prep.tsx` — performance prep checklist
- `app/import.tsx` — new routine import
- `app/timeline.tsx` — timeline editor (drag-to-retime cues and sections)
- `app/upload.tsx`, `app/tracks/[id].tsx` — a separate, unrelated single-track upload/playback feature (own audio library, distinct from routines)

State management (`lib/rehearseStore.tsx`) and design tokens (`lib/theme.tsx` — 5 palettes, section/cue-type color maps, Newsreader + Work Sans fonts) are mobile-only; the web port intentionally didn't bring the palette system over.

---

## Local development

### Prerequisites
- Node.js 22+, pnpm 9 (see root README)
- Expo Go app (for quick device testing) or a configured iOS/Android simulator

### Environment

`.env.local` (no `.env.example` here yet — same Supabase project as `apps/web`):

```bash
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_ANON_KEY=
```

### Run

From the repo root:

```bash
pnpm dev:mobile
```

Or from this directory:

```bash
npm run dev          # expo start
npm run ios          # expo run:ios
npm run android       # expo run:android
npm run type-check
```
