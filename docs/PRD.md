# Pesu Tamil — PRD (v1)

> Supersedes `product-brief.md` as the source of truth. That file is kept for historical context (the original brainstorm) but the decisions below are locked and take precedence where they differ.

## What this is

**Pesu Tamil** — a gamified Web/PWA app teaching Savyr (English-dominant, 6-ish) to **speak and understand conversational Tamil**, 15–20 min/day. Built for Savyr first, single-family personal use — not a public launch.

## Links

- Repo: `https://github.com/vinos-samuel/pesu-tamil` (branch `main`)
- Clickable session-flow storyboard (design reference, shows the 6-screen loop + creature art direction): `https://claude.ai/code/artifact/48a0c3d7-1f9a-47df-a7c9-558ac942ac56`

## Status

**Done:** product scope, game design, session-flow UX (validated via the storyboard artifact), v1 content draft (46 phrases, 5 units — see [`curriculum-phrases.md`](curriculum-phrases.md)), tech stack decisions.

**Pending (external, on Vinos):**
- [ ] New Supabase account (kept separate from existing account/org, to isolate billing)
- [ ] Native-speaker audio recording of the 46 v1 phrases (iPhone Voice Memo → naming convention below)
- [ ] Native-speaker review of the draft Tamil phrases (register/accuracy — flagged item-by-item in the phrase list)

**In progress (started 2026-08-09):** Web/PWA app scaffold — Vite + React + TypeScript + Tailwind, Supabase client wired, festival-daylight palette in `tailwind.config.js`, Google Fonts (Baloo 2 / Mukta) loaded. First working screen: the "who's playing?" profile picker, confirmed end-to-end against the live database (create + select both verified). Not yet built: units/creatures screens, the Learn → Recognize → Produce loop, parent dashboard.

## Locked decisions — don't re-litigate these, they were deliberated at length

**Audience & scope:** kids 5–14, spoken conversational Tamil only — no script/literacy track in v1, that's a deliberate deferral not an oversight. v1 is single-family (Savyr), but keep it forward-compatible (no-auth profile picker, not hardcoded to one user) since more kids may join later.

**Game design — "Creature Tamer" skin:** correctly learning/using a phrase tames a creature. Never say "lesson/practice" in-app copy — say "quest/tame/battle." Core loop per phrase:
- **Learn:** tap creature → hear Tamil audio → English-only caption reveals meaning after. Free, unlimited repeats.
- **Recognize:** English prompt → pick matching Tamil audio from 2–3 options. Distractors = other phrases already taught in the same unit (no extra authoring needed). Wrong answer costs a heart, reveals correct answer, never blocks progress.
- **Produce (redesigned 2026-08-09, advisor-reviewed — see below):** splits into two real sub-tiers, not one mic-with-a-fallback:
  - **Say-it** (every phrase): no ASR anywhere — record self via `MediaRecorder`, play it back immediately followed by the native recording, kid self-grades ("Same!" / "Not quite — again"). Never a hard right/wrong, never blocks progress, feedback copy never says "Correct!" (say "Nice — I heard you!" instead) — an unvarying "correct" reads as fake to a kid within a couple of sessions. The recording is stored in Storage; **the real grading happens on the parent dashboard** — a "recent recordings" list with thumbs up/down, ~60 seconds a week. Excluded from SRS scheduling (see `progress` below) since it can't produce a real wrong answer.
  - **Build-it** (only phrases with ≥2 `word_gloss` entries, ~13 of 69): word-order tapping using the phrase's own component words. Genuinely gradable, feeds SRS same as Recognize.
  - Web Speech API / client-side ASR is explicitly ruled out, even as an ungraded toy — child L2 speech on sub-second single words is close to a worst case for any recognizer, and a mic that returns the wrong word or nothing reads as *broken* to a 6-year-old, which is worse than not having a mic at all.

**"Battle mode":** solo-first by design (beat-your-own-best/ghost-run), always available with zero other users — this was a deliberate fix for the multiplayer cold-start problem. A connected cousin upgrades it to an async score-comparison via shareable link. Never require another person to be present.

**Visual design:** kid-facing screens commit permanently to a bright marigold/teal "festival daylight" palette (an earlier dark-indigo version was explicitly rejected as too dark — don't revert to it). Parent dashboard is a deliberate register-break — plain data, cream/daylight palette, never seen by the kid. Typefaces: Baloo 2 (display) + Mukta (body). Creatures are placeholder CSS/SVG geometry — rounded body, big glossy eyes, blush cheeks, species-specific crest (peacock feather fan, jasmine petals, small horns, otter ears, flame spark) — explicitly NOT final art; real illustration is a separate future task.

**No sign-in:** a lightweight "who's playing?" profile picker instead of accounts/auth — kept even at one user (Savyr) so adding a sibling/cousin later doesn't need a redesign. The private app URL is the only access gate for v1.

**Stack:** Web/PWA (no native app). Backend = **Supabase** (Postgres + bundled Storage in one project — avoids needing a second service just for audio files). New Supabase account, kept separate from Vinos's existing account to isolate billing. Free tier expected to comfortably cover v1 scale.

**Audio:** real native-speaker recordings only for what Savyr actually learns from. ChatGPT/synthetic TTS voice is acceptable **only** as a throwaway dev placeholder while building mechanics — never as the real content, because mis-modeled pronunciation actively teaches Savyr wrong Tamil, which is worse than no app. Naming convention for recorded files:

```
unit-{n}-{slug}/{seq}-{phrase-slug}.m4a
e.g. unit-1-greetings/01-vanakkam.m4a
```

**Content growth loop (how Unit 6+ gets written):** no end-of-session survey (recreates "hidden homework" feeling). Instead: (1) silent automatic per-attempt logging (phrase, tier, right/wrong) as the primary signal, (2) an occasional playful in-game topic picker (not every session) to steer future unit topics, (3) a free-text "quick note" field on the parent dashboard for qualitative signal Vinos captures from real conversations with Savyr. Unit 6 onward moves to **full sentences** recombining Units 1–5 vocabulary — deliberately not pre-written; write it once Units 1–5 are live and real usage data exists.

**Audio is not required for every unit (decided 2026-08-09):** Units 1, 3, 5 get real native-speaker recordings. Units 2 (Family & Kinship) and 4 (Numbers) skip audio entirely — the terms are common/simple enough to teach as English-spelled Tamil pronunciation text instead of a recording. `phrases.needs_audio` carries this per-item. Confirmed: the creature-taming mechanic still applies to every phrase including audio-free ones — the Learn tier just shows pronunciation text instead of a play button for `needs_audio = false` phrases, rather than dropping the creature/game loop for those units.

**Contrast pairs as a teaching device (decided 2026-08-09):** wherever a phrase has a natural opposite, negative, or question form (vaenum/vaendam, pasikkudhu/pasika illa, vaa/po, povom/povoma?, saapdu/saaptiya?), it's called out explicitly in content notes and the two items are taught close together. This stays authoring-side scaffolding, not in-app grammar lecture — no UI copy ever says "question particle" or "negation," per the existing "no grammar terminology" non-goal. The pairing itself, through usage and repetition, is the lesson. See `curriculum-phrases.md` for the full set.

**In-app sequencing stays rule-based (decided 2026-08-07):** what Savyr sees next, and in what order, is plain SRS logic (SM-2-style — missed phrases resurface sooner) — no LLM call in the runtime loop. An LLM API (ChatGPT/Claude) is fair game as an **authoring tool** for drafting Unit 6+ candidate sentences in batches once real usage data exists, same as a human draft — but every batch gets native-speaker review before it's recorded and shipped, exactly like Units 1–5. No live/unreviewed LLM-generated content ever reaches Savyr directly. Revisit true live-adaptive generation only after v1 is dogfooded and only if batch-authoring turns out to be the bottleneck.

**Explicit non-goals for v1:** script/literacy, ML personalization (rule-based only — age-band + unit sequence + simple spaced-repetition), real-time multiplayer, monetization (not being considered yet — don't raise it unprompted), native mobile app, regional Tamil variant switching.

## Data model shape (turn into real schema/migrations)

- `profiles` — one row per kid, no auth, selected via "who's playing?"
- `units`, `phrases` — content, tagged by unit/tier/age-band; phrase has an audio file reference in Supabase Storage (`needs_audio` flags which phrases skip audio — see Units 2 & 4 decision above)
- `creatures` — linked to phrases: species/color/level
- `attempts` — per-rep log: profile, phrase, tier (learn/recognize/say-it/build-it), correct/incorrect (nullable — say-it has no hard correct/incorrect), plus `self_grade`/`parent_grade`/`recording_path` for say-it, timestamp
- `progress` — derived per profile: streak, XP, mastery/SRS state per phrase, creatures unlocked. **SRS scheduling reads only Recognize + Build-it attempts** — Say-it is excluded (app-logic rule): an always-generous tier carries no real signal and would corrupt spaced-repetition scheduling if fed in. Parent thumbs-down on a recording is a manual demotion signal instead.

## Status (updated 2026-08-09)

Supabase provisioned, schema live, 69 phrases + 4 tips seeded, 43 audio files recorded and uploaded (Units 1, 3, 5). App scaffold started (Vite/React/TS/Tailwind, working profile picker against the live database). Units 2 & 4 (26 phrases) need audio recorded too — see `recording-checklist.md` — now that Produce/Say-it needs something to compare against.

## Build order (advisor-reviewed, 2026-08-09)

1. **Learn + Recognize, Unit 1 only, real audio, end to end.** ✅ Done 2026-08-09 — verified against the live database (audio fetch, `attempts` logging for both tiers, `progress` tally, `profiles.total_xp`), not just code review.
2. **Say-it Produce.** ✅ Done 2026-08-09. Storage bucket `say-it-recordings`, public — same call as `phrase-audio`: the app's whole access model is already "possession of the private URL/anon key," not per-object auth, so a second bucket with a different policy would be inconsistent complexity for no real gain at this scale. Verified end-to-end including the mic-blocked honor-system fallback (record→compare→self-grade path uses standard `MediaRecorder`, unverifiable in the sandboxed test browser but straightforward; real check happens on an actual device).
3. **Parent dashboard.** ✅ Done 2026-08-09. Recent Say-it recordings (only ones with an actual `recording_path` — honor-system attempts don't show up, nothing to play back) with kid/native playback and thumbs. Reachable via a small text link on the picker screen, no auth, matches the app's overall access model. Verified list rendering and grade persistence with a synthetic test row (deleted after).
4. **Build-it.** ✅ Done 2026-08-09, with a real design change from the original vision — flagged here for review since it was made without Vinos present (he was away, said to keep going):
   - **The gap:** the original word-order concept assumed tappable *Tamil* audio word-clips. We only have phrase-level recordings, not word-level, and can't show romanized Tamil text on screen (locked non-goal). Splitting existing recordings into word-level audio automatically isn't something to attempt without proper audio tooling — too easy to get wrong.
   - **What got built instead:** tap *English gloss* words into the same order as the spoken Tamil (the `word_gloss` field already carries this order, e.g. "thanni = water, vaenum = want" → tap "water" then "want"). Getting the order right plays the real native audio as confirmation/reward. This still teaches actual Tamil word order (through the English glosses) without inventing content or showing Tamil text.
   - **Eligibility:** `word_gloss` with ≥2 parts AND real `audio_path` — 18 phrases currently qualify (more than the advisor's rough "~13" estimate, since more glosses were added afterward).
   - Verified end-to-end including both the correct-order and wrong-order paths (a bug was caught live: the wrong-order feedback said "here's the right order" but didn't actually show it — fixed before shipping).
5. Never: Web Speech API / client-side ASR.
