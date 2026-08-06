# Product Brief

## Who this is for

Two users, different needs:

- **The kid (5–14):** wants play, not homework. Attention span and what feels "cool" varies a lot across that range — a 5-year-old and a 13-year-old will not tolerate the same UI or tone.
- **The parent:** wants proof of progress, low guilt ("we're doing *something* for heritage/language"), and a way to participate without needing to already speak fluent Tamil themselves. A parent dashboard (streaks, words/phrases learned, what to try at home) is nearly as important as the kid-facing app.

## Why spoken-first, and why spoken-*only* for v1

Tamil has meaningful diglossia — spoken Tamil and literary/written Tamil diverge more than in most languages. Script-first apps chase literacy before a kid can actually talk to Paati/Thatha, and the payoff (reading one word) takes a long time to reach, which kills engagement.

Cutting the script/literacy track entirely for v1 — not just deprioritizing it — keeps the whole curriculum, UI, and gamification loop focused on one clear outcome: **understand what's said, say it back.** Script can be a v2 track once the spoken core works.

## The 5–14 age range problem

This is a wide band. A single flat curriculum and UI will underserve both ends — a 5-year-old needs picture-matching and songs; a 13-year-old will disengage from anything that reads as "made for toddlers." Worth deciding early (see open question in README) whether v1 ships as:
- one curriculum with a tone/UI that scales by selected age band, or
- a genuinely separate track for young (5–8) vs. older (9–14) kids, sharing only the underlying content library and SRS engine.

Recommendation to test: **share the content/audio library and gamification engine, but skin the UI/mascot/copy differently per age band.** Cheaper than two curricula, avoids the "this is for babies" problem for older kids.

## Gamification mechanics for a 15–20 min/day session

- **Streaks + a mascot** with a distinct visual identity (not a generic Duolingo-owl clone) — something rooted in Tamil culture/folk art could double as a cultural touchpoint (peacock, elephant, a folk-art character)
- **XP + levels** that map to real spoken competence ("Level 3: can greet and count to 10"), not abstract points
- **Session = 3–4 short activity types, not one long drill** — e.g., 5 min listen-and-match, 5 min tap-the-word, 5 min speak-and-repeat, 5 min mini-game/story — variety matters more than depth per mode at this age
- **Spaced repetition under the hood**, disguised as a game mechanic (e.g., a "word garden" that wilts if a phrase isn't revisited) rather than presented as "review"
- **Unlockable cultural rewards** — a song, a folk story snippet, a festival mini-game — ties the reward loop back to the actual cultural goal instead of generic stickers
- **Speech recognition / pronunciation feedback** — a strong differentiator if done well, but Tamil ASR is less mature than Hindi/English. Design for graceful degradation: self-recording + waveform/similarity comparison rather than strict pass/fail grading, to avoid false-negative frustration
- **Parent co-play prompts** — "say this with a grown-up" — turns screen time into family time and reinforces retention outside the app

## Session structure (example, 15–20 min)

1. Warm-up review (2–3 min, SRS-driven, feels like a quick game)
2. New content — one small chunk (5–6 min)
3. Practice game applying it (5 min)
4. Speaking challenge (3–4 min)
5. End-of-session reward + streak animation + "say this to someone today" prompt

## Differentiators worth leaning into

- **Kinship/family vocabulary depth** — Tamil has specific terms for elder/younger sibling, maternal/paternal relatives that don't map cleanly to English. Genuinely useful, genuinely hard to find done well elsewhere.
- **Native-speaker audio, not TTS.** Tamil TTS quality is still rough; recorded audio (ideally kid voices for peer-modeling in the younger band) will feel dramatically more polished.
- **Diaspora-specific framing** — content built around "what you'd actually say at home/at a family gathering," not textbook dialogue.
- **Parent dashboard as first-class**, not an afterthought.

## Explicit non-goals for v1

- Tamil script / literacy (எழுத்து) — deferred
- Formal/literary Tamil register
- Adult or non-native-speaker-parent-focused content (parent-facing surfaces are about *tracking*, not *learning*, for v1)
