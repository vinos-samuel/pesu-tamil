# Pesu Tamil (பேசு தமிழ்)

> "Pesu" = "speak" — a gamified app that teaches English-speaking kids (ages 5–14) to **speak and understand conversational Tamil**, in 15–20 minutes a day.

**Status:** Pre-build. This repo currently holds the product brief only — no app code yet. Tech stack (native mobile vs. web/PWA) is intentionally undecided until the curriculum and UX direction are settled.

This is a fresh project, unrelated to any other repo in this account. It will be pushed to its own GitHub repository.

## The one-line pitch

Duolingo doesn't teach Tamil. Most existing "learn Tamil" apps are either built for adult heritage speakers (grammar-heavy) or are static alphabet flashcard apps with no real gamification. Pesu Tamil is kid-first, spoken-first, and built around the actual goal diaspora parents have: *my kid can talk to grandparents and understand what's said at home.*

## Current scope decisions (locked for v1)

- **Audience:** kids 5–14 (English-dominant, Tamil-diaspora households)
- **Modality:** **spoken conversational Tamil only.** No script/literacy track yet — that's an explicit non-goal for v1, to be revisited later.
- **Session length:** 15–20 minutes/day
- **Format:** gamified — streaks, levels, mini-games, not a lecture/quiz app

See [`docs/product-brief.md`](docs/product-brief.md) for the full brainstorm this scope was distilled from, and [`docs/curriculum.md`](docs/curriculum.md) for the spoken-Tamil content plan.

## Open questions (not yet decided)

- Native mobile (Expo/React Native) vs. web/PWA vs. both
- Age-band splitting: one experience for 5–14, or a young (5–8) / older (9–14) split
- Speech recognition approach for pronunciation feedback (Tamil ASR is immature — needs a fallback design)
- Monetization model
- Regional Tamil variant handling (India / Sri Lanka / Singapore-Malaysia)

## Next steps

1. Nail down curriculum sequencing for spoken-only Tamil (see `docs/curriculum.md`)
2. Decide platform (native vs. web) — see open questions above
3. Scaffold the app once curriculum + platform are settled
