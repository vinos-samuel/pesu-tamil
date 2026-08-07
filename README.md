# Pesu Tamil (பேசு தமிழ்)

> "Pesu" = "speak" — a gamified app that teaches English-speaking kids (ages 5–14) to **speak and understand conversational Tamil**, in 15–20 minutes a day.

**Status:** Pre-build, but scoped and designed. Product, game design, session-flow UX, tech stack, and v1 content (46 phrases) are locked — see [`docs/PRD.md`](docs/PRD.md). No app code yet.

This is a fresh project, unrelated to any other repo in this account.

## The one-line pitch

Duolingo doesn't teach Tamil. Most existing "learn Tamil" apps are either built for adult heritage speakers (grammar-heavy) or are static alphabet flashcard apps with no real gamification. Pesu Tamil is kid-first, spoken-first, and built around the actual goal diaspora parents have: *my kid can talk to grandparents and understand what's said at home.*

## Current scope decisions (locked for v1)

- **Audience:** kids 5–14 (English-dominant, Tamil-diaspora households)
- **Modality:** **spoken conversational Tamil only.** No script/literacy track yet — that's an explicit non-goal for v1, to be revisited later.
- **Session length:** 15–20 minutes/day
- **Format:** gamified — streaks, levels, mini-games, not a lecture/quiz app

See [`docs/PRD.md`](docs/PRD.md) for the locked product/game/tech decisions and [`docs/curriculum-phrases.md`](docs/curriculum-phrases.md) for the v1 phrase list (Units 1–5, 46 phrases).

`docs/product-brief.md` and `docs/curriculum.md` are the original brainstorm drafts, kept for history — superseded by the PRD where they differ (e.g. platform is now decided: Web/PWA + Supabase).

## Next steps

1. Provision Supabase (new account, separate billing) once it exists.
2. Scaffold the Web/PWA app around the validated session-flow storyboard (linked in `docs/PRD.md`).
3. Build Learn → Recognize → Produce against placeholder audio, then swap in real recordings as they land.
