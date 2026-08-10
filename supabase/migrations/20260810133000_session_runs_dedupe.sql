-- Caught live 2026-08-10: React StrictMode double-invoked SessionRunner's
-- setup effect in dev, and both invocations raced past the "is there
-- already an active run" check before either finished writing, producing
-- two incomplete session_runs rows for the same profile+unit. Fixed
-- client-side too (a useRef guard in SessionRunner.tsx), but "at most one
-- active run per profile+unit" is a real invariant and belongs at the DB
-- level, not just as an app-level convention -- this is the same class of
-- protection a unique constraint always gives over "the client happens to
-- behave."

-- Clean up the duplicate(s) this bug already produced: keep the one with
-- the highest current_index (the one that was actually played), drop the
-- other stalled-at-0 row(s).
delete from session_runs a using session_runs b
where a.profile_id = b.profile_id
  and a.unit_id = b.unit_id
  and a.completed_at is null
  and b.completed_at is null
  and a.current_index < b.current_index;

create unique index session_runs_one_active_per_unit
  on session_runs (profile_id, unit_id)
  where completed_at is null;
