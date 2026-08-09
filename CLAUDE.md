# Pesu Tamil — Project Context

Gamified Web/PWA teaching Savyr (6, English-dominant) spoken conversational Tamil. Full product/design decisions: [`docs/PRD.md`](docs/PRD.md). Content: [`docs/curriculum-phrases.md`](docs/curriculum-phrases.md). Stack: Vite + React + TypeScript + Tailwind, Supabase (project `pesu-tamil`, ap-southeast-1, ref `zsksmbcdutyojdcvfghd`).

## Current Sprint (updated 2026-08-09)

**Completed this session:**
- Fixed data bug: internal "(bonus)"/"(bonus, contrast)" authoring tags had leaked into the learner-facing `english` column on 23 phrases — app was reading them aloud in prompts. Migration `20260809140000` strips them.
- Fixed silent audio failures app-wide — `new Audio().play()` promise rejections were uncaught everywhere; added `src/lib/playAudio.ts`, used in every screen.
- Redesigned Recognize tier: tap-to-preview (any option, repeatable, ungraded) separated from an explicit "Choose this one ✓" commit — previously the first tap both played audio and graded, so a kid couldn't compare options before answering.
- Added a back/exit affordance to every screen (UnitPicker, Intro, Learn, Recognize, SayIt, BuildIt) — none existed before.
- Say-it: added "🎤 Record again" before self-grading (previously no way to redo a bad take) and fixed "Hear Paati" → "Hear it in Tamil" (voice isn't always female/grandma).
- Learn: fixed "Play again" label showing before the first play ever happened; removed the redundant second play button.
- Two Opus design-advisor passes run (read-only, no code from them): (1) creature system + gamification + LLM-word-teaching concept, (2) live-vs-batch classification for Claude API use (intuitiveness/tips/fun/coaching).
- Built and published a design-pitch artifact — working parametric SVG creature generator (traits deterministically hashed from phrase slug: body/crest/eyes/mouth/hue), Sanctuary collection-screen mockup, redesigned parent-dashboard mockup. **Vinos approved this design direction.**

**Where we stopped:** design approved, zero of it built into the real app yet. Next session starts implementation.

**What's next (per Vinos, 2026-08-09): "build design and 1-3"**
1. Build the approved design (parametric `<Creature>` component replacing the literal-animal emoji; Sanctuary collection screen; dashboard redesign) into the real React app.
2. Opus build-order item 1: wire up the 4 existing `tips` rows into the Learn screen — content was authored and reviewed weeks ago, never queried anywhere in the app.
3. Opus build-order item 2: UX/copy pass — kid-facing screens currently show dev tier names ("Learn 1/10", "Recognize 3/10") violating the app's own no-dev-vocabulary rule; add real progress visualization (egg-hatching concept, not grey "4/10" text); resolve the undefined zero-hearts end state in Recognize.
4. Opus build-order item 3: write the ~60-line personality copy bank (varied per-creature-species encouragement, replaces static "Correct!"/"Not quite" text) — Claude-drafted in one batch, Vinos culls, ships as a static `src/lib/copy.ts`, no runtime API call.
5. **After 1-3 ship, Vinos tests with Savyr directly to judge real engagement before deciding on anything further.** Explicitly not proceeding to items 4 (parent weekly digest) or 5 (The Nest/adjacent-words) until that read.

**Still open, not part of the above:** Units 2 & 4 (26 phrases) still need native-speaker recordings — Vinos said he'd record "in the evening" earlier this session; unclear if done. Confirm status before assuming those units are audio-ready.

**New decisions/architecture locked this session:**
- Live LLM calls are permitted only for (a) selecting among pre-approved content, or (b) parent-facing features (e.g. weekly digest) — never for generating kid-facing text, in any language, live. Batch-author + Vinos-review, same pattern as existing Say-it recording review.
- Creature visual system: parametric SVG (6 bodies × 8 crests × 4 eyes × 3 mouths × hue-per-unit), not literal animal emoji, not commissioned art. Deterministic from phrase slug — same phrase always renders the same creature.
- Recognize interaction model: preview (repeatable, ungraded) → explicit commit (single action, graded). Do not regress to tap-plays-and-grades.
- `src/lib/playAudio.ts` is now the only sanctioned way to play audio in this codebase — always use it, never call `new Audio().play()` directly (silent-failure risk).
- Sarvam AI (Indian Indic-language model, has an explicit spoken/colloquial vs. formal-register translation mode) flagged as a possible second opinion for Tamil content drafting — plan is a side-by-side pilot against Claude on real content when next drafting Tamil, not a pipeline swap. Not committed.
