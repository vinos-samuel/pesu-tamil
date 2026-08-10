-- Phase 0 of the mastery-gate rebuild (see session notes 2026-08-10).
-- `creature_unlocked` has existed since the initial schema and nothing in
-- the codebase has ever read or written it -- the real wild/following/tamed
-- state now comes entirely from `progress.mastery_state`, computed by
-- recomputeMasteryState() in src/lib/queries.ts. Dropping it rather than
-- leaving a second, unused "is it unlocked" boolean sitting next to the
-- one that's actually authoritative.
--
-- `next_review_at` (same table) is NOT touched here -- it also existed
-- unused until now, but recomputeMasteryState() starts writing it in this
-- same phase, so it stays.
--
-- mastery_state's 'new' enum value is also left alone: no code path has
-- ever written it (row-absence already means "never engaged"), and there's
-- no benefit to a constraint migration just to remove an unreachable value.

alter table progress drop column if exists creature_unlocked;
